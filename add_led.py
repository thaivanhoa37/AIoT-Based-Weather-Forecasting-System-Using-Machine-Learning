import re

# Read the file
file_path = r"g:\DATN\AIoT-Based-Weather-Forecasting-System-Using-Machine-Learning\src\AIoT-Based Weather Forecasting System Using Machine Learning\gateway_lora_mqtt\gateway_lora_mqtt.ino"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add LED pin definition after LORA_TX
content = content.replace(
    '#define LORA_TX 17\r\n',
    '#define LORA_TX 17\r\n\r\n// LED Pin Definition\r\n#define LED_PIN 2\r\n'
)

# 2. Add LED function prototypes
old_prototypes = '''void publishSensorData(float temp, float humidity, float pressure, float co2, float dust, int aqi);'''
new_prototypes = '''void publishSensorData(float temp, float humidity, float pressure, float co2, float dust, int aqi);
void blinkLED(int times, int delayMs);
void blinkDataReceived();
void updateConnectionLED();'''

content = content.replace(old_prototypes, new_prototypes)

# 3. Add LED setup in setup() function
old_setup = '''  Serial.println("\\n╔════════════════════════════════════╗");
  Serial.println("║   LoRa Gateway with MQTT          ║");
  Serial.println("║   Web Config Enabled              ║");
  Serial.println("╚════════════════════════════════════╝");
  
  // Load saved configuration'''

new_setup = '''  Serial.println("\\n╔════════════════════════════════════╗");
  Serial.println("║   LoRa Gateway with MQTT          ║");
  Serial.println("║   Web Config Enabled              ║");
  Serial.println("╚════════════════════════════════════╝");
  
  // Setup LED
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  Serial.println("✓ LED initialized on GPIO2");
  
  // Load saved configuration'''

content = content.replace(old_setup, new_setup)

# 4. Add updateConnectionLED() call in loop()
old_loop = '''  // MQTT Loop
  if (mqttClient.connected()) {
    mqttClient.loop();
    mqttConnected = true;
  } else {
    mqttConnected = false;
  }
  
  // Process LoRa Data'''

new_loop = '''  // MQTT Loop
  if (mqttClient.connected()) {
    mqttClient.loop();
    mqttConnected = true;
  } else {
    mqttConnected = false;
  }
  
  // Update LED status based on connection
  updateConnectionLED();
  
  // Process LoRa Data'''

content = content.replace(old_loop, new_loop)

# 5. Add blinkDataReceived() call when data is received
old_publish = '''        // Publish to MQTT
        if (mqttConnected) {
          publishSensorData(temp, humidity, pressure, co2, dust, aqi);
          Serial.println("║ 📡 Published to MQTT");
        } else {
          Serial.println("║ ⚠️  MQTT not connected");
        }'''

new_publish = '''        // Blink LED when data received
        blinkDataReceived();
        
        // Publish to MQTT
        if (mqttConnected) {
          publishSensorData(temp, humidity, pressure, co2, dust, aqi);
          Serial.println("║ 📡 Published to MQTT");
        } else {
          Serial.println("║ ⚠️  MQTT not connected");
        }'''

content = content.replace(old_publish, new_publish)

# 6. Add LED control functions at the end
led_functions = '''
// LED Control Functions
void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    delay(delayMs);
  }
}

void blinkDataReceived() {
  // Blink 2 times quickly when data is received
  blinkLED(2, 100);
}

void updateConnectionLED() {
  static unsigned long lastBlink = 0;
  static bool ledState = false;
  
  // Check if WiFi or MQTT is disconnected (only in Station mode)
  if (!apMode && (WiFi.status() != WL_CONNECTED || !mqttConnected)) {
    // Blink continuously when connection error
    if (millis() - lastBlink > 500) {
      ledState = !ledState;
      digitalWrite(LED_PIN, ledState ? HIGH : LOW);
      lastBlink = millis();
    }
  } else {
    // Turn off LED when everything is connected
    digitalWrite(LED_PIN, LOW);
  }
}
'''

# Find the last closing brace and add functions before it
content = content.rstrip() + led_functions

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ LED functionality added successfully!")
print("Changes made:")
print("1. Added LED_PIN definition (GPIO2)")
print("2. Added LED function prototypes")
print("3. Added LED initialization in setup()")
print("4. Added updateConnectionLED() call in loop()")
print("5. Added blinkDataReceived() when data is received")
print("6. Added LED control functions")
