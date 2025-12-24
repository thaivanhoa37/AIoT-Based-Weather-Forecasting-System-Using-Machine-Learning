# 🌤️ Hệ thống Dự báo Thời tiết AIoT sử dụng Machine Learning

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.9+-blue.svg" alt="Python">
  <img src="https://img.shields.io/badge/FastAPI-0.100+-green.svg" alt="FastAPI">
  <img src="https://img.shields.io/badge/Machine%20Learning-Prophet%20%7C%20LightGBM-orange.svg" alt="ML">
  <img src="https://img.shields.io/badge/IoT-LoRa%20%7C%20MQTT-red.svg" alt="IoT">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License">
</p>

> **Đồ án tốt nghiệp** - Hệ thống IoT thông minh thu thập dữ liệu môi trường thời gian thực từ các cảm biến phân tán và sử dụng Machine Learning để dự báo thời tiết ngắn hạn (24 giờ - 7 ngày).

---

## 📋 Thông tin đồ án

| Thông tin | Chi tiết |
|-----------|----------|
| **Tên đề tài** | Hệ thống Dự báo Thời tiết AIoT sử dụng Machine Learning |
| **Người thực hiện** | **Thái Văn Hòa** |
| **Giảng viên hướng dẫn** | **Ph.D. Vương Công Đạt** |
| **Mục đích** | Đồ án tốt nghiệp |

---

## 🎯 Mục tiêu đề tài

### Mục tiêu chính
1. **Xây dựng hệ thống IoT thu thập dữ liệu môi trường** thời gian thực từ các cảm biến phân tán sử dụng công nghệ LoRa và MQTT
2. **Phát triển các mô hình Machine Learning** (Prophet, LightGBM) để dự báo thời tiết ngắn hạn với độ chính xác cao
3. **Thiết kế dashboard web tương tác** hiển thị dữ liệu thời gian thực, dự báo và phân tích xu hướng

### Mục tiêu cụ thể
- Thu thập dữ liệu từ cảm biến: **Nhiệt độ, Độ ẩm, Áp suất, CO₂, Bụi mịn (PM2.5), Chỉ số AQI**
- Tích hợp dữ liệu từ API thời tiết: **Tốc độ gió, Lượng mưa, Chỉ số UV**
- Dự báo thời tiết: **24 giờ tới** (theo giờ) và **7 ngày tới** (theo ngày)
- Xác định điều kiện thời tiết: Nắng, Mưa, Nhiều mây, Sương mù, v.v.
- Hỗ trợ đa ngôn ngữ: Tiếng Việt và Tiếng Anh

---

## 📁 Cấu trúc dự án

