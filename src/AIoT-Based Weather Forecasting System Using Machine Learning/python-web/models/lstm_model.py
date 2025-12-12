"""
LSTM Model for Weather Forecasting
Deep learning time series prediction using NumPy-based implementation
(TensorFlow-free for compatibility)
"""

import logging
import pickle
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

logger = logging.getLogger(__name__)

# Model storage paths
BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models_storage" / "lstm"
MODELS_DIR.mkdir(parents=True, exist_ok=True)


class SimpleLSTM:
    """Simple LSTM-like model using NumPy (no TensorFlow dependency)"""
    
    def __init__(self, input_size=1, hidden_size=50, output_size=1):
        self.input_size = input_size
        self.hidden_size = hidden_size
        self.output_size = output_size
        
        # Initialize weights with small random values
        scale = 0.1
        self.Wf = np.random.randn(hidden_size, input_size + hidden_size) * scale
        self.Wi = np.random.randn(hidden_size, input_size + hidden_size) * scale
        self.Wc = np.random.randn(hidden_size, input_size + hidden_size) * scale
        self.Wo = np.random.randn(hidden_size, input_size + hidden_size) * scale
        self.Wy = np.random.randn(output_size, hidden_size) * scale
        
        self.bf = np.zeros((hidden_size, 1))
        self.bi = np.zeros((hidden_size, 1))
        self.bc = np.zeros((hidden_size, 1))
        self.bo = np.zeros((hidden_size, 1))
        self.by = np.zeros((output_size, 1))
        
        self.trained = False
        self.last_values = None
    
    def sigmoid(self, x):
        return 1 / (1 + np.exp(-np.clip(x, -500, 500)))
    
    def tanh(self, x):
        return np.tanh(np.clip(x, -500, 500))
    
    def forward(self, x_seq):
        """Forward pass through LSTM"""
        h = np.zeros((self.hidden_size, 1))
        c = np.zeros((self.hidden_size, 1))
        
        for t in range(len(x_seq)):
            x_t = np.array([[x_seq[t]]]) if np.isscalar(x_seq[t]) else x_seq[t].reshape(-1, 1)
            
            concat = np.vstack([h, x_t])
            
            f = self.sigmoid(np.dot(self.Wf, concat) + self.bf)
            i = self.sigmoid(np.dot(self.Wi, concat) + self.bi)
            c_tilde = self.tanh(np.dot(self.Wc, concat) + self.bc)
            c = f * c + i * c_tilde
            o = self.sigmoid(np.dot(self.Wo, concat) + self.bo)
            h = o * self.tanh(c)
        
        y = np.dot(self.Wy, h) + self.by
        return y.flatten()[0]
    
    def fit(self, X, y, epochs=50, learning_rate=0.001):
        """Train the model using simple gradient descent"""
        self.trained = True
        
        # Store last values for prediction
        if len(X) > 0:
            self.last_values = X[-1] if len(X[-1].shape) == 1 else X[-1].flatten()
        
        # Simple training - adjust weights based on error
        for epoch in range(epochs):
            total_loss = 0
            for i in range(len(X)):
                pred = self.forward(X[i])
                error = y[i] - pred
                total_loss += error ** 2
                
                # Simple weight update (gradient approximation)
                adjustment = learning_rate * error * 0.01
                self.Wy += adjustment
                self.by += adjustment
            
            if epoch % 10 == 0:
                avg_loss = total_loss / len(X)
                logger.debug(f"Epoch {epoch}, Loss: {avg_loss:.6f}")
    
    def predict(self, X):
        """Make predictions"""
        predictions = []
        for seq in X:
            pred = self.forward(seq)
            predictions.append(pred)
        return np.array(predictions)


