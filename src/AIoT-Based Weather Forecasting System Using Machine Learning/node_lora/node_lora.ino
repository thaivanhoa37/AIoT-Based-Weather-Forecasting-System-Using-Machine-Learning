/*
 * LoRa E32-433T20D Node - Environmental Monitoring System
 * ESP32 30 Pin with Real Sensors + OLED Display + Detailed Serial Output
 * 
 * Gửi dữ liệu cảm biến thực mỗi 5 giây qua LoRa
 * Hiển thị dữ liệu trên OLED 128x64
 * In chi tiết dữ liệu cảm biến ra Serial Monitor
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

// Timing variables
unsigned long lastSendTime = 0;
unsigned long lastDisplayTime = 0;
unsigned long lastDetailedPrintTime = 0;
const unsigned long sendInterval = 30000;    // Gửi mỗi 30 giây
const unsigned long displayInterval = 2000;  // Cập nhật OLED mỗi 2 giây
const unsigned long detailedPrintInterval = 2000; // In chi tiết mỗi 2 giây

// Sensor data variables (realtime)
float temperature = 0;
float humidity = 0;
float pressure = 0;
float co2ppm = 0;
float dustDensity = 0;
int aqi = 0;

// Display data (averaged)
float dispTemp = 0;
float dispHum = 0;
float dispPres = 0;
float dispCO2 = 0;
float dispDust = 0;
int dispAQI = 0;

// Averaging variables
float tempSum = 0, humiSum = 0, pressSum = 0, co2Sum = 0, dustSum = 0;
int aqiSum = 0;
int readCount = 0;

int sendCount = 0;

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

// Display data on OLED
void updateOLED() {
  if (!oledInitialized) return;
  
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  
  // Line 1: Temperature & Humidity
  display.setCursor(0, 0);
  display.printf("T:%.1f C  H:%.1f%%", dispTemp, dispHum);
  
  // Line 2: Pressure
  display.setCursor(0, 10);
  display.printf("P:%.0f hPa", dispPres);
  
  // Line 3: CO2
  display.setCursor(0, 20);
  display.printf("CO2:%.0f ppm(%s)", dispCO2, getCO2Quality(dispCO2).c_str());
  
  // Line 4: Dust
  display.setCursor(0, 30);
  display.printf("Dust:%.1f ug/m3", dispDust);
  
  // Line 5: AQI
  display.setCursor(0, 40);
  display.printf("AQI:%d(%s)", dispAQI, getAQIQuality(dispAQI).c_str());
  
  // Line 6: Status & packets
  display.setCursor(0, 50);
  display.printf("Packets:%d", sendCount);
  
  display.display();
}

// Initialize CO2 sensor reading from MQ135
float readCO2() {
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
  if(temperature > 20) {
    float t_factor = 1.0 + 0.018 * (temperature - 20.0);
    ppm = ppm * t_factor;
  }
  
  // Humidity compensation
  if(humidity > 65) {
    float h_factor = 1.0 + 0.015 * (humidity - 65.0);
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

// Read all sensors
void readAllSensors() {
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
  
  if (dht_valid && ath_valid) {
    // Cả 2 cảm biến đều hoạt động - tính trung bình
    temperature = (dht_temp + ath_temp) / 2.0;
    humidity = (dht_humi + ath_humi) / 2.0;
  }
  else if (dht_valid) {
    // Chỉ DHT11 hoạt động
    temperature = dht_temp;
    humidity = dht_humi;
  } 
  else if (ath_valid) {
    // Chỉ AHT20 hoạt động
    temperature = ath_temp;
    humidity = ath_humi;
  }
  else {
    // Không có cảm biến nào hoạt động
    temperature = 0;
    humidity = 0;
    return; // Skip if no valid temp/humi
  }
  
  // Read BMP280
  if (bmpInitialized) {
    pressure = bmp.readPressure() / 100.0;
    if (isnan(pressure) || pressure < 300 || pressure > 1300) {
      pressure = 0;
    }
  }
  
  // Read MQ135
  co2ppm = readCO2();
  
  // Read dust sensor
  dustDensity = readDustSensor();
  
  // Calculate AQI
  aqi = calculateAQI(dustDensity);
  
  // Accumulate for averaging
  if (temperature > 0 && humidity > 0) {
    tempSum += temperature;
    humiSum += humidity;
    if (pressure > 0) pressSum += pressure;
    if (co2ppm > 0) co2Sum += co2ppm;
    if (dustDensity > 0) {
      dustSum += dustDensity;
      aqiSum += aqi;
    }
    readCount++;
  }
}

void setup() {
  Serial2.begin(9600);   // LoRa E32 gắn với cổng TX2 RX2 trên board ESP32
  Serial.begin(115200);
  
  delay(1000);
  
  Serial.println("\n\n");
  Serial.println("****************************************");
  Serial.println("*   LoRa Environmental Monitoring     *");
  Serial.println("*   With Detailed Sensor Testing      *");
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
  
  Serial.println("\nWaiting 20 seconds for sensor warmup...\n");
  
  // Show startup message on OLED
  if (oledInitialized) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("System Starting...");
    display.println("Sensors Warming Up");
    display.println("Please wait...");
    display.display();
  }
  
  delay(20000);
  Serial.println("Starting data transmission...\n");
}

void loop() {
  // Continuously read sensors
  readAllSensors();
  
  // Print detailed sensor readings every 2 seconds
  if (millis() - lastDetailedPrintTime >= detailedPrintInterval) {
    lastDetailedPrintTime = millis();
    
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
  }
  
  // Update OLED display every 2 seconds
  if (millis() - lastDisplayTime >= displayInterval) {
    lastDisplayTime = millis();
    
    // Use current readings for display
    dispTemp = temperature;
    dispHum = humidity;
    dispPres = pressure;
    dispCO2 = co2ppm;
    dispDust = dustDensity;
    dispAQI = aqi;
    
    updateOLED();
  }
  
  // Send averaged data every 30 seconds via LoRa
  if (millis() - lastSendTime >= sendInterval) {
    lastSendTime = millis();
    sendCount++;
    
    // Calculate averages
    float avgTemp = (readCount > 0) ? (tempSum / readCount) : temperature;
    float avgHum = (readCount > 0) ? (humiSum / readCount) : humidity;
    float avgPres = (readCount > 0) ? (pressSum / readCount) : pressure;
    float avgCO2 = (readCount > 0) ? (co2Sum / readCount) : co2ppm;
    float avgDust = (readCount > 0) ? (dustSum / readCount) : dustDensity;
    int avgAQI = (readCount > 0) ? (aqiSum / readCount) : aqi;
    
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
    Serial.println("*     30-SECOND AVERAGE - SENT VIA LORA *");
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
    
    // Reset accumulators
    tempSum = humiSum = pressSum = co2Sum = dustSum = 0;
    aqiSum = 0;
    readCount = 0;
  }
  
  // Receive and display LoRa messages
  if (Serial2.available() > 0) {
    String input = Serial2.readString();
    Serial.print("<<< RECEIVED FROM LORA: ");
    Serial.println(input);
  }
  
  delay(50);
}