```
AIoT-Based-Weather-Forecasting-System-Using-Machine-Learning/
│
├── 📄 README.md                    # Tài liệu hướng dẫn (Tiếng Anh)
├── 📄 README_VI.md                 # Tài liệu hướng dẫn (Tiếng Việt)
├── 📄 LICENSE                      # Giấy phép MIT
│
└── 📂 src/
    └── 📂 AIoT-Based Weather Forecasting System Using Machine Learning/
        │
        ├── 📂 gateway_lora_mqtt/           # 🔌 Firmware Gateway LoRa-MQTT
        │   └── gateway_lora_mqtt.ino       # Code Arduino cho gateway
        │
        ├── 📂 node_lora/                   # 📡 Firmware Node cảm biến LoRa
        │   └── node_lora.ino               # Code Arduino cho node cảm biến
        │
        ├── 📂 Node-red&db json/            # 🔄 Cấu hình Node-RED & Database
        │   ├── flows.json                  # Flows xử lý dữ liệu Node-RED
        │   └── init-database.sql           # Schema khởi tạo MySQL
        │
        └── 📂 python-web/                  # 🌐 Ứng dụng Web chính
            │
            ├── 📄 main.py                  # Entry point FastAPI
            ├── 📄 database.py              # Kết nối & quản lý MySQL
            ├── 📄 ml_utils.py              # Tiện ích Machine Learning
            ├── 📄 auto_train_scheduler.py  # Lập lịch huấn luyện tự động
            ├── 📄 config.json              # Cấu hình hệ thống
            ├── 📄 requirements.txt         # Dependencies Python
            ├── 📄 run.sh                   # Script khởi chạy ứng dụng
            │
            ├── 📂 models/                  # 🤖 Mô hình Machine Learning
            │   ├── __init__.py
            │   ├── prophet_model.py        # Model Prophet (Facebook)
            │   ├── lightgbm_model.py       # Model LightGBM/XGBoost
            │   ├── sensor_data.py          # Model dữ liệu cảm biến
            │   └── weather_forecasting.py  # Model dữ liệu thời tiết
            │
            ├── 📂 routes/                  # 🛣️ API Routes
            │   ├── __init__.py
            │   ├── api.py                  # RESTful API endpoints
            │   ├── pages.py                # Page routes
            │   └── VietNam_Location.json   # Dữ liệu vị trí Việt Nam
            │
            ├── 📂 templates/               # 📄 HTML Templates
            │   ├── base.html               # Template cơ sở
            │   ├── index.html              # Trang tổng quan
            │   ├── charts.html             # Trang biểu đồ & phân tích
            │   ├── forecast.html           # Trang dự báo ML
            │   ├── ml-training.html        # Trang huấn luyện ML
            │   ├── mysql.html              # Trang quản lý dữ liệu
            │   └── settings.html           # Trang cấu hình hệ thống
            │
            ├── 📂 static/                  # 🎨 Static files
            │   ├── css/styles.css          # Stylesheet
            │   └── js/                     # JavaScript modules
            │       ├── app.js              # Core app logic
            │       ├── i18n.js             # Đa ngôn ngữ
            │       ├── index.js            # Trang chủ
            │       ├── charts.js           # Biểu đồ
            │       ├── forecast.js         # Dự báo
            │       ├── ml-training.js      # Huấn luyện ML
            │       ├── mysql.js            # Quản lý dữ liệu
            │       └── settings.js         # Cấu hình
            │
            ├── 📂 models_storage/          # 💾 Lưu trữ mô hình đã train
            │   ├── prophet/                # Mô hình Prophet
            │   ├── lightgbm/               # Mô hình LightGBM
            │   └── *.json                  # Metadata & history
            │
            └── 📂 backups/                 # 🔒 Sao lưu database
```

---

## 🤖 Mô hình Machine Learning

### Tổng quan

Hệ thống sử dụng **2 mô hình chính** để dự báo thời tiết, mỗi mô hình có ưu điểm riêng:

| Model | Phương pháp | Ưu điểm | Phù hợp cho |
|-------|-------------|---------|-------------|
| **Prophet** | Time Series Decomposition | Xử lý tốt xu hướng & mùa vụ | Dự báo dài hạn (7 ngày) |
| **LightGBM** | Gradient Boosting | Chính xác cao, nhanh | Dự báo ngắn hạn (24 giờ) |

---

### 📊 Model 1: Prophet (Facebook)

#### Nguyên lý hoạt động
Prophet phân tách chuỗi thời gian thành **3 thành phần**:

```
y(t) = g(t) + s(t) + h(t) + ε(t)
```

| Thành phần | Ý nghĩa | Mô tả |
|------------|---------|-------|
| `g(t)` | **Trend** | Xu hướng tăng/giảm dài hạn |
| `s(t)` | **Seasonality** | Tính chu kỳ (theo giờ, ngày, tuần, năm) |
| `h(t)` | **Holiday** | Ảnh hưởng của ngày lễ, sự kiện |
| `ε(t)` | **Error** | Sai số ngẫu nhiên |

#### Quy trình huấn luyện
```
Dữ liệu lịch sử → Chuẩn hóa → Phân tách xu hướng/mùa vụ → Fit model → Dự báo
```

