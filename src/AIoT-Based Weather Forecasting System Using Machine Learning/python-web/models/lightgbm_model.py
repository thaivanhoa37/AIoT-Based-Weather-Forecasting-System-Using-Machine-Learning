"""
LightGBM/XGBoost Model for Weather Forecasting
Gradient Boosting based time series prediction using Direct Multi-Step Forecasting
"""

import logging
import pickle
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import TimeSeriesSplit
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor

try:
    import lightgbm as lgb
    HAS_LIGHTGBM = True
except ImportError:
    HAS_LIGHTGBM = False
    
try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

logger = logging.getLogger(__name__)

# Model storage paths
BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models_storage" / "lightgbm"
MODELS_DIR.mkdir(parents=True, exist_ok=True)


class GradientBoostingForecaster:
    """
    Direct Multi-Step Forecasting using LightGBM/XGBoost
    
    Direct strategy: Train separate model for each forecast horizon
    """
    
    def __init__(self, lookback=24, forecast_horizon=24, use_lightgbm=True):
        self.lookback = lookback
        self.forecast_horizon = forecast_horizon
        self.use_lightgbm = use_lightgbm and HAS_LIGHTGBM
        
        # Models for each step (direct multi-step)
        self.models = {}  # {step: model}
        self.trained = False
        self.last_values = None
        
        # Model parameters
        self.lgb_params = {
            'objective': 'regression',
            'metric': 'mae',
            'boosting_type': 'gbdt',
            'num_leaves': 31,
            'learning_rate': 0.05,
            'feature_fraction': 0.9,
            'bagging_fraction': 0.8,
            'bagging_freq': 5,
            'verbose': -1,
            'n_estimators': 100,
            'early_stopping_rounds': 10
        }
        
        self.xgb_params = {
            'objective': 'reg:squarederror',
            'eval_metric': 'mae',
            'max_depth': 6,
            'learning_rate': 0.05,
            'n_estimators': 100,
            'subsample': 0.8,
            'colsample_bytree': 0.9,
            'early_stopping_rounds': 10,
            'verbosity': 0
        }
    
    def _create_features(self, data):
        """Create lag features and time-based features"""
        df = pd.DataFrame({'value': data})
        
        # Lag features
        for lag in range(1, self.lookback + 1):
            df[f'lag_{lag}'] = df['value'].shift(lag)
        
        # Rolling statistics
        for window in [3, 6, 12, 24]:
            if window <= self.lookback:
                df[f'rolling_mean_{window}'] = df['value'].shift(1).rolling(window=window).mean()
                df[f'rolling_std_{window}'] = df['value'].shift(1).rolling(window=window).std()
                df[f'rolling_min_{window}'] = df['value'].shift(1).rolling(window=window).min()
                df[f'rolling_max_{window}'] = df['value'].shift(1).rolling(window=window).max()
        
        # Difference features (trend)
        df['diff_1'] = df['value'].diff(1)
        df['diff_24'] = df['value'].diff(24) if len(df) > 24 else 0
        
        return df
    
    def _prepare_direct_data(self, scaled_values, step):
        """
        Prepare data for direct multi-step forecasting
        
        Args:
            scaled_values: Normalized time series data
            step: Forecast horizon (1 = 1 hour ahead, 24 = 24 hours ahead)
        
        Returns:
            X, y arrays for training
        """
        X, y = [], []
        for i in range(self.lookback + step, len(scaled_values) + 1):
            features = []
            # Raw lag values
            for lag in range(1, self.lookback + 1):
                idx = i - step - lag
                if idx >= 0:
                    features.append(scaled_values[idx])
                else:
                    features.append(0)
            # Rolling features (mean, std, min, max)
            window_data = scaled_values[max(0, i - step - self.lookback):i - step]
            if len(window_data) > 0:
                features.extend([
                    np.mean(window_data[-3:]) if len(window_data) >= 3 else np.mean(window_data),
                    np.std(window_data[-3:]) if len(window_data) >= 3 else 0,
                    np.mean(window_data[-6:]) if len(window_data) >= 6 else np.mean(window_data),
                    np.std(window_data[-6:]) if len(window_data) >= 6 else 0,
                    np.mean(window_data[-12:]) if len(window_data) >= 12 else np.mean(window_data),
                    np.std(window_data[-12:]) if len(window_data) >= 12 else 0,
                    np.min(window_data),
                    np.max(window_data),
                ])
            else:
                features.extend([0] * 8)
            X.append(features)
            # Target: value at step hours ahead
            target_idx = i - 1
            if target_idx < len(scaled_values):
                y.append(scaled_values[target_idx])
        return np.array(X), np.array(y)
    
    def fit(self, X_sequences, y_values, epochs=None, learning_rate=None):
        """
        Train direct multi-step models
        
        Args:
            X_sequences: Input sequences (from prepare_data)
            y_values: Target values
        """
        self.trained = True
        
        # Store last sequence for prediction
        if len(X_sequences) > 0:
            self.last_values = X_sequences[-1].flatten()
        
        # Reconstruct full time series from sequences
        all_values = []
        for seq in X_sequences:
            if len(all_values) == 0:
                all_values.extend(seq.flatten())
            else:
                all_values.append(seq[-1])
        all_values = np.array(all_values)
        
        # Add target values
        full_series = np.concatenate([all_values[:self.lookback], y_values])
        
        # Train model for selected forecast steps (1, 3, 6, 12, 24 hours)
        steps_to_train = [1, 3, 6, 12, 24]
        
        for step in steps_to_train:
            if step > self.forecast_horizon:
                continue
                
            X_train, y_train = self._prepare_direct_data(full_series, step)
            
            if len(X_train) < 10:
                logger.warning(f"Insufficient data for step {step}")
                continue
            
            # Split for validation
            split_idx = int(len(X_train) * 0.8)
            X_tr, X_val = X_train[:split_idx], X_train[split_idx:]
            y_tr, y_val = y_train[:split_idx], y_train[split_idx:]
            
            if self.use_lightgbm and HAS_LIGHTGBM:
                # LightGBM training
                train_data = lgb.Dataset(X_tr, label=y_tr)
                val_data = lgb.Dataset(X_val, label=y_val, reference=train_data)
                
                model = lgb.train(
                    self.lgb_params,
                    train_data,
                    valid_sets=[val_data],
                    num_boost_round=100
                )
            elif HAS_XGBOOST:
                # XGBoost training
                model = xgb.XGBRegressor(**self.xgb_params)
                model.fit(
                    X_tr, y_tr,
                    eval_set=[(X_val, y_val)],
                    verbose=False
                )
            else:
                # Fallback to sklearn GradientBoostingRegressor
                model = GradientBoostingRegressor(
                    n_estimators=100,
                    learning_rate=0.05,
                    max_depth=6,
                    subsample=0.8,
                    random_state=42
                )
                model.fit(X_tr, y_tr)
            
            self.models[step] = model
            logger.debug(f"Trained model for step {step}")
        
        logger.info(f"Trained {len(self.models)} direct models for steps: {list(self.models.keys())}")
    
    def predict(self, X_sequences):
        """
        Make predictions for all sequences (for evaluation)
        Returns 1-step ahead predictions
        """
        predictions = []
        
        for seq in X_sequences:
            # Use step 1 model for single predictions
            if 1 in self.models:
                features = self._create_features_from_sequence(seq)
                if self.use_lightgbm:
                    pred = self.models[1].predict([features])[0]
                else:
                    pred = self.models[1].predict([features])[0]
                predictions.append(pred)
            else:
                predictions.append(seq[-1])  # Fallback to last value
        
        return np.array(predictions)
    
    def _create_features_from_sequence(self, sequence):
        """Create feature vector from a sequence (must match _prepare_direct_data)"""
        seq = np.array(sequence).flatten()
        features = list(seq[-self.lookback:])
        # Rolling features (mean, std, min, max)
        if len(seq) > 0:
            features.extend([
                np.mean(seq[-3:]) if len(seq) >= 3 else np.mean(seq),
                np.std(seq[-3:]) if len(seq) >= 3 else 0,
                np.mean(seq[-6:]) if len(seq) >= 6 else np.mean(seq),
                np.std(seq[-6:]) if len(seq) >= 6 else 0,
                np.mean(seq[-12:]) if len(seq) >= 12 else np.mean(seq),
                np.std(seq[-12:]) if len(seq) >= 12 else 0,
                np.min(seq),
                np.max(seq),
            ])
        else:
            features.extend([0] * 8)
        return features
    
    def predict_multi_step(self, last_sequence, hours_ahead=24):
        """
        Direct multi-step prediction
        
        Args:
            last_sequence: Last lookback values
            hours_ahead: Number of hours to predict
        
        Returns:
            List of predictions for each hour
        """
        predictions = []
        seq = np.array(last_sequence).flatten()
        
        # Get available trained steps
        trained_steps = sorted(self.models.keys())
        
        for h in range(1, hours_ahead + 1):
            # Find closest trained step
            closest_step = min(trained_steps, key=lambda x: abs(x - h))
            
            if closest_step in self.models:
                features = self._create_features_from_sequence(seq)
                
                if self.use_lightgbm:
                    pred = self.models[closest_step].predict([features])[0]
                else:
                    pred = self.models[closest_step].predict([features])[0]
                
                predictions.append(pred)
                
                # Update sequence with prediction for next iteration
                seq = np.roll(seq, -1)
                seq[-1] = pred
            else:
                # Fallback
                predictions.append(seq[-1])
        
        return predictions
    
    def forward(self, x_seq):
        """Compatibility method - single step prediction"""
        features = self._create_features_from_sequence(x_seq)
        
        if 1 in self.models:
            if self.use_lightgbm:
                return self.models[1].predict([features])[0]
            else:
                return self.models[1].predict([features])[0]
        return x_seq[-1] if len(x_seq) > 0 else 0


