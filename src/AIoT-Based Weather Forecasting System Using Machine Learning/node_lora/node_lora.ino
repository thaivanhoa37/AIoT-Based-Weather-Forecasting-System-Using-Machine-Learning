/*
 * LoRa E32-433T20D Node - Environmental Monitoring System with FreeRTOS
 * ESP32 30 Pin with Real Sensors + OLED Display + Detailed Serial Output
 * 
 * Gửi dữ liệu cảm biến thực mỗi 5 giây qua LoRa
 * Hiển thị dữ liệu trên OLED 128x64
 * In chi tiết dữ liệu cảm biến ra Serial Monitor
 * Sử dụng FreeRTOS để quản lý đa nhiệm
 * 
 * LoRa Module Connections:
 * E32-433T20D    ESP32 (30 pin)
 * VCC       ->   3.3V
 * GND       ->   GND
 * TX        ->   RX2 (GPIO16)
 * RX        ->   TX2 (GPIO17)
 * M1        ->   GPIO18
 * M0        ->   GPIO19
 *
 * Sensor Connections:
 * DHT11     ->   GPIO4
 * I2C (AHT20, BMP280, OLED) -> GPIO21 (SDA), GPIO22 (SCL)
 * MQ135     ->   GPIO35 (ADC1_CH7)
 * GP2Y1014  ->   GPIO34 (MEASURE), GPIO25 (LED)
 */

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_AHTX0.h>
#include <Adafruit_BMP280.h>
#include <DHT.h>

// LoRa Configuration
#define M0 19       
#define M1 18

// Chân UART2 cho LoRa E32
#define LORA_RX 16    // ESP32 nhận -> nối với TX của E32
#define LORA_TX 17    // ESP32 truyền -> nối với RX của E32


// OLED Configuration
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define SCREEN_ADDRESS 0x3C
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// DHT11 Configuration
#define DHT_PIN 4
#define DHT_TYPE DHT11
DHT dht(DHT_PIN, DHT_TYPE);

// MQ135 Configuration
#define MQ135_PIN 35
#define RZERO 76.63
#define PARA 116.6020682
#define PPM_MIN 400
#define PPM_MAX 5000

// Dust Sensor Configuration
#define MEASURE_PIN 34
#define LED_POWER_PIN 25
#define SAMPLING_TIME 280
#define DELTA_TIME 40
#define SLEEP_TIME 9680

// AQI Table
struct AQILevel {
  float Clow, Chigh;
  int Ilow, Ihigh;
};

AQILevel aqiTable[] = {
  {0.0, 12.0, 0, 50},
  {12.1, 35.4, 51, 100},
  {35.5, 55.4, 101, 150},
  {55.5, 150.4, 151, 200},
  {150.5, 250.4, 201, 300},
  {250.5, 500.4, 301, 500}
};

// Sensor instances
Adafruit_AHTX0 aht;
Adafruit_BMP280 bmp;

// Sensor state flags
bool ahtInitialized = false;
bool bmpInitialized = false;
bool dhtInitialized = false;
bool oledInitialized = false;

// Sensor data variables (realtime) - Protected by mutex
float temperature = 0;
float humidity = 0;
float pressure = 0;
float co2ppm = 0;
float dustDensity = 0;
int aqi = 0;

// Averaging variables - Protected by mutex
float tempSum = 0, humiSum = 0, pressSum = 0, co2Sum = 0, dustSum = 0;
int aqiSum = 0;
int readCount = 0;

int sendCount = 0;

// FreeRTOS Task Handles
TaskHandle_t TaskReadSensorHandle;
TaskHandle_t TaskDisplayHandle;
TaskHandle_t TaskPrintHandle;
TaskHandle_t TaskLoRaHandle;

// Mutex for protecting shared data
SemaphoreHandle_t dataMutex;

