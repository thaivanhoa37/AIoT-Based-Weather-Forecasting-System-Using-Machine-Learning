# 🚀 Hướng Dẫn Sử Dụng Giao Diện Huấn Luyện Model ML

## 📌 Giới Thiệu

Giao diện huấn luyện model ML mới đã được cải tiến để cung cấp trải nghiệm người dùng tốt hơn, với các tính năng:
- **Giao diện chuyên dụng** cho quá trình huấn luyện
- **Cấu hình linh hoạt** với nhiều tùy chọn
- **Theo dõi tiến trình chi tiết** với animation
- **So sánh model trực quan**
- **Hướng dẫn chi tiết** cho từng tùy chọn

## 🌐 Truy cập Giao Diện

### Cách 1: Trang Huấn Luyện Riêng Biệt
Trong menu sidebar, nhấp vào:
```
🚀 Huấn luyện ML
```
Điều này sẽ mở trang `ml-training.html` với giao diện toàn diện.

### Cách 2: Từ Trang Cấu Hình Hệ Thống
Vào **Cấu hình hệ thống** → **Cấu hình và Huấn luyện Model**

## 🎯 Hướng Dẫn Chi Tiết

### **Bước 1: Cấu Hình Tham Số**

#### Chọn Model
```
🤖 Chọn Model:
- Prophet (Facebook)      ⭐⭐⭐⭐ (Khuyến nghị)
- LSTM (Deep Learning)    ⭐⭐⭐⭐⭐ (Độ chính xác cao)
- ARIMA                   ⭐⭐⭐ (Nhanh nhất)
```

**Khuyến nghị:** Sử dụng **Prophet** hoặc **LSTM** cho dự báo thời tiết.

#### Chọn Nguồn Dữ Liệu
```
📁 Nguồn dữ liệu:
- MySQL Local            (Mặc định, từ database local)
- Firebase Realtime      (Từ Firebase cloud)
- CSV File              (Từ file .csv)
```

#### Khoảng Thời Gian Dữ Liệu
```
📅 Số ngày quá khứ: 7-365 ngày
Khuyến nghị: 30-90 ngày
- 7 ngày:   Nhanh nhưng không chính xác
- 30 ngày:  Cân bằng (khuyến nghị nhất)
- 90 ngày:  Chính xác hơn, lâu hơn
- 365 ngày: Chính xác tối đa, rất lâu
```

#### Biến Dự Báo Chính
```
🎯 Dự báo:
- Nhiệt độ (°C)    (Mặc định)
- Độ ẩm (%)
- Áp suất (hPa)
- Tất cả biến     (Dự báo đa biến)
```

#### Tỷ Lệ Train/Test
```
🔧 Chia dữ liệu:
- 80/20 (khuyến nghị) ✓ Cân bằng giữa training và testing
- 85/15              Nhiều dữ liệu training
- 75/25              Kiểm tra kỹ hơn
```

#### Tùy Chọn Nâng Cao
```
⚡ GPU: Sử dụng GPU nếu có → tăng tốc 10-100x
⚡ Tự động: Tự động điều chỉnh tham số model
```

### **Bước 2: Bắt Đầu Huấn Luyện**

Nhấp nút: **🚀 Bắt đầu huấn luyện**

#### Các Bước Xử Lý (5 giai đoạn)
```
1. ⏳ Tải dữ liệu từ MySQL         (15%)
2. ⏳ Tiền xử lý & làm sạch dữ liệu (35%)
3. ⏳ Xây dựng mô hình               (60%)
4. ⏳ Đánh giá hiệu suất             (85%)
5. ⏳ Lưu mô hình                    (100%)
```

Mỗi bước sẽ hiển thị:
- ✓ Tiêu đề bước
- 🟢 Đèn trạng thái (Chờ → Xử lý → Hoàn thành)
- 📊 Progress bar tổng thể
- 🎯 Phần trăm hoàn thành

### **Bước 3: Xem Kết Quả**

Sau khi huấn luyện xong, bạn sẽ thấy:

```
📊 RMSE (Root Mean Square Error)
   Sai số bình phương trung bình
   📉 Càng thấp → Càng tốt
   Ví dụ: 0.35°C → Sai lệch trung bình 0.35°C

📊 MAE (Mean Absolute Error)
   Sai số tuyệt đối trung bình
   📉 Giá trị cụ thể hơn RMSE
   Ví dụ: 0.25°C → Sai lệch là 0.25°C

📊 R² Score (Coefficient of Determination)
   Mức độ phù hợp dữ liệu
   📈 Từ 0 đến 1 (gần 1 là tốt nhất)
   Ví dụ: 0.92 → 92% dữ liệu được giải thích

⏱️ Thời Gian Huấn Luyện
   Thời gian tổng cộng từ bắt đầu đến kết thúc
   Ví dụ: 45.5s
```

