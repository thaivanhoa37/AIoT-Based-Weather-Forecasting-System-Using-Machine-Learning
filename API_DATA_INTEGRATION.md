# API Data Integration vào Auto-Training 🌐

## Tổng Quan

Hệ thống **Auto-Training** đã được cập nhật để hỗ trợ **dữ liệu từ Weather API** (OpenWeatherMap) ngoài dữ liệu cảm biến.

---

## 🌐 Dữ Liệu Weather API Được Hỗ Trợ

### Các Biến API Có Sẵn

| Biến | Ký Hiệu | Nguồn | Giá Trị |
|------|---------|-------|--------|
| Tốc độ gió | `wind_speed` | Weather API | m/s |
| Lượng mưa | `rainfall` | Weather API | mm |
| Chỉ số UV | `uv_index` | Weather API | - |

---

## 📝 Cấu Hình Gồm 2 Nhóm Dữ Liệu

### 1️⃣ **Dữ Liệu Cảm Biến (📡 Sensor Data)**
```
- temperature  (🌡️ Nhiệt độ)
- humidity     (💧 Độ ẩm)
- pressure     (📊 Áp suất)
- aqi          (💨 AQI)
- co2          (🔬 CO2)
```

### 2️⃣ **Dữ Liệu Weather API (🌐 API Data)**
```
- wind_speed   (💨 Tốc độ gió)
- rainfall     (🌧️ Lượng mưa)
- uv_index     (☀️ Chỉ số UV)
```

---

## 💾 Cấu Hình JSON

### auto_train_config.json Structure
```json
{
  "enabled": true,
  "interval_days": 7,
  "hour": 2,
  "model_type": "lightgbm",
  "data_points": 17000,
  "targets": [
    "temperature",
    "humidity",
    "co2",
    "wind_speed",      // <- API target
    "rainfall"         // <- API target
  ],
  "training_history": [
    {
      "timestamp": "2025-12-14T07:08:36.007381",
      "model_type": "lightgbm",
      "data_points": 17000,
      "targets": ["temperature", "humidity", "co2", "wind_speed"],
      "accuracy": 0.8542,
      "training_time": 45.23,
      "status": "success"
    }
  ]
}
```

---

## 🔌 API Endpoints

### GET `/api/ml/auto-train/settings`
**Response** - Trả về cấu hình với tất cả targets (sensor + API):
```json
{
  "enabled": true,
  "targets": [
    "temperature",
    "humidity",
    "wind_speed",
    "rainfall",
    "uv_index"
  ]
}
```

### POST `/api/ml/auto-train/settings`
**Body** - Hỗ trợ cập nhật targets từ cảm biến và API:
```json
{
  "enabled": true,
  "targets": [
    "temperature",
    "humidity",
    "wind_speed",
    "rainfall"
  ]
}
```

### POST `/api/ml/auto-train/run`
**Response** - Hiển thị chi tiết sensor vs API targets:
```json
{
  "success": true,
  "message": "Auto-training hoàn tất với model lightgbm",
  "accuracy": 0.8542,
  "training_time": 45.23,
  "targets": ["temperature", "humidity", "wind_speed"],
  "sensor_targets": ["temperature", "humidity"],
  "api_targets": ["wind_speed"]
}
```

### GET `/api/ml/auto-train/history?limit=10`
**Response** - Lịch sử với chi tiết sensor & API targets:
```json
{
  "history": [
    {
      "timestamp": "2025-12-14T07:08:36",
      "model_type": "lightgbm",
      "targets": ["temperature", "humidity", "wind_speed", "rainfall"],
      "accuracy": 0.8542,
      "training_time": 45.23,
      "status": "success"
    }
  ]
}
```

---

## 🎨 Giao Diện Người Dùng (UI Updates)

### Lựa Chọn Biến - Hai Nhóm
```
🎯 Chọn biến để huấn luyện tự động

📡 Dữ Liệu Cảm Biến
├─ ☑ 🌡️ Nhiệt độ
├─ ☑ 💧 Độ ẩm
├─ ☐ 📊 Áp suất
├─ ☐ 💨 AQI
└─ ☐ 🔬 CO2

🌐 Dữ Liệu Weather API
├─ ☐ 💨 Tốc độ gió
├─ ☐ 🌧️ Lượng mưa
└─ ☐ ☀️ Chỉ số UV

📊 Đã chọn: 2 biến cảm biến + 1 biến API
```

### Hiển Thị Số Lượng
- **Sensor Count**: Số cảm biến đã chọn (2)
- **API Count**: Số biến API đã chọn (1)

### Lịch Sử Huấn Luyện
- Hiển thị sensor & API targets riêng biệt
- Sắp xếp theo category với icon/màu khác nhau
- Ví dụ:
  ```
  📡 temperature, humidity
  🌐 wind_speed, rainfall
  ```

---

## 📊 Quy Trình Huấn Luyện Với API Data