#### Các biến được dự báo (6 biến)
| Biến | Nguồn dữ liệu | Mô tả |
|------|---------------|-------|
| 🌡️ Nhiệt độ (Temperature) | Cảm biến IoT | Đơn vị: °C |
| 💧 Độ ẩm (Humidity) | Cảm biến IoT | Đơn vị: % |
| ⏱️ Áp suất (Pressure) | Cảm biến IoT | Đơn vị: hPa |
| 💨 Tốc độ gió (Wind Speed) | API Thời tiết | Đơn vị: km/h |
| 🌧️ Lượng mưa (Rainfall) | API Thời tiết | Đơn vị: mm |
| ☀️ Chỉ số UV (UV Index) | API Thời tiết | Thang 0-11+ |

#### Các biến chỉ giám sát (không train dự báo)
| Biến | Mô tả |
|------|-------|
| 💨 CO₂ | Hiển thị thời gian thực từ cảm biến |
| 🌫️ Bụi mịn PM2.5 | Hiển thị thời gian thực từ cảm biến |
| 📊 Chỉ số AQI | Hiển thị thời gian thực từ cảm biến |

---

### 📈 Model 2: LightGBM (Gradient Boosting)

#### Nguyên lý hoạt động
LightGBM sử dụng chiến lược **Direct Multi-Step Forecasting**:

```
Train riêng 1 model cho mỗi bước dự báo (1h, 3h, 6h, 12h, 24h)
```

#### Feature Engineering
Model tự động tạo các đặc trưng từ dữ liệu:

| Loại đặc trưng | Mô tả |
|----------------|-------|
| **Lag Features** | Giá trị 24 giờ trước (t-1, t-2, ..., t-24) |
| **Rolling Statistics** | Mean, Std, Min, Max của cửa sổ 3h, 6h, 12h, 24h |
| **Difference Features** | Độ biến thiên: diff(1), diff(24) |

#### Quy trình dự báo
```
Input (24h trước) → Tạo features → Model step-1 → Model step-3 → ... → Model step-24 → Output (24h tới)
```

---

### 🌦️ Xác định điều kiện thời tiết

Sau khi dự báo các thông số, hệ thống xác định **điều kiện thời tiết** dựa trên logic sau:

```python
# Thời gian ban ngày (10h-18h): UV có ý nghĩa
if is_daytime:
    if uv_index >= 6:
        condition = "☀️ Nắng"
    elif uv_index >= 3:
        condition = "🌤️ Nắng nhẹ"
    else:
        condition = "☁️ Nhiều mây"

# Thời gian ban đêm: Không dùng UV
else:
    if rainfall > 0.5:
        condition = "🌧️ Mưa đêm"
    elif humidity > 90:
        condition = "🌫️ Sương mù"
    else:
        condition = "🌙 Đêm quang"

# Luôn ưu tiên kiểm tra mưa
if rainfall > 0.5:
    condition = "🌧️ Mưa"
```

#### Bảng điều kiện thời tiết

| Điều kiện | UV Index | Rainfall | Humidity | Giờ |
|-----------|----------|----------|----------|-----|
| ☀️ Nắng | ≥ 6 | < 0.5 | - | 10h-18h |
| 🌤️ Nắng nhẹ | 3-6 | < 0.5 | - | 10h-18h |
| ☁️ Nhiều mây | < 3 | < 0.5 | - | 10h-18h |
| 🌧️ Mưa | - | > 0.5 | - | Bất kỳ |
| 🌫️ Sương mù | - | < 0.5 | > 90% | Đêm |
| 🌅 Sáng sớm | - | < 0.5 | - | 6h-10h |
| 🌆 Chiều tối | - | < 0.5 | - | 18h-20h |
| 🌙 Đêm quang | - | < 0.5 | < 90% | 20h-6h |

---

## 🚀 Hướng dẫn cài đặt và chạy dự án

### Yêu cầu hệ thống

| Thành phần | Yêu cầu |
|------------|---------|
| **OS** | Linux (Raspberry Pi OS), Windows, macOS |
| **Python** | 3.9 trở lên |
| **MySQL** | 5.7 trở lên |
| **RAM** | Tối thiểu 2GB |
| **Node-RED** | (Tùy chọn) Để thu thập dữ liệu MQTT |