// Calculate AQI from PM2.5
int calculateAQI(float pm25) {
  if (pm25 <= 0) return 0;
  if (pm25 > 500) return 500;

  for (int i = 0; i < 6; i++) {
    if (pm25 >= aqiTable[i].Clow && pm25 <= aqiTable[i].Chigh) {
      return ((aqiTable[i].Ihigh - aqiTable[i].Ilow) / (aqiTable[i].Chigh - aqiTable[i].Clow)) *
             (pm25 - aqiTable[i].Clow) + aqiTable[i].Ilow;
    }
  }
  return 0;
}

String getAQIQuality(int aqi) {
  if (aqi <= 50) return "TOT";     // Good
  if (aqi <= 100) return "TB";     // Moderate
  if (aqi <= 150) return "KEM";    // Unhealthy for sensitive groups
  return "NGUY";                   // Unhealthy or worse
}

String getCO2Quality(float ppm) {
  if (ppm < 800) return "TOT";     // Good air quality
  if (ppm < 1200) return "TB";     // Average
  if (ppm < 2000) return "KEM";    // Poor
  return "NGUY";                   // Dangerous
}

// Initialize OLED display
bool initializeOLED() {
  if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println("✗ OLED initialization failed!");
    return false;
  }
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("OLED Initialized");
  display.display();
  delay(1000);
  return true;
}

// Initialize CO2 sensor reading from MQ135
float readCO2(float temp, float hum) {
  int adc = analogRead(MQ135_PIN);
  float voltage = adc * (3.3 / 4095.0);
  
  // Avoid division by zero
  if (voltage < 0.1) voltage = 0.1;
  
  float rs = ((5.0 * 20.0) / voltage) - 20.0;
  if (rs < 0) rs = 0;
  
  float ratio = rs / RZERO;
  float ppm = PARA * pow(ratio, -1.41);
  ppm = constrain(ppm, PPM_MIN, PPM_MAX);
  
  // Temperature compensation
  if(temp > 20) {
    float t_factor = 1.0 + 0.018 * (temp - 20.0);
    ppm = ppm * t_factor;
  }
  
  // Humidity compensation
  if(hum > 65) {
    float h_factor = 1.0 + 0.015 * (hum - 65.0);
    ppm = ppm * h_factor;
  }
  
  ppm = constrain(ppm, PPM_MIN, PPM_MAX);
  return ppm;
}

// Read dust sensor
float readDustSensor() {
  digitalWrite(LED_POWER_PIN, LOW);
  delayMicroseconds(SAMPLING_TIME);
  float voMeasured = analogRead(MEASURE_PIN);
  delayMicroseconds(DELTA_TIME);
  digitalWrite(LED_POWER_PIN, HIGH);
  delayMicroseconds(SLEEP_TIME);
  
  float calcVoltage = voMeasured * (3.3 / 4095.0);
  float dust = (170 * calcVoltage - 0.1);
  if (dust < 0) dust = 0;
  return dust;
}

