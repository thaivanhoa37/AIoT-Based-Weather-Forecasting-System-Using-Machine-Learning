#define M0 19       
#define M1 18

// Chân UART2 cho LoRa E32 (ESP32 DevKit v1 thường là như này)
#define LORA_RX 16    // ESP32 nhận -> nối với TX của E32
#define LORA_TX 17    // ESP32 truyền -> nối với RX của E32

void setup() {
  Serial.begin(9600);                         // Serial ra máy tính
  Serial2.begin(9600, SERIAL_8N1, LORA_RX, LORA_TX);  // UART2 cho LoRa

  pinMode(M0, OUTPUT);        
  pinMode(M1, OUTPUT);

  // M0 = 0, M1 = 0 -> Chế độ Normal (truyền trong suốt)
  digitalWrite(M0, LOW);       
  digitalWrite(M1, LOW);       

  Serial.println("LoRa E32 chat ready!");
}

void loop() {
  // --- PC gửi -> LoRa ---
  if (Serial.available() > 0) {              
    String input = Serial.readStringUntil('\n');  // đọc 1 dòng tới khi nhấn Enter
    if (input.length() > 0) {
      Serial2.print(input);                   // gửi qua LoRa
      Serial2.print('\n');                    // thêm xuống dòng cho bên kia dễ tách
      Serial.print("[TX] ");
      Serial.println(input);
    }
  }

  // --- LoRa nhận -> in ra PC ---
  if (Serial2.available() > 0) {
    String recv = Serial2.readStringUntil('\n');  // đọc tới khi gặp '\n'
    if (recv.length() > 0) {
      Serial.print("[RX] ");
      Serial.println(recv);
    }
  }

  // không cần delay to, để UART chạy mượt
  delay(5);
}
