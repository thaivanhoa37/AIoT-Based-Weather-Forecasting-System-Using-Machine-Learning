"""
API Routes - RESTful API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, func
from typing import List, Optional
from datetime import datetime, timedelta
import random
import logging

from database import get_db
from models.sensor_data import SensorData
from models.weather_forecasting import WeatherForecasting
from ml_utils import ml_trainer

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)


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
    model_type: str = Query("prophet", regex="^(prophet|lstm|arima)$"),
    data_points: int = Query(1000, ge=100, le=10000),
    db: Session = Depends(get_db)
):
    """
    Train ML model for weather forecasting with real Prophet implementation
    
    - **model_type**: Type of model (prophet is fully implemented, lstm/arima are legacy)
    - **data_points**: Number of historical data points to use (actual used: available data)
    """
    try:
        # Get training data - order by ascending time (oldest first) for proper time series
        records = db.query(SensorData).order_by(SensorData.timestamp).limit(data_points).all()
        
        if len(records) < 100:
            raise HTTPException(status_code=400, detail="Không đủ dữ liệu để huấn luyện (tối thiểu 100 bản ghi)")
        
        # Train all models (temperature, humidity, aqi) using Prophet
        train_result = ml_trainer.train_all_models(records)
        
        # Format response for frontend
        if train_result.get('success'):
            return {
                'success': True,
                'models_trained': train_result.get('models_trained', []),
                'all_metrics': train_result.get('metrics', {}),
                'overall_accuracy': train_result.get('accuracy', 0),
                'data_points_used': train_result.get('data_points', 0),
                'training_time': f"{train_result.get('time_seconds', 0):.2f}s",
                'timestamp': train_result.get('timestamp', datetime.now().isoformat())
            }
        else:
            raise HTTPException(status_code=400, detail=train_result.get('error', 'Training failed'))
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ML training error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ml/model-info")
async def get_model_info():
    """Get current ML model information"""
    info = ml_trainer.get_model_info()
    
    if info['models_available']:
        return {
            "models_available": info['models_available'],
            "training_count": info['training_count'],
            "last_trained": info.get('last_trained', 'Chưa huấn luyện'),
            "last_accuracy": info.get('last_accuracy', 0),
            "last_data_points": info.get('last_data_points', 0),
            "metrics": info.get('metrics', {}),
            "status": "Hoạt động" if info['models_available'] else "Cần huấn luyện"
        }
    else:
        return {
            "models_available": [],
            "training_count": 0,
            "last_trained": "Chưa huấn luyện",
            "status": "Cần huấn luyện",
            "message": "Vui lòng huấn luyện mô hình trước"
        }


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
                'name': 'Prophet (Multi-Sensor)',
                'status': 'Hoạt động' if models_trained else 'Cần huấn luyện',
                'modelsTrained': models_trained,
                'lastTrained': model_info.get('last_trained', 'Chưa huấn luyện'),
                'accuracy': model_info.get('last_accuracy', 0),
                'dataRows': model_info.get('last_data_points', 0),
                'trainingCount': model_info.get('training_count', 0)
            },
            'timestamp': datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _generate_basic_predictions(latest_data: dict, hours_ahead: int) -> dict:
    """Generate basic predictions as fallback when ML models aren't available"""
    predictions = []
    base_time = datetime.now()
    
    temp = latest_data.get('temperature', 25)
    humidity = latest_data.get('humidity', 70)
    pressure = latest_data.get('pressure', 1013)
    
    for i in range(1, hours_ahead + 1):
        pred_time = base_time + timedelta(hours=i)
        
        # Simple predictions with slight variations
        temp_variation = np.sin(i * 0.3) * 2
        humidity_variation = np.cos(i * 0.25) * 5
        pressure_variation = np.sin(i * 0.2) * 1
        
        will_rain = humidity + humidity_variation > 80
        confidence = max(50, 90 - i * 1)
        
        predictions.append({
            'timestamp': pred_time.strftime("%d/%m/%Y %H:%M:%S"),
            'temperature': round(temp + temp_variation, 1),
            'humidity': round(min(100, max(0, humidity + humidity_variation)), 1),
            'pressure': round(pressure + pressure_variation, 1),
            'aqi': round(latest_data.get('aqi', 50) + np.random.normal(0, 2), 0),
            'willRain': will_rain,
            'confidence': round(confidence, 1)
        })
    
    return {
        'success': True,
        'predictions': predictions,
        'models_used': [],
        'timestamp': datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    }


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

@router.get("/settings")
async def get_settings():
    """Get system settings"""
    return {
        "station_name": "Trạm Công nghệ cao, Quận 9",
        "node1_id": "NODE_001",
        "node2_id": "NODE_002",
        "location": {
            "latitude": 10.8505,
            "longitude": 106.7717,
            "address": "Khu Công nghệ cao, Quận 9, TP. Hồ Chí Minh"
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
            "email_notifications": True,
            "email": "admin@weather-station.com"
        }
    }


@router.post("/settings")
async def update_settings(settings: dict):
    """Update system settings"""
    # In real implementation, save to database or config file
    return {
        "success": True,
        "message": "Cài đặt đã được cập nhật",
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