// Task 1: Read Sensors (High Priority)
void TaskReadSensor(void *pvParameters) {
  // Wait for MQ135 warmup
  Serial.println("Chờ 20 giây cho MQ135 khởi động...");
  vTaskDelay(pdMS_TO_TICKS(20000));
  Serial.println("MQ135 sẵn sàng!");
  
  while (1) {
    // Read DHT11
    float dht_temp = dht.readTemperature();
    float dht_humi = dht.readHumidity();
    
    // Read AHT20
    sensors_event_t humidity_event, temp_event;
    float ath_temp = 0, ath_humi = 0;
    
    if (ahtInitialized && aht.getEvent(&humidity_event, &temp_event)) {
      ath_temp = temp_event.temperature;
      ath_humi = humidity_event.relative_humidity;
    }
    
    // Select temperature and humidity from available sensors
    // Priority: Average both if available, then DHT11 only, then AHT20 only
    bool dht_valid = !isnan(dht_temp) && !isnan(dht_humi) && dht_temp > -40 && dht_temp < 80;
    bool ath_valid = ath_temp > -40 && ath_temp < 80 && ath_humi > 0 && ath_humi <= 100;
    
    float local_temp = 0, local_hum = 0;
    
    if (dht_valid && ath_valid) {
      // Cả 2 cảm biến đều hoạt động - tính trung bình
      local_temp = (dht_temp + ath_temp) / 2.0;
      local_hum = (dht_humi + ath_humi) / 2.0;
    }
    else if (dht_valid) {
      // Chỉ DHT11 hoạt động
      local_temp = dht_temp;
      local_hum = dht_humi;
    } 
    else if (ath_valid) {
      // Chỉ AHT20 hoạt động
      local_temp = ath_temp;
      local_hum = ath_humi;
    }
    else {
      // Không có cảm biến nào hoạt động
      vTaskDelay(pdMS_TO_TICKS(1000));
      continue;
    }
    
    // Read BMP280
    float local_press = 0;
    if (bmpInitialized) {
      local_press = bmp.readPressure() / 100.0;
      if (isnan(local_press) || local_press < 300 || local_press > 1300) {
        local_press = 0;
      }
    }
    
    // Read MQ135
    float local_co2 = readCO2(local_temp, local_hum);
    
    // Read dust sensor
    float local_dust = readDustSensor();
    
    // Calculate AQI
    int local_aqi = calculateAQI(local_dust);
    
    // Update shared variables with mutex protection
    if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
      temperature = local_temp;
      humidity = local_hum;
      pressure = local_press;
      co2ppm = local_co2;
      dustDensity = local_dust;
      aqi = local_aqi;
      
      // Accumulate for averaging
      tempSum += local_temp;
      humiSum += local_hum;
      if (local_press > 0) pressSum += local_press;
      if (local_co2 > 0) co2Sum += local_co2;
      if (local_dust > 0) {
        dustSum += local_dust;
        aqiSum += local_aqi;
      }
      readCount++;
      
      xSemaphoreGive(dataMutex);
    }
    
    vTaskDelay(pdMS_TO_TICKS(1000)); // Read every 1 second
  }
}

// Task 2: Display on OLED (Medium Priority)
void TaskDisplay(void *pvParameters) {
  while (1) {
    if (oledInitialized) {
      // Get current sensor values with mutex protection
      float disp_temp, disp_hum, disp_press, disp_co2, disp_dust;
      int disp_aqi;
      
      if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
        disp_temp = temperature;
        disp_hum = humidity;
        disp_press = pressure;
        disp_co2 = co2ppm;
        disp_dust = dustDensity;
        disp_aqi = aqi;
        xSemaphoreGive(dataMutex);
      } else {
        vTaskDelay(pdMS_TO_TICKS(100));
        continue;
      }
      
      display.clearDisplay();
      display.setTextSize(1);
      display.setTextColor(SSD1306_WHITE);
      
      // Line 1: Temperature & Humidity
      display.setCursor(0, 0);
      display.printf("T:%.1f C  H:%.1f%%", disp_temp, disp_hum);
      
      // Line 2: Pressure
      display.setCursor(0, 10);
      display.printf("P:%.0f hPa", disp_press);
      
      // Line 3: CO2
      display.setCursor(0, 20);
      display.printf("CO2:%.0f ppm(%s)", disp_co2, getCO2Quality(disp_co2).c_str());
      
      // Line 4: Dust
      display.setCursor(0, 30);
      display.printf("Dust:%.1f ug/m3", disp_dust);
      
      // Line 5: AQI
      display.setCursor(0, 40);
      display.printf("AQI:%d(%s)", disp_aqi, getAQIQuality(disp_aqi).c_str());
      
      // Line 6: Status & packets
      display.setCursor(0, 50);
      display.printf("Packets:%d", sendCount);
      
      display.display();
    }
    
    vTaskDelay(pdMS_TO_TICKS(2000)); // Update every 2 seconds
  }
}

