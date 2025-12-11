# 📊 Hướng dẫn Huấn luyện Model Dự báo Thời tiết

## 🎯 Các thông số cần thiết để train

### **1. Model Type (Loại Model)**
- **Prophet** (Khuyến nghị): Từ Facebook, tốt cho time series, không cần GPU
- **LSTM**: Deep Learning, độ chính xác cao hơn nhưng chậm hơn
- **ARIMA**: Thống kê cổ điển, cần dữ liệu tĩnh (stationary)
- **Random Forest**: Machine Learning, nhanh và chính xác

### **2. Data Points (Số lượng dữ liệu)**
- **Tối thiểu**: 100 bản ghi
- **Khuyến nghị**: 500-2000 bản ghi
- **Tối đa**: 10000 bản ghi
- **Ý nghĩa**: Nhiều dữ liệu → Độ chính xác cao hơn nhưng lâu hơn

### **3. Target Variable (Biến mục tiêu dự báo)**
Có thể huấn luyện một hoặc nhiều biến:
- **Nhiệt độ** (Temperature): °C
- **Độ ẩm** (Humidity): %
- **Áp suất** (Pressure): hPa
- **Chất lượng không khí** (AQI)
- **Tất cả**: Huấn luyện 3-4 model cùng lúc

### **4. Train/Test Ratio (Tỷ lệ chia dữ liệu)**
- **80/20**: 80% train, 20% test (Khuyến nghị)
- **85/15**: Phù hợp với dữ liệu nhỏ
- **75/25**: Kiểm tra kỹ hơn, nhưng dữ liệu train ít hơn

### **5. Thông số mô hình khác (tùy chọn)**
- **Seasonality**: Chu kỳ lặp lại (ngàn, tuần, tháng)
- **Intervals**: Khoảng thời gian dự báo
- **Hyperparameters**: Tham số tinh chỉnh

---

## 💾 Dữ liệu cần có

### **Yêu cầu cơ bản**
1. **Database MySQL** có bảng `sensor_data` hoặc `weather_forecasting`
2. **Cột bắt buộc**:
   - `timestamp`: Thời gian ghi nhận (DateTime)
   - `temperature`: Nhiệt độ (float)
   - `humidity`: Độ ẩm (float)
   - `pressure`: Áp suất (float)
   - `aqi`: Chất lượng không khí (float)

### **Chất lượng dữ liệu**
- Không có giá trị NULL quá nhiều
- Dữ liệu không có spike bất thường
- Chuỗi thời gian liên tục (không khoảng trống lớn)
- Khoảng thời gian ổn định (15 phút, 1 giờ, 1 ngày)

---

## 🚀 Các bước huấn luyện

### **1. Chuẩn bị dữ liệu**
```bash
# Kiểm tra số lượng dữ liệu trong database
SELECT COUNT(*) FROM sensor_data;

# Xem thời gian dữ liệu có sẵn
SELECT MIN(timestamp), MAX(timestamp) FROM sensor_data;
```

### **2. Chọn thông số**
- Model: Prophet (đơn giản, nhanh, chính xác)
- Data Points: 500-1000 (cân bằng giữa chất lượng và tốc độ)
- Target: Tất cả (để dự báo đầy đủ)
- Test Ratio: 80/20 (mặc định)

### **3. Bắt đầu huấn luyện**
- Click nút "🚀 Bắt đầu huấn luyện"
- Theo dõi tiến trình 5 bước
- Chờ kết quả (2-10 phút tùy model)

### **4. Kiểm tra kết quả**
- **RMSE** (Root Mean Square Error): Sai số bình phương
  - Nhỏ hơn = tốt hơn
  - Nên < 5 cho nhiệt độ
  
- **MAE** (Mean Absolute Error): Sai số tuyệt đối trung bình
  - Dễ hiểu hơn RMSE
  - Nên < 2 cho nhiệt độ
  
- **R² Score**: Độ phù hợp mô hình
  - Từ 0 đến 1 (gần 1 là tốt)
  - Nên > 0.8

---

## ⚙️ Mẹo và khuyến nghị

### **Chọn Model**
| Model | Ưu điểm | Nhược điểm | Thời gian |
|-------|---------|-----------|----------|
| Prophet | Dễ dùng, nhanh, ổn định | Ít flexible | 10-30s |
| LSTM | Độ chính xác cao | Phức tạp, chậm, cần GPU | 1-5 phút |
| ARIMA | Nhẹ, lý thuyết vững | Cần dữ liệu stationary | 10-20s |
| Random Forest | Nhanh, chính xác | Khó giải thích | 20-60s |

**💡 Khuyến nghị**: Bắt đầu với **Prophet**, nếu không tốt thì thử **Random Forest**

### **Tối ưu hóa**
1. **Tăng dữ liệu**: Thêm nhiều điểm dữ liệu (tối đa 2000)
2. **Xử lý dữ liệu**: Loại bỏ outliers, làm sạch dữ liệu
3. **Feature Engineering**: Thêm biến mới (gió, mưa, UV)
4. **Tuning hyperparameters**: Thay đổi seasonality, intervals
5. **Ensemble**: Kết hợp nhiều model

### **Xử lý lỗi**
| Lỗi | Nguyên nhân | Giải pháp |
|-----|-----------|----------|
| "Không đủ dữ liệu" | < 100 bản ghi | Chạy sensor lâu hơn |
| "Dữ liệu không hợp lệ" | Có NULL, outliers | Làm sạch dữ liệu |
| "Model không hội tụ" | Dữ liệu kém chất lượng | Xem lại dữ liệu |
| "RMSE cao" | Model không match dữ liệu | Thử model khác |

---

## 📊 Hiểu kết quả

### **Khi RMSE = 1.5 (nhiệt độ)**
- Model dự báo sai trung bình **1.5°C**
- Còn chấp nhận được cho dự báo ngắn hạn

### **Khi R² = 0.92**
- Model giải thích **92%** biến thiên dữ liệu
- Rất tốt, model sẵn sàng dùng

### **Khi MAE = 0.8**
- Sai số trung bình tuyệt đối **0.8°C**
- Người dùng sẽ hài lòng

---

## 🔗 API Endpoint

**POST** `/api/ml/train`

Query parameters:
- `model_type`: `prophet|lstm|arima` (default: prophet)
- `data_points`: 100-10000 (default: 1000)

Response:
```json
{
  "success": true,
  "models_trained": ["temperature", "humidity", "aqi"],
  "all_metrics": {
    "temperature": { "rmse": 1.23, "mae": 0.89, "r2": 0.92 },
    "humidity": { "rmse": 3.45, "mae": 2.10, "r2": 0.87 }
  },
  "overall_accuracy": 0.895,
  "data_points_used": 950,
  "training_time": "12.34s"
}
```

---

## 📱 Tham khảo thêm
- [Prophet Documentation](https://facebook.github.io/prophet/)
- [LSTM Time Series](https://keras.io/examples/timeseries/)
- [ARIMA Guide](https://en.wikipedia.org/wiki/Autoregressive_integrated_moving_average)
- Xem trang `/forecast` để kiểm tra dự báo sau khi train
