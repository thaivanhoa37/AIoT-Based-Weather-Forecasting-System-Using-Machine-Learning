/*
 * LoRa E32-433T20D Receiver - Environmental Monitor
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

int packetCount = 0;
int errorCount = 0;

void setup() {
  Serial2.begin(9600);   // LoRa E32 gắn với cổng TX2 RX2 trên board ESP32
  Serial.begin(115200);
  
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
  Serial.println("║   Gateway MQTT Receiver           ║");
  Serial.println("╚════════════════════════════════════╝");
  Serial.println("Waiting for sensor data...\n");
}

void loop() {
  // Nhận dữ liệu từ LoRa và hiển thị
  if (Serial2.available() > 0) {
    // Đợi để nhận đủ dữ liệu
    delay(100);
    
    String received = "";
    int bytesRead = 0;
    unsigned long startTime = millis();
    
    // Đọc dữ liệu với timeout 300ms
    while (Serial2.available() && (millis() - startTime < 300)) {
      char c = Serial2.read();
      
      // Chỉ nhận ký tự hợp lệ
      if ((c >= 32 && c <= 126) || c == '\n' || c == '\r') {
        if (c != '\n' && c != '\r') {
          received += c;
          bytesRead++;
        }
      }
      delay(2);
    }
    
    // Xóa buffer còn lại (nếu có)
    while (Serial2.available()) {
      Serial2.read();
      delay(1);
    }
    
    received.trim();
    
    // Chỉ xử lý nếu có dữ liệu hợp lệ (JSON compact)
    // Format: {"t":25.5,"h":60.0,"p":1013,"c":450,"d":12.8}
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
      
      // Parse JSON data (format compact: "t", "h", "p", "c", "d")
      float temp = parseValue(received, "t");
      float humidity = parseValue(received, "h");
      float pressure = parseValue(received, "p");
      float co2 = parseValue(received, "c");
      float dust = parseValue(received, "d");
      
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
