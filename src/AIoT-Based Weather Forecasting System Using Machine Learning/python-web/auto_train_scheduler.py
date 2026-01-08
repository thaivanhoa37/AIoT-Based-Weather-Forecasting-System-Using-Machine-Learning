"""
Auto-Training Scheduler
Automatically trains ML models on a schedule
"""
import asyncio
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from threading import Thread
import time

logger = logging.getLogger(__name__)

AUTO_TRAIN_CONFIG_FILE = Path(__file__).parent / "models_storage" / "auto_train_config.json"

class AutoTrainScheduler:
    def __init__(self, app=None):
        self.app = app
        self.running = False
        self.thread = None
        self.last_check = None
        
    def load_settings(self):
        """Load auto-training settings"""
        default_settings = {
            "enabled": False,
            "interval_days": 7,
            "hour": 2,
            "model_type": "prophet",
            "data_points": 10000,
            "targets": ["temperature", "humidity"],  # Default targets
            "last_auto_train": None,
            "last_auto_train_timestamp": None,
            "training_history": []  # Store training history
        }
        try:
            if AUTO_TRAIN_CONFIG_FILE.exists():
                with open(AUTO_TRAIN_CONFIG_FILE, 'r', encoding='utf-8') as f:
                    saved = json.load(f)
                    default_settings.update(saved)
                    # Validate targets
                    if "targets" in saved and isinstance(saved["targets"], list):
                        valid_targets = ["temperature", "humidity", "pressure", "aqi", "co2", "dust", 
                                       "wind_speed", "rainfall", "uv_index"]
                        default_settings["targets"] = [t for t in saved["targets"] if t in valid_targets]
        except Exception as e:
            logger.error(f"Error loading auto-train settings: {e}")
        return default_settings
    
    def save_settings(self, settings):
        """Save auto-training settings"""
        try:
            AUTO_TRAIN_CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(AUTO_TRAIN_CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump(settings, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            logger.error(f"Error saving auto-train settings: {e}")
            return False
    
    def should_train(self, settings):
        """Check if it's time to train"""
        if not settings.get("enabled", False):
            return False
        
        now = datetime.now()
        target_hour = settings.get("hour", 2)
        interval_days = settings.get("interval_days", 7)
        
        # Check if current hour matches target hour (allowing a 1-hour window)
        if now.hour != target_hour:
            return False
        
        # Check if we already trained in the last hour (prevent duplicate runs)
        if self.last_check:
            time_since_check = (now - self.last_check).total_seconds()
            if time_since_check < 3600:  # Less than 1 hour since last check
                return False
        
        # Check if enough time has passed since last training
        last_train_str = settings.get("last_auto_train_timestamp")
        if last_train_str:
            try:
                last_train = datetime.fromisoformat(last_train_str)
                days_since = (now - last_train).days
                
                # Only train if interval has passed
                if days_since < interval_days:
                    logger.debug(f"Only {days_since} days since last training, need {interval_days} days")
                    return False
                    
                logger.info(f"Training interval met: {days_since} days >= {interval_days} days")
            except Exception as e:
                logger.warning(f"Could not parse last training time: {e}")
                # If we can't parse, proceed with training
        else:
            logger.info("No previous training found, will train now")
        
        # Update last check time
        self.last_check = now
        return True
    
    def run_training(self):
        """Execute the training"""
        from database import SessionLocal
        from models.sensor_data import SensorData
        from sqlalchemy import desc
        from ml_utils import ml_trainer
        
        settings = self.load_settings()
        model_type = settings.get("model_type", "prophet")
        data_points = settings.get("data_points", 10000)
        targets = settings.get("targets", ["temperature", "humidity"])
        
        logger.info(f"🤖 Auto-Training started: model={model_type}, data_points={data_points}, targets={targets}")
        print(f"\n{'='*60}")
        print(f"⏰ AUTO-TRAINING SCHEDULER")
        print(f"{'='*60}")
        print(f"🤖 Model: {model_type}")
        print(f"📊 Data points: {data_points}")
        print(f"🎯 Targets: {', '.join(targets)}")
        print(f"🕐 Time: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
        print(f"{'='*60}\n")
        
        try:
            db = SessionLocal()
            
            # Get training data
            records = db.query(SensorData).filter(
                SensorData.temperature > 0
            ).order_by(desc(SensorData.timestamp)).limit(data_points).all()
            
            if len(records) < 100:
                logger.warning("Not enough data for auto-training")
                print("⚠️ Không đủ dữ liệu để huấn luyện")
                
                # Save failed training history
                self._add_training_history(settings, {
                    "status": "failed",
                    "message": "Không đủ dữ liệu để huấn luyện"
                })
                
                db.close()
                return False
            
            # Prepare data
            data = [{
                'timestamp': r.timestamp.isoformat() if hasattr(r.timestamp, 'isoformat') else str(r.timestamp),
                'temperature': r.temperature,
                'humidity': r.humidity,
                'pressure': r.pressure,
                'aqi': r.aqi or 0
            } for r in records]
            
            db.close()
            
            # Train model
            result = ml_trainer.train_model(model_type, data, targets)
            
            if result.get('success'):
                # Update last auto train time
                now = datetime.now()
                settings["last_auto_train"] = now.strftime("%d/%m/%Y %H:%M")
                settings["last_auto_train_timestamp"] = now.isoformat()
                
                accuracy = result.get("accuracy", 0) * 100
                
                # Save training to history
                self._add_training_history(settings, {
                    "timestamp": now.isoformat(),
                    "model_type": model_type,
                    "data_points": data_points,
                    "targets": targets,
                    "accuracy": accuracy / 100,  # Store as decimal
                    "training_time": result.get('training_time', 0),
                    "status": "success",
                    "message": "Training completed successfully"
                })
                
                self.save_settings(settings)
                
                logger.info(f"✅ Auto-Training completed: accuracy={accuracy:.2f}%")
                print(f"\n✅ AUTO-TRAINING HOÀN TẤT!")
                print(f"📈 R² Score: {accuracy:.2f}%")
                print(f"⏱️ Thời gian: {result.get('training_time', 0):.1f}s")
                print(f"{'='*60}\n")
                return True
            else:
                error_msg = result.get('message', 'Unknown error')
                logger.error(f"Auto-Training failed: {error_msg}")
                print(f"❌ Auto-Training thất bại: {error_msg}")
                
                # Save failed training to history
                now = datetime.now()
                self._add_training_history(settings, {
                    "timestamp": now.isoformat(),
                    "model_type": model_type,
                    "data_points": data_points,
                    "targets": targets,
                    "status": "failed",
                    "message": error_msg
                })
                
                return False
                
        except Exception as e:
            logger.error(f"Auto-Training error: {e}")
            print(f"❌ Auto-Training lỗi: {e}")
            
            # Save error to history
            now = datetime.now()
            self._add_training_history(settings, {
                "timestamp": now.isoformat(),
                "model_type": model_type,
                "data_points": data_points,
                "targets": targets,
                "status": "error",
                "message": str(e)
            })
            
            return False
    
    def _add_training_history(self, settings, history_entry):
        """Add a training record to history"""
        if "training_history" not in settings:
            settings["training_history"] = []
        
        # Keep only last 50 records
        settings["training_history"].insert(0, history_entry)
        settings["training_history"] = settings["training_history"][:50]
        
        self.save_settings(settings)
    
    def check_and_run(self):
        """Check if training should run and execute if needed"""
        settings = self.load_settings()
        
        if self.should_train(settings):
            logger.info("Auto-training triggered by scheduler")
            self.run_training()
    
    def scheduler_loop(self):
        """Main scheduler loop - runs in background thread"""
        logger.info("🔄 Auto-Training Scheduler started")
        print("🔄 Auto-Training Scheduler đang chạy...")
        
        while self.running:
            try:
                settings = self.load_settings()
                
                # Only check if enabled
                if settings.get("enabled", False):
                    if self.should_train(settings):
                        logger.info("⏰ Auto-training triggered by scheduler")
                        print(f"\n⏰ Đến giờ huấn luyện tự động: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
                        self.run_training()
                else:
                    # If disabled, just log periodically (every 6 hours)
                    if not hasattr(self, '_last_disabled_log') or \
                       (datetime.now() - self._last_disabled_log).total_seconds() > 21600:
                        logger.info("Auto-Training is disabled")
                        self._last_disabled_log = datetime.now()
                        
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
            
            # Sleep for 30 minutes before next check (more frequent than 1 hour)
            # This ensures we don't miss the target hour
            for _ in range(1800):  # 1800 seconds = 30 minutes
                if not self.running:
                    break
                time.sleep(1)
    
    def start(self):
        """Start the scheduler in background"""
        if self.running:
            return
        
        self.running = True
        self.thread = Thread(target=self.scheduler_loop, daemon=True)
        self.thread.start()
        logger.info("Auto-Training Scheduler started in background")
    
    def stop(self):
        """Stop the scheduler"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        logger.info("Auto-Training Scheduler stopped")


# Global scheduler instance
auto_train_scheduler = AutoTrainScheduler()


def start_scheduler():
    """Start the auto-training scheduler"""
    auto_train_scheduler.start()


def stop_scheduler():
    """Stop the auto-training scheduler"""
    auto_train_scheduler.stop()