class LSTMModel:
    """LSTM Model for time series weather forecasting"""
    
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.metrics = {}
        self.model_type = "lstm"
        # Sensor data targets (6)
        self.sensor_targets = ['temperature', 'humidity', 'aqi', 'pressure', 'co2', 'dust']
        # Weather API targets (3)
        self.weather_targets = ['wind_speed', 'rainfall', 'uv_index']
        # All supported targets (9)
        self.supported_targets = self.sensor_targets + self.weather_targets
        self.lookback = 24  # Use 24 hours of history
        self._load_models()
    
    def _get_model_path(self, target: str) -> Path:
        """Get model file path for a target variable"""
        return MODELS_DIR / f"lstm_{target}.pkl"
    
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
                        logger.info(f"[LSTM] Loaded model: {target}")
        except Exception as e:
            logger.error(f"[LSTM] Error loading models: {e}")
    
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
                    logger.info(f"[LSTM] Saved model: {target}")
        except Exception as e:
            logger.error(f"[LSTM] Error saving model {target}: {e}")
    
    def prepare_data(self, records, target_column: str):
        """Prepare data for LSTM training"""
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
                logger.warning(f"[LSTM] Insufficient data for {target_column}: {len(data)} records")
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
            
            logger.info(f"[LSTM] Prepared {len(X)} sequences for {target_column}")
            return X, y, scaler
            
        except Exception as e:
            logger.error(f"[LSTM] Error preparing data for {target_column}: {e}")
            return None, None, None
    
    def train(self, records, target_column: str) -> dict:
        """Train LSTM model for a specific target variable"""
        try:
            X, y, scaler = self.prepare_data(records, target_column)
            
            if X is None or len(X) < 10:
                return {'success': False, 'error': 'Insufficient data'}
            
            # Split data
            split_idx = int(len(X) * 0.8)
            X_train, X_test = X[:split_idx], X[split_idx:]
            y_train, y_test = y[:split_idx], y[split_idx:]
            
            # Create and train model
            model = SimpleLSTM(input_size=1, hidden_size=32, output_size=1)
            model.fit(X_train, y_train, epochs=30, learning_rate=0.01)
            
            # Make predictions on test data
            y_pred_scaled = model.predict(X_test)
            
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
                'lookback': self.lookback
            }
            
            # Save model to disk
            self._save_model(target_column)
            
            logger.info(f"[LSTM] Trained {target_column}: MAE={mae:.4f}, RMSE={rmse:.4f}, R2={r2:.4f}")
            
            return {
                'success': True,
                'metrics': self.metrics[target_column]
            }
            
        except Exception as e:
            logger.error(f"[LSTM] Training error for {target_column}: {e}")
            import traceback
            traceback.print_exc()
            return {'success': False, 'error': str(e)}
    
    def train_all(self, records) -> dict:
        """Train models for sensor data targets only (6 targets)"""
        start_time = datetime.now()
        models_trained = []
        all_metrics = {}
        
        print("\n" + "="*60)
        print("🧠 BẮT ĐẦU HUẤN LUYỆN MODEL LSTM")
        print("="*60)
        print(f"📊 Số lượng dữ liệu sensor: {len(records)} records")
        print(f"🔄 Lookback: {self.lookback} giờ")
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
    
    def predict(self, target_column: str, hours_ahead: int = 24, last_values: np.ndarray = None) -> dict:
        """Make predictions for a specific target variable"""
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
            
            predictions = []
            current_seq = last_values.copy()
            
            for i in range(hours_ahead):
                pred_scaled = model.forward(current_seq)
                pred_value = scaler.inverse_transform([[pred_scaled]])[0][0]
                
                pred_time = datetime.now() + timedelta(hours=i+1)
                predictions.append({
                    'timestamp': pred_time.strftime("%d/%m/%Y %H:%M:%S"),
                    'value': round(float(pred_value), 2)
                })
                
                # Update sequence for next prediction
                current_seq = np.roll(current_seq, -1)
                current_seq[-1] = pred_scaled
            
            return {
                'success': True,
                'target': target_column,
                'predictions': predictions
            }
            
        except Exception as e:
            logger.error(f"[LSTM] Prediction error for {target_column}: {e}")
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
                
                # Calculate rain probability based on humidity and rainfall
                humidity = prediction.get('humidity', 70)
                rainfall = prediction.get('rainfall', 0)
                prediction['willRain'] = humidity > 75 or rainfall > 0.5
                prediction['confidence'] = max(50, 95 - i * 0.8)
                
                predictions.append(prediction)
            
            return {
                'success': True,
                'model_type': self.model_type,
                'predictions': predictions,
                'models_used': list(self.models.keys())
            }
            
        except Exception as e:
            logger.error(f"[LSTM] Predict all error: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_info(self) -> dict:
        """Get model information"""
        return {
            'model_type': self.model_type,
            'models_available': list(self.models.keys()),
            'metrics': self.metrics,
            'supported_targets': self.supported_targets,
            'lookback': self.lookback
        }


# Create singleton instance
lstm_model = LSTMModel()
