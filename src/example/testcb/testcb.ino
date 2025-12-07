/***********************************************************************************
 * IoT Environmental Monitoring System - SENSOR TEST VERSION
 * 
 * This system tests environmental sensors with serial output:
 * - Temperature & Humidity sensor (AHT20 + DHT11)
 * - Pressure sensor (BMP280)
 * - CO2 sensor (MQ135)
 * - Dust sensor (GP2Y1010AU0F)
 * - OLED Display
 * 
 * Hardware Connections:
 * MQ135 -> ESP32
 * - VCC  -> 5V
 * - GND  -> GND  
 * - AOUT -> GPIO35 (ADC1_CH7)
 * 
 * DHT11 -> ESP32
 * - VCC  -> 3.3V
 * - GND  -> GND
 * - DATA -> GPIO4
 * 
 * Dust Sensor -> ESP32
 * - VCC  -> 5V
 * - GND  -> GND
 * - VO   -> GPIO34
 * - LED  -> GPIO25
 * 
 * Note: Using ADC1 channel to avoid conflicts with WiFi
 ***********************************************************************************/
#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_AHTX0.h>
#include <Adafruit_BMP280.h>
#include <DHT.h>

#define DHT_PIN 4  // GPIO4 = D4
#define DHT_TYPE DHT11
DHT dht(DHT_PIN, DHT_TYPE);

// Dust Sensor Configuration
#define MEASURE_PIN 34  // Chân analog đọc tín hiệu (VO)
#define LED_POWER_PIN 25  // Chân điều khiển LED của cảm biến
#define SAMPLING_TIME 280  // Thời gian lấy mẫu (micro giây)
#define DELTA_TIME 40     // Thời gian delay giữa lấy mẫu (micro giây)
#define SLEEP_TIME 9680   // Thời gian ngủ (micro giây)

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

// OLED Configuration
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define SCREEN_ADDRESS 0x3C
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// Cấu hình MQ135
#define MQ135_PIN 35     // GPIO35 (ADC1_CH7)
#define RZERO 76.63      // Điện trở của cảm biến trong không khí sạch (kΩ)
#define PARA 116.6020682 // Hệ số hiệu chỉnh theo nhiệt độ/độ ẩm
#define PPM_MIN 400      // CO2 trong không khí sạch
#define PPM_MAX 5000     // CO2 tối đa có thể đo

// Sensor initialization
Adafruit_AHTX0 aht;
Adafruit_BMP280 bmp;
bool bmpInitialized = false;
bool ahtInitialized = false;
bool oledInitialized = false;

// State variables
float temperature = 0, humidity = 0, pressure = 0, co2ppm = 0, dustDensity = 0;
float tempSum = 0, humiSum = 0, pressSum = 0, co2Sum = 0, dustSum = 0;
int count = 0;
int countTime = 0;
int aqi = 0, aqiSum = 0;

float avgTemperature = 0;
float avgHumidity = 0;
float avgPressure = 0;
float avgCO2 = 0;
float avgDust = 0;
int avgAQI = 0;
bool updateDisplay = false;

// Task handles
TaskHandle_t TaskReadHandle;
TaskHandle_t TaskPrintHandle;
TaskHandle_t TaskDisplayHandle;

// Function declarations
void TaskReadSensor(void *pvParameters);
void TaskPrintData(void *pvParameters);
void TaskDisplay(void *pvParameters);
float readCO2();

int calculateAQI(float pm25) {
  if (pm25 <= 0) return 0;
  if (pm25 > 500) return 500;

  for (int i = 0; i < 6; i++) {
    if (pm25 >= aqiTable[i].Clow && pm25 <= aqiTable[i].Chigh) {
      return ((aqiTable[i].Ihigh - aqiTable[i].Ilow) / (aqiTable[i].Chigh - aqiTable[i].Clow)) *
             (pm25 - aqiTable[i].Clow) + aqiTable[i].Ilow;
    }
  }
  return 0;  // Trả về 0 nếu không khớp
}

String getAQIQuality(int aqi) {
  if (aqi <= 50) return "TOT";     // Good
  if (aqi <= 100) return "TB";     // Moderate
  if (aqi <= 150) return "KEM";    // Unhealthy for sensitive groups
  return "NGUY";                   // Unhealthy or worse
}

/*
 * Function: Read CO2 from MQ135
 * Returns CO2 concentration in ppm
 */
float readCO2() {
    // Đọc giá trị ADC
    int adc = analogRead(MQ135_PIN);
    float voltage = adc * (3.3 / 4095.0); // ESP32 ADC = 3.3V
    
    // Tính điện trở của cảm biến (Rs)
    float rs = ((5.0 * 20.0) / voltage) - 20.0; // 20kΩ = điện trở phân áp
    
    // Tính tỉ lệ Rs/Ro
    float ratio = rs / RZERO;
    
    // Tính PPM dựa trên công thức: ppm = PARA * (Rs/Ro)^-1.41
    float ppm = PARA * pow(ratio, -1.41);
    
    // Giới hạn giá trị PPM
    ppm = constrain(ppm, PPM_MIN, PPM_MAX);
    
    // Temperature compensation
    if(temperature > 20) {
        float t_factor = 1.0 + 0.018 * (temperature - 20.0);  // 1.8% per °C
        ppm = ppm * t_factor;
    }
    
    // Humidity compensation (above 65%)
    if(humidity > 65) {
        float h_factor = 1.0 + 0.015 * (humidity - 65.0);  // 1.5% per %RH
        ppm = ppm * h_factor;
    }
    
    // Final range check
    ppm = constrain(ppm, PPM_MIN, PPM_MAX);
    return ppm;
}