**Cách diễn giải kết quả:**
- R² > 0.9: ⭐⭐⭐⭐⭐ Rất tốt
- R² > 0.8: ⭐⭐⭐⭐ Tốt
- R² > 0.7: ⭐⭐⭐ Chấp nhận được
- R² < 0.7: ⭐⭐ Cần cải tiến

## 📊 So Sánh Các Model

### **Prophet (Facebook)**
```
Ưu điểm:
✓ Nhanh và mạnh
✓ Xử lý tính mùa vụ tốt
✓ Đơn giản để sử dụng
✓ Tốc độ: ⭐⭐⭐⭐⭐
✓ Độ chính xác: ⭐⭐⭐⭐

Nhược điểm:
✗ Không học được pattern phức tạp

Khả năng: Dự báo thời tiết, xu hướng
```

### **LSTM (Long Short-Term Memory)**
```
Ưu điểm:
✓ Độ chính xác cao nhất
✓ Xử lý dữ liệu chuỗi thời gian tốt
✓ Học được pattern phức tạp
✓ Độ chính xác: ⭐⭐⭐⭐⭐

Nhược điểm:
✗ Lâu hơn trong training
✗ Cần dữ liệu lớn hơn
✗ Phức tạp hơn
✗ Tốc độ: ⭐⭐⭐

Khả năng: Dự báo chính xác, mô hình phức tạp
```

### **ARIMA**
```
Ưu điểm:
✓ Rất nhanh
✓ Thống kê vững chắc
✓ Đơn giản
✓ Tốc độ: ⭐⭐⭐⭐⭐

Nhược điểm:
✗ Không xử lý tính mùa vụ tốt
✗ Độ chính xác thấp hơn
✗ Độ chính xác: ⭐⭐⭐

Khả năng: Dự báo đơn giản, xu hướng tuyến tính
```

## ⚙️ Cấu Hình Tự Động

Nếu bạn muốn model train lại tự động:

1. Vào **⚙️ Cấu hình hệ thống**
2. Tìm **Cấu hình ML**
3. Chọn lịch train:
   ```
   ⏰ Mỗi 6 giờ   → Cập nhật thường xuyên
   ⏰ Mỗi 12 giờ  → Cân bằng (mặc định)
   ⏰ Mỗi 24 giờ  → Một lần mỗi ngày
   ⏰ Không tự động → Chỉ train khi yêu cầu
   ```
4. Nhấp **💾 Lưu cấu hình ML**

## 🔍 Xem Trước Dữ Liệu

Trước khi train, bạn có thể:
1. Nhấp **👁️ Xem trước dữ liệu** để kiểm tra
2. Nhấp **✓ Kiểm tra dữ liệu** để validate
3. Xem các thống kê dữ liệu

## 💾 Lưu Model

Model sẽ tự động được lưu sau khi train xong:
- 📂 Location: `/models/` (hoặc cấu hình khác)
- 📄 Format: `.pkl` hoặc `.h5` tùy model
- 🔄 Tự động load khi dự báo

## 🚨 Ghi Chú Quan Trọng

1. **GPU:** Nếu bạn có GPU (NVIDIA CUDA), bật tùy chọn GPU để train nhanh hơn
2. **Dữ liệu:** Cần ít nhất 7 ngày dữ liệu để train (khuyến nghị 30+ ngày)
3. **Bộ nhớ:** Dữ liệu nhiều sẽ cần bộ nhớ lớn hơn
4. **Thời gian:** Train lần đầu sẽ lâu, các lần sau nhanh hơn vì cải tiến dữ liệu
5. **Model:** Chọn model phù hợp với loại dữ liệu của bạn

## ❓ Câu Hỏi Thường Gặp

### Q: Nên chọn model nào?
**A:** Cho dự báo thời tiết, LSTM hoặc Prophet đều tốt. Thử cả hai và so sánh kết quả.

### Q: Tôi nên sử dụng bao nhiêu ngày dữ liệu?
**A:** 30-90 ngày là lý tưởng. Ít hơn 7 ngày sẽ không chính xác, nhiều hơn 1 năm sẽ quá lâu.

### Q: R² Score 0.85 có tốt không?
**A:** Rất tốt! Nó có nghĩa 85% biến thiên được giải thích bởi model.

### Q: Có thể train trên GPU không?
**A:** Có, nếu bạn cài CUDA và TensorFlow/PyTorch hỗ trợ GPU. Bật tùy chọn "GPU".

### Q: Model sẽ được lưu ở đâu?
**A:** Thường là folder `/models/` hoặc cấu hình trong backend.

## 📞 Hỗ Trợ

Nếu gặp vấn đề:
1. Kiểm tra kết nối MySQL
2. Kiểm tra dữ liệu có hợp lệ không
3. Xem browser console (F12) để lỗi chi tiết
4. Thử lại hoặc liên hệ admin

---

**Phiên bản:** 2.0  
**Cập nhật lần cuối:** 2025-12-04  
**Hỗ trợ:** AIoT Weather Team
