# Hướng dẫn Chạy AIoT Weather Forecasting System

## 📍 Vị trí ứng dụng

```
python-web/                # Ứng dụng FastAPI
├── main.py               # Điểm vào chính
├── database.py           # Cấu hình database
├── routes/               # API endpoints
├── templates/            # HTML templates
├── static/               # CSS, JS, files tĩnh
├── models/               # Database models
├── venv/                 # Virtual environment (đã tạo)
└── requirements.txt      # Dependencies
```

## 🚀 Cách chạy ứng dụng

### Cách 1: Chạy từ thư mục root (Khuyên dùng)

```bash
cd ~/Documents/AIoT-Based-Weather-Forecasting-System-Using-Machine-Learning
./run_app.sh
```

### Cách 2: Chạy từ thư mục python-web

```bash
cd ~/Documents/AIoT-Based-Weather-Forecasting-System-Using-Machine-Learning/src/AIoT-Based\ Weather\ Forecasting\ System\ Using\ Machine\ Learning/python-web
./run_fastapi.sh
```

### Cách 3: Chạy thủ công (nếu script không hoạt động)

```bash
cd ~/Documents/AIoT-Based-Weather-Forecasting-System-Using-Machine-Learning/src/AIoT-Based\ Weather\ Forecasting\ System\ Using\ Machine\ Learning/python-web

# Kích hoạt virtual environment
source venv/bin/activate

# Khởi động server
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## 🌐 Truy cập ứng dụng

Khi server chạy, truy cập:

- **Web UI**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs
- **API Docs (ReDoc)**: http://localhost:8000/redoc

## ⚙️ Cấu hình Database

Trước khi chạy, cần cấu hình kết nối MySQL:

### 1. Cấu hình file .env

```bash
cd python-web
nano .env
```

Sửa các tham số sau:

```env
DATABASE_URL=mysql+pymysql://root:password@localhost/weather_forecasting
DATABASE_HOST=localhost
DATABASE_USER=root
DATABASE_PASSWORD=your_password
DATABASE_NAME=weather_forecasting
```

### 2. Tạo database

Chạy file SQL:

```bash
mysql -u root -p < ../Node-red\&db\ json/init-database.sql
```

## 📊 Dữ liệu mẫu

Để tạo dữ liệu mẫu để test:

```bash
cd python-web
source venv/bin/activate
python insert_sample_data.py
```

## 🤖 Huấn luyện mô hình Machine Learning

Để huấn luyện mô hình dự báo:

```bash
# Từ thư mục python-web
source venv/bin/activate

# Huấn luyện mô hình đơn giản
python train_models.py

# Hoặc huấn luyện mô hình nâng cao
python advanced_training.py
```

## 🧪 Test ứng dụng

```bash
# Test quick
python quick_test.py

# Test toàn bộ
python test_models.py

# Test với dữ liệu thực
python test_real_data.py
```

## 📝 Các API Endpoint chính

### 📊 Dashboard

- `GET /` - Trang dashboard chính
- `GET /charts` - Trang biểu đồ
- `GET /forecast` - Trang dự báo
- `GET /mysql` - Quản lý MySQL

### 🔌 API Endpoints

```
GET  /api/realtime              - Dữ liệu thời gian thực
GET  /api/charts/data           - Dữ liệu biểu đồ
GET  /api/mysql/data            - Dữ liệu MySQL (phân trang)
GET  /api/statistics            - Thống kê
GET  /api/forecast              - Dự báo thời tiết
GET  /api/export/csv            - Export dữ liệu CSV
POST /api/models/train          - Huấn luyện mô hình
GET  /api/models/status         - Trạng thái mô hình
```

Chi tiết: http://localhost:8000/docs

## 🔧 Xử lý lỗi thường gặp

### Lỗi: "No such file or directory"

**Nguyên nhân**: Đường dẫn thư mục không đúng

**Giải pháp**:
```bash
# Kiểm tra đường dẫn hiện tại
pwd

# Chắc chắn bạn ở đúng thư mục
cd ~/Documents/AIoT-Based-Weather-Forecasting-System-Using-Machine-Learning
```

### Lỗi: "ModuleNotFoundError: No module named 'fastapi'"

**Nguyên nhân**: Virtual environment chưa kích hoạt hoặc dependencies chưa cài đặt

**Giải pháp**:
```bash
cd python-web

# Tạo virtual environment (nếu chưa có)
python3 -m venv venv

# Kích hoạt
source venv/bin/activate

# Cài đặt dependencies
pip install -r requirements.txt
```

### Lỗi: "Connection refused" khi kết nối MySQL

**Nguyên nhân**: MySQL server chưa chạy hoặc thông tin kết nối sai

**Giải pháp**:
```bash
# Kiểm tra MySQL service
sudo systemctl status mysql

# Nếu chưa chạy, khởi động
sudo systemctl start mysql

# Kiểm tra thông tin trong .env
nano .env
```

### Lỗi: Port 8000 đã được sử dụng

**Nguyên nhân**: Có process khác sử dụng port 8000

**Giải pháp**:
```bash
# Tìm process
sudo lsof -i :8000

# Kill process (thay PID bằng số từ output trên)
sudo kill -9 <PID>

# Hoặc dùng port khác
python -m uvicorn main:app --port 8001
```

### Lỗi: "ImportError: plotly"

**Nguyên nhân**: Library plotly không cài đặt (không bắt buộc)

**Giải pháp**: Bỏ qua warning này, hoặc cài đặt:
```bash
pip install plotly
```

## 📋 Danh sách file quan trọng

| File | Mục đích |
|------|---------|
| `main.py` | Điểm vào ứng dụng FastAPI |
| `database.py` | Cấu hình kết nối MySQL |
| `routes/` | Định nghĩa API endpoints |
| `templates/` | HTML templates (Jinja2) |
| `models/` | SQLAlchemy models |
| `train_models.py` | Huấn luyện mô hình ML |
| `insert_sample_data.py` | Tạo dữ liệu mẫu |
| `requirements.txt` | Python dependencies |
| `.env` | Cấu hình environment |

## 💡 Tips

1. **Tự động reload**: Khi sửa code, server tự động reload nhờ `--reload`
2. **Chế độ debug**: Mở http://localhost:8000/docs để test API
3. **Logs**: Theo dõi logs trong terminal để debug
4. **Database**: Dùng MySQL Workbench để quản lý database dễ hơn

## 📞 Hỗ trợ

Nếu gặp vấn đề:

1. Kiểm tra logs trong terminal
2. Xem file `.env` có đúng không
3. Kiểm tra MySQL service
4. Chắc chắn virtual environment đã kích hoạt
5. Cài đặt lại dependencies: `pip install -r requirements.txt --force-reinstall`

---

**Phiên bản**: 1.0.0  
**Cập nhật**: 7 December 2025  
**Framework**: FastAPI + Uvicorn + SQLAlchemy
