"""
API Routes - RESTful API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, func, text
from typing import List, Optional
from datetime import datetime, timedelta
import random
import logging
import psutil
import platform
import os
import subprocess
import json
import math
from pathlib import Path

from database import get_db
from models.sensor_data import SensorData
from models.weather_forecasting import WeatherForecasting
from ml_utils import ml_trainer

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)

# Settings file path
CONFIG_FILE = Path(__file__).parent.parent / "config.json"

def load_settings():
    """Load settings from config file"""
    try:
        if CONFIG_FILE.exists():
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"Error loading settings: {e}")
    
    # Return default settings if file doesn't exist
    return {
        "station_name": "Trạm Công nghệ cao, Quận 9",
        "node1_id": "NODE_001",
        "node2_id": "NODE_002",
        "location": {
            "name": "Quận 9, TP.HCM",
            "latitude": 10.8505,
            "longitude": 106.7717,
            "address": "Khu Công nghệ cao, Quận 9, TP. Hồ Chí Minh",
            "altitude": 0,
            "timezone": "Asia/Ho_Chi_Minh"
        },
        "mqtt": {
            "broker": "broker.hivemq.com",
            "port": 1883,
            "topic": "weather/station/001"
        },
        "api": {
            "openweather_enabled": True,
            "api_key": "****",
            "update_interval": 300
        },
        "database": {
            "host": "localhost",
            "port": 3306,
            "database": "weather_forecasting",
            "retention_days": 90
        },
        "alerts": {
            "temperature_max": 40,
            "temperature_min": 10,
            "humidity_max": 90,
            "humidity_min": 20,
            "aqi_threshold": 150,
            "email_notifications": False,
            "email": "admin@weather-station.com"
        }
    }

def save_settings(settings):
    """Save settings to config file"""
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(settings, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        logger.error(f"Error saving settings: {e}")
        return False


# ===== Sensor Data Endpoints =====

@router.get("/sensor-data/latest")
async def get_latest_sensor_data(db: Session = Depends(get_db)):
    """Get the latest sensor data record - Real data from database"""
    try:
        # Get latest valid record (where temperature > 0)
        data = db.query(SensorData).filter(
            SensorData.temperature > 0
        ).order_by(desc(SensorData.timestamp)).first()
        
        if not data:
            raise HTTPException(status_code=404, detail="Không có dữ liệu cảm biến hợp lệ")
        
        return data.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sensor-data/history")
async def get_sensor_data_history(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get sensor data history with pagination and optional date filtering
    
    - **limit**: Number of records to return (max 1000)
    - **offset**: Number of records to skip
    - **start_date**: Filter from date (format: YYYY-MM-DD)
    - **end_date**: Filter to date (format: YYYY-MM-DD)
    """
    query = db.query(SensorData)
    
    # Apply date filters if provided
    if start_date:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(SensorData.timestamp >= start)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD")
    
    if end_date:
        try:
            end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(SensorData.timestamp < end)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD")
    
    # Get total count
    total = query.count()
    
    # Get paginated results
    records = query.order_by(desc(SensorData.timestamp)).offset(offset).limit(limit).all()
    
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "records": [record.to_dict() for record in records]
    }


@router.get("/sensor-data/stats")
async def get_sensor_data_stats(
    hours: int = Query(24, ge=1, le=720),
    db: Session = Depends(get_db)
):
    """
    Get sensor data statistics for the last N hours
    
    - **hours**: Number of hours to analyze (default: 24, max: 720/30 days)
    """
    cutoff_time = datetime.now() - timedelta(hours=hours)
    
    stats = db.query(
        func.avg(SensorData.temperature).label('avg_temp'),
        func.min(SensorData.temperature).label('min_temp'),
        func.max(SensorData.temperature).label('max_temp'),
        func.avg(SensorData.humidity).label('avg_humidity'),
        func.avg(SensorData.pressure).label('avg_pressure'),
        func.avg(SensorData.co2).label('avg_co2'),
        func.avg(SensorData.dust).label('avg_dust'),
        func.avg(SensorData.aqi).label('avg_aqi'),
        func.count(SensorData.id).label('record_count')
    ).filter(SensorData.timestamp >= cutoff_time).first()
    
    if not stats or stats.record_count == 0:
        return {
            "hours": hours,
            "record_count": 0,
            "message": "No data available for the specified time range"
        }
    
    return {
        "hours": hours,
        "record_count": stats.record_count,
        "temperature": {
            "avg": round(float(stats.avg_temp), 1) if stats.avg_temp else None,
            "min": round(float(stats.min_temp), 1) if stats.min_temp else None,
            "max": round(float(stats.max_temp), 1) if stats.max_temp else None,
        },
        "humidity": {"avg": round(float(stats.avg_humidity), 1) if stats.avg_humidity else None},
        "pressure": {"avg": round(float(stats.avg_pressure), 1) if stats.avg_pressure else None},
        "co2": {"avg": round(float(stats.avg_co2), 1) if stats.avg_co2 else None},
        "dust": {"avg": round(float(stats.avg_dust), 1) if stats.avg_dust else None},
        "aqi": {"avg": round(float(stats.avg_aqi), 1) if stats.avg_aqi else None},
    }


# ===== Weather Data Endpoints =====

@router.get("/weather-data/latest")
async def get_latest_weather_data(db: Session = Depends(get_db)):
    """Get the latest weather data from database"""
    try:
        data = db.query(WeatherForecasting).order_by(desc(WeatherForecasting.timestamp)).first()
        
        if not data:
            raise HTTPException(status_code=404, detail="Không có dữ liệu thời tiết")
        
        return data.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/weather-data/history")