class LSTMModel:
    """
    LightGBM/XGBoost Model for time series weather forecasting
    Using Direct Multi-Step Strategy
    """
    
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.metrics = {}
        # Determine backend
        if HAS_LIGHTGBM:
            self.model_type = "lightgbm"
            self.backend = "lightgbm"
        elif HAS_XGBOOST:
            self.model_type = "lightgbm"
            self.backend = "xgboost"
        else:
            self.model_type = "lightgbm"
            self.backend = "sklearn"
        # Sensor data targets (6)
        self.sensor_targets = ['temperature', 'humidity', 'aqi', 'pressure', 'co2', 'dust']
        # Weather API targets (3)
        self.weather_targets = ['wind_speed', 'rainfall', 'uv_index']
        # All supported targets (9)
        self.supported_targets = self.sensor_targets + self.weather_targets
        self.lookback = 24  # Use 24 hours of history
        self.forecast_horizon = 24  # Predict up to 24 hours ahead
        self._load_models()
        
        logger.info(f"[LIGHTGBM] Initialized with backend={self.backend} (LightGBM={HAS_LIGHTGBM}, XGBoost={HAS_XGBOOST})")
    
    def _get_model_path(self, target: str) -> Path:
        """Get model file path for a target variable"""
        return MODELS_DIR / f"gbm_{target}.pkl"
    
    def _load_models(self):
        """Load trained models from disk"""
        try:
            for target in self.supported_targets:
                path = self._get_model_path(target)
                if path.exists():
                    with open(path, 'rb') as f:
                        data = pickle.load(f)
                        self.models[target] = data.get('model')
                        self.scalers[target] = data.get('scaler')
                        self.metrics[target] = data.get('metrics', {})
                        logger.info(f"[{self.model_type.upper()}] Loaded model: {target}")
        except Exception as e:
            logger.error(f"[{self.model_type.upper()}] Error loading models: {e}")
    
    def _save_model(self, target: str):
        """Save a trained model to disk"""
        try:
            if target in self.models:
                data = {
                    'model': self.models[target],
                    'scaler': self.scalers.get(target),
                    'metrics': self.metrics.get(target, {})
                }
                with open(self._get_model_path(target), 'wb') as f:
                    pickle.dump(data, f)
                    logger.info(f"[{self.model_type.upper()}] Saved model: {target}")
        except Exception as e:
            logger.error(f"[{self.model_type.upper()}] Error saving model {target}: {e}")
    
    def prepare_data(self, records, target_column: str):
        """Prepare data for model training"""
        try:
            data = []
            for record in records:
                value = getattr(record, target_column, None)
                if value is not None and value > 0:
                    data.append({
                        'timestamp': record.timestamp,
                        'value': float(value)
                    })
            
            if len(data) < self.lookback + 10:
                logger.warning(f"[{self.model_type.upper()}] Insufficient data for {target_column}: {len(data)} records")
                return None, None, None
            
            df = pd.DataFrame(data)
            df = df.sort_values('timestamp').reset_index(drop=True)
            
            # Normalize data
            scaler = MinMaxScaler(feature_range=(0, 1))
            scaled_values = scaler.fit_transform(df['value'].values.reshape(-1, 1))
            
            # Create sequences
            X, y = [], []
            for i in range(self.lookback, len(scaled_values)):
                X.append(scaled_values[i-self.lookback:i, 0])
                y.append(scaled_values[i, 0])
            
            X = np.array(X)
            y = np.array(y)
            
            logger.info(f"[{self.model_type.upper()}] Prepared {len(X)} sequences for {target_column}")
            return X, y, scaler
            
        except Exception as e:
            logger.error(f"[{self.model_type.upper()}] Error preparing data for {target_column}: {e}")
            return None, None, None
    
    def train(self, records, target_column: str) -> dict:
        """Train model for a specific target variable"""
        try:
            X, y, scaler = self.prepare_data(records, target_column)
            
            if X is None or len(X) < 10:
                return {'success': False, 'error': 'Insufficient data'}
            
            # Split data
            split_idx = int(len(X) * 0.8)
            X_train, X_test = X[:split_idx], X[split_idx:]
            y_train, y_test = y[:split_idx], y[split_idx:]
            
            # Create and train model
            model = GradientBoostingForecaster(
                lookback=self.lookback,
                forecast_horizon=self.forecast_horizon,
                use_lightgbm=HAS_LIGHTGBM
            )
            model.fit(X_train, y_train)
            
            # Make predictions on test data
            y_pred_scaled = model.predict(X_test)
            # Clamp predictions to [0, 1] to avoid out-of-range values
            y_pred_scaled = np.clip(y_pred_scaled, 0, 1)
            # Inverse transform predictions
            y_pred = scaler.inverse_transform(y_pred_scaled.reshape(-1, 1)).flatten()
            y_true = scaler.inverse_transform(y_test.reshape(-1, 1)).flatten()
            
            # Calculate metrics
            mae = mean_absolute_error(y_true, y_pred)
            rmse = np.sqrt(mean_squared_error(y_true, y_pred))
            
            # Handle potential division issues
            ss_res = np.sum((y_true - y_pred) ** 2)
            ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
            r2 = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
            r2 = max(-1, min(1, r2))  # Clamp to valid range
            
            accuracy = max(0, min(100, r2 * 100))
            
            # Store model and metrics
            self.models[target_column] = model
            self.scalers[target_column] = scaler
            self.metrics[target_column] = {
                'mae': round(float(mae), 4),
                'rmse': round(float(rmse), 4),
                'r2': round(float(r2), 4),
                'accuracy': round(float(accuracy), 2),
                'data_points': len(X),
                'lookback': self.lookback,
                'model_backend': self.backend
            }
            
            # Save model to disk
            self._save_model(target_column)
            
            logger.info(f"[LIGHTGBM] Trained {target_column}: MAE={mae:.4f}, RMSE={rmse:.4f}, R2={r2:.4f} (backend={self.backend})")
            
            return {
                'success': True,
                'metrics': self.metrics[target_column]
            }
            
        except Exception as e:
            logger.error(f"[{self.model_type.upper()}] Training error for {target_column}: {e}")
            import traceback
            traceback.print_exc()
            return {'success': False, 'error': str(e)}
    
    def train_all(self, records) -> dict:
        """Train models for sensor data targets only (6 targets)"""
        start_time = datetime.now()
        models_trained = []
        all_metrics = {}
        
        model_name = "LightGBM" if HAS_LIGHTGBM else ("XGBoost" if HAS_XGBOOST else "GradientBoosting")
        
        print("\n" + "="*60)
        print(f"🧠 BẮT ĐẦU HUẤN LUYỆN MODEL {model_name} (Direct Multi-Step)")
        print("="*60)
        print(f"📊 Số lượng dữ liệu sensor: {len(records)} records")
        print(f"🔄 Lookback: {self.lookback} giờ")
        print(f"📈 Forecast horizon: {self.forecast_horizon} giờ")
        print(f"🕐 Thời gian bắt đầu: {start_time.strftime('%H:%M:%S')}")
        print(f"⚙️  Backend: {self.backend}")
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
                print(f"    �� RMSE: {metrics.get('rmse', 0):.4f}")
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
        
        model_name = "LightGBM" if HAS_LIGHTGBM else ("XGBoost" if HAS_XGBOOST else "GradientBoosting")
        
        print("\n" + "="*60)
        print(f"🧠 BẮT ĐẦU HUẤN LUYỆN MODEL {model_name} (SELECTED TARGETS)")
        print("="*60)
        print(f"📊 Số lượng dữ liệu sensor: {len(records)} records")
        print(f"🎯 Targets đã chọn: {', '.join(targets_to_train)}")
        print(f"🔄 Lookback: {self.lookback} giờ")
        print(f"📈 Forecast horizon: {self.forecast_horizon} giờ")
        print(f"🕐 Thời gian bắt đầu: {start_time.strftime('%H:%M:%S')}")
        print(f"⚙️  Backend: {self.backend}")
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
    
    def predict(self, target_column: str, hours_ahead: int = 24, last_values: np.ndarray = None) -> dict:
        """Make predictions for a specific target variable using direct multi-step"""
        try:
            if target_column not in self.models:
                return {'success': False, 'error': f'Model not trained for {target_column}'}
            
            model = self.models[target_column]
            scaler = self.scalers.get(target_column)
            
            if scaler is None:
                return {'success': False, 'error': f'Scaler not found for {target_column}'}
            
            # Use last known values or model's stored values
            if last_values is None:
                if hasattr(model, 'last_values') and model.last_values is not None:
                    last_values = model.last_values
                else:
                    # Generate dummy values based on scaler
                    last_values = np.ones(self.lookback) * 0.5
            
            # Ensure correct shape
            if len(last_values) < self.lookback:
                last_values = np.pad(last_values, (self.lookback - len(last_values), 0), mode='edge')
            else:
                last_values = last_values[-self.lookback:]
            
            # Use direct multi-step prediction
            predictions_scaled = model.predict_multi_step(last_values, hours_ahead)
            
            predictions = []
            for i, pred_scaled in enumerate(predictions_scaled):
                pred_value = scaler.inverse_transform([[pred_scaled]])[0][0]
                pred_time = datetime.now() + timedelta(hours=i+1)
                predictions.append({
                    'timestamp': pred_time.strftime("%d/%m/%Y %H:%M:%S"),
                    'value': round(float(pred_value), 2)
                })
            
            return {
                'success': True,
                'target': target_column,
                'predictions': predictions
            }
            
        except Exception as e:
            logger.error(f"[{self.model_type.upper()}] Prediction error for {target_column}: {e}")
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
                
                # Lấy giờ dự báo để xác định ban ngày/đêm
                pred_hour = pred_time.hour
                is_daytime = 10 <= pred_hour <= 18  # UV chỉ có từ 10h-18h
                
                # Weather determination logic:
                # - Ban đêm (trước 10h, sau 18h): UV = 0 là bình thường, không dùng UV để xét
                # - Ban ngày (10h-18h): UV cao = nắng, UV thấp = nhiều mây
                # - Rainfall > 0.5 luôn = mưa
                # - Humidity chỉ dùng kết hợp, không đơn lẻ quyết định mưa
                
                if rainfall > 0.5:
                    # Có lượng mưa thực tế -> chắc chắn mưa
                    prediction['willRain'] = True
                    prediction['weather_condition'] = 'Mưa' if rainfall > 2 else 'Mưa nhẹ'
                    prediction['weather_condition_key'] = 'rain' if rainfall > 2 else 'lightRain'
                    prediction['weather_icon'] = '🌧️'
                elif is_daytime:
                    # Ban ngày (10h-18h): dùng UV index
                    if uv_index >= 6:
                        prediction['willRain'] = False
                        prediction['weather_condition'] = 'Nắng'
                        prediction['weather_condition_key'] = 'sunny'
                        prediction['weather_icon'] = '☀️'
                    elif uv_index >= 3:
                        prediction['willRain'] = False
                        prediction['weather_condition'] = 'Nắng nhẹ'
                        prediction['weather_condition_key'] = 'sunnyLight'
                        prediction['weather_icon'] = '🌤️'
                    elif uv_index >= 1:
                        # UV thấp ban ngày -> nhiều mây
                        if humidity > 90 and rainfall > 0:
                            prediction['willRain'] = True
                            prediction['weather_condition'] = 'Có thể mưa'
                            prediction['weather_condition_key'] = 'mayRain'
                            prediction['weather_icon'] = '🌦️'
                        else:
                            prediction['willRain'] = False
                            prediction['weather_condition'] = 'Nhiều mây'
                            prediction['weather_condition_key'] = 'manyClouds'
                            prediction['weather_icon'] = '☁️'
                    else:
                        # UV = 0 ban ngày -> rất nhiều mây
                        prediction['willRain'] = False
                        prediction['weather_condition'] = 'Nhiều mây'
                        prediction['weather_condition_key'] = 'manyClouds'
                        prediction['weather_icon'] = '☁️'
                else:
                    # Ban đêm (trước 10h, sau 18h): không dùng UV
                    # Chỉ dựa vào rainfall để xác định mưa
                    if rainfall > 0:
                        prediction['willRain'] = True
                        prediction['weather_condition'] = 'Mưa đêm'
                        prediction['weather_condition_key'] = 'nightRain'
                        prediction['weather_icon'] = '🌧️'
                    elif humidity > 90:
                        prediction['willRain'] = False
                        prediction['weather_condition'] = 'Sương mù'
                        prediction['weather_condition_key'] = 'fog'
                        prediction['weather_icon'] = '🌫️'
                    elif 6 <= pred_hour < 10:
                        # Sáng sớm (6h-10h)
                        prediction['willRain'] = False
                        prediction['weather_condition'] = 'Sáng sớm'
                        prediction['weather_condition_key'] = 'earlyMorning'
                        prediction['weather_icon'] = '🌅'
                    elif 18 < pred_hour <= 20:
                        # Chiều tối (18h-20h)
                        prediction['willRain'] = False
                        prediction['weather_condition'] = 'Chiều tối'
                        prediction['weather_condition_key'] = 'evening'
                        prediction['weather_icon'] = '🌆'
                    else:
                        # Đêm khuya
                        prediction['willRain'] = False
                        prediction['weather_condition'] = 'Đêm quang'
                        prediction['weather_condition_key'] = 'clearNight'
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
            logger.error(f"[{self.model_type.upper()}] Predict all error: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_info(self) -> dict:
        """Get model information"""
        return {
            'model_type': self.model_type,
            'backend': 'lightgbm' if HAS_LIGHTGBM else ('xgboost' if HAS_XGBOOST else 'none'),
            'models_available': list(self.models.keys()),
            'metrics': self.metrics,
            'supported_targets': self.supported_targets,
            'lookback': self.lookback,
            'forecast_horizon': self.forecast_horizon,
            'strategy': 'direct_multi_step'
        }


# Create singleton instance
lightgbm_model = LSTMModel()
# Alias for backward compatibility
lstm_model = lightgbm_model
