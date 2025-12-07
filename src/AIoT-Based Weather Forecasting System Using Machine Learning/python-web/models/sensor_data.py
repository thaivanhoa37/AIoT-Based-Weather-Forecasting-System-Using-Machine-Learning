"""
Sensor Data Model - IoT sensor readings
"""
from sqlalchemy import Column, BigInteger, Float, DateTime, TIMESTAMP, Index
from sqlalchemy.sql import func
from database import Base


class SensorData(Base):
    """
    Model for sensor_data table
    Stores IoT sensor readings: temperature, humidity, pressure, CO2, dust, AQI
    """
    __tablename__ = "sensor_data"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    temperature = Column(Float, nullable=False, comment="Temperature in Celsius")
    humidity = Column(Float, nullable=False, comment="Humidity in percentage")
    pressure = Column(Float, nullable=False, comment="Atmospheric pressure in hPa")
    co2 = Column(Float, nullable=False, comment="CO2 level in ppm")
    dust = Column(Float, nullable=False, comment="Dust/PM2.5 in µg/m³")
    aqi = Column(Float, nullable=False, comment="Air Quality Index")
    timestamp = Column(DateTime, nullable=False, index=True, comment="Measurement timestamp")
    created_at = Column(TIMESTAMP, server_default=func.now(), comment="Record creation time")

    # Indexes
    __table_args__ = (
        Index('idx_timestamp', 'timestamp'),
    )

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            "id": self.id,
            "temperature": float(self.temperature),
            "humidity": float(self.humidity),
            "pressure": float(self.pressure),
            "co2": float(self.co2),
            "dust": float(self.dust),
            "aqi": float(self.aqi),
            "timestamp": self.timestamp.strftime("%Y-%m-%d %H:%M:%S") if self.timestamp else None,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S") if self.created_at else None,
        }

    def __repr__(self):
        return f"<SensorData(id={self.id}, temp={self.temperature}°C, humidity={self.humidity}%, timestamp={self.timestamp})>"
