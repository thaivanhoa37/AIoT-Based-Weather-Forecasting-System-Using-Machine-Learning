/*
 * LoRa E32-433T20D Transmitter - Environmental Data
 * ESP32 30 Pin
 * 
 * Gửi dữ liệu môi trường ảo mỗi 5 giây
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

#define M0 18       
#define M1 19

unsigned long lastSendTime = 0;
const unsigned long sendInterval = 5000; // Gửi mỗi 5 giây (tăng từ 3s)

// Dữ liệu môi trường ảo
float temperature = 25.0;
float humidity = 60.0;
float pressure = 1013.25;
int light = 500;
int sendCount = 0;

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
  
  Serial.println("\n=== LoRa Environmental Station ===");
  Serial.println("Sending sensor data every 5 seconds...\n");
}

void loop() {
  // Tự động gửi dữ liệu môi trường mỗi 5 giây
  if (millis() - lastSendTime >= sendInterval) {
    lastSendTime = millis();
    sendCount++;
    
    // Tạo dữ liệu môi trường ảo (thay đổi ngẫu nhiên)
    temperature = 25.0 + random(-50, 50) / 10.0;  // 20-30°C
    humidity = 60.0 + random(-200, 200) / 10.0;   // 40-80%
    pressure = 1013.25 + random(-100, 100) / 10.0; // 1003-1023 hPa
    light = 500 + random(-200, 200);               // 300-700 lux
    
    // Tạo chuỗi JSON để gửi (ngắn gọn hơn)
    String data = "{";
    data += "\"temp\":" + String(temperature, 1) + ",";
    data += "\"hum\":" + String(humidity, 1) + ",";
    data += "\"pres\":" + String(pressure, 1) + ",";  // Giảm độ chính xác từ 2 xuống 1
    data += "\"light\":" + String(light);
    data += "}";
    
    // Xóa buffer trước khi gửi
    while (Serial2.available()) {
      Serial2.read();
    }
    
    // Gửi qua LoRa
    Serial2.println(data);
    Serial2.flush();  // Đợi gửi xong
    
    // Hiển thị trên Serial Monitor
    Serial.print(">>> SENT #");
    Serial.print(sendCount);
    Serial.println(":");
    Serial.println("  Temperature: " + String(temperature, 1) + " °C");
    Serial.println("  Humidity:    " + String(humidity, 1) + " %");
    Serial.println("  Pressure:    " + String(pressure, 1) + " hPa");
    Serial.println("  Light:       " + String(light) + " lux");
    Serial.println("  Raw: " + data);
    Serial.print("  Length: ");
    Serial.print(data.length());
    Serial.println(" bytes\n");
  }
  
  // Nhận dữ liệu từ LoRa và hiển thị
  if (Serial2.available() > 0) {
    String input = Serial2.readString();
    Serial.print("<<< RECEIVED: ");
    Serial.println(input);
  }
  
  delay(50);
}