String getCO2Quality(float ppm) {
  if (ppm < 800) return "TOT";     // Good air quality
  if (ppm < 1200) return "TB";  // Average
  if (ppm < 2000) return "KEM!";    // Poor
  return "NGUY";                  // Dangerous
}

void scanI2C() {
  Serial.println("Scanning I2C...");
  for (uint8_t address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    uint8_t error = Wire.endTransmission();
    if (error == 0) {
      Serial.print("Found I2C device at address: 0x");
      if (address < 16) Serial.print("0");
      Serial.println(address, HEX);
    }
  }
  Serial.println("I2C scan complete.");
}

bool initializeOLED() {
  Serial.print("Initializing OLED at address: 0x");
  Serial.println(SCREEN_ADDRESS, HEX);
  if (display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println("OLED initialized successfully!");
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("OLED Initialized");
    display.display();
    return true;
  }
  Serial.println("❌ Failed to initialize OLED! Check I2C connection.");
  return false;
}

void TaskReadSensor(void *pvParameters) {
  // Wait for MQ135 warmup
  Serial.println("Chờ 20 giây cho MQ135 khởi động...");
  vTaskDelay(pdMS_TO_TICKS(20000));
  Serial.println("MQ135 sẵn sàng!");

  while (1) {
    sensors_event_t humidity_event, temp_event;
    
    float dht_temp = dht.readTemperature();
    float dht_humi = dht.readHumidity();
    float ath_temp = 0, ath_humi = 0;
    
    if (ahtInitialized && aht.getEvent(&humidity_event, &temp_event)) {
      ath_temp = temp_event.temperature;
      ath_humi = humidity_event.relative_humidity;
    }
    
    // Tính trung bình nếu cả 2 cảm biến đều hoạt động
    if (!isnan(dht_temp) && !isnan(dht_humi) && ath_temp != 0) {
      temperature = (dht_temp + ath_temp) / 2;
      humidity = (dht_humi + ath_humi) / 2;
    } 
    // Nếu ATH20 hoạt động
    else if (ath_temp != 0) {
      temperature = ath_temp;
      humidity = ath_humi;
    }
    // Nếu DHT11 hoạt động
    else if (!isnan(dht_temp) && !isnan(dht_humi)) {
      temperature = dht_temp;
      humidity = dht_humi;
    }
    // Nếu không có cảm biến nào hoạt động
    else {
      temperature = humidity = 0;
    }

    vTaskDelay(pdMS_TO_TICKS(50));

    if (bmpInitialized) {
      pressure = bmp.readPressure() / 100.0;  // Convert Pa to hPa
      if (isnan(pressure)) {
        pressure = 0;
      }
    }

    co2ppm = readCO2();

    // Read dust sensor
    digitalWrite(LED_POWER_PIN, LOW);  // Power on the LED
    delayMicroseconds(SAMPLING_TIME);
    float voMeasured = analogRead(MEASURE_PIN);  // Read the dust value
    delayMicroseconds(DELTA_TIME);
    digitalWrite(LED_POWER_PIN, HIGH);  // Turn the LED off
    delayMicroseconds(SLEEP_TIME);

    float calcVoltage = voMeasured * (3.3 / 4095.0);  // Convert to voltage
    dustDensity = (170 * calcVoltage - 0.1);  // Convert to dust density
    if (dustDensity < 0) dustDensity = 0;
    
    aqi = calculateAQI(dustDensity);

    if (temperature != 0 && humidity != 0) {
      tempSum += temperature;
      humiSum += humidity;
      if (pressure != 0) pressSum += pressure;
      if (co2ppm > 0) co2Sum += co2ppm;
      if (dustDensity > 0) {
        dustSum += dustDensity;
        aqiSum += aqi;
      }
      count++;
    }
    countTime++;

    // Print instant sensor readings
    Serial.println("\n========================================");
    Serial.println("        INSTANT SENSOR READINGS        ");
    Serial.println("========================================");
    Serial.printf("Temperature : %.1f°C\n", temperature);
    Serial.printf("Humidity    : %.1f%%\n", humidity);
    Serial.printf("Pressure    : %.1f hPa\n", pressure);
    Serial.printf("CO2         : %.1f ppm (%s)\n", co2ppm, getCO2Quality(co2ppm).c_str());
    Serial.printf("Dust        : %.1f ug/m3\n", dustDensity);
    Serial.printf("AQI         : %d (%s)\n", aqi, getAQIQuality(aqi).c_str());
    Serial.println("========================================\n");

    vTaskDelay(pdMS_TO_TICKS(2000)); // Read every 2 seconds
  }
}

