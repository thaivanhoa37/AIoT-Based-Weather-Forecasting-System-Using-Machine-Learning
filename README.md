# 🌤️ Hệ thống Dự báo Thời tiết AIoT sử dụng Machine Learning

Hệ thống IoT thông minh thu thập dữ liệu môi trường thời gian thực từ các cảm biến phân tán và dùng machine learning để dự báo thời tiết ngắn hạn. Hiển thị dự báo, cảnh báo và phân tích trên dashboard tương tác.

## ✨ Tính năng chính

- 🔌 **Thu thập dữ liệu IoT**: Mạng LoRa, MQTT, Node-RED
- 🤖 **Machine Learning**: Prophet, LightGBM, ARIMA, Random Forest
- 📊 **Dashboard Web**: Giám sát thời gian thực, dự báo, biểu đồ
- 💾 **Quản lý dữ liệu**: MySQL, xuất CSV/JSON/Excel, sao lưu, tối ưu
- ⚙️ **Tính năng nâng cao**: Đa ngôn ngữ, API Swagger, tự động huấn luyện

---

## 📁 Cấu trúc dự án

```
├── src/
│   └── AIoT-Based Weather Forecasting System Using Machine Learning/
│       ├── gateway_lora_mqtt/          # Firmware cổng LoRa
│       ├── node_lora/                  # Firmware nút cảm biến
│       ├── Node-red&db json/           # Flows Node-RED & schema MySQL
│       └── python-web/                 # Ứng dụng web chính
│           ├── main.py, database.py, ml_utils.py
│           ├── auto_train_scheduler.py # Huấn luyện tự động
│           ├── models/                 # Prophet, LightGBM
│           ├── routes/                 # API & pages
│           ├── templates/              # HTML (dashboard, forecast, mysql, settings)
│           ├── static/                 # CSS, JS
│           ├── models_storage/         # Lưu mô hình ML
│           ├── backups/                # Sao lưu database
│           ├── run.sh                  # Script chạy ứng dụng
│           └── requirements.txt
├── Md/                                 # Tài liệu
├── LICENSE
└── README.md
```

---

## 🚀 Clone & Cài đặt

### 1. Clone repository
```bash
git clone https://github.com/thaivanhoa37/AIoT-Based-Weather-Forecasting-System-Using-Machine-Learning.git
cd AIoT-Based-Weather-Forecasting-System-Using-Machine-Learning
```

### 2. Cấu hình database
```bash
cd "src/AIoT-Based Weather Forecasting System Using Machine Learning/python-web"
nano .env
```

Thêm vào `.env`:
```env
DATABASE_URL=mysql+pymysql://root:password@localhost/weather_forecasting
DATABASE_HOST=localhost
DATABASE_USER=root
DATABASE_PASSWORD=your_password
DATABASE_NAME=weather_forecasting
APP_HOST=0.0.0.0
APP_PORT=8000
```

### 3. Import database schema
```bash
mysql -u root -p < "../Node-red&db json/init-database.sql"
```

### 4. Chạy ứng dụng với run.sh
```bash
# Cách 1: Dùng script run.sh (khuyên dùng)
chmod +x run.sh
./run.sh

# Cách 2: Chạy thủ công
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 5. Truy cập
- **Web Dashboard**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 📖 File run.sh

Script `run.sh` tự động thực hiện:
1. Tạo virtual environment nếu chưa có
2. Kích hoạt virtual environment
3. Cài đặt dependencies từ requirements.txt
4. Khởi chạy FastAPI server trên port 8000
5. Hiển thị URL truy cập

```bash
# Cho phép thực thi
chmod +x run.sh

# Chạy
./run.sh
```

---

## 📊 Tính năng chính

| Tính năng | Mô tả |
|----------|-------|
| **Giám sát thời gian thực** | Nhiệt độ, độ ẩm, áp suất, AQI từ nhiều nút |
| **Dự báo thời tiết** | 24h và 7 ngày sử dụng ML |
| **Xuất dữ liệu** | CSV, JSON, Excel |
| **Sao lưu Database** | Tự động và thủ công |
| **Huấn luyện ML** | Prophet, LightGBM, ARIMA, Random Forest |
| **Tối ưu hóa Database** | Tối ưu bảng & index |
| **Quản lý dữ liệu** | Xóa cũ, xem thống kê |
| **Đa ngôn ngữ** | Tiếng Việt, Tiếng Anh |

---

## 🛠️ Yêu cầu

- **Python 3.9+**
- **MySQL Server 5.7+**
- **Node.js** (tùy chọn, cho Node-RED)

**Dependencies chính:**
```
FastAPI, Uvicorn, SQLAlchemy, PyMySQL
Pandas, Numpy, Scikit-learn, Prophet, LightGBM
Jinja2, Python-dotenv, AIOFILES
```

---

## 🐛 Xử lý sự cố nhanh

| Vấn đề | Giải pháp |
|--------|----------|
| Port 8000 đã sử dụng | `lsof -i :8000` → `kill -9 <PID>` |
| Lỗi kết nối database | Kiểm tra `.env` và MySQL service |
| Import database thất bại | Kiểm tra MySQL user permissions |
| Module không tìm thấy | `pip install -r requirements.txt` |

---

## 📚 Tài liệu thêm

| File | Mô tả |
|------|-------|
| [SETUP_GUIDE.md](Md/SETUP_GUIDE.md) | Hướng dẫn cài đặt chi tiết |
| [QUICK_START_MYSQL.md](Md/QUICK_START_MYSQL.md) | Quản lý dữ liệu nhanh |
| [ML_TRAINING_PARAMETERS.md](Md/ML_TRAINING_PARAMETERS.md) | Hướng dẫn huấn luyện ML |
| [COMPLETION_REPORT.md](Md/COMPLETION_REPORT.md) | Báo cáo hoàn thành tính năng |

---

## ✅ Trạng thái dự án

| Thành phần | Trạng thái |
|-----------|-----------|
| Web Dashboard | ✅ Production Ready |
| ML Pipeline | ✅ Production Ready |
| Database Management | ✅ Production Ready |
| IoT Integration | ✅ Working |
| Documentation | ✅ Complete |

---

## 📜 Giấy phép

MIT License - Xem [LICENSE](LICENSE)

---

## 👥 Tác giả

**Thái Văn Hòa** - Tác giả & Người duy trì

---

**Cập nhật:** 14 Tháng 12, 2025 | **Phiên bản:** 1.0.0
