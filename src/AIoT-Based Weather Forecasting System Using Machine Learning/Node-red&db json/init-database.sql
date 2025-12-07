-- Create database if not exists
CREATE DATABASE IF NOT EXISTS weather_forecasting CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE weather_forecasting;

-- Create sensor_data table
CREATE TABLE IF NOT EXISTS sensor_data (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    temperature FLOAT NOT NULL,
    humidity FLOAT NOT NULL,
    pressure FLOAT NOT NULL,
    co2 FLOAT NOT NULL,
    dust FLOAT NOT NULL,
    aqi FLOAT NOT NULL,
    timestamp DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create weather_forecasting table for OpenWeatherMap API data
CREATE TABLE IF NOT EXISTS weather_api (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    wind_speed FLOAT NOT NULL DEFAULT 0 COMMENT 'Wind speed in m/s',
    rainfall FLOAT NOT NULL DEFAULT 0 COMMENT 'Rainfall in mm',
    uv_index FLOAT NOT NULL DEFAULT 0 COMMENT 'UV index',
    timestamp DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
