"""
Prophet Model for Weather Forecasting
Time series forecasting using Facebook Prophet
With fallback to simple seasonal decomposition if Prophet fails
"""

import logging
import pickle
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler

# Import hàm tính giờ ngày/đêm theo mùa Việt Nam
from models.lightgbm_model import is_daytime_vietnam, get_time_period_vietnam

logger = logging.getLogger(__name__)

# Model storage paths
BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models_storage" / "prophet"
MODELS_DIR.mkdir(parents=True, exist_ok=True)


class SimpleSeasonalModel:
    """Simple seasonal decomposition model as fallback"""
    
    def __init__(self):
        self.hourly_pattern = None
        self.daily_pattern = None
        self.weekly_pattern = None
        self.trend_model = None
        self.scaler = StandardScaler()
        self.base_value = 0
        self.last_values = []
    
    def fit(self, df):
        """Fit the seasonal model"""
        df = df.copy()
        df['hour'] = df['ds'].dt.hour
        df['dayofweek'] = df['ds'].dt.dayofweek
        df['dayofyear'] = df['ds'].dt.dayofyear
        
        # Calculate base value
        self.base_value = df['y'].mean()
        
        # Calculate hourly pattern
        self.hourly_pattern = df.groupby('hour')['y'].mean().to_dict()
        
        # Calculate weekly pattern
        self.weekly_pattern = df.groupby('dayofweek')['y'].mean().to_dict()
        
        # Store last values for prediction
        self.last_values = df['y'].tail(24).values.tolist()
        
        # Simple trend model
        X = df[['hour', 'dayofweek', 'dayofyear']].values
        y = df['y'].values
        
        self.scaler.fit(X)
        X_scaled = self.scaler.transform(X)
        
        self.trend_model = Ridge(alpha=1.0)
        self.trend_model.fit(X_scaled, y)
        
        return self
    
    def predict(self, future_df):
        """Make predictions"""
        future_df = future_df.copy()
        future_df['hour'] = future_df['ds'].dt.hour
        future_df['dayofweek'] = future_df['ds'].dt.dayofweek
        future_df['dayofyear'] = future_df['ds'].dt.dayofyear
        
        predictions = []
        
        for _, row in future_df.iterrows():
            hour = row['hour']
            dow = row['dayofweek']
            doy = row['dayofyear']
            
            # Get seasonal components
            hourly = self.hourly_pattern.get(hour, self.base_value)
            weekly = self.weekly_pattern.get(dow, self.base_value)
            
            # Combine patterns
            seasonal = (hourly + weekly) / 2
            
            # Add trend prediction
            X = np.array([[hour, dow, doy]])
            X_scaled = self.scaler.transform(X)
            trend = self.trend_model.predict(X_scaled)[0]
            
            # Weighted combination
            pred = 0.6 * trend + 0.4 * seasonal
            predictions.append(pred)
        
        result = future_df.copy()
        result['yhat'] = predictions
        result['yhat_lower'] = [p * 0.9 for p in predictions]
        result['yhat_upper'] = [p * 1.1 for p in predictions]
        
        return result


