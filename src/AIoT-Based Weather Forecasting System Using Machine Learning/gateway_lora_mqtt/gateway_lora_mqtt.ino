/*
 * LoRa E32-433T20D Gateway with MQTT & Web Config
 * ESP32 30 Pin
 * 
 * Features:
 * - Nhận dữ liệu từ LoRa Node
 * - Publish lên MQTT broker
 * - AP Mode khi không kết nối được WiFi/MQTT
 * - Web Config để cấu hình WiFi và MQTT
 * - WiFi Scanning
 * 
 * Kết nối:
 * E32-433T20D    ESP32 (30 pin)
 * VCC       ->   3.3V
 * GND       ->   GND
 * TX        ->   RX2 (GPIO16)
 * RX        ->   TX2 (GPIO17)
 * M1        ->   GPIO18
 * M0        ->   GPIO19
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <WebServer.h>
#include <Preferences.h>
#include <ArduinoJson.h>

// LoRa Pin Definitions
#define M0 19      
#define M1 18
#define LORA_RX 16
#define LORA_TX 17

// LED Pin Definition
#define LED_PIN 2

// MQTT Topic Definitions
const char* TOPIC_STATE_TEMPERATURE = "esp32/sensor/temperature";
const char* TOPIC_STATE_HUMIDITY = "esp32/sensor/humidity";
const char* TOPIC_STATE_PRESSURE = "esp32/sensor/pressure";
const char* TOPIC_STATE_CO2 = "esp32/sensor/co2";
const char* TOPIC_STATE_DUST = "esp32/sensor/dust";
const char* TOPIC_STATE_AQI = "esp32/sensor/aqi";

// Default Configuration (có thể thay đổi qua web config)
char ssid[32] = "vanhoa";
char password[32] = "11111111";
char mqtt_server[40] = "192.168.137.127";
int mqtt_port = 1883;
const char* mqtt_client_id = "ESP32_IOT_Monitor";

// AP Mode Configuration
const char* ap_ssid = "ESP32_Gateway_Config";
const char* ap_password = "12345678";

// Global Objects
WiFiClient espClient;
PubSubClient mqttClient(espClient);
WebServer server(80);
Preferences preferences;

// Status Variables
bool apMode = false;
bool mqttConnected = false;
int packetCount = 0;
int errorCount = 0;
unsigned long lastReconnectAttempt = 0;
unsigned long lastMqttAttempt = 0;

// Function Prototypes
void setupLoRa();
void setupWiFi();
void setupMQTT();
void setupWebServer();
void loadConfig();
void saveConfig();
void handleRoot();
void handleScan();
void handleSave();
void handleStatus();
void reconnectWiFi();
void reconnectMQTT();
void processLoRaData();
float parseValue(String json, String key);
void publishSensorData(float temp, float humidity, float pressure, float co2, float dust, int aqi);
void blinkLED(int times, int delayMs);
void ledConnectionError();

void setup() {
  Serial.begin(115200);
  Serial.println("\n╔════════════════════════════════════╗");
  Serial.println("║   LoRa Gateway with MQTT          ║");
  Serial.println("║   Web Config Enabled              ║");
  Serial.println("╚════════════════════════════════════╝");
  
  // Setup LED
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  Serial.println("✓ LED initialized on GPIO2");
  
    // Load saved configuration
  loadConfig();
  
  // Setup LoRa
  setupLoRa();
  
  // Setup WiFi
  setupWiFi();
  
  // Setup MQTT if WiFi connected
  if (WiFi.status() == WL_CONNECTED) {
    setupMQTT();
  }
  
  // Setup Web Server
  setupWebServer();
  
  Serial.println("\nSystem Ready!");
  Serial.println("Waiting for sensor data...\n");
}

void loop() {
  // Handle Web Server
  server.handleClient();
  
  // Reconnect WiFi if disconnected (only in Station mode)
  if (!apMode && WiFi.status() != WL_CONNECTED) {
    ledConnectionError(); // Blink LED continuously for WiFi error
    if (millis() - lastReconnectAttempt > 30000) {
      Serial.println("WiFi disconnected. Attempting reconnect...");
      reconnectWiFi();
      lastReconnectAttempt = millis();
    }
  }
  
  // Reconnect MQTT if disconnected
  if (!apMode && WiFi.status() == WL_CONNECTED && !mqttClient.connected()) {
    ledConnectionError(); // Blink LED continuously for MQTT error
    if (millis() - lastMqttAttempt > 5000) {
      reconnectMQTT();
      lastMqttAttempt = millis();
    }
  }
  
  // MQTT Loop
  if (mqttClient.connected()) {
    mqttClient.loop();
    mqttConnected = true;
  } else {
    mqttConnected = false;
  }
  
  // Process LoRa Data
  processLoRaData();
  
  delay(10);
}

void setupLoRa() {
  Serial2.begin(9600, SERIAL_8N1, LORA_RX, LORA_TX);
  
  pinMode(M0, OUTPUT);        
  pinMode(M1, OUTPUT);
  digitalWrite(M0, LOW);
  digitalWrite(M1, LOW);
  
  delay(100);
  
  // Clear buffer
  while (Serial2.available()) {
    Serial2.read();
  }
  
  Serial.println("✓ LoRa E32 initialized");
}

void setupWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    apMode = false;
  } else {
    Serial.println("\n✗ WiFi connection failed!");
    Serial.println("\n╔════════════════════════════════════╗");
    Serial.println("║      AP MODE ACTIVATED            ║");
    Serial.println("╠════════════════════════════════════╣");
    
    // Start AP Mode
    WiFi.mode(WIFI_AP);
    WiFi.softAP(ap_ssid, ap_password);
    
    Serial.print("║ SSID:     ");
    Serial.println(ap_ssid);
    Serial.print("║ Password: ");
    Serial.println(ap_password);
    Serial.print("║ IP:       ");
    Serial.println(WiFi.softAPIP());
    Serial.println("║");
    Serial.println("║ 🌐 Web Config: http://192.168.4.1");
    Serial.println("╚════════════════════════════════════╝");
    apMode = true;
  }
}

void setupMQTT() {
  mqttClient.setServer(mqtt_server, mqtt_port);
  
  Serial.print("Connecting to MQTT broker: ");
  Serial.print(mqtt_server);
  Serial.print(":");
  Serial.println(mqtt_port);
  
  if (mqttClient.connect(mqtt_client_id)) {
    Serial.println("✓ MQTT connected!");
    mqttConnected = true;
  } else {
    Serial.println("✗ MQTT connection failed!");
    Serial.print("MQTT State: ");
    Serial.println(mqttClient.state());
    mqttConnected = false;
  }
}

void setupWebServer() {
  server.on("/", handleRoot);
  server.on("/scan", handleScan);
  server.on("/save", HTTP_POST, handleSave);
  server.on("/status", handleStatus);
  
  server.begin();
  Serial.println("✓ Web server started");
}

void loadConfig() {
  preferences.begin("gateway", false);
  
  String saved_ssid = preferences.getString("ssid", "");
  String saved_pass = preferences.getString("password", "");
  String saved_mqtt = preferences.getString("mqtt_server", "");
  int saved_port = preferences.getInt("mqtt_port", 1883);
  
  if (saved_ssid.length() > 0) {
    saved_ssid.toCharArray(ssid, 32);
  }
  if (saved_pass.length() > 0) {
    saved_pass.toCharArray(password, 32);
  }
  if (saved_mqtt.length() > 0) {
    saved_mqtt.toCharArray(mqtt_server, 40);
  }
  mqtt_port = saved_port;
  
  preferences.end();
  
  Serial.println("✓ Configuration loaded");
}

void saveConfig() {
  preferences.begin("gateway", false);
  
  preferences.putString("ssid", ssid);
  preferences.putString("password", password);
  preferences.putString("mqtt_server", mqtt_server);
  preferences.putInt("mqtt_port", mqtt_port);
  
  preferences.end();
  
  Serial.println("✓ Configuration saved");
}

void handleRoot() {
  String html = "<!DOCTYPE html><html><head>";
  html += "<meta charset='UTF-8'>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1.0'>";
  html += "<title>ESP32 Gateway Config</title>";
  html += "<style>";
  html += "body { font-family: Arial, sans-serif; margin: 20px; background: #f0f0f0; }";
  html += ".container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }";
  html += "h1 { color: #333; text-align: center; }";
  html += ".status { padding: 10px; margin: 10px 0; border-radius: 5px; }";
  html += ".status.connected { background: #d4edda; color: #155724; }";
  html += ".status.disconnected { background: #f8d7da; color: #721c24; }";
  html += "label { display: block; margin-top: 10px; font-weight: bold; }";
  html += "input, select { width: 100%; padding: 8px; margin-top: 5px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }";
  html += "button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px; width: 100%; }";
  html += "button:hover { background: #0056b3; }";
  html += ".scan-btn { background: #28a745; }";
  html += ".scan-btn:hover { background: #218838; }";
  html += "</style>";
  html += "</head><body>";
  html += "<div class='container'>";
  html += "<h1>🌐 ESP32 Gateway Config</h1>";
  
  // Status
  html += "<div class='status " + String(WiFi.status() == WL_CONNECTED ? "connected" : "disconnected") + "'>";
  html += "WiFi: " + String(WiFi.status() == WL_CONNECTED ? "✓ Connected" : "✗ Disconnected");
  if (WiFi.status() == WL_CONNECTED) {
    html += " (" + WiFi.localIP().toString() + ")";
  }
  html += "</div>";
  
  html += "<div class='status " + String(mqttConnected ? "connected" : "disconnected") + "'>";
  html += "MQTT: " + String(mqttConnected ? "✓ Connected" : "✗ Disconnected");
  html += "</div>";
  
  html += "<div class='status connected'>";
  html += "Packets: " + String(packetCount) + " | Errors: " + String(errorCount);
  html += "</div>";
  
  // Configuration Form
  html += "<form action='/save' method='POST'>";
  
  html += "<label>WiFi SSID:</label>";
  html += "<select id='ssid' name='ssid'>";
  html += "<option value='" + String(ssid) + "'>" + String(ssid) + " (current)</option>";
  html += "</select>";
  html += "<button type='button' class='scan-btn' onclick='scanWiFi()'>📡 Scan WiFi Networks</button>";
  
  html += "<label>WiFi Password:</label>";
  html += "<input type='password' name='password' value='" + String(password) + "'>";
  
  html += "<label>MQTT Server:</label>";
  html += "<input type='text' name='mqtt_server' value='" + String(mqtt_server) + "'>";
  
  html += "<label>MQTT Port:</label>";
  html += "<input type='number' name='mqtt_port' value='" + String(mqtt_port) + "'>";
  
  html += "<button type='submit'>💾 Save & Restart</button>";
  html += "</form>";
  
  html += "</div>";
  
  // JavaScript for WiFi Scanning
  html += "<script>";
  html += "function scanWiFi() {";
  html += "  document.querySelector('.scan-btn').innerHTML = '⏳ Scanning...';";
  html += "  fetch('/scan').then(r => r.json()).then(data => {";
  html += "    let select = document.getElementById('ssid');";
  html += "    select.innerHTML = '';";
  html += "    data.networks.forEach(net => {";
  html += "      let opt = document.createElement('option');";
  html += "      opt.value = net.ssid;";
  html += "      opt.text = net.ssid + ' (' + net.rssi + ' dBm)';";
  html += "      select.appendChild(opt);";
  html += "    });";
  html += "    document.querySelector('.scan-btn').innerHTML = '📡 Scan WiFi Networks';";
  html += "  });";
  html += "}";
  html += "</script>";
  
  html += "</body></html>";
  
  server.send(200, "text/html", html);
}

void handleScan() {
  Serial.println("Scanning WiFi networks...");
  int n = WiFi.scanNetworks();
  
  String json = "{\"networks\":[";
  for (int i = 0; i < n; i++) {
    if (i > 0) json += ",";
    json += "{\"ssid\":\"" + WiFi.SSID(i) + "\",\"rssi\":" + String(WiFi.RSSI(i)) + "}";
  }
  json += "]}";
  
  server.send(200, "application/json", json);
  Serial.println("WiFi scan complete: " + String(n) + " networks found");
}

void handleSave() {
  if (server.hasArg("ssid")) {
    server.arg("ssid").toCharArray(ssid, 32);
  }
  if (server.hasArg("password")) {
    server.arg("password").toCharArray(password, 32);
  }
  if (server.hasArg("mqtt_server")) {
    server.arg("mqtt_server").toCharArray(mqtt_server, 40);
  }
  if (server.hasArg("mqtt_port")) {
    mqtt_port = server.arg("mqtt_port").toInt();
  }
  
  saveConfig();
  
  String html = "<!DOCTYPE html><html><head>";
  html += "<meta charset='UTF-8'>";
  html += "<meta http-equiv='refresh' content='5;url=/'>";
  html += "<style>body{font-family:Arial;text-align:center;padding:50px;background:#f0f0f0;}";
  html += ".message{background:white;padding:30px;border-radius:10px;display:inline-block;}</style>";
  html += "</head><body>";
  html += "<div class='message'>";
  html += "<h2>✓ Configuration Saved!</h2>";
  html += "<p>ESP32 will restart in 5 seconds...</p>";
  html += "</div></body></html>";
  
  server.send(200, "text/html", html);
  
  delay(2000);
  ESP.restart();
}

void handleStatus() {
  StaticJsonDocument<200> doc;
  doc["wifi"] = WiFi.status() == WL_CONNECTED;
  doc["mqtt"] = mqttConnected;
  doc["packets"] = packetCount;
  doc["errors"] = errorCount;
  doc["ip"] = WiFi.localIP().toString();
  
  String json;
  serializeJson(doc, json);
  server.send(200, "application/json", json);
}

void reconnectWiFi() {
  WiFi.disconnect();
  delay(100);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("✓ WiFi reconnected!");
    apMode = false;
  } else {
    Serial.println("✗ WiFi reconnection failed. Switching to AP mode...");
    WiFi.mode(WIFI_AP);
    WiFi.softAP(ap_ssid, ap_password);
    Serial.println("AP Mode: http://192.168.4.1");
    apMode = true;
  }
}

void reconnectMQTT() {
  Serial.print("Attempting MQTT connection...");
  
  if (mqttClient.connect(mqtt_client_id)) {
    Serial.println("✓ Connected!");
    mqttConnected = true;
  } else {
    Serial.print("✗ Failed, rc=");
    Serial.println(mqttClient.state());
    mqttConnected = false;
  }
}

void processLoRaData() {
  static unsigned long lastCheck = 0;
  
  // Debug message every 10 seconds
  if (millis() - lastCheck > 10000) {
    Serial.println(">>> Waiting for LoRa data...");
    lastCheck = millis();
  }
  
  if (Serial2.available() > 0) {
    Serial.println("\n!!! DATA DETECTED !!!");
    
    // Blink LED 2 times when receiving data
    blinkLED(2, 100);
    
    delay(100);
    
    String received = "";
    int bytesRead = 0;
    unsigned long startTime = millis();
    
    while (Serial2.available() && (millis() - startTime < 300)) {
      char c = Serial2.read();
      
      if ((c >= 32 && c <= 126) || c == '\n' || c == '\r') {
        if (c != '\n' && c != '\r') {
          received += c;
          bytesRead++;
        }
      }
      delay(2);
    }
    
    // Clear remaining buffer
    while (Serial2.available()) {
      Serial2.read();
      delay(1);
    }
    
    received.trim();
    
    Serial.print(">>> Received: [");
    Serial.print(received);
    Serial.println("]");
    
    // Process JSON data
    if (received.length() >= 20 && received.indexOf("{") >= 0 && received.indexOf("}") >= 0) {
      packetCount++;
      
      Serial.println("╔════════════════════════════════════╗");
      Serial.print("║ PACKET #");
      Serial.print(packetCount);
      Serial.print(" | ");
      Serial.print(millis() / 1000);
      Serial.println("s ║");
      Serial.println("╠════════════════════════════════════╣");
      
      // Parse JSON
      float temp = parseValue(received, "t");
      float humidity = parseValue(received, "h");
      float pressure = parseValue(received, "p");
      float co2 = parseValue(received, "c");
      float dust = parseValue(received, "d");
      int aqi = (int)parseValue(received, "a");
      
      if (temp > -50 && temp < 100 && humidity > 0 && humidity <= 100) {
        Serial.println("║ ✓ ENVIRONMENTAL DATA:");
        Serial.print("║ 🌡️  Temperature: "); Serial.print(temp, 1); Serial.println(" °C");
        Serial.print("║ 💧 Humidity:    "); Serial.print(humidity, 1); Serial.println(" %");
        
        if (pressure > 0) {
          Serial.print("║ 🌍 Pressure:    "); Serial.print(pressure, 0); Serial.println(" hPa");
        }
        if (co2 > 0) {
          Serial.print("║ 🌫️  CO2:         "); Serial.print(co2, 0); Serial.println(" ppm");
        }
        if (dust > 0) {
          Serial.print("║ 💨 Dust:        "); Serial.print(dust, 1); Serial.println(" µg/m³");
        }
        if (aqi > 0) {
          Serial.print("║ 📊 AQI:         "); Serial.println(aqi);
        }
        
        // Publish to MQTT
        if (mqttConnected) {
          publishSensorData(temp, humidity, pressure, co2, dust, aqi);
          Serial.println("║ 📡 Published to MQTT");
        } else {
          Serial.println("║ ⚠️  MQTT not connected");
        }
      } else {
        Serial.println("║ ⚠️  PARSE ERROR");
        errorCount++;
      }
      
      Serial.println("╚════════════════════════════════════╝\n");
    } else if (received.length() > 0) {
      errorCount++;
      Serial.println("⚠️  Invalid data format");
    }
  }
}

void publishSensorData(float temp, float humidity, float pressure, float co2, float dust, int aqi) {
  char msg[10];
  
  // Publish Temperature
  dtostrf(temp, 4, 1, msg);
  mqttClient.publish(TOPIC_STATE_TEMPERATURE, msg);
  
  // Publish Humidity
  dtostrf(humidity, 4, 1, msg);
  mqttClient.publish(TOPIC_STATE_HUMIDITY, msg);
  
  // Publish Pressure
  if (pressure > 0) {
    dtostrf(pressure, 6, 0, msg);
    mqttClient.publish(TOPIC_STATE_PRESSURE, msg);
  }
  
  // Publish CO2
  if (co2 > 0) {
    dtostrf(co2, 6, 0, msg);
    mqttClient.publish(TOPIC_STATE_CO2, msg);
  }
  
  // Publish Dust
  if (dust > 0) {
    dtostrf(dust, 5, 1, msg);
    mqttClient.publish(TOPIC_STATE_DUST, msg);
  }
  
  // Publish AQI
  if (aqi > 0) {
    sprintf(msg, "%d", aqi);
    mqttClient.publish(TOPIC_STATE_AQI, msg);
  }
}

float parseValue(String json, String key) {
  String searchKey = "\"" + key + "\":";
  int startPos = json.indexOf(searchKey);
  if (startPos == -1) return 0;
  
  startPos += searchKey.length();
  
  int endPos = json.indexOf(",", startPos);
  if (endPos == -1) {
    endPos = json.indexOf("}", startPos);
  }
  
  if (endPos == -1) return 0;
  
  String value = json.substring(startPos, endPos);
  value.trim();
  
  return value.toFloat();
}

// LED Control Functions
void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    delay(delayMs);
  }
}

void ledConnectionError() {
  static unsigned long lastBlink = 0;
  static bool ledState = false;
  
  // Blink every 200ms for connection errors
  if (millis() - lastBlink > 200) {
    ledState = !ledState;
    digitalWrite(LED_PIN, ledState ? HIGH : LOW);
    lastBlink = millis();
  }
}
