"""
Weather Forecasting Model - OpenWeatherMap API data
"""
from sqlalchemy import Column, BigInteger, Float, DateTime, TIMESTAMP, Index
from sqlalchemy.sql import func
from database import Base


class WeatherForecasting(Base):
    """
    Model for weather_api table
    Stores weather data from OpenWeatherMap API: wind, rainfall, UV index
    """
    __tablename__ = "weather_api"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    wind_speed = Column(Float, nullable=False, default=0, comment="Wind speed in m/s")
    rainfall = Column(Float, nullable=False, default=0, comment="Rainfall in mm")
    uv_index = Column(Float, nullable=False, default=0, comment="UV index")
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
            "wind_speed": float(self.wind_speed),
            "rainfall": float(self.rainfall),
            "uv_index": float(self.uv_index),
            "timestamp": self.timestamp.strftime("%Y-%m-%d %H:%M:%S") if self.timestamp else None,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S") if self.created_at else None,
        }

    def __repr__(self):
        return f"<WeatherForecasting(id={self.id}, wind={self.wind_speed}m/s, rain={self.rainfall}mm, timestamp={self.timestamp})>"
