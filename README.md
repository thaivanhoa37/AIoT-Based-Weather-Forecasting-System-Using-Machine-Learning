# 🌤️ AIoT-Based Weather Forecasting System Using Machine Learning

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.9+-blue.svg" alt="Python">
  <img src="https://img.shields.io/badge/FastAPI-0.100+-green.svg" alt="FastAPI">
  <img src="https://img.shields.io/badge/Machine%20Learning-Prophet%20%7C%20LightGBM-orange.svg" alt="ML">
  <img src="https://img.shields.io/badge/IoT-LoRa%20%7C%20MQTT-red.svg" alt="IoT">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License">
</p>

> **Graduation Project** - A smart IoT system that collects real-time environmental data from distributed sensors and uses Machine Learning to forecast short-term weather (24 hours - 7 days).

---

## 📋 Project Information

| Information | Details |
|-------------|---------|
| **Project Title** | AIoT-Based Weather Forecasting System Using Machine Learning |
| **Author** | **Thai Van Hoa** |
| **Supervisor** | **Ph.D. Vuong Cong Dat** |
| **Purpose** | Graduation Project |

---

## 🎯 Project Objectives

### Main Objectives
1. **Build an IoT system for real-time environmental data collection** from distributed sensors using LoRa and MQTT technologies
2. **Develop Machine Learning models** (Prophet, LightGBM) for high-accuracy short-term weather forecasting
3. **Design an interactive web dashboard** displaying real-time data, forecasts, and trend analysis

### Specific Objectives
- Collect sensor data: **Temperature, Humidity, Pressure, CO₂, PM2.5, AQI Index**
- Integrate data from weather API: **Wind Speed, Rainfall, UV Index**
- Weather forecasting: **Next 24 hours** (hourly) and **Next 7 days** (daily)
- Determine weather conditions: Sunny, Rainy, Cloudy, Foggy, etc.
- Multi-language support: Vietnamese and English

---

## 📁 Project Structure

```
AIoT-Based-Weather-Forecasting-System-Using-Machine-Learning/
│
├── 📄 README.md                    # Documentation
├── 📄 LICENSE                      # MIT License
│
└── 📂 src/
    └── 📂 AIoT-Based Weather Forecasting System Using Machine Learning/
        │
        ├── 📂 gateway_lora_mqtt/           # 🔌 LoRa-MQTT Gateway Firmware
        │   └── gateway_lora_mqtt.ino       # Arduino code for gateway
        │
        ├── 📂 node_lora/                   # 📡 LoRa Sensor Node Firmware
        │   └── node_lora.ino               # Arduino code for sensor node
        │
        ├── 📂 Node-red&db json/            # 🔄 Node-RED & Database Config
        │   ├── flows.json                  # Node-RED data processing flows
        │   └── init-database.sql           # MySQL initialization schema
        │
        └── 📂 python-web/                  # 🌐 Main Web Application
            │
            ├── 📄 main.py                  # FastAPI entry point
            ├── 📄 database.py              # MySQL connection & management
            ├── 📄 ml_utils.py              # Machine Learning utilities
            ├── 📄 auto_train_scheduler.py  # Auto training scheduler
            ├── 📄 config.json              # System configuration
            ├── 📄 requirements.txt         # Python dependencies
            ├── 📄 run.sh                   # Application startup script
            │
            ├── 📂 models/                  # 🤖 Machine Learning Models
            │   ├── __init__.py
            │   ├── prophet_model.py        # Prophet Model (Facebook)
            │   ├── lightgbm_model.py       # LightGBM/XGBoost Model
            │   ├── sensor_data.py          # Sensor data model
            │   └── weather_forecasting.py  # Weather data model
            │
            ├── 📂 routes/                  # 🛣️ API Routes
            │   ├── __init__.py
            │   ├── api.py                  # RESTful API endpoints
            │   ├── pages.py                # Page routes
            │   └── VietNam_Location.json   # Vietnam location data
            │
            ├── 📂 templates/               # 📄 HTML Templates
            │   ├── base.html               # Base template
            │   ├── index.html              # Dashboard page
            │   ├── charts.html             # Charts & analysis page
            │   ├── forecast.html           # ML forecast page
            │   ├── ml-training.html        # ML training page
            │   ├── mysql.html              # Data management page
            │   └── settings.html           # System settings page
            │
            ├── 📂 static/                  # 🎨 Static files
            │   ├── css/styles.css          # Stylesheet
            │   └── js/                     # JavaScript modules
            │       ├── app.js              # Core app logic
            │       ├── i18n.js             # Internationalization
            │       ├── index.js            # Homepage
            │       ├── charts.js           # Charts
            │       ├── forecast.js         # Forecast
            │       ├── ml-training.js      # ML Training
            │       ├── mysql.js            # Data management
            │       └── settings.js         # Settings
            │
            ├── 📂 models_storage/          # 💾 Trained model storage
            │   ├── prophet/                # Prophet models
            │   ├── lightgbm/               # LightGBM models
            │   └── *.json                  # Metadata & history
            │
            └── 📂 backups/                 # 🔒 Database backups
```