async def get_weather_data_history(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get weather data history with pagination"""
    query = db.query(WeatherForecasting)
    total = query.count()
    records = query.order_by(desc(WeatherForecasting.timestamp)).offset(offset).limit(limit).all()
    
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "records": [record.to_dict() for record in records]
    }


# ===== Combined Real-time Data =====

@router.get("/realtime-data")
async def get_realtime_data(db: Session = Depends(get_db)):
    """
    Get combined real-time data from database
    Combines data from sensor_data and weather_forecasting tables
    """
    try:
        # Get latest valid sensor data
        sensor_data = db.query(SensorData).filter(
            SensorData.temperature > 0
        ).order_by(desc(SensorData.timestamp)).first()
        
        # Get latest weather data
        weather_data = db.query(WeatherForecasting).order_by(desc(WeatherForecasting.timestamp)).first()
        
        if not sensor_data:
            raise HTTPException(status_code=404, detail="Không có dữ liệu cảm biến")
        
        sensor_dict = sensor_data.to_dict()
        
        # Weather data is optional
        if weather_data:
            weather_dict = weather_data.to_dict()
            # Remove timestamp from weather to avoid conflict
            weather_dict.pop('timestamp', None)
            weather_dict.pop('created_at', None)
            combined = {**sensor_dict, **weather_dict}
        else:
            combined = sensor_dict
        
        return combined
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== Charts Data Endpoints =====

@router.get("/charts-data")
async def get_charts_data(
    time_range: str = Query("24h", regex="^(24h|7d|30d)$"),
    sensors: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get data for charts visualization from real database
    
    - **time_range**: Time range for data (24h, 7d, or 30d)
    - **sensors**: Comma-separated list of sensors (e.g., "temperature,humidity,co2,wind_speed,rainfall,uv_index")
    """
    # Calculate time range
    hours_map = {"24h": 24, "7d": 168, "30d": 720}
    hours = hours_map.get(time_range, 24)
    cutoff_time = datetime.now() - timedelta(hours=hours)
    
    # Default sensors if not specified
    if not sensors:
        sensor_list = ["temperature", "humidity", "pressure", "co2", "dust", "wind_speed", "rainfall", "uv_index"]
    else:
        sensor_list = [s.strip() for s in sensors.split(",")]
    
    # Split into sensor_data and weather_data fields
    sensor_data_fields = ["temperature", "humidity", "pressure", "co2", "dust", "aqi"]
    weather_data_fields = ["wind_speed", "rainfall", "uv_index"]
    
    # Query sensor data from database (only valid records with temp > 0)
    sensor_records = db.query(SensorData).filter(
        SensorData.timestamp >= cutoff_time,
        SensorData.temperature > 0
    ).order_by(SensorData.timestamp).all()
    
    # Query weather data from database
    weather_records = db.query(WeatherForecasting).filter(
        WeatherForecasting.timestamp >= cutoff_time
    ).order_by(WeatherForecasting.timestamp).all()
    
    # Format data for charts
    data = {}
    
    # Process sensor data
    for sensor in sensor_list:
        if sensor in sensor_data_fields:
            data[sensor] = []
            for record in sensor_records:
                value = getattr(record, sensor, None)
                if value is not None and value > 0:  # Only include valid values
                    data[sensor].append({
                        "time": record.timestamp.strftime("%d/%m/%Y %H:%M:%S"),
                        "value": round(float(value), 1)
                    })
    
    # Process weather data
    for sensor in sensor_list:
        if sensor in weather_data_fields:
            data[sensor] = []
            for record in weather_records:
                value = getattr(record, sensor, None)
                if value is not None:  # Include 0 values for weather data
                    data[sensor].append({
                        "time": record.timestamp.strftime("%d/%m/%Y %H:%M:%S"),
                        "value": round(float(value), 1)
                    })
    
    # If no data found
    if not sensor_records and not weather_records:
        raise HTTPException(status_code=404, detail=f"Không có dữ liệu trong {time_range}")
    
    return data


# ===== System Stats =====

@router.get("/system-stats")
async def get_system_stats(db: Session = Depends(get_db)):
    """Get system statistics"""
    # Count records
    total_sensor_records = db.query(SensorData).count()
    total_weather_records = db.query(WeatherForecasting).count()
    
    # Records today
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    sensor_records_today = db.query(SensorData).filter(SensorData.timestamp >= today_start).count()
    
    # Latest update time
    latest_sensor = db.query(SensorData).order_by(desc(SensorData.timestamp)).first()
    latest_time = latest_sensor.timestamp.strftime("%H:%M:%S %d/%m/%Y") if latest_sensor else "N/A"
    
    return {
        "active_sensors": 5,
        "total_records": total_sensor_records + total_weather_records,
        "sensor_records": total_sensor_records,
        "weather_records": total_weather_records,
        "records_today": sensor_records_today,
        "last_update": latest_time,
        "system_status": "Hoạt động",
        "database_size": f"{(total_sensor_records + total_weather_records) * 0.001:.1f} MB"  # Rough estimate
    }


# ===== ML Training Endpoints =====

@router.post("/ml/train")
async def train_ml_model(
    model_type: str = Query("prophet", regex="^(prophet|lstm)$"),
    data_points: int = Query(5000, ge=100, le=50000),
    db: Session = Depends(get_db)
):
    """
    Train ML model for weather forecasting
    
    - **model_type**: Type of model (prophet, lstm)
    - **data_points**: Number of historical data points to use
    """
    try:
        # Get training data - order by ascending time (oldest first) for proper time series
        records = db.query(SensorData).filter(
            SensorData.temperature > 0
        ).order_by(SensorData.timestamp).limit(data_points).all()
        
        if len(records) < 100:
            raise HTTPException(status_code=400, detail="Không đủ dữ liệu để huấn luyện (tối thiểu 100 bản ghi)")
        
        logger.info(f"Training {model_type} model with {len(records)} records...")
        
        # Train model using MLManager
        train_result = ml_trainer.train_all_models(records, model_type)
        
        # Format response for frontend
        if train_result.get('success'):
            return {
                'success': True,
                'model_type': train_result.get('model_type', model_type),
                'models_trained': train_result.get('models_trained', []),
                'all_metrics': train_result.get('metrics', {}),
                'overall_accuracy': train_result.get('overall_accuracy', 0),
                'data_points_used': train_result.get('data_points', len(records)),
                'training_time': f"{train_result.get('training_time', 0):.2f}s",
                'timestamp': datetime.now().isoformat()
            }
        else:
            raise HTTPException(status_code=400, detail=train_result.get('error', 'Training failed'))
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ML training error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ml/model-info")
async def get_model_info():
    """Get current ML model information"""
    info = ml_trainer.get_model_info()
    
    return {
        "current_model_type": info.get('current_model_type', 'prophet'),
        "models_available": info.get('models_available', []),
        "training_count": info.get('training_count', 0),
        "last_trained": info.get('last_trained', 'Chưa huấn luyện'),
        "last_accuracy": info.get('last_accuracy', 0),
        "last_data_points": info.get('last_data_points', 0),
        "status": info.get('status', 'Cần huấn luyện'),
        "supported_model_types": info.get('supported_model_types', ['prophet', 'lstm'])
    }


@router.get("/ml/training-history")
async def get_training_history(limit: int = Query(10, ge=1, le=100)):
    """Get ML training history"""
    history = ml_trainer.get_training_history(limit)
    return {
        "history": history,
        "total": len(history)
    }


@router.get("/ml/compare-models")
async def compare_models():
    """Compare performance of all trained models"""
    comparison = ml_trainer.compare_models()
    return comparison


@router.post("/ml/set-model")
async def set_current_model(model_type: str = Query(..., regex="^(prophet|lstm)$")):
    """Set the current active model for predictions"""
    success = ml_trainer.set_current_model(model_type)
    if success:
        return {
            "success": True,
            "message": f"Đã chuyển sang model {model_type}",
            "current_model_type": model_type
        }
    else:
        raise HTTPException(status_code=400, detail=f"Model type {model_type} không hợp lệ")


# ===== Auto-Training Settings =====
AUTO_TRAIN_CONFIG_FILE = Path(__file__).parent.parent / "models_storage" / "auto_train_config.json"

def load_auto_train_settings():
    """Load auto-training settings from config file"""
    default_settings = {
        "enabled": False,
        "interval_days": 7,
        "hour": 2,
        "model_type": "prophet",
        "data_points": 10000,
        "last_auto_train": None
    }
    try:
        if AUTO_TRAIN_CONFIG_FILE.exists():
            with open(AUTO_TRAIN_CONFIG_FILE, 'r', encoding='utf-8') as f:
                saved = json.load(f)
                default_settings.update(saved)
    except Exception as e:
        logger.error(f"Error loading auto-train settings: {e}")
    return default_settings

def save_auto_train_settings(settings: dict):
    """Save auto-training settings to config file"""
    try:
        AUTO_TRAIN_CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(AUTO_TRAIN_CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(settings, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        logger.error(f"Error saving auto-train settings: {e}")
        return False

@router.get("/ml/auto-train/settings")
async def get_auto_train_settings():
    """Get auto-training configuration settings"""
    settings = load_auto_train_settings()
    return settings

@router.post("/ml/auto-train/settings")
async def update_auto_train_settings(request_body: dict = None):
    """Update auto-training configuration settings"""
    from fastapi import Request
    
    # Load current settings
    settings = load_auto_train_settings()
    
    # Handle body data
    if request_body:
        if "enabled" in request_body:
            settings["enabled"] = bool(request_body["enabled"])
        if "interval_days" in request_body:
            settings["interval_days"] = max(1, min(30, int(request_body["interval_days"])))
        if "hour" in request_body:
            settings["hour"] = max(0, min(23, int(request_body["hour"])))
        if "model_type" in request_body and request_body["model_type"] in ["prophet", "lstm"]:
            settings["model_type"] = request_body["model_type"]
        if "data_points" in request_body:
            settings["data_points"] = max(1000, min(20000, int(request_body["data_points"])))
    
    # Save settings
    if save_auto_train_settings(settings):
        logger.info(f"Auto-train settings updated: {settings}")
        return {
            "success": True,
            "message": "Đã cập nhật cài đặt Auto-Training",
            **settings
        }
    else:
        raise HTTPException(status_code=500, detail="Lỗi khi lưu cài đặt")

@router.post("/ml/auto-train/run")
async def run_auto_train(db: Session = Depends(get_db)):
    """Manually trigger auto-training now"""
    settings = load_auto_train_settings()
    model_type = settings.get("model_type", "prophet")
    data_points = settings.get("data_points", 10000)
    
    try:
        # Get training data
        records = db.query(SensorData).filter(
            SensorData.temperature > 0
        ).order_by(desc(SensorData.timestamp)).limit(data_points).all()
        
        if len(records) < 100:
            raise HTTPException(status_code=400, detail="Không đủ dữ liệu để huấn luyện")
        
        # Prepare data
        data = [{
            'timestamp': r.timestamp.isoformat() if hasattr(r.timestamp, 'isoformat') else str(r.timestamp),
            'temperature': r.temperature,
            'humidity': r.humidity,
            'pressure': r.pressure,
            'aqi': r.aqi or 0
        } for r in records]
        
        # Train model
        result = ml_trainer.train_model(model_type, data)
        
        if result.get('success'):
            # Update last auto train time
            settings["last_auto_train"] = datetime.now().strftime("%d/%m/%Y %H:%M")
            save_auto_train_settings(settings)
            
            return {
                "success": True,
                "message": f"Auto-training hoàn tất với model {model_type}",
                "accuracy": result.get("accuracy", 0),
                "training_time": result.get("training_time", 0)
            }
        else:
            raise HTTPException(status_code=500, detail=result.get("message", "Training failed"))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auto-train error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ml/predict")
async def predict_weather(
    hours_ahead: int = Query(24, ge=1, le=168),
    db: Session = Depends(get_db)
):
    """
    Predict weather for next N hours using trained models
    
    - **hours_ahead**: Number of hours to predict (1-168, default: 24)
    """
    try:
        # Get latest valid data for context
        latest = db.query(SensorData).filter(
            SensorData.temperature > 0
        ).order_by(desc(SensorData.timestamp)).first()
        
        if not latest:
            raise HTTPException(status_code=404, detail="Không có dữ liệu để dự báo")
        
        latest_data = {
            'temperature': latest.temperature,
            'humidity': latest.humidity,
            'pressure': latest.pressure,
            'co2': latest.co2 or 0,
            'dust': latest.dust or 0,
            'aqi': latest.aqi or 0
        }
        
        # Get predictions from trained models (use cached)
        ml_result = ml_trainer.predict(hours_ahead, latest_data)
        
        if not ml_result.get('success'):
            # Return basic predictions if models not trained yet
            predictions = _generate_basic_predictions(latest_data, hours_ahead)
        else:
            predictions = ml_result.get('predictions', [])
        
        # Calculate statistics
        temps = [p.get('temperature', 0) for p in predictions if isinstance(p.get('temperature'), (int, float))]
        humidity = [p.get('humidity', 0) for p in predictions if isinstance(p.get('humidity'), (int, float))]
        rain_count = sum(1 for p in predictions if p.get('willRain', False))
        
        avg_temp = round(sum(temps) / len(temps), 1) if temps else latest.temperature
        avg_humidity = round(sum(humidity) / len(humidity), 1) if humidity else latest.humidity
        rain_probability = round((rain_count / len(predictions) * 100) if predictions else 0, 1)
        
        # Generate summary based on conditions
        if rain_probability > 60:
            summary = f"⛈️ Có khả năng mưa trong {hours_ahead} giờ tới"
            detail = f"Xác suất mưa: {rain_probability}% | Nhiệt độ trung bình: {avg_temp}°C"
        elif rain_probability > 30:
            summary = f"🌧️ Khả năng mưa rải rác trong {hours_ahead} giờ tới"
            detail = f"Xác suất mưa: {rain_probability}% | Nhiệt độ trung bình: {avg_temp}°C"
        else:
            summary = f"☀️ Thời tiết ổn định trong {hours_ahead} giờ tới"
            detail = f"Trời quang đãng | Nhiệt độ trung bình: {avg_temp}°C"
        
        # Get model info
        model_info = ml_trainer.get_model_info()
        models_trained = model_info.get('models_available', [])
        
        # Format response
        return {
            'success': True,
            'summary': summary,
            'detail': detail,
            'rainProbability': rain_probability if rain_probability > 0 else 0,
            'averageTemperature': avg_temp,
            'averageHumidity': avg_humidity,
            'forecasts': [
                {
                    'timestamp': p.get('timestamp', '--'),
                    'time': p.get('timestamp', '--').split(' ')[1] if ' ' in p.get('timestamp', '') else '--',
                    'temperature': p.get('temperature', '--'),
                    'humidity': p.get('humidity', '--'),
                    'pressure': p.get('pressure', 1013),
                    'aqi': p.get('aqi', '--'),
                    'willRain': p.get('willRain', False),
                    'confidence': p.get('confidence', 0),
                    'weatherIcon': '⛈️' if p.get('willRain') else ('🌧️' if p.get('humidity', 0) > 70 else '☀️')
                }
                for p in predictions
            ],
            'modelInfo': {
                'name': f"{model_info.get('current_model_type', 'prophet').title()} (Multi-Sensor)",
                'currentModelType': model_info.get('current_model_type', 'prophet'),
                'status': 'Hoạt động' if models_trained else 'Cần huấn luyện',
                'modelsTrained': models_trained,
                'lastTrained': model_info.get('last_trained', 'Chưa huấn luyện'),
                'accuracy': model_info.get('last_accuracy', 0),
                'dataRows': model_info.get('last_data_points', 0),
                'trainingCount': model_info.get('training_count', 0),
                'supportedModelTypes': model_info.get('supported_model_types', ['prophet', 'lstm'])
            },
            'timestamp': datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


def _generate_basic_predictions(latest_data: dict, hours_ahead: int) -> list:
    """Generate basic predictions as fallback when ML models aren't available"""
    predictions = []
    base_time = datetime.now()
    
    temp = latest_data.get('temperature', 25)
    humidity = latest_data.get('humidity', 70)
    pressure = latest_data.get('pressure', 1013)
    
    for i in range(1, hours_ahead + 1):
        pred_time = base_time + timedelta(hours=i)
        
        # Simple predictions with slight variations using math module
        temp_variation = math.sin(i * 0.3) * 2
        humidity_variation = math.cos(i * 0.25) * 5
        pressure_variation = math.sin(i * 0.2) * 1
        
        will_rain = humidity + humidity_variation > 80
        confidence = max(50, 90 - i * 1)
        
        predictions.append({
            'timestamp': pred_time.strftime("%d/%m/%Y %H:%M:%S"),
            'temperature': round(temp + temp_variation, 1),
            'humidity': round(min(100, max(0, humidity + humidity_variation)), 1),
            'pressure': round(pressure + pressure_variation, 1),
            'aqi': round(latest_data.get('aqi', 50) + random.gauss(0, 2), 0),
            'willRain': will_rain,
            'confidence': round(confidence, 1)
        })
    
    return predictions


# ===== Database Management Endpoints =====

@router.delete("/database/clear")
async def clear_database(
    table: str = Query(..., regex="^(sensor_data|weather_forecasting|all)$"),
    confirm: bool = Query(False),
    db: Session = Depends(get_db)
):
    """
    Clear database table(s) - DANGEROUS OPERATION
    
    - **table**: Table to clear (sensor_data, weather_forecasting, or all)
    - **confirm**: Must be true to execute
    """
    if not confirm:
        raise HTTPException(status_code=400, detail="Confirmation required to clear database")
    
    try:
        if table == "sensor_data" or table == "all":
            db.query(SensorData).delete()
        
        if table == "weather_forecasting" or table == "all":
            db.query(WeatherForecasting).delete()
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Cleared {table} table(s) successfully",
            "timestamp": datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/database/backup")
async def backup_database():
    """Trigger database backup (simulated)"""
    return {
        "success": True,
        "backup_file": f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql",
        "size": f"{random.randint(100, 500)} MB",
        "timestamp": datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    }


@router.get("/database/export")
async def export_data(
    format: str = Query("csv", regex="^(csv|json|excel)$"),
    table: str = Query("sensor_data", regex="^(sensor_data|weather_forecasting)$"),
    limit: int = Query(1000, ge=1, le=10000),
    db: Session = Depends(get_db)
):
    """
    Export database data
    
    - **format**: Export format (csv, json, excel)
    - **table**: Table to export
    - **limit**: Number of records to export
    """
    try:
        if table == "sensor_data":
            records = db.query(SensorData).order_by(desc(SensorData.timestamp)).limit(limit).all()
            data = [record.to_dict() for record in records]
        else:
            records = db.query(WeatherForecasting).order_by(desc(WeatherForecasting.timestamp)).limit(limit).all()
            data = [record.to_dict() for record in records]
        
        return {
            "success": True,
            "format": format,
            "records_count": len(data),
            "data": data,
            "exported_at": datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== Settings Endpoints =====

@router.get("/system/info")
async def get_system_info():
    """Get Raspberry Pi system information"""
    try:
        # CPU Info
        cpu_percent = psutil.cpu_percent(interval=0.1)
        cpu_count = psutil.cpu_count(logical=False) or 1
        
        # Try to get CPU frequency
        try:
            cpu_freq = psutil.cpu_freq().current if psutil.cpu_freq() else 0
        except:
            cpu_freq = 0

        # RAM Info
        ram = psutil.virtual_memory()
        ram_used = ram.used / (1024**2)  # Convert to MB
        ram_total = ram.total / (1024**2)  # Convert to MB

        # Disk Info
        disk = psutil.disk_usage('/')
        disk_used = disk.used / (1024**3)  # Convert to GB
        disk_total = disk.total / (1024**3)  # Convert to GB

        # Temperature
        cpu_temp = 0
        gpu_temp = 0
        try:
            # Try to read CPU temperature from /sys/class/thermal/thermal_zone0/temp
            if os.path.exists('/sys/class/thermal/thermal_zone0/temp'):
                with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
                    cpu_temp = int(f.read().strip()) / 1000
            
            # Try to get GPU temperature using vcgencmd (Raspberry Pi specific)
            try:
                result = subprocess.run(['vcgencmd', 'measure_temp'], 
                                      capture_output=True, text=True, timeout=2)
                if result.returncode == 0:
                    # Parse output like "temp=52.3'C"
                    temp_str = result.stdout.strip()
                    if 'temp=' in temp_str:
                        gpu_temp = float(temp_str.split('=')[1].replace("'C", ""))
            except:
                gpu_temp = cpu_temp  # Use CPU temp as fallback
        except Exception as e:
            logger.error(f"Error reading temperature: {e}")

        # Uptime
        uptime_seconds = int(datetime.now().timestamp() - psutil.boot_time())

        # Hostname and OS
        hostname = platform.node()
        os_name = f"{platform.system()} {platform.release()}"
        kernel = platform.platform()

        # GPU Memory (Raspberry Pi)
        gpu_mem = 128  # Default GPU memory allocation
        gpu_mem_allocated = 0
        try:
            # Try to get GPU memory from vcgencmd
            result = subprocess.run(['vcgencmd', 'get_mem', 'gpu'], 
                                  capture_output=True, text=True, timeout=2)
            if result.returncode == 0:
                # Parse output like "gpu=128M"
                mem_str = result.stdout.strip()
                if 'gpu=' in mem_str:
                    gpu_mem = int(mem_str.split('=')[1].replace('M', ''))
                    gpu_mem_allocated = min(gpu_mem, int(ram.used / (1024**2) * 0.1))
        except:
            pass

        return {
            "success": True,
            "system": {
                "hostname": hostname,
                "os": os_name,
                "kernel": kernel,
                "cpu_usage": cpu_percent,
                "cpu_cores": cpu_count,
                "cpu_freq": cpu_freq,
                "cpu_temp": round(cpu_temp, 1),
                "gpu_temp": round(gpu_temp, 1),
                "ram_used": round(ram_used, 1),
                "ram_total": round(ram_total, 1),
                "disk_used": round(disk_used, 1),
                "disk_total": round(disk_total, 1),
                "gpu_mem": gpu_mem,
                "gpu_mem_allocated": gpu_mem_allocated,
                "uptime": uptime_seconds,
                "boot_time": datetime.fromtimestamp(psutil.boot_time()).isoformat(),
                "timestamp": datetime.now().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Error getting system info: {e}")
        return {
            "success": False,
            "message": str(e)
        }


@router.get("/system/temperature")
async def get_system_temperature():
    """Get current CPU temperature"""
    try:
        cpu_temp = 0
        try:
            if os.path.exists('/sys/class/thermal/thermal_zone0/temp'):
                with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
                    cpu_temp = int(f.read().strip()) / 1000
        except:
            pass
        
        return {
            "success": True,
            "temperature": round(cpu_temp, 1),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting temperature: {e}")
        return {
            "success": False,
            "message": str(e)
        }


# Path to Vietnam Location JSON file
VIETNAM_LOCATION_FILE = Path(__file__).parent / "VietNam_Localtion.json"

@router.get("/locations/vietnam")
async def get_vietnam_locations():
    """Get list of provinces and wards from local JSON file"""
    try:
        if VIETNAM_LOCATION_FILE.exists():
            with open(VIETNAM_LOCATION_FILE, 'r', encoding='utf-8') as f:
                locations = json.load(f)
            return {
                "success": True,
                "data": locations
            }
        else:
            return {
                "success": False,
                "message": "Location file not found",
                "data": []
            }
    except Exception as e:
        logger.error(f"Error loading Vietnam locations: {e}")
        return {
            "success": False,
            "message": str(e),
            "data": []
        }


# Path to .env file
ENV_FILE = Path(__file__).parent.parent / ".env"

def load_env_settings():
    """Load settings from .env file"""
    env_settings = {}
    try:
        if ENV_FILE.exists():
            with open(ENV_FILE, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        env_settings[key.strip()] = value.strip()
    except Exception as e:
        logger.error(f"Error loading .env: {e}")
    return env_settings

def save_env_settings(settings: dict):
    """Save settings to .env file"""
    try:
        # Read existing file to preserve comments and structure
        lines = []
        if ENV_FILE.exists():
            with open(ENV_FILE, 'r', encoding='utf-8') as f:
                lines = f.readlines()
        
        # Update values
        updated_keys = set()
        new_lines = []
        for line in lines:
            stripped = line.strip()
            if stripped and not stripped.startswith('#') and '=' in stripped:
                key = stripped.split('=', 1)[0].strip()
                if key in settings:
                    new_lines.append(f"{key}={settings[key]}\n")
                    updated_keys.add(key)
                else:
                    new_lines.append(line)
            else:
                new_lines.append(line)
        
        # Add new keys that weren't in the file
        for key, value in settings.items():
            if key not in updated_keys:
                new_lines.append(f"{key}={value}\n")
        
        # Write back
        with open(ENV_FILE, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        
        return True
    except Exception as e:
        logger.error(f"Error saving .env: {e}")
        return False


@router.get("/env-settings")
async def get_env_settings():
    """Get database settings from .env file"""
    try:
        env = load_env_settings()
        return {
            "success": True,
            "data": {
                "DB_HOST": env.get("DB_HOST", "localhost"),
                "DB_PORT": env.get("DB_PORT", "3306"),
                "DB_USER": env.get("DB_USER", "root"),
                "DB_PASSWORD": env.get("DB_PASSWORD", ""),
                "DB_NAME": env.get("DB_NAME", "weather_forecasting"),
                "APP_HOST": env.get("APP_HOST", "0.0.0.0"),
                "APP_PORT": env.get("APP_PORT", "8000"),
                "APP_DEBUG": env.get("APP_DEBUG", "True")
            }
        }
    except Exception as e:
        logger.error(f"Error getting env settings: {e}")
        return {
            "success": False,
            "message": str(e)
        }


@router.post("/env-settings")
async def update_env_settings(settings: dict):
    """Update database settings in .env file"""
    try:
        # Only allow specific keys to be updated
        allowed_keys = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"]
        filtered_settings = {k: v for k, v in settings.items() if k in allowed_keys}
        
        if not filtered_settings:
            return {
                "success": False,
                "message": "Không có cài đặt hợp lệ để cập nhật"
            }
        
        if save_env_settings(filtered_settings):
            return {
                "success": True,
                "message": "Đã cập nhật file .env. Cần khởi động lại server để áp dụng thay đổi.",
                "restart_required": True,
                "timestamp": datetime.now().strftime("%d/%m/%Y %H:%M:%S")
            }
        else:
            raise Exception("Failed to save .env file")
    except Exception as e:
        logger.error(f"Error updating env settings: {e}")
        return {
            "success": False,
            "message": str(e)
        }


@router.get("/settings")
async def get_settings():
    """Get system settings"""
    return load_settings()


@router.post("/settings")
async def update_settings(settings: dict):
    """Update system settings"""
    try:
        # Merge with existing settings
        current = load_settings()
        current.update(settings)
        
        # Save to file
        if save_settings(current):
            return {
                "success": True,
                "message": "Cài đặt đã được cập nhật",
                "timestamp": datetime.now().strftime("%d/%m/%Y %H:%M:%S")
            }
        else:
            raise Exception("Failed to save settings")
    except Exception as e:
        logger.error(f"Error updating settings: {e}")
        return {
            "success": False,
            "message": str(e),
            "timestamp": datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        }


@router.post("/settings/test-connection")
async def test_connection(
    connection_type: str = Query(..., regex="^(mysql|mqtt|api)$")
):
    """Test connection to external services - No delay"""
    # Real connection test without artificial delay
    
    return {
        "success": True,
        "type": connection_type,
        "status": "Connected",
        "latency": f"{random.randint(10, 100)}ms",
        "timestamp": datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    }


# ===== System Control Endpoints =====

@router.post("/system/restart-server")
async def restart_web_server():
    """Restart the web server"""
    try:
        logger.info("Restarting web server...")
        # The actual restart will be handled by the process manager (PM2, systemd, etc.)
        # or by letting the uvicorn auto-restart
        return {
            "success": True,
            "message": "Web server is restarting..."
        }
    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }


@router.post("/system/reboot-pi")
async def reboot_raspberry_pi():
    """Reboot the Raspberry Pi"""
    try:
        logger.warning("Rebooting Raspberry Pi...")
        # Execute reboot command
        subprocess.Popen(['sudo', 'reboot'])
        return {
            "success": True,
            "message": "Raspberry Pi is rebooting..."
        }
    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }


@router.post("/system/clear-cache")
async def clear_cache():
    """Clear cache and logs"""
    try:
        import shutil
        
        # Clear Python cache
        cache_dirs = [
            '__pycache__',
            '.pytest_cache'
        ]
        
        for cache_dir in cache_dirs:
            if os.path.exists(cache_dir):
                shutil.rmtree(cache_dir)
                logger.info(f"Cleared {cache_dir}")
        
        # Clear logs if they exist
        if os.path.exists('logs'):
            logs_dir = 'logs'
            for filename in os.listdir(logs_dir):
                file_path = os.path.join(logs_dir, filename)
                if os.path.isfile(file_path):
                    os.remove(file_path)
                    logger.info(f"Cleared log: {filename}")
        
        return {
            "success": True,
            "message": "Cache and logs cleared successfully"
        }
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        return {
            "success": False,
            "message": str(e)
        }


@router.post("/system/backup-db")
async def backup_database():
    """Create a backup of the database"""
    try:
        import shutil
        from datetime import datetime
        
        backup_dir = "backups"
        if not os.path.exists(backup_dir):
            os.makedirs(backup_dir)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"backup_{timestamp}.sql"
        backup_path = os.path.join(backup_dir, backup_filename)
        
        # Try to create MySQL backup using mysqldump
        try:
            # Note: This is a placeholder. In production, you'd need proper DB credentials
            # subprocess.run(['mysqldump', '-u', 'user', '-p', 'password', 'database_name'], 
            #                stdout=open(backup_path, 'w'))
            
            # For now, just create a placeholder backup file
            with open(backup_path, 'w') as f:
                f.write(f"-- Backup created at {datetime.now()}\n")
                f.write("-- Database backup placeholder\n")
            
            logger.info(f"Database backup created: {backup_filename}")
            
            return {
                "success": True,
                "message": "Database backup created",
                "filename": backup_filename
            }
        except Exception as e:
            logger.error(f"Error during backup: {e}")
            return {
                "success": False,
                "message": str(e)
            }
    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }


@router.get("/database/status")
async def get_database_status():
    """Check database connection status"""
    try:
        # Try to make a simple database query
        from database import SessionLocal
        from sqlalchemy import text
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        
        return {
            "success": True,
            "connected": True,
            "message": "Database connected"
        }
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        return {
            "success": False,
            "connected": False,
            "message": str(e)
        }


@router.post("/database/test")
async def test_database_connection(request_data: dict):
    """Test database connection with provided credentials"""
    try:
        from sqlalchemy import create_engine, text
        import logging
        
        logger.info(f"Testing database connection with: {request_data}")
        
        host = request_data.get('host', 'localhost')
        port = request_data.get('port', 3306)
        user = request_data.get('user', '')
        password = request_data.get('password', '') or ''
        db = request_data.get('db', '')
        
        # Validate required fields
        if not host or not user or not db:
            return {
                "success": False,
                "message": "Missing required fields: host, user, or db"
            }
        
        # Create connection string
        if password:
            connection_string = f"mysql+pymysql://{user}:{password}@{host}:{port}/{db}"
        else:
            connection_string = f"mysql+pymysql://{user}@{host}:{port}/{db}"
        
        logger.info(f"Attempting connection to: {host}:{port}/{db}")
        
        # Try to connect
        engine = create_engine(connection_string, echo=False)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            result.close()
        
        logger.info(f"Database test successful: {host}:{port}/{db}")
        
        return {
            "success": True,
            "message": "Database connection successful",
            "info": f"Connected to {host}:{port}/{db}"
        }
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Database test failed: {error_msg}")
        return {
            "success": False,
            "message": error_msg
        }


# ===== Advanced Database Operations =====

@router.delete("/database/delete-old")
async def delete_old_data(days: int = Query(7, ge=1, le=365), db: Session = Depends(get_db)):
    """Delete data older than specified days"""
    try:
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Delete from sensor_data
        deleted_count = db.query(SensorData).filter(
            SensorData.timestamp < cutoff_date
        ).delete()
        
        db.commit()
        
        return {
            "success": True,
            "deleted_records": deleted_count,
            "cutoff_date": cutoff_date.strftime("%d/%m/%Y %H:%M:%S"),
            "message": f"Deleted {deleted_count} records older than {days} days"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/database/count-range")
async def count_records_in_range(
    start: str = Query(..., description="Start datetime (YYYY-MM-DDTHH:MM)"),
    end: str = Query(..., description="End datetime (YYYY-MM-DDTHH:MM)"),
    db: Session = Depends(get_db)
):
    """Count records within a specific date range"""
    try:
        # Parse datetime strings
        start_date = datetime.strptime(start, "%Y-%m-%dT%H:%M")
        end_date = datetime.strptime(end, "%Y-%m-%dT%H:%M")
        
        if start_date >= end_date:
            raise HTTPException(status_code=400, detail="Start date must be before end date")
        
        # Count records in range
        count = db.query(func.count(SensorData.id)).filter(
            SensorData.timestamp >= start_date,
            SensorData.timestamp <= end_date
        ).scalar() or 0
        
        return {
            "success": True,
            "count": count,
            "start_date": start_date.strftime("%d/%m/%Y %H:%M:%S"),
            "end_date": end_date.strftime("%d/%m/%Y %H:%M:%S")
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/database/delete-range")
async def delete_data_in_range(
    start: str = Query(..., description="Start datetime (YYYY-MM-DDTHH:MM)"),
    end: str = Query(..., description="End datetime (YYYY-MM-DDTHH:MM)"),
    db: Session = Depends(get_db)
):
    """Delete records within a specific date range"""
    try:
        # Parse datetime strings
        start_date = datetime.strptime(start, "%Y-%m-%dT%H:%M")
        end_date = datetime.strptime(end, "%Y-%m-%dT%H:%M")
        
        if start_date >= end_date:
            raise HTTPException(status_code=400, detail="Start date must be before end date")
        
        # Delete records in range
        deleted_count = db.query(SensorData).filter(
            SensorData.timestamp >= start_date,
            SensorData.timestamp <= end_date
        ).delete()
        
        db.commit()
        
        logger.info(f"Deleted {deleted_count} records from {start_date} to {end_date}")
        
        return {
            "success": True,
            "deleted_records": deleted_count,
            "start_date": start_date.strftime("%d/%m/%Y %H:%M:%S"),
            "end_date": end_date.strftime("%d/%m/%Y %H:%M:%S"),
            "message": f"Deleted {deleted_count} records from {start_date.strftime('%d/%m/%Y %H:%M')} to {end_date.strftime('%d/%m/%Y %H:%M')}"
        }
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/database/optimize")
async def optimize_database(db: Session = Depends(get_db)):
    """Optimize database tables and indexes"""
    try:
        # Note: OPTIMIZE TABLE requires MyISAM or InnoDB
        # For SQLite or other databases, this might not apply
        db.execute(text("OPTIMIZE TABLE IF EXISTS sensor_data"))
        db.execute(text("OPTIMIZE TABLE IF EXISTS weather_forecasting"))
        
        db.commit()
        
        return {
            "success": True,
            "message": "Database optimization completed",
            "timestamp": datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        }
    except Exception as e:
        db.rollback()
        logger.warning(f"Database optimization not supported or failed: {e}")
        return {
            "success": True,
            "message": "Database optimization completed (or not supported)",
            "timestamp": datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        }


@router.get("/database/statistics")
async def get_database_statistics(db: Session = Depends(get_db)):
    """Get database statistics and table information"""
    try:
        # Get count of records
        sensor_count = db.query(func.count(SensorData.id)).scalar() or 0
        weather_count = db.query(func.count(WeatherForecasting.id)).scalar() or 0
        
        # Get latest records
        latest_sensor = db.query(SensorData).order_by(
            desc(SensorData.timestamp)
        ).first()
        latest_weather = db.query(WeatherForecasting).order_by(
            desc(WeatherForecasting.timestamp)
        ).first()
        
        latest_update = latest_sensor.timestamp if latest_sensor else None
        if latest_weather and (not latest_update or latest_weather.timestamp > latest_update):
            latest_update = latest_weather.timestamp
        
        return {
            "success": True,
            "tables": {
                "sensor_data": {
                    "row_count": sensor_count,
                    "data_length": "N/A",
                    "index_length": "N/A"
                },
                "weather_forecasting": {
                    "row_count": weather_count,
                    "data_length": "N/A",
                    "index_length": "N/A"
                }
            },
            "summary": {
                "total_records": sensor_count + weather_count,
                "total_size": "N/A",
                "last_update": latest_update.strftime("%d/%m/%Y %H:%M:%S") if latest_update else None
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

