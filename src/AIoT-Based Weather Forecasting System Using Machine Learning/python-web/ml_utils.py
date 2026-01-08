"""
Machine Learning Utilities Module
Central manager for all ML models (Prophet, LightGBM/XGBoost)
"""

import json
import logging
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta

# Setup logging
logger = logging.getLogger(__name__)

# Model storage paths
BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models_storage"
MODELS_DIR.mkdir(exist_ok=True)

# Paths for history and metrics
HISTORY_FILE = MODELS_DIR / 'training_history.json'
CURRENT_MODEL_FILE = MODELS_DIR / 'current_model.json'

# Import model classes
from models.prophet_model import prophet_model
from models.lightgbm_model import lightgbm_model


class MLManager:
    """Central manager for all ML models"""
    
    def __init__(self):
        self.models = {
            'prophet': prophet_model,
            'lightgbm': lightgbm_model
        }
        self.current_model_type = 'prophet'
        self.training_history = []
        self._load_training_history()
        self._load_current_model()
    
    def _load_training_history(self):
        """Load training history from file"""
        try:
            if HISTORY_FILE.exists():
                with open(HISTORY_FILE, 'r') as f:
                    self.training_history = json.load(f)
        except Exception as e:
            logger.error(f"Error loading training history: {e}")
            self.training_history = []
    
    def _save_training_history(self):
        """Save training history to file"""
        try:
            with open(HISTORY_FILE, 'w') as f:
                json.dump(self.training_history, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Error saving training history: {e}")
    
    def _load_current_model(self):
        """Load current model preference"""
        try:
            if CURRENT_MODEL_FILE.exists():
                with open(CURRENT_MODEL_FILE, 'r') as f:
                    data = json.load(f)
                    self.current_model_type = data.get('model_type', 'prophet')
        except Exception as e:
            logger.error(f"Error loading current model: {e}")
    
    def _save_current_model(self):
        """Save current model preference"""
        try:
            with open(CURRENT_MODEL_FILE, 'w') as f:
                json.dump({
                    'model_type': self.current_model_type,
                    'updated_at': datetime.now().isoformat()
                }, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving current model: {e}")
    
    def set_current_model(self, model_type: str):
        """Set the current active model type"""
        if model_type in self.models:
            self.current_model_type = model_type
            self._save_current_model()
            logger.info(f"Set current model to: {model_type}")
            return True
        return False
    
    def get_current_model(self):
        """Get the current active model"""
        return self.models.get(self.current_model_type, prophet_model)
    
    def train_model(self, model_type: str, data: list, targets: list) -> dict:
        """
        Train model with specific targets (for auto-train compatibility)
        
        Args:
            model_type: Type of model to train (prophet, lightgbm)
            data: List of data dictionaries with sensor readings
            targets: List of target features to train
        
        Returns:
            dict with training results
        """
        try:
            from models.sensor_data import SensorData
            from datetime import datetime
            
            # Convert data dictionaries to SensorData objects
            records = []
            for d in data:
                record = SensorData(
                    timestamp=datetime.fromisoformat(d['timestamp']) if isinstance(d['timestamp'], str) else d['timestamp'],
                    temperature=d.get('temperature', 0),
                    humidity=d.get('humidity', 0),
                    pressure=d.get('pressure', 0),
                    aqi=d.get('aqi', 0)
                )
                records.append(record)
            
            # Separate sensor and weather targets
            sensor_targets = [t for t in targets if t in ['temperature', 'humidity', 'pressure', 'aqi', 'co2', 'dust']]
            weather_targets = [t for t in targets if t in ['wind_speed', 'rainfall', 'uv_index']]
            
            # For weather targets, we need to get weather data
            weather_records = None
            if weather_targets:
                try:
                    from database import SessionLocal
                    from models.weather_forecasting import WeatherForecasting
                    from sqlalchemy import desc
                    
                    db = SessionLocal()
                    weather_records = db.query(WeatherForecasting).order_by(
                        desc(WeatherForecasting.timestamp)
                    ).limit(len(records)).all()
                    db.close()
                except Exception as e:
                    logger.warning(f"Could not fetch weather data: {e}")
                    weather_records = None
            
            # Call train_selected_targets
            result = self.train_selected_targets(
                records,
                model_type,
                sensor_targets,
                weather_records,
                weather_targets
            )
            
            # Format result for compatibility
            if result.get('success'):
                return {
                    'success': True,
                    'accuracy': result.get('overall_accuracy', 0) / 100,  # Convert to decimal
                    'training_time': result.get('training_time', 0),
                    'message': 'Training completed successfully',
                    'models_trained': result.get('models_trained', [])
                }
            else:
                return {
                    'success': False,
                    'message': result.get('error', 'Training failed')
                }
                
        except Exception as e:
            logger.error(f"Error in train_model: {e}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'message': str(e)
            }
    
    def train_all_models(self, records, model_type: str = None, weather_records=None) -> dict:
        """
        Train a specific model type or current model with all targets
        
        Args:
            records: List of SensorData records from database
            model_type: Type of model to train (prophet, lightgbm)
            weather_records: List of WeatherForecasting records from database (optional)
        
        Returns:
            dict with training results
        """
        # Use train_selected_targets with all targets
        sensor_targets = ['temperature', 'humidity', 'aqi', 'pressure', 'co2', 'dust']
        weather_targets = ['wind_speed', 'rainfall', 'uv_index'] if weather_records else []
        
        return self.train_selected_targets(
            records, 
            model_type, 
            sensor_targets, 
            weather_records, 
            weather_targets
        )
    
    def train_selected_targets(self, records, model_type: str = None, 
                               sensor_targets: list = None, 
                               weather_records=None, 
                               weather_targets: list = None) -> dict:
        """
        Train a specific model type with selected targets
        
        Args:
            records: List of SensorData records from database
            model_type: Type of model to train (prophet, lightgbm)
            sensor_targets: List of sensor targets to train (e.g., ['temperature', 'humidity'])
            weather_records: List of WeatherForecasting records from database (optional)
            weather_targets: List of weather targets to train (e.g., ['wind_speed'])
        
        Returns:
            dict with training results
        """
        if model_type is None:
            model_type = self.current_model_type
        
        if model_type not in self.models:
            return {
                'success': False,
                'error': f'Unknown model type: {model_type}'
            }
        
        # Default targets if not specified
        if sensor_targets is None:
            sensor_targets = ['temperature', 'humidity', 'aqi', 'pressure', 'co2', 'dust']
        if weather_targets is None:
            weather_targets = []
        
        try:
            start_time = datetime.now()
            
            # Get the model and train it with selected targets
            model = self.models[model_type]
            
            # Train with sensor_data records for selected sensor targets
            result = model.train_selected(records, sensor_targets)
            
            # If weather_records and weather_targets provided, train weather targets too
            weather_result = None
            if weather_records and len(weather_records) > 0 and weather_targets:
                weather_result = model.train_weather_selected(weather_records, weather_targets)
            
            # Combine results
            if result.get('success'):
                models_trained = result.get('models_trained', [])
                all_metrics = result.get('metrics', {})
                total_training_time = result.get('training_time', 0)
                
                # Add weather models if successful
                if weather_result and weather_result.get('success'):
                    models_trained.extend(weather_result.get('models_trained', []))
                    all_metrics.update(weather_result.get('metrics', {}))
                    total_training_time += weather_result.get('training_time', 0)
                
                # Recalculate overall accuracy
                accuracies = []
                for m in all_metrics.values():
                    if isinstance(m, dict):
                        acc = m.get('accuracy', 0)
                        if acc == 0 and 'r2' in m:
                            acc = max(0, m.get('r2', 0) * 100)
                        if acc > 0:
                            accuracies.append(acc)
                overall_accuracy = np.mean(accuracies) if accuracies else 0
                
                # Print final summary
                print("\n" + "="*60)
                print("✅ HOÀN THÀNH HUẤN LUYỆN " + model_type.upper())
                print("="*60)
                print(f"📊 Models đã train: {', '.join(models_trained)}")
                print(f"🎯 Độ chính xác tổng: {overall_accuracy:.2f}%")
                print(f"⏱️  Thời gian: {total_training_time:.2f}s")
                print("="*60 + "\n")
                
                # Update current model type
                self.current_model_type = model_type
                self._save_current_model()
                
                # Record training history
                training_record = {
                    'timestamp': datetime.now().isoformat(),
                    'model_type': model_type,
                    'models_trained': models_trained,
                    'metrics': all_metrics,
                    'overall_accuracy': round(float(overall_accuracy), 2),
                    'training_time': (datetime.now() - start_time).total_seconds(),
                    'data_points': len(records),
                    'weather_data_points': len(weather_records) if weather_records else 0
                }
                
                self.training_history.append(training_record)
                # Keep only last 100 records
                if len(self.training_history) > 100:
                    self.training_history = self.training_history[-100:]
                self._save_training_history()
                
                logger.info(f"Training completed for {model_type}: {overall_accuracy:.2f}% accuracy")
                
                return {
                    'success': True,
                    'model_type': model_type,
                    'models_trained': models_trained,
                    'metrics': all_metrics,
                    'overall_accuracy': round(float(overall_accuracy), 2),
                    'training_time': round((datetime.now() - start_time).total_seconds(), 2),
                    'data_points': len(records) + (len(weather_records) if weather_records else 0)
                }
            
            return result
            
        except Exception as e:
            logger.error(f"Error training model {model_type}: {e}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'error': str(e)
            }
    
    def predict(self, hours_ahead: int = 24, latest_data: dict = None, 
                model_type: str = None) -> dict:
        """
        Make predictions using the specified or current model
        
        Args:
            hours_ahead: Number of hours to predict
            latest_data: Latest sensor data for context
            model_type: Type of model to use for prediction
        
        Returns:
            dict with predictions
        """
        if model_type is None:
            model_type = self.current_model_type
        
        if model_type not in self.models:
            return {
                'success': False,
                'error': f'Unknown model type: {model_type}'
            }
        
        try:
            model = self.models[model_type]
            result = model.predict_all(hours_ahead, latest_data)
            
            if result.get('success'):
                result['current_model_type'] = model_type
            
            return result
            
        except Exception as e:
            logger.error(f"Error predicting with {model_type}: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_model_info(self, model_type: str = None) -> dict:
        """Get information about a specific model or all models"""
        try:
            if model_type and model_type in self.models:
                model = self.models[model_type]
                info = model.get_info()
                info['is_current'] = (model_type == self.current_model_type)
                return info
            
            # Get info from current/last trained model
            all_info = {}
            for mtype, model in self.models.items():
                info = model.get_info()
                info['is_current'] = (mtype == self.current_model_type)
                all_info[mtype] = info
            
            # Get last training from history
            last_trained = None
            last_accuracy = 0
            last_data_points = 0
            models_available = []
            current_model_type = self.current_model_type
            
            if self.training_history:
                last_record = self.training_history[-1]
                last_trained = last_record.get('timestamp', '')
                
                # Calculate overall accuracy from metrics if overall_accuracy is 0
                last_accuracy = last_record.get('overall_accuracy', 0)
                if last_accuracy == 0 and 'metrics' in last_record:
                    metrics = last_record['metrics']
                    accuracies = []
                    for target, m in metrics.items():
                        if isinstance(m, dict):
                            # Try r2 score converted to percentage, or accuracy directly
                            acc = m.get('accuracy', 0)
                            if acc == 0 and 'r2' in m:
                                r2 = m.get('r2', 0)
                                if r2 > 0:
                                    acc = r2 * 100
                            if acc > 0:
                                accuracies.append(acc)
                    if accuracies:
                        last_accuracy = sum(accuracies) / len(accuracies)
                
                last_data_points = last_record.get('data_points', 0)
                # Also check data_info.total_points for old format
                if last_data_points == 0 and 'data_info' in last_record:
                    last_data_points = last_record['data_info'].get('total_points', 0)
                    
                models_available = last_record.get('models_trained', [])
                current_model_type = last_record.get('model_type', self.current_model_type)
            
            # If no history, check current model
            if not models_available:
                current = self.get_current_model()
                if current and current.models:
                    models_available = list(current.models.keys())
            
            return {
                'current_model_type': current_model_type,
                'models_available': models_available,
                'training_count': len(self.training_history),
                'last_trained': last_trained,
                'last_accuracy': last_accuracy,
                'last_data_points': last_data_points,
                'status': 'Hoạt động' if models_available else 'Cần huấn luyện',
                'all_models': all_info,
                'supported_model_types': list(self.models.keys())
            }
            
        except Exception as e:
            logger.error(f"Error getting model info: {e}")
            return {
                'current_model_type': self.current_model_type,
                'models_available': [],
                'training_count': 0,
                'status': 'Lỗi',
                'error': str(e)
            }
    
    def get_training_history(self, limit: int = 10) -> list:
        """Get training history records"""
        return self.training_history[-limit:]
    
    def get_all_metrics(self) -> dict:
        """Get metrics from all model types"""
        metrics = {}
        for mtype, model in self.models.items():
            info = model.get_info()
            if info.get('metrics'):
                metrics[mtype] = info['metrics']
        return metrics
    
    def compare_models(self) -> dict:
        """Compare all trained models"""
        comparison = {}
        
        for mtype, model in self.models.items():
            info = model.get_info()
            metrics = info.get('metrics', {})
            
            if metrics:
                # Extract accuracy from each metric dict
                accuracies = [
                    m.get('accuracy', 0) 
                    for m in metrics.values() 
                    if isinstance(m, dict) and m.get('accuracy', 0) > 0
                ]
                avg_accuracy = np.mean(accuracies) if accuracies else 0
                
                comparison[mtype] = {
                    'model_name': 'Prophet' if mtype == 'prophet' else 'LightGBM',
                    'models_available': info.get('models_available', []),
                    'models_count': len(info.get('models_available', [])),
                    'average_accuracy': round(float(avg_accuracy), 2),
                    'metrics_count': len(metrics),
                    'metrics': metrics
                }
            else:
                # Model has no metrics yet
                comparison[mtype] = {
                    'model_name': 'Prophet' if mtype == 'prophet' else 'LightGBM',
                    'models_available': info.get('models_available', []),
                    'models_count': len(info.get('models_available', [])),
                    'average_accuracy': 0,
                    'metrics_count': 0,
                    'metrics': {}
                }
        
        # Find best model based on average accuracy
        best_model = None
        best_accuracy = 0
        for mtype, data in comparison.items():
            if data['average_accuracy'] > best_accuracy:
                best_accuracy = data['average_accuracy']
                best_model = mtype
        
        return {
            'comparison': comparison,
            'best_model': best_model,
            'best_accuracy': round(float(best_accuracy), 2) if best_accuracy > 0 else 0,
            'current_model': self.current_model_type
        }


# Create global instance
ml_manager = MLManager()

# For backward compatibility
ml_trainer = ml_manager
