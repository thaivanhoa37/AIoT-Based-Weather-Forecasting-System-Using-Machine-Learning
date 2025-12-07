"""
Insert sample data into database for testing
Run this script to populate database with realistic sensor data
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta
import random
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.sensor_data import SensorData, Base
from models.weather_forecasting import WeatherForecasting
from database import DATABASE_URL

def insert_sample_data():
    """Insert sample sensor data for the last 7 days"""
    print("🔄 Connecting to database...")
    print(f"📡 Database: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'localhost'}")
    engine = create_engine(DATABASE_URL, echo=False)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    
    try:
        print("📊 Inserting sensor data...")
        
        # Generate data for last 7 days, every 5 minutes
        now = datetime.now()
        records_to_insert = []
        
        # 7 days * 24 hours * 12 records per hour (every 5 minutes) = ~2000 records
        for i in range(2000):
            timestamp = now - timedelta(minutes=i * 5)
            
            # Generate realistic sensor values with daily patterns
            hour = timestamp.hour
            
            # Temperature: cooler at night (22-28°C), warmer during day (28-35°C)
            base_temp = 25 + 5 * (1 - abs(hour - 14) / 14)  # Peak at 2 PM
            temperature = base_temp + random.uniform(-2, 2)
            
            # Humidity: higher at night (60-80%), lower during day (40-60%)
            base_humidity = 60 + 15 * (abs(hour - 14) / 14)
            humidity = base_humidity + random.uniform(-5, 5)
            
            # Pressure: relatively stable
            pressure = 1013 + random.uniform(-5, 5)
            
            # CO2: higher indoors during work hours
            co2 = 400 + random.uniform(0, 200) + (50 if 8 <= hour <= 18 else 0)
            
            # Dust: varies with traffic and activity
            dust = 15 + random.uniform(0, 30) + (20 if 7 <= hour <= 9 or 17 <= hour <= 19 else 0)
            
            # AQI based on dust levels
            aqi = 50 + (dust * 2) + random.uniform(-10, 10)
            
            record = SensorData(
                temperature=round(temperature, 1),
                humidity=round(humidity, 1),
                pressure=round(pressure, 1),
                co2=round(co2, 1),
                dust=round(dust, 1),
                aqi=round(aqi, 0),
                timestamp=timestamp
            )
            records_to_insert.append(record)
            
            # Commit in batches of 100
            if len(records_to_insert) >= 100:
                session.bulk_save_objects(records_to_insert)
                session.commit()
                print(f"  ✓ Inserted {i + 1} sensor records...")
                records_to_insert = []
        
        # Insert remaining records
        if records_to_insert:
            session.bulk_save_objects(records_to_insert)
            session.commit()
            print(f"  ✓ Inserted {2000} sensor records total!")
        
        # Insert weather forecasting data
        print("🌤️  Inserting weather forecasting data...")
        weather_records = []
        
        for i in range(500):  # Last ~2 days of weather data (every 5 minutes)
            timestamp = now - timedelta(minutes=i * 5)
            hour = timestamp.hour
            
            # Wind speed: varies with time of day
            wind_speed = 5 + random.uniform(0, 15) + (5 if 12 <= hour <= 16 else 0)
            
            # Rainfall: random with seasonal pattern
            rainfall = 0 if random.random() > 0.15 else random.uniform(0.1, 10)
            
            # UV index: based on time of day
            if 6 <= hour <= 18:
                uv_index = max(0, min(11, 5 + (7 * (1 - abs(hour - 12) / 6))))
            else:
                uv_index = 0
            
            record = WeatherForecasting(
                wind_speed=round(wind_speed, 1),
                rainfall=round(rainfall, 1),
                uv_index=round(uv_index, 1),
                timestamp=timestamp
            )
            weather_records.append(record)
            
            if len(weather_records) >= 100:
                session.bulk_save_objects(weather_records)
                session.commit()
                print(f"  ✓ Inserted {i + 1} weather records...")
                weather_records = []
        
        if weather_records:
            session.bulk_save_objects(weather_records)
            session.commit()
            print(f"  ✓ Inserted 500 weather records total!")
        
        print("\n✅ Sample data insertion completed successfully!")
        print(f"📊 Total sensor records: 2000")
        print(f"🌤️  Total weather records: 500")
        print(f"⏰ Time range: {(now - timedelta(minutes=2000 * 5)).strftime('%Y-%m-%d %H:%M')} to {now.strftime('%Y-%m-%d %H:%M')}")
        
    except Exception as e:
        print(f"\n❌ Error inserting data: {e}")
        session.rollback()
        raise
    finally:
        session.close()

if __name__ == "__main__":
    print("=" * 60)
    print("  AIoT Weather Forecasting - Sample Data Insertion")
    print("=" * 60)
    print()
    
    try:
        insert_sample_data()
        print("\n🎉 All done! You can now run the web application.")
    except Exception as e:
        print(f"\n💥 Failed: {e}")
        sys.exit(1)