### Bước 1: Clone repository

```bash
git clone https://github.com/thaivanhoa37/AIoT-Based-Weather-Forecasting-System-Using-Machine-Learning.git
cd AIoT-Based-Weather-Forecasting-System-Using-Machine-Learning
```

### Bước 2: Di chuyển vào thư mục ứng dụng web

```bash
cd "src/AIoT-Based Weather Forecasting System Using Machine Learning/python-web"
```

### Bước 3: Cấu hình database

Tạo file `.env` với nội dung:

```env
# Database Configuration
DATABASE_URL=mysql+pymysql://root:your_password@localhost/weather_forecasting
DATABASE_HOST=localhost
DATABASE_USER=root
DATABASE_PASSWORD=your_password
DATABASE_NAME=weather_forecasting

# App Configuration
APP_HOST=0.0.0.0
APP_PORT=8000
```

### Bước 4: Khởi tạo database MySQL

```bash
# Đăng nhập MySQL và tạo database
mysql -u root -p

# Trong MySQL shell:
CREATE DATABASE weather_forecasting;
USE weather_forecasting;
SOURCE ../Node-red&db\ json/init-database.sql;
EXIT;
```

### Bước 5: Chạy ứng dụng

#### Cách 1: Sử dụng script `run.sh` (Khuyên dùng)

```bash
chmod +x run.sh
./run.sh
```

Script `run.sh` tự động thực hiện:
1. ✅ Tạo virtual environment (nếu chưa có)
2. ✅ Kích hoạt virtual environment
3. ✅ Cài đặt dependencies từ `requirements.txt`
4. ✅ Khởi chạy FastAPI server trên port 8000

#### Cách 2: Chạy thủ công

```bash
# Tạo virtual environment
python3 -m venv venv

# Kích hoạt virtual environment
source venv/bin/activate  # Linux/macOS
# hoặc: venv\Scripts\activate  # Windows

# Cài đặt dependencies
pip install -r requirements.txt

# Chạy ứng dụng
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## ✨ Tính năng chính

### 🏠 Trang Tổng quan (Dashboard)
- Hiển thị dữ liệu cảm biến IoT thời gian thực
- Dự báo 24 giờ tới và 7 ngày tới
- Trạng thái hệ thống

### 📊 Biểu đồ & Phân tích
- Biểu đồ lịch sử các thông số
- Bộ lọc theo khoảng thời gian
- Thống kê tổng hợp

### 🌤️ Dự báo thời tiết (ML)
- Dự báo chi tiết từng giờ
- Bảng dữ liệu dự báo
- Thống kê dự báo
- Xuất dữ liệu CSV/Excel

### 🤖 Huấn luyện ML
- Chọn model (Prophet/LightGBM)
- Cấu hình số ngày dữ liệu
- Theo dõi tiến trình huấn luyện
- Lịch sử huấn luyện
- Lập lịch tự động huấn luyện

### 💾 Quản lý dữ liệu MySQL
- Xem dữ liệu trong database
- Tìm kiếm và lọc
- Xuất dữ liệu
- Sao lưu database
- Dọn dẹp dữ liệu cũ

### ⚙️ Cấu hình hệ thống
- Cấu hình vị trí GPS
- Kết nối MySQL
- Thông số Raspberry Pi
- Điều khiển hệ thống (Restart, Shutdown)

---

## 📄 Giấy phép

Dự án được phân phối dưới giấy phép **MIT License**. Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

---

## 👨‍💻 Tác giả

**Thái Văn Hòa**

- 📧 Email: thaivanhoa2002@gmail.com
- 🔗 GitHub: [@thaivanhoa37](https://github.com/thaivanhoa37)

---

## 🙏 Lời cảm ơn

Xin chân thành cảm ơn **Ph.D. Vương Công Đạt** đã tận tình hướng dẫn và hỗ trợ trong suốt quá trình thực hiện đồ án tốt nghiệp này.

---

<p align="center">
  <b>🌤️ AIoT Weather Forecasting System - Đồ án tốt nghiệp 2025</b>
</p>