// Task 3: Print to Serial (Low Priority)
void TaskPrint(void *pvParameters) {
  while (1) {
    // Get current sensor values with mutex protection
    float print_temp, print_hum, print_press, print_co2, print_dust;
    int print_aqi;
    
    if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
      print_temp = temperature;
      print_hum = humidity;
      print_press = pressure;
      print_co2 = co2ppm;
      print_dust = dustDensity;
      print_aqi = aqi;
      xSemaphoreGive(dataMutex);
    } else {
      vTaskDelay(pdMS_TO_TICKS(100));
      continue;
    }
    
    Serial.println("\n========================================");
    Serial.println("        INSTANT SENSOR READINGS        ");
    Serial.println("========================================");
    Serial.printf("Temperature : %.1f°C\n", print_temp);
    Serial.printf("Humidity    : %.1f%%\n", print_hum);
    Serial.printf("Pressure    : %.1f hPa\n", print_press);
    Serial.printf("CO2         : %.1f ppm (%s)\n", print_co2, getCO2Quality(print_co2).c_str());
    Serial.printf("Dust        : %.1f ug/m3\n", print_dust);
    Serial.printf("AQI         : %d (%s)\n", print_aqi, getAQIQuality(print_aqi).c_str());
    Serial.println("========================================\n");
    
    vTaskDelay(pdMS_TO_TICKS(2000)); // Print every 2 seconds
  }
}