---

## 🤖 Machine Learning Models

### Overview

The system uses **2 main models** for weather forecasting, each with its own advantages:

| Model | Method | Advantages | Best for |
|-------|--------|------------|----------|
| **Prophet** | Time Series Decomposition | Handles trends & seasonality well | Long-term forecast (7 days) |
| **LightGBM** | Gradient Boosting | High accuracy, fast | Short-term forecast (24 hours) |

---

### 📊 Model 1: Prophet (Facebook)

#### How it works
Prophet decomposes time series into **3 components**:

```
y(t) = g(t) + s(t) + h(t) + ε(t)
```

| Component | Meaning | Description |
|-----------|---------|-------------|
| `g(t)` | **Trend** | Long-term increasing/decreasing trend |
| `s(t)` | **Seasonality** | Cyclical patterns (hourly, daily, weekly, yearly) |
| `h(t)` | **Holiday** | Impact of holidays and events |
| `ε(t)` | **Error** | Random noise |

#### Training Process
```
Historical Data → Normalization → Trend/Seasonality Decomposition → Fit Model → Forecast
```

#### Forecasted Variables (6 variables)
| Variable | Data Source | Description |
|----------|-------------|-------------|
| 🌡️ Temperature | IoT Sensor | Unit: °C |
| 💧 Humidity | IoT Sensor | Unit: % |
| ⏱️ Pressure | IoT Sensor | Unit: hPa |
| 💨 Wind Speed | Weather API | Unit: km/h |
| 🌧️ Rainfall | Weather API | Unit: mm |
| ☀️ UV Index | Weather API | Scale 0-11+ |

#### Monitoring-only Variables (not trained for forecasting)
| Variable | Description |
|----------|-------------|
| 💨 CO₂ | Real-time display from sensor |
| 🌫️ PM2.5 | Real-time display from sensor |
| 📊 AQI Index | Real-time display from sensor |

---

### 📈 Model 2: LightGBM (Gradient Boosting)

#### How it works
LightGBM uses **Direct Multi-Step Forecasting** strategy:

```
Train a separate model for each forecast step (1h, 3h, 6h, 12h, 24h)
```

#### Feature Engineering
The model automatically creates features from data:

| Feature Type | Description |
|--------------|-------------|
| **Lag Features** | Values from 24 hours ago (t-1, t-2, ..., t-24) |
| **Rolling Statistics** | Mean, Std, Min, Max of 3h, 6h, 12h, 24h windows |
| **Difference Features** | Variation: diff(1), diff(24) |

#### Forecasting Process
```
Input (past 24h) → Create features → Model step-1 → Model step-3 → ... → Model step-24 → Output (next 24h)
```

---

### 🌦️ Weather Condition Determination

After forecasting the parameters, the system determines **weather conditions** based on the following logic:

```python
# Daytime (10h-18h): UV is meaningful
if is_daytime:
    if uv_index >= 6:
        condition = "☀️ Sunny"
    elif uv_index >= 3:
        condition = "🌤️ Partly Sunny"
    else:
        condition = "☁️ Cloudy"

# Nighttime: Don't use UV
else:
    if rainfall > 0.5:
        condition = "🌧️ Night Rain"
    elif humidity > 90:
        condition = "🌫️ Foggy"
    else:
        condition = "🌙 Clear Night"

# Always prioritize rain check
if rainfall > 0.5:
    condition = "🌧️ Rainy"
```

#### Weather Conditions Table

| Condition | UV Index | Rainfall | Humidity | Time |
|-----------|----------|----------|----------|------|
| ☀️ Sunny | ≥ 6 | < 0.5 | - | 10h-18h |
| 🌤️ Partly Sunny | 3-6 | < 0.5 | - | 10h-18h |
| ☁️ Cloudy | < 3 | < 0.5 | - | 10h-18h |
| 🌧️ Rainy | - | > 0.5 | - | Any |
| 🌫️ Foggy | - | < 0.5 | > 90% | Night |
| 🌅 Early Morning | - | < 0.5 | - | 6h-10h |
| 🌆 Evening | - | < 0.5 | - | 18h-20h |
| 🌙 Clear Night | - | < 0.5 | < 90% | 20h-6h |

---

## 🚀 Installation and Running Guide

### System Requirements

| Component | Requirement |
|-----------|-------------|
| **OS** | Linux (Raspberry Pi OS), Windows, macOS |
| **Python** | 3.9 or higher |
| **MySQL** | 5.7 or higher |
| **RAM** | Minimum 2GB |
| **Node-RED** | (Optional) For MQTT data collection |

### Step 1: Clone repository

```bash
git clone https://github.com/thaivanhoa37/AIoT-Based-Weather-Forecasting-System-Using-Machine-Learning.git
cd AIoT-Based-Weather-Forecasting-System-Using-Machine-Learning
```

### Step 2: Navigate to web application directory

```bash
cd "src/AIoT-Based Weather Forecasting System Using Machine Learning/python-web"
```

### Step 3: Configure database

Create `.env` file with the following content:

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

### Step 4: Initialize MySQL database

```bash
# Login to MySQL and create database
mysql -u root -p

# In MySQL shell:
CREATE DATABASE weather_forecasting;
USE weather_forecasting;
SOURCE ../Node-red&db\ json/init-database.sql;
EXIT;
```

### Step 5: Run the application

#### Method 1: Using `run.sh` script (Recommended)

```bash
chmod +x run.sh
./run.sh
```

The `run.sh` script automatically:
1. ✅ Creates virtual environment (if not exists)
2. ✅ Activates virtual environment
3. ✅ Installs dependencies from `requirements.txt`
4. ✅ Starts FastAPI server on port 8000

#### Method 2: Manual setup

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # Linux/macOS
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Run application
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```



---

## ✨ Main Features

### 🏠 Dashboard
- Display real-time IoT sensor data
- 24-hour and 7-day forecasts
- System status

### 📊 Charts & Analysis
- Historical parameter charts
- Time range filters
- Summary statistics

### 🌤️ Weather Forecast (ML)
- Detailed hourly forecast
- Forecast data table
- Forecast statistics
- Export to CSV/Excel

### 🤖 ML Training
- Select model (Prophet/LightGBM)
- Configure data days
- Monitor training progress
- Training history
- Auto training scheduler

### 💾 MySQL Data Management
- View database data
- Search and filter
- Export data
- Database backup
- Clean old data

### ⚙️ System Settings
- GPS location configuration
- MySQL connection
- Raspberry Pi parameters
- System control (Restart, Shutdown)

---

## 📄 License

This project is distributed under the **MIT License**. See the [LICENSE](LICENSE) file for more details.

---

## 👨‍💻 Author

**Thai Van Hoa**

- 📧 Email: thaivanhoa2002@gmail.com
- 🔗 GitHub: [@thaivanhoa37](https://github.com/thaivanhoa37)

---

## 🙏 Acknowledgements

Sincere thanks to **Ph.D. Vuong Cong Dat** for dedicated guidance and support throughout the completion of this graduation project.

---

<p align="center">
  <b>🌤️ AIoT Weather Forecasting System - Graduation Project 2025</b>
</p>