```
┌─────────────────────────────────┐
│  Scheduler/Manual Training      │
└──────────────┬──────────────────┘
               │
        ┌──────▼──────┐
        │  Lấy Targets│
        └──────┬──────┘
               │
        ┌──────▼──────────────────┐
        │  Tách Sensor vs API     │
        │  - Sensor Targets       │
        │  - Weather API Targets  │
        └──────┬──────────────────┘
               │
        ┌──────▼──────────────────┐
        │  Trích Dữ Liệu         │
        │  - SensorData table     │
        │  - WeatherForecasting   │
        └──────┬──────────────────┘
               │
        ┌──────▼──────────────────┐
        │  Train Model            │
        │  - Sensor targets       │
        │  - API targets          │
        └──────┬──────────────────┘
               │
        ┌──────▼──────────────────┐
        │  Lưu Kết Quả          │
        │  - Tất cả targets      │
        │  - Sensor + API split  │
        └──────────────────────────┘
```

---

## 💻 Code Changes

### Backend (Python)

#### `auto_train_scheduler.py`
```python
# Validate targets - support API targets
valid_targets = ["temperature", "humidity", "pressure", "aqi", "co2", "dust",
                "wind_speed", "rainfall", "uv_index"]
```

#### `routes/api.py`
```python
# Separate sensor and API targets
sensor_targets = [t for t in targets if t in ["temperature", "humidity", "pressure", "aqi", "co2", "dust"]]
weather_targets = [t for t in targets if t in ["wind_speed", "rainfall", "uv_index"]]

# Get weather records if needed
if weather_targets:
    weather_records = db.query(WeatherForecasting).filter(
        WeatherForecasting.wind_speed >= 0
    ).order_by(WeatherForecasting.timestamp).limit(data_points).all()

# Response includes both
return {
    "sensor_targets": sensor_targets,
    "api_targets": weather_targets
}
```

### Frontend (JavaScript)

#### `static/js/ml-training.js`
```javascript
// Update count display with sensor + API split
function updateAutoTrainSelectedCount() {
    const sensorCount = checkboxes.filter(cb => sensorTargets.includes(cb.value)).length;
    const apiCount = checkboxes.filter(cb => apiTargets.includes(cb.value)).length;
    countEl.innerHTML = `📊 Đã chọn: ${sensorCount} biến cảm biến + ${apiCount} biến API`;
}

// Display in progress log
addProgressLog(`📡 Biến cảm biến: ${result.sensor_targets.join(', ')}`);
addProgressLog(`🌐 Biến Weather API: ${result.api_targets.join(', ')}`);
```

#### `templates/ml-training.html`
```html
<!-- Sensor Data Section -->
<h4>📡 Dữ Liệu Cảm Biến</h4>
<div style="display: grid; ...">
    <label>...</label>
    ...
</div>

<!-- Weather API Section -->
<h4>🌐 Dữ Liệu Weather API</h4>
<div style="background: rgba(102, 126, 234, 0.05); ...">
    <label><input value="wind_speed"> 💨 Tốc độ gió</label>
    <label><input value="rainfall"> 🌧️ Lượng mưa</label>
    <label><input value="uv_index"> ☀️ Chỉ số UV</label>
</div>
```

---

## 📋 Ví Dụ Sử Dụng

### Cấu hình 1: Chỉ Dữ Liệu Cảm Biến
```
Targets: ["temperature", "humidity", "aqi"]
Kết quả: 📊 Đã chọn: 3 biến cảm biến + 0 biến API
```

### Cấu hình 2: Chỉ Dữ Liệu API
```
Targets: ["wind_speed", "rainfall", "uv_index"]
Kết quả: 📊 Đã chọn: 0 biến cảm biến + 3 biến API
```

### Cấu hình 3: Cả Hai Loại
```
Targets: ["temperature", "humidity", "co2", "wind_speed", "rainfall"]
Kết quả: 📊 Đã chọn: 3 biến cảm biến + 2 biến API
```

---

## 🔄 Dữ Liệu Trong JSON

### Training History Entry
```json
{
  "timestamp": "2025-12-14T07:08:36.007381",
  "model_type": "lightgbm",
  "data_points": 17000,
  "targets": [
    "temperature",     // <- Sensor
    "humidity",        // <- Sensor
    "wind_speed",      // <- API
    "rainfall"         // <- API
  ],
  "accuracy": 0.8542,
  "training_time": 45.23,
  "status": "success",
  "message": "Training completed successfully"
}
```

---

## ✨ Tính Năng Nổi Bật

✅ **Lựa chọn linh hoạt**: Chọn bất kỳ kết hợp nào của sensor & API targets
✅ **Hiển thị rõ ràng**: Phân tách sensor và API targets trong UI
✅ **Lưu trữ đầy đủ**: Tất cả targets được lưu trong lịch sử
✅ **Validation tự động**: Loại bỏ targets không hợp lệ
✅ **Response chi tiết**: API trả về sensor_targets & api_targets riêng

---

## 🐛 Troubleshooting

### Vấn đề: API targets không hiển thị khi chọn
**Giải pháp**: Kiểm tra browser console, đảm bảo checkbox có class `auto-train-sensor-checkbox`

### Vấn đề: Weather data không có trong training
**Giải pháp**: 
1. Kiểm tra WeatherForecasting table có dữ liệu
2. Kiểm tra API có enabled
3. Chọn ít nhất 1 API target

### Vấn đề: Độ chính xác thấp khi thêm API targets
**Giải pháp**: 
- API data có thể chưa đủ
- Cần đủ dữ liệu cả 2 loại
- Thử giảm số targets

---

**Cập nhật: 14/12/2025**