void TaskPrintData(void *pvParameters) {
  while (1) {
    if (countTime >= 15) {  // Average every 30 seconds (15 readings * 2 seconds)
      if (count > 0) {
        avgTemperature = tempSum / count;
        avgHumidity = humiSum / count;
        avgPressure = pressSum / count;
        avgCO2 = co2Sum / count;
        avgDust = dustSum / count;
        avgAQI = aqiSum / count;
        
        Serial.println("\n****************************************");
        Serial.println("*      30-SECOND AVERAGE VALUES       *");
        Serial.println("****************************************");
        Serial.printf("* Temperature : %.1f°C\n", avgTemperature);
        Serial.printf("* Humidity    : %.1f%%\n", avgHumidity);
        Serial.printf("* Pressure    : %.1f hPa\n", avgPressure);
        Serial.printf("* CO2         : %.1f ppm (%s)\n", avgCO2, getCO2Quality(avgCO2).c_str());
        Serial.printf("* Dust        : %.1f ug/m3\n", avgDust);
        Serial.printf("* AQI         : %d (%s)\n", avgAQI, getAQIQuality(avgAQI).c_str());
        Serial.println("****************************************\n");

        updateDisplay = true;

        tempSum = humiSum = pressSum = co2Sum = dustSum = 0;
        aqiSum = 0;
        count = countTime = 0;
      }
    }
    vTaskDelay(pdMS_TO_TICKS(1500));
  }
}

void TaskDisplay(void *pvParameters) {
  while (1) {
    if (updateDisplay && oledInitialized) {
      display.clearDisplay();
      display.setTextSize(1);
      display.setTextColor(SSD1306_WHITE);
      
      // Row 1: Temperature and Humidity
      display.setCursor(0, 0);
      display.printf("Tem:%.1f*C |Hum:%.1f%%", avgTemperature, avgHumidity);
      
      // Row 2: CO2 with quality
      display.setCursor(0, 16);
      display.printf("Co2:%.0f ppm(%s)", avgCO2, getCO2Quality(avgCO2).c_str());
      
      // Row 3: Dust
      display.setCursor(0, 32);
      display.printf("Dust:%.1f ug/m3", avgDust);
      
      // Row 4: AQI with quality
      display.setCursor(0, 48);
      display.printf("AQI:%d(%s)", avgAQI, getAQIQuality(avgAQI).c_str());
      
      display.display();
      updateDisplay = false;
    }
    vTaskDelay(pdMS_TO_TICKS(1000));
  }
}

void setup() {
  Serial.begin(115200);
  vTaskDelay(pdMS_TO_TICKS(1000));

  Serial.println("\n\n");
  Serial.println("****************************************");
  Serial.println("*   SENSOR TEST MODE - SERIAL OUTPUT  *");
  Serial.println("*   No WiFi, MQTT, or Web Server      *");
  Serial.println("****************************************\n");

  // Initialize sensor pins
  pinMode(MQ135_PIN, INPUT);
  pinMode(MEASURE_PIN, INPUT);
  pinMode(LED_POWER_PIN, OUTPUT);
  digitalWrite(LED_POWER_PIN, HIGH);  // Turn off LED initially

  Wire.begin();
  dht.begin();  // Khởi tạo DHT11
  Serial.println("DHT11 initialized");
  
  scanI2C();
  
  oledInitialized = initializeOLED();
  
  int attempts = 0;
  while (!aht.begin() && attempts < 3) {
    Serial.println("Could not find AHT20! Retrying...");
    attempts++;
    vTaskDelay(pdMS_TO_TICKS(1000));
  }
  ahtInitialized = aht.begin();
  if (ahtInitialized) {
    Serial.println("AHT20 initialized successfully!");
  } else {
    Serial.println("AHT20 initialization failed - will use DHT11 only");
  }
  
  attempts = 0;
  while (!bmp.begin(0x77) && attempts < 3) {
    Serial.println("Could not find BMP280! Retrying...");
    attempts++;
    vTaskDelay(pdMS_TO_TICKS(1000));
  }
  bmpInitialized = bmp.begin(0x77);
  if (bmpInitialized) {
    Serial.println("BMP280 initialized successfully!");
  } else {
    Serial.println("BMP280 initialization failed");
  }

  if (oledInitialized) {
    display.clearDisplay();
    display.setTextSize(1);
    display.println("System starting...");
    display.println("Wait for MQ135...");
    display.display();
  }

  Serial.println("\n*** Sensor initialization complete ***\n");

  // Create tasks
  xTaskCreatePinnedToCore(TaskReadSensor, "ReadSensor", 4096, NULL, 3, &TaskReadHandle, 1);
  xTaskCreatePinnedToCore(TaskPrintData, "PrintData", 4096, NULL, 1, &TaskPrintHandle, 1);
  xTaskCreatePinnedToCore(TaskDisplay, "Display", 4096, NULL, 1, &TaskDisplayHandle, 0);
  
  Serial.println("*** All tasks created - starting sensor monitoring ***\n");
}

void loop() {
  vTaskDelay(pdMS_TO_TICKS(1000));
}
