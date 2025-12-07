/*
 * LoRa E32-433T20D Receiver - Environmental Monitor
 * ESP32 30 Pin
 * 
 * Nhận và hiển thị dữ liệu môi trường
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
  Serial.begin(9600);
  
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
  Serial.println("╚════════════════════════════════════╝");
  Serial.println("Waiting for sensor data...\n");
}

void loop() {
  // Nhận dữ liệu từ LoRa và hiển thị
  if (Serial2.available() > 0) {
    // Đợi để nhận đủ dữ liệu (quan trọng!)
    delay(150);
    
    String received = "";
    int bytesRead = 0;
    unsigned long startTime = millis();
    
    // Đọc với timeout 300ms
    while (Serial2.available() && (millis() - startTime < 300)) {
      char c = Serial2.read();
      
      // Chỉ nhận ký tự hợp lệ
      if ((c >= 32 && c <= 126) || c == '\n' || c == '\r') {
        if (c != '\n' && c != '\r') {
          received += c;
          bytesRead++;
        }
      }
      delay(3);
    }
    
    // Xóa buffer còn lại (nếu có)
    while (Serial2.available()) {
      Serial2.read();
      delay(1);
    }
    
    received.trim();
    
    // Chỉ xử lý nếu có dữ liệu hợp lệ
    if (received.length() >= 10) {  // JSON tối thiểu phải > 10 ký tự
      packetCount++;
      
      Serial.println("╔════════════════════════════════════╗");
      Serial.print("║ Packet #");
      Serial.print(packetCount);
      Serial.print(" | Time: ");
      Serial.print(millis() / 1000);
      Serial.print("s | Bytes: ");
      Serial.println(bytesRead);
      Serial.println("╠════════════════════════════════════╣");
      
      // Parse JSON data
      if (received.indexOf("{") >= 0 && received.indexOf("}") >= 0) {
        // Tìm giá trị từ JSON
        float temp = parseValue(received, "temp");
        float hum = parseValue(received, "hum");
        float pres = parseValue(received, "pres");
        float co2 = parseValue(received, "co2");
        float dust = parseValue(received, "dust");
        int aqi = (int)parseValue(received, "aqi");
        
        // Kiểm tra dữ liệu hợp lệ
        if (temp > 0 && hum > 0) {
          Serial.println("║ ENVIRONMENTAL DATA:");
          Serial.print("║ 🌡️  Temperature: ");
          Serial.print(temp, 1);
          Serial.println(" °C");
          
          Serial.print("║ 💧 Humidity:    ");
          Serial.print(hum, 1);
          Serial.println(" %");
          
          Serial.print("║ 🌍 Pressure:    ");
          Serial.print(pres, 1);
          Serial.println(" hPa");
          
          Serial.print("║ 🌫️  CO2:         ");
          Serial.print(co2, 1);
          Serial.println(" ppm");
          
          Serial.print("║ 💨 Dust:        ");
          Serial.print(dust, 1);
          Serial.println(" ug/m3");
          
          Serial.print("║ 📊 AQI:         ");
          Serial.print(aqi);
          Serial.println("");
        } else {
          Serial.println("║ ⚠️  PARSE ERROR - Invalid data");
          Serial.print("║ Raw: ");
          Serial.println(received);
          errorCount++;
        }
      } else {
        // Hiển thị raw data nếu không phải JSON
        Serial.println("║ ⚠️  FORMAT ERROR - Not JSON");
        Serial.print("║ Raw: ");
        Serial.println(received);
        errorCount++;
      }
      
      Serial.print("║ Errors: ");
      Serial.println(errorCount);
      Serial.println("╚════════════════════════════════════╝\n");
    } else if (received.length() > 0) {
      // Dữ liệu quá ngắn - có thể bị loss
      errorCount++;
      Serial.println("╔════════════════════════════════════╗");
      Serial.println("║ ⚠️  DATA LOSS DETECTED");
      Serial.print("║ Received only ");
      Serial.print(received.length());
      Serial.println(" bytes");
      Serial.print("║ Data: ");
      Serial.println(received);
      Serial.println("╚════════════════════════════════════╝\n");
    }
  }
  
  delay(50);
}

// Hàm parse giá trị từ JSON đơn giản
float parseValue(String json, String key) {
  int startPos = json.indexOf("\"" + key + "\":");
  if (startPos == -1) return 0;
  
  startPos += key.length() + 3; // Bỏ qua "key":
  int endPos = json.indexOf(",", startPos);
  if (endPos == -1) {
    endPos = json.indexOf("}", startPos);
  }
  
  String value = json.substring(startPos, endPos);
  return value.toFloat();
}
