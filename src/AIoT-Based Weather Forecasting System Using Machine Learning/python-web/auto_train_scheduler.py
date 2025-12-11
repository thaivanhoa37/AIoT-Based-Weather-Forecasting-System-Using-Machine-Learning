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
            "last_auto_train": None,
            "last_auto_train_timestamp": None
        }
        try:
            if AUTO_TRAIN_CONFIG_FILE.exists():
                with open(AUTO_TRAIN_CONFIG_FILE, 'r', encoding='utf-8') as f:
                    saved = json.load(f)
                    default_settings.update(saved)
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
        
        # Check if current hour matches target hour
        if now.hour != target_hour:
            return False
        
        # Check if we already trained today
        last_train_str = settings.get("last_auto_train_timestamp")
        if last_train_str:
            try:
                last_train = datetime.fromisoformat(last_train_str)
                days_since = (now - last_train).days
                if days_since < interval_days:
                    return False
            except:
                pass
        
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
        
        logger.info(f"🤖 Auto-Training started: model={model_type}, data_points={data_points}")
        print(f"\n{'='*60}")
        print(f"⏰ AUTO-TRAINING SCHEDULER")
        print(f"{'='*60}")
        print(f"🤖 Model: {model_type}")
        print(f"📊 Data points: {data_points}")
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
            result = ml_trainer.train_model(model_type, data)
            
            if result.get('success'):
                # Update last auto train time
                now = datetime.now()
                settings["last_auto_train"] = now.strftime("%d/%m/%Y %H:%M")
                settings["last_auto_train_timestamp"] = now.isoformat()
                self.save_settings(settings)
                
                accuracy = result.get("accuracy", 0) * 100
                logger.info(f"✅ Auto-Training completed: accuracy={accuracy:.2f}%")
                print(f"\n✅ AUTO-TRAINING HOÀN TẤT!")
                print(f"📈 R² Score: {accuracy:.2f}%")
                print(f"⏱️ Thời gian: {result.get('training_time', 0):.1f}s")
                print(f"{'='*60}\n")
                return True
            else:
                logger.error(f"Auto-Training failed: {result.get('message')}")
                print(f"❌ Auto-Training thất bại: {result.get('message')}")
                return False
                
        except Exception as e:
            logger.error(f"Auto-Training error: {e}")
            print(f"❌ Auto-Training lỗi: {e}")
            return False
    
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
                self.check_and_run()
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
            
            # Sleep for 1 hour before next check
            for _ in range(3600):  # 3600 seconds = 1 hour
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