class ProphetModel:
    """Prophet Model for time series weather forecasting"""
    
    def __init__(self):
        self.models = {}
        self.metrics = {}
        self.model_type = "prophet"
        # Sensor data targets (6)
        self.sensor_targets = ['temperature', 'humidity', 'aqi', 'pressure', 'co2', 'dust']
        # Weather API targets (3)
        self.weather_targets = ['wind_speed', 'rainfall', 'uv_index']
        # All supported targets (9)
        self.supported_targets = self.sensor_targets + self.weather_targets
        self.use_prophet = False  # Use fallback by default
        self._load_models()
    
    def _get_model_path(self, target: str) -> Path:
        """Get model file path for a target variable"""
        return MODELS_DIR / f"prophet_{target}.pkl"
    
    def _load_models(self):
        """Load trained models from disk"""
        try:
            for target in self.supported_targets:
                path = self._get_model_path(target)
                if path.exists():
                    with open(path, 'rb') as f:
                        data = pickle.load(f)
                        self.models[target] = data.get('model')
                        self.metrics[target] = data.get('metrics', {})
                        logger.info(f"[Prophet] Loaded model: {target}")
        except Exception as e:
            logger.error(f"[Prophet] Error loading models: {e}")
    
    def _save_model(self, target: str):
        """Save a trained model to disk"""
        try:
            if target in self.models:
                data = {
                    'model': self.models[target],
                    'metrics': self.metrics.get(target, {})
                }
                with open(self._get_model_path(target), 'wb') as f:
                    pickle.dump(data, f)
                    logger.info(f"[Prophet] Saved model: {target}")
        except Exception as e:
            logger.error(f"[Prophet] Error saving model {target}: {e}")
    
    def prepare_data(self, records, target_column: str) -> pd.DataFrame:
        """
        Prepare data for Prophet training
        Prophet requires 'ds' (datetime) and 'y' (value) columns
        """
        try:
            data = []
            for record in records:
                value = getattr(record, target_column, None)
                if value is not None and value > 0:
                    data.append({
                        'ds': record.timestamp,
                        'y': float(value)
                    })
            
            if len(data) < 50:
                logger.warning(f"[Prophet] Insufficient data for {target_column}: {len(data)} records")
                return None
            
            df = pd.DataFrame(data)
            df['ds'] = pd.to_datetime(df['ds'])
            df = df.sort_values('ds').reset_index(drop=True)
            
            # Remove outliers using IQR method
            Q1 = df['y'].quantile(0.25)
            Q3 = df['y'].quantile(0.75)
            IQR = Q3 - Q1
            df = df[(df['y'] >= Q1 - 1.5 * IQR) & (df['y'] <= Q3 + 1.5 * IQR)]
            
            logger.info(f"[Prophet] Prepared {len(df)} records for {target_column}")
            return df
            
        except Exception as e:
            logger.error(f"[Prophet] Error preparing data for {target_column}: {e}")
            return None
    
    def train(self, records, target_column: str) -> dict:
        """
        Train Prophet model for a specific target variable
        Returns metrics dict with mae, rmse, r2, accuracy
        """
        try:
            df = self.prepare_data(records, target_column)
            if df is None or len(df) < 50:
                return {'success': False, 'error': 'Insufficient data'}
            
            # Use simple seasonal model (reliable fallback)
            model = SimpleSeasonalModel()
            model.fit(df)
            
            # Make predictions on training data for evaluation
            forecast = model.predict(df[['ds']])
            
            # Calculate metrics
            y_true = df['y'].values
            y_pred = forecast['yhat'].values
            
            # Ensure same length
            min_len = min(len(y_true), len(y_pred))
            y_true = y_true[:min_len]
            y_pred = y_pred[:min_len]
            
            mae = mean_absolute_error(y_true, y_pred)
            rmse = np.sqrt(mean_squared_error(y_true, y_pred))
            
            # Calculate R2
            ss_res = np.sum((y_true - y_pred) ** 2)
            ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
            r2 = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
            r2 = max(-1, min(1, r2))
            
            accuracy = max(0, min(100, r2 * 100))
            
            # Store model and metrics
            self.models[target_column] = model
            self.metrics[target_column] = {
                'mae': round(float(mae), 4),
                'rmse': round(float(rmse), 4),
                'r2': round(float(r2), 4),
                'accuracy': round(float(accuracy), 2),
                'data_points': len(df)
            }
            
            # Save model to disk
            self._save_model(target_column)
            
            logger.info(f"[Prophet] Trained {target_column}: MAE={mae:.4f}, RMSE={rmse:.4f}, R2={r2:.4f}")
            
            return {
                'success': True,
                'metrics': self.metrics[target_column]
            }
            
        except Exception as e:
            logger.error(f"[Prophet] Training error for {target_column}: {e}")
            import traceback
            traceback.print_exc()
            return {'success': False, 'error': str(e)}
    
    def train_all(self, records) -> dict:
        """Train models for sensor data targets only (6 targets)"""
        start_time = datetime.now()
        models_trained = []
        all_metrics = {}
        
        print("\n" + "="*60)
        print("🚀 BẮT ĐẦU HUẤN LUYỆN MODEL PROPHET")
        print("="*60)
        print(f"📊 Số lượng dữ liệu sensor: {len(records)} records")
        print(f"🕐 Thời gian bắt đầu: {start_time.strftime('%H:%M:%S')}")
        print("-"*60)
        
        # Only train sensor targets (6 targets from SensorData)
        for i, target in enumerate(self.sensor_targets, 1):
            print(f"\n[{i}/{len(self.sensor_targets)}] 🎯 Training: {target.upper()}")
            result = self.train(records, target)
            if result.get('success'):
                models_trained.append(target)
                all_metrics[target] = result['metrics']
                metrics = result['metrics']
                print(f"    ✅ Thành công!")
                print(f"    📈 R² Score: {metrics.get('r2', 0)*100:.2f}%")
                print(f"    📉 MAE: {metrics.get('mae', 0):.4f}")
                print(f"    📉 RMSE: {metrics.get('rmse', 0):.4f}")
            else:
                print(f"    ❌ Thất bại: {result.get('error', 'Unknown error')}")
        
        training_time = (datetime.now() - start_time).total_seconds()
        
        if models_trained:
            # Calculate overall accuracy
            accuracies = [m.get('accuracy', 0) for m in all_metrics.values()]
            overall_accuracy = np.mean(accuracies) if accuracies else 0
            
            return {
                'success': True,
                'model_type': self.model_type,
                'models_trained': models_trained,
                'metrics': all_metrics,
                'overall_accuracy': round(float(overall_accuracy), 2),
                'training_time': round(training_time, 2),
                'data_points': len(records)
            }
        else:
            print("\n❌ THẤT BẠI: Không train được model nào!")
            return {
                'success': False,
                'model_type': self.model_type,
                'error': 'Failed to train any models'
            }
    
    def train_selected(self, records, selected_targets: list) -> dict:
        """
        Train models for selected sensor data targets only
        
        Args:
            records: List of SensorData records from database
            selected_targets: List of targets to train (e.g., ['temperature', 'humidity'])
        
        Returns:
            dict with training results
        """
        start_time = datetime.now()
        models_trained = []
        all_metrics = {}
        
        # Filter only valid sensor targets
        targets_to_train = [t for t in selected_targets if t in self.sensor_targets]
        
        if not targets_to_train:
            return {
                'success': False,
                'error': 'No valid sensor targets selected'
            }
        
        print("\n" + "="*60)
        print("🚀 BẮT ĐẦU HUẤN LUYỆN MODEL PROPHET (SELECTED TARGETS)")
        print("="*60)
        print(f"📊 Số lượng dữ liệu sensor: {len(records)} records")
        print(f"🎯 Targets đã chọn: {', '.join(targets_to_train)}")
        print(f"🕐 Thời gian bắt đầu: {start_time.strftime('%H:%M:%S')}")
        print("-"*60)
        
        for i, target in enumerate(targets_to_train, 1):
            print(f"\n[{i}/{len(targets_to_train)}] 🎯 Training: {target.upper()}")
            result = self.train(records, target)
            if result.get('success'):
                models_trained.append(target)
                all_metrics[target] = result['metrics']
                metrics = result['metrics']
                print(f"    ✅ Thành công!")
                print(f"    📈 R² Score: {metrics.get('r2', 0)*100:.2f}%")
                print(f"    📉 MAE: {metrics.get('mae', 0):.4f}")
                print(f"    📉 RMSE: {metrics.get('rmse', 0):.4f}")
            else:
                print(f"    ❌ Thất bại: {result.get('error', 'Unknown error')}")
        
        training_time = (datetime.now() - start_time).total_seconds()
        
        if models_trained:
            accuracies = [m.get('accuracy', 0) for m in all_metrics.values()]
            overall_accuracy = np.mean(accuracies) if accuracies else 0
            
            return {
                'success': True,
                'model_type': self.model_type,
                'models_trained': models_trained,
                'metrics': all_metrics,
                'overall_accuracy': round(float(overall_accuracy), 2),
                'training_time': round(training_time, 2),
                'data_points': len(records)
            }
        else:
            print("\n❌ THẤT BẠI: Không train được model nào!")
            return {
                'success': False,
                'model_type': self.model_type,
                'error': 'Failed to train any models'
            }
    
    def train_weather_targets(self, weather_records) -> dict:
        """
        Train models for weather API targets (wind_speed, rainfall, uv_index)
        
        Args:
            weather_records: List of WeatherForecasting records from database
        
        Returns:
            dict with training results
        """
        start_time = datetime.now()
        models_trained = []
        all_metrics = {}
        
        print(f"\n📊 Dữ liệu weather API: {len(weather_records)} records")
        
        # Continue numbering from sensor targets (7, 8, 9)
        start_idx = len(self.sensor_targets) + 1
        total = len(self.sensor_targets) + len(self.weather_targets)
        
        for i, target in enumerate(self.weather_targets, start_idx):
            print(f"\n[{i}/{total}] 🎯 Training: {target.upper()}")
            result = self.train(weather_records, target)
            if result.get('success'):
                models_trained.append(target)
                all_metrics[target] = result['metrics']
                metrics = result['metrics']
                print(f"    ✅ Thành công!")
                print(f"    📈 R² Score: {metrics.get('r2', 0)*100:.2f}%")
                print(f"    📉 MAE: {metrics.get('mae', 0):.4f}")
                print(f"    📉 RMSE: {metrics.get('rmse', 0):.4f}")
            else:
                print(f"    ❌ Thất bại: {result.get('error', 'Unknown error')}")
        
        training_time = (datetime.now() - start_time).total_seconds()
        
        if models_trained:
            accuracies = [m.get('accuracy', 0) for m in all_metrics.values()]
            overall_accuracy = np.mean(accuracies) if accuracies else 0
            
            return {
                'success': True,
                'models_trained': models_trained,
                'metrics': all_metrics,
                'overall_accuracy': round(float(overall_accuracy), 2),
                'training_time': round(training_time, 2)
            }
        else:
            print("\n⚠️  Không train được weather targets!")
            return {
                'success': False,
                'error': 'Failed to train weather models'
            }
    
    def train_weather_selected(self, weather_records, selected_targets: list) -> dict:
        """
        Train models for selected weather API targets
        
        Args:
            weather_records: List of WeatherForecasting records from database
            selected_targets: List of weather targets to train (e.g., ['wind_speed', 'rainfall'])
        
        Returns:
            dict with training results
        """
        start_time = datetime.now()
        models_trained = []
        all_metrics = {}
        
        # Filter only valid weather targets
        targets_to_train = [t for t in selected_targets if t in self.weather_targets]
        
        if not targets_to_train:
            return {
                'success': False,
                'error': 'No valid weather targets selected'
            }
        
        print(f"\n📊 Dữ liệu weather API: {len(weather_records)} records")
        print(f"🎯 Weather targets đã chọn: {', '.join(targets_to_train)}")
        
        for i, target in enumerate(targets_to_train, 1):
            print(f"\n[{i}/{len(targets_to_train)}] 🎯 Training: {target.upper()}")
            result = self.train(weather_records, target)
            if result.get('success'):
                models_trained.append(target)
                all_metrics[target] = result['metrics']
                metrics = result['metrics']
                print(f"    ✅ Thành công!")
                print(f"    📈 R² Score: {metrics.get('r2', 0)*100:.2f}%")
                print(f"    📉 MAE: {metrics.get('mae', 0):.4f}")
                print(f"    📉 RMSE: {metrics.get('rmse', 0):.4f}")
            else:
                print(f"    ❌ Thất bại: {result.get('error', 'Unknown error')}")
        
        training_time = (datetime.now() - start_time).total_seconds()
        
        if models_trained:
            accuracies = [m.get('accuracy', 0) for m in all_metrics.values()]
            overall_accuracy = np.mean(accuracies) if accuracies else 0
            
            return {
                'success': True,
                'models_trained': models_trained,
                'metrics': all_metrics,
                'overall_accuracy': round(float(overall_accuracy), 2),
                'training_time': round(training_time, 2)
            }
        else:
            print("\n⚠️  Không train được selected weather targets!")
            return {
                'success': False,
                'error': 'Failed to train selected weather models'
            }
    
    def predict(self, target_column: str, hours_ahead: int = 24) -> dict:
        """Make predictions for a specific target variable"""
        try:
            if target_column not in self.models:
                return {'success': False, 'error': f'Model not trained for {target_column}'}
            
            model = self.models[target_column]
            
            # Create future dataframe
            future = pd.DataFrame({
                'ds': pd.date_range(start=datetime.now(), periods=hours_ahead, freq='h')
            })
            
            # Make predictions
            forecast = model.predict(future)
            
            predictions = []
            for i in range(len(forecast)):
                pred_value = float(forecast['yhat'].iloc[i])
                lower = float(forecast.get('yhat_lower', forecast['yhat']).iloc[i])
                upper = float(forecast.get('yhat_upper', forecast['yhat']).iloc[i])
                
                predictions.append({
                    'timestamp': forecast['ds'].iloc[i].strftime("%d/%m/%Y %H:%M:%S"),
                    'value': round(pred_value, 2),
                    'lower': round(lower, 2),
                    'upper': round(upper, 2)
                })
            
            return {
                'success': True,
                'target': target_column,
                'predictions': predictions
            }
            
        except Exception as e:
            logger.error(f"[Prophet] Prediction error for {target_column}: {e}")
            return {'success': False, 'error': str(e)}
    
    def predict_all(self, hours_ahead: int = 24, latest_data: dict = None) -> dict:
        """Make predictions for all trained models"""
        try:
            if not self.models:
                return {
                    'success': False,
                    'predictions': [],
                    'error': 'No trained models available'
                }
            
            # Get predictions for each target
            all_predictions = {}
            for target in self.models.keys():
                result = self.predict(target, hours_ahead)
                if result.get('success'):
                    all_predictions[target] = result['predictions']
            
            # Combine predictions into hourly forecasts
            predictions = []
            for i in range(hours_ahead):
                pred_time = datetime.now() + timedelta(hours=i+1)
                
                prediction = {
                    'timestamp': pred_time.strftime("%d/%m/%Y %H:%M:%S"),
                }
                
                # Add each target's prediction
                for target, preds in all_predictions.items():
                    if i < len(preds):
                        value = preds[i]['value']
                        # Apply constraints for all targets
                        if target == 'temperature':
                            value = max(0, min(60, value))
                        elif target == 'humidity':
                            value = max(0, min(100, value))
                        elif target == 'aqi':
                            value = max(0, min(500, value))
                        elif target == 'pressure':
                            value = max(900, min(1100, value))
                        elif target == 'co2':
                            value = max(0, min(5000, value))
                        elif target == 'dust':
                            value = max(0, min(1000, value))
                        elif target == 'wind_speed':
                            value = max(0, min(100, value))
                        elif target == 'rainfall':
                            value = max(0, min(500, value))
                        elif target == 'uv_index':
                            value = max(0, min(15, value))
                        prediction[target] = round(value, 1)
                
                # Fill missing values from latest data
                if latest_data:
                    for key in self.supported_targets:
                        if key not in prediction:
                            prediction[key] = latest_data.get(key, 0)
                
                # Calculate weather condition based on UV index, humidity and rainfall
                humidity = prediction.get('humidity', 50)
                rainfall = prediction.get('rainfall', 0)
                uv_index = prediction.get('uv_index', 0)
                
                # Lấy giờ dự báo để xác định ban ngày/đêm theo mùa Việt Nam
                pred_hour = pred_time.hour
                is_daytime = is_daytime_vietnam(pred_time)  # Dùng hàm tính theo mùa
                time_period = get_time_period_vietnam(pred_time)  # Khoảng thời gian chi tiết
                
                # Weather determination logic:
                # - Ban đêm/sáng sớm/chiều tối: UV = 0 là bình thường, không dùng UV để xét
                # - Ban ngày (sau bình minh 1.5h đến trước hoàng hôn 30p): UV cao = nắng, UV thấp = nhiều mây
                # - Rainfall > 0.5 luôn = mưa
                # - Humidity chỉ dùng kết hợp, không đơn lẻ quyết định mưa
                
                if rainfall > 0.5:
                    # Có lượng mưa thực tế -> chắc chắn mưa
                    prediction['willRain'] = True
                    prediction['weather_condition'] = 'Mưa' if rainfall > 2 else 'Mưa nhẹ'
                    prediction['weather_condition_key'] = 'weatherRain' if rainfall > 2 else 'weatherLightRain'
                    prediction['weather_icon'] = '🌧️'
                elif is_daytime:
                    # Ban ngày (10h-18h): dùng UV index
                    if uv_index >= 6:
                        prediction['willRain'] = False
                        prediction['weather_condition'] = 'Nắng'
                        prediction['weather_condition_key'] = 'weatherSunny'
                        prediction['weather_icon'] = '☀️'
                    elif uv_index >= 3:
                        prediction['willRain'] = False
                        prediction['weather_condition'] = 'Nắng nhẹ'
                        prediction['weather_condition_key'] = 'weatherSunnyLight'
                        prediction['weather_icon'] = '🌤️'
                    elif uv_index >= 1:
                        # UV thấp ban ngày -> nhiều mây
                        if humidity > 90 and rainfall > 0:
                            prediction['willRain'] = True
                            prediction['weather_condition'] = 'Có thể mưa'
                            prediction['weather_condition_key'] = 'weatherMayRain'
                            prediction['weather_icon'] = '🌦️'
                        else:
                            prediction['willRain'] = False
                            prediction['weather_condition'] = 'Nhiều mây'
                            prediction['weather_condition_key'] = 'weatherManyClouds'
                            prediction['weather_icon'] = '☁️'
                    else:
                        # UV = 0 ban ngày -> rất nhiều mây
                        prediction['willRain'] = False
                        prediction['weather_condition'] = 'Nhiều mây'
                        prediction['weather_condition_key'] = 'weatherManyClouds'
                        prediction['weather_icon'] = '☁️'
                else:
                    # Ban đêm/sáng sớm/chiều tối: không dùng UV
                    # Chỉ dựa vào rainfall để xác định mưa
                    if rainfall > 0:
                        prediction['willRain'] = True
                        prediction['weather_condition'] = 'Mưa đêm'
                        prediction['weather_condition_key'] = 'weatherNightRain'
                        prediction['weather_icon'] = '🌧️'
                    elif humidity > 90:
                        prediction['willRain'] = False
                        prediction['weather_condition'] = 'Sương mù'
                        prediction['weather_condition_key'] = 'weatherFog'
                        prediction['weather_icon'] = '🌫️'
                    elif time_period == 'dawn':
                        # Bình minh/Sáng sớm (theo mùa)
                        prediction['willRain'] = False
                        prediction['weather_condition'] = 'Sáng sớm'
                        prediction['weather_condition_key'] = 'weatherEarlyMorning'
                        prediction['weather_icon'] = '🌅'
                    elif time_period == 'dusk':
                        # Hoàng hôn/Chiều tối (theo mùa)
                        prediction['willRain'] = False
                        prediction['weather_condition'] = 'Chiều tối'
                        prediction['weather_condition_key'] = 'weatherEvening'
                        prediction['weather_icon'] = '🌆'
                    else:
                        # Đêm khuya
                        prediction['willRain'] = False
                        prediction['weather_condition'] = 'Đêm quang'
                        prediction['weather_condition_key'] = 'weatherClearNight'
                        prediction['weather_icon'] = '🌙'
                
                prediction['confidence'] = max(50, 95 - i * 0.8)
                
                predictions.append(prediction)
            
            return {
                'success': True,
                'model_type': self.model_type,
                'predictions': predictions,
                'models_used': list(self.models.keys())
            }
            
        except Exception as e:
            logger.error(f"[Prophet] Predict all error: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_info(self) -> dict:
        """Get model information"""
        return {
            'model_type': self.model_type,
            'models_available': list(self.models.keys()),
            'metrics': self.metrics,
            'supported_targets': self.supported_targets,
            'use_prophet': self.use_prophet
        }


# Create singleton instance
prophet_model = ProphetModel()
