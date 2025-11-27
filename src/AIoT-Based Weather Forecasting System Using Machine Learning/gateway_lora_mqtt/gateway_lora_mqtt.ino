/*
 * LoRa E32-433T20D Receiver - Environmental Monitor (DEBUG VERSION)
 * ESP32 30 Pin
 * 
 * Nhận dữ liệu cảm biến từ LoRa Node và hiển thị
 * Tương thích với format JSON compact từ node_lora.ino
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

#define M0 19      
#define M1 18

// Chân UART2 cho LoRa E32
#define LORA_RX 16    // ESP32 nhận -> nối với TX của E32
#define LORA_TX 17    // ESP32 truyền -> nối với RX của E32

int packetCount = 0;
int errorCount = 0;

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, LORA_RX, LORA_TX);  // Chỉ định rõ pin RX/TX
  
  pinMode(M0, OUTPUT);        
  pinMode(M1, OUTPUT);
  digitalWrite(M0, LOW);  // Set 2 chân M0 và M1 xuống LOW 
  digitalWrite(M1, LOW);  // để hoạt động ở chế độ Normal
  
  delay(100);
  
  // Xóa buffer Serial2
  while (Serial2.available()) {
    Serial2.read();
  }
  
  Serial.println("\n╔════════════════════════════════════╗");
  Serial.println("║   LoRa Environmental Monitor      ║");
  Serial.println("║   Gateway DEBUG MODE              ║");
  Serial.println("╚════════════════════════════════════╝");
  Serial.println("Waiting for sensor data...");
  Serial.println("DEBUG: Will show raw bytes received\n");
}

void loop() {
  // DEBUG: Kiểm tra liên tục xem có dữ liệu không
  static unsigned long lastCheck = 0;
  if (millis() - lastCheck > 10000) {  // Mỗi 10 giây
    Serial.println(">>> Still waiting for LoRa data...");
    Serial.print(">>> Serial2 available: ");
    Serial.println(Serial2.available());
    lastCheck = millis();
  }
  
  // Nhận dữ liệu từ LoRa và hiển thị
  if (Serial2.available() > 0) {
    Serial.println("\n!!! DATA DETECTED ON Serial2 !!!");
    
    // Đợi để nhận đủ dữ liệu
    delay(100);
    
    String received = "";
    int bytesRead = 0;
    unsigned long startTime = millis();
    
    // Đọc dữ liệu với timeout 300ms
    Serial.print(">>> Reading bytes: ");
    while (Serial2.available() && (millis() - startTime < 300)) {
      char c = Serial2.read();
      
      // DEBUG: In ra mọi byte nhận được (bao gồm cả HEX)
      Serial.print(c);
      Serial.print("[0x");
      Serial.print(c, HEX);
      Serial.print("] ");
      
      // Chỉ nhận ký tự hợp lệ
      if ((c >= 32 && c <= 126) || c == '\n' || c == '\r') {
        if (c != '\n' && c != '\r') {
          received += c;
          bytesRead++;
        }
      }
      delay(2);
    }
    Serial.println();
    
    // Xóa buffer còn lại (nếu có)
    int discarded = 0;
    while (Serial2.available()) {
      Serial2.read();
      discarded++;
      delay(1);
    }
    if (discarded > 0) {
      Serial.print(">>> Discarded extra bytes: ");
      Serial.println(discarded);
    }
    
    received.trim();
    
    Serial.print(">>> Received string length: ");
    Serial.println(received.length());
    Serial.print(">>> Received string: [");
    Serial.print(received);
    Serial.println("]");
    
    // Chỉ xử lý nếu có dữ liệu hợp lệ (JSON compact)
    // Format: {"t":25.5,"h":60.0,"p":1013,"c":450,"d":12.8,"a":50}
    if (received.length() >= 20 && received.indexOf("{") >= 0 && received.indexOf("}") >= 0) {
      packetCount++;
      
      Serial.println("╔════════════════════════════════════╗");
      Serial.print("║ PACKET #");
      Serial.print(packetCount);
      Serial.print(" | ");
      Serial.print(millis() / 1000);
      Serial.print("s | ");
      Serial.print(bytesRead);
      Serial.println(" bytes║");
      Serial.println("╠════════════════════════════════════╣");
      
      // Parse JSON data (format compact: "t", "h", "p", "c", "d", "a")
      float temp = parseValue(received, "t");
      float humidity = parseValue(received, "h");
      float pressure = parseValue(received, "p");
      float co2 = parseValue(received, "c");
      float dust = parseValue(received, "d");
      int aqi = (int)parseValue(received, "a");
      
      // Kiểm tra dữ liệu hợp lệ
      if (temp > -50 && temp < 100 && humidity > 0 && humidity <= 100) {
        Serial.println("║ ✓ ENVIRONMENTAL DATA:");
        
        Serial.print("║ 🌡️  Temperature: ");
        Serial.print(temp, 1);
        Serial.println(" °C");
        
        Serial.print("║ 💧 Humidity:    ");
        Serial.print(humidity, 1);
        Serial.println(" %");
        
        if (pressure > 0) {
          Serial.print("║ 🌍 Pressure:    ");
          Serial.print(pressure, 0);
          Serial.println(" hPa");
        }
        
        if (co2 > 0) {
          Serial.print("║ 🌫️  CO2:         ");
          Serial.print(co2, 0);
          Serial.println(" ppm");
        }
        
        if (dust > 0) {
          Serial.print("║ 💨 Dust:        ");
          Serial.print(dust, 1);
          Serial.println(" µg/m³");
        }
        
        if (aqi > 0) {
          Serial.print("║ 📊 AQI:         ");
          Serial.println(aqi);
        }
        
        Serial.print("║ Status: ");
        if (temp < 15) Serial.print("🥶 Cold");
        else if (temp < 25) Serial.print("✓ Normal");
        else if (temp < 35) Serial.print("🔥 Hot");
        else Serial.print("⚠️ Very Hot");
        
        Serial.println("");
      } else {
        Serial.println("║ ⚠️  PARSE ERROR - Invalid data");
        Serial.print("║ Temp: ");
        Serial.print(temp, 1);
        Serial.print(" | Hum: ");
        Serial.print(humidity, 1);
        Serial.println("%");
        errorCount++;
      }
      
      Serial.print("║ Success: ");
      Serial.print(packetCount);
      Serial.print(" | Errors: ");
      Serial.println(errorCount);
      Serial.println("║ Raw JSON: " + received);
      Serial.println("╚════════════════════════════════════╝\n");
    } else if (received.length() > 0) {
      // Dữ liệu quá ngắn hoặc format sai
      errorCount++;
      Serial.println("╔════════════════════════════════════╗");
      Serial.println("║ ⚠️  INVALID DATA RECEIVED");
      Serial.print("║ Length: ");
      Serial.print(received.length());
      Serial.print(" bytes | Expected: >=20");
      Serial.println("");
      Serial.print("║ Raw: ");
      Serial.println(received);
      Serial.println("╚════════════════════════════════════╝\n");
    }
  }
  
  delay(100);
}

// Hàm parse giá trị từ JSON compact (key là 1 ký tự)
// Format: "t":25.5 hoặc "t":25
float parseValue(String json, String key) {
  // Tìm "t": trong JSON
  String searchKey = "\"" + key + "\":";
  int startPos = json.indexOf(searchKey);
  if (startPos == -1) return 0;
  
  // Di chuyển đến vị trí bắt đầu của giá trị
  startPos += searchKey.length();
  
  // Tìm vị trí kết thúc (phẩy hoặc dấu })
  int endPos = json.indexOf(",", startPos);
  if (endPos == -1) {
    endPos = json.indexOf("}", startPos);
  }
  
  if (endPos == -1) return 0;
  
  // Trích xuất và chuyển đổi giá trị
  String value = json.substring(startPos, endPos);
  value.trim();
  
  return value.toFloat();
}