// Task 4: Send LoRa Data (Medium Priority)
void TaskLoRa(void *pvParameters) {
  while (1) {
    sendCount++;
    
    // Calculate averages with mutex protection
    float avgTemp, avgHum, avgPres, avgCO2, avgDust;
    int avgAQI;
    int count;
    
    if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
      count = readCount;
      
      if (count > 0) {
        avgTemp = tempSum / count;
        avgHum = humiSum / count;
        avgPres = pressSum / count;
        avgCO2 = co2Sum / count;
        avgDust = dustSum / count;
        avgAQI = aqiSum / count;
        
        // Reset accumulators
        tempSum = humiSum = pressSum = co2Sum = dustSum = 0;
        aqiSum = 0;
        readCount = 0;
      } else {
        avgTemp = temperature;
        avgHum = humidity;
        avgPres = pressure;
        avgCO2 = co2ppm;
        avgDust = dustDensity;
        avgAQI = aqi;
      }
      
      xSemaphoreGive(dataMutex);
    } else {
      vTaskDelay(pdMS_TO_TICKS(100));
      continue;
    }
    
    // Create compact JSON (optimized for LoRa)
    String data = "{";
    data += "\"t\":" + String(avgTemp, 1) + ",";      // Temperature
    data += "\"h\":" + String(avgHum, 1) + ",";       // Humidity
    data += "\"p\":" + String(avgPres, 0) + ",";      // Pressure
    data += "\"c\":" + String(avgCO2, 0) + ",";       // CO2 (ppm)
    data += "\"d\":" + String(avgDust, 1) + ",";      // Dust (ug/m3)
    data += "\"a\":" + String(avgAQI);                // AQI
    data += "}";
    
    // Clear Serial2 buffer before sending
    while (Serial2.available()) {
      Serial2.read();
    }
    
    // Send via LoRa
    Serial2.println(data);
    Serial2.flush();
    
    // Display on Serial Monitor
    Serial.println("\n****************************************");
    Serial.println("*      5-SECOND AVERAGE - SENT VIA LORA *");
    Serial.println("****************************************");
    Serial.print("* Packet #");
    Serial.print(sendCount);
    Serial.print(" [");
    Serial.print(data.length());
    Serial.println(" bytes]");
    Serial.printf("* Temp: %.1f°C | Humidity: %.1f%%\n", avgTemp, avgHum);
    Serial.printf("* Pressure: %.0f hPa | CO2: %.0f ppm (%s)\n", avgPres, avgCO2, getCO2Quality(avgCO2).c_str());
    Serial.printf("* Dust: %.1f ug/m3 | AQI: %d (%s)\n", avgDust, avgAQI, getAQIQuality(avgAQI).c_str());
    Serial.printf("* JSON: %s\n", data.c_str());
    Serial.println("****************************************\n");
    
    // Check for received LoRa messages
    if (Serial2.available() > 0) {
      String input = Serial2.readString();
      Serial.print("<<< RECEIVED FROM LORA: ");
      Serial.println(input);
    }
    
    vTaskDelay(pdMS_TO_TICKS(5000)); // Send every 5 seconds
  }
}

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, LORA_RX, LORA_TX);  // Chỉ định rõ pin RX/TX

  
  delay(1000);
  
  Serial.println("\n\n");
  Serial.println("****************************************");
  Serial.println("*   LoRa Environmental Monitoring     *");
  Serial.println("*   With FreeRTOS Multitasking        *");
  Serial.println("****************************************\n");
  
  pinMode(M0, OUTPUT);        
  pinMode(M1, OUTPUT);
  digitalWrite(M0, LOW);
  digitalWrite(M1, LOW);
  
  // Initialize sensor pins
  pinMode(MQ135_PIN, INPUT);
  pinMode(MEASURE_PIN, INPUT);
  pinMode(LED_POWER_PIN, OUTPUT);
  digitalWrite(LED_POWER_PIN, HIGH);
  
  delay(100);
  
  // Initialize I2C and sensors
  Wire.begin(21, 22);  // SDA=21, SCL=22
  
  // Initialize OLED first
  delay(100);
  oledInitialized = initializeOLED();
  
  // Initialize DHT11
  dht.begin();
  dhtInitialized = true;
  Serial.println("✓ DHT11 initialized");
  
  // Initialize AHT20
  delay(100);
  if (aht.begin()) {
    ahtInitialized = true;
    Serial.println("✓ AHT20 initialized");
  } else {
    Serial.println("✗ AHT20 not found");
  }
  
  // Initialize BMP280
  delay(100);
  if (bmp.begin(0x77)) {
    bmpInitialized = true;
    Serial.println("✓ BMP280 initialized");
  } else {
    Serial.println("✗ BMP280 not found");
  }
  
  // Clear Serial2 buffer
  while (Serial2.available()) {
    Serial2.read();
  }
  
  // Show startup message on OLED
  if (oledInitialized) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("System Starting...");
    display.println("FreeRTOS Mode");
    display.println("Sensors Warming Up");
    display.println("Please wait...");
    display.display();
  }
  
  Serial.println("\nInitializing FreeRTOS tasks...\n");
  
  // Create mutex for data protection
  dataMutex = xSemaphoreCreateMutex();
  
  if (dataMutex == NULL) {
    Serial.println("Failed to create mutex!");
    while(1);
  }
  
  // Create FreeRTOS tasks
  xTaskCreatePinnedToCore(
    TaskReadSensor,           // Task function
    "ReadSensor",             // Task name
    4096,                     // Stack size
    NULL,                     // Parameters
    3,                        // Priority (High)
    &TaskReadSensorHandle,    // Task handle
    1                         // Core 1
  );
  
  xTaskCreatePinnedToCore(
    TaskDisplay,              // Task function
    "Display",                // Task name
    4096,                     // Stack size
    NULL,                     // Parameters
    2,                        // Priority (Medium)
    &TaskDisplayHandle,       // Task handle
    0                         // Core 0
  );
  
  xTaskCreatePinnedToCore(
    TaskPrint,                // Task function
    "Print",                  // Task name
    4096,                     // Stack size
    NULL,                     // Parameters
    1,                        // Priority (Low)
    &TaskPrintHandle,         // Task handle
    0                         // Core 0
  );
  
  xTaskCreatePinnedToCore(
    TaskLoRa,                 // Task function
    "LoRa",                   // Task name
    4096,                     // Stack size
    NULL,                     // Parameters
    2,                        // Priority (Medium)
    &TaskLoRaHandle,          // Task handle
    1                         // Core 1
  );
  
  Serial.println("✓ All FreeRTOS tasks created successfully!");
  Serial.println("✓ Task priorities: ReadSensor(3), Display(2), LoRa(2), Print(1)");
  Serial.println("✓ Core assignment: ReadSensor & LoRa on Core 1, Display & Print on Core 0");
  Serial.println("\nStarting monitoring...\n");
}

void loop() {
  // Empty loop - all work done by FreeRTOS tasks
  vTaskDelay(pdMS_TO_TICKS(1000));
}
