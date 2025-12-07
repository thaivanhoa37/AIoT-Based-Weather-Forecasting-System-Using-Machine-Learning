// ===== Index Page JavaScript =====

let realtimeUpdateInterval = null;
let isHovering = false;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadRealtimeData();
    displayForecast7Day();
    displayForecastHourly();

    // Pause updates when hovering over content
    const content = document.querySelector('.content');
    if (content) {
        content.addEventListener('mouseenter', () => {
            isHovering = true;
        });
        content.addEventListener('mouseleave', () => {
            isHovering = false;
        });
    }

    // Auto-refresh every 5 seconds (reduced from 3s to prevent jank)
    realtimeUpdateInterval = setInterval(() => {
        if (!isHovering && !document.hidden) {
            loadRealtimeData();
        }
    }, 5000);
    
    // Update forecasts less frequently (every 30 seconds)
    setInterval(() => {
        if (!isHovering && !document.hidden) {
            displayForecast7Day();
            displayForecastHourly();
        }
    }, 30000);
    
    // Pause updates when tab is hidden
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('Tab hidden - pausing updates');
        } else {
            console.log('Tab visible - resuming updates');
            loadRealtimeData();
        }
    });
});

// Load real-time data from SQL
async function loadRealtimeData() {
    // Prevent concurrent updates
    if (window.AppState && window.AppState.updateInProgress) return;
    if (window.AppState) window.AppState.updateInProgress = true;
    
    const loading = AppUtils.showLoading(document.querySelector('.content'), true); // Minimal loader

    try {
        // Fetch real-time data directly from SQL
        const response = await fetch('/api/realtime-data');
        if (!response.ok) throw new Error('Không thể kết nối API');
        const data = await response.json();
        
        if (!data) throw new Error('Không có dữ liệu');

        // Update hero section with smooth transitions
        const heroTemp = document.getElementById('currentTemp');
        const heroHumidity = document.getElementById('heroHumidity');
        const heroWind = document.getElementById('heroWind');
        const heroPressure = document.getElementById('heroPressure');
        
        if (heroTemp) heroTemp.textContent = `${data.temperature}°C`;
        if (document.getElementById('weatherDesc')) document.getElementById('weatherDesc').textContent = 'Thời tiết hiện tại';
        if (heroHumidity) heroHumidity.textContent = `${data.humidity}%`;
        if (heroWind) heroWind.textContent = `${data.wind_speed}km/h`;
        if (heroPressure) heroPressure.textContent = `${data.pressure}hPa`;
        if (document.getElementById('lastUpdate')) document.getElementById('lastUpdate').textContent = `Cập nhật lúc ${data.timestamp}`;

        // Update IoT data cards with fade effect
        const tempCard = document.getElementById('tempValue');
        const humidityCard = document.getElementById('humidityValue');
        const pressureCard = document.getElementById('pressureValue');
        const co2Card = document.getElementById('co2Value');
        const dustCard = document.getElementById('dustValue');
        
        if (tempCard) tempCard.innerHTML = `${data.temperature}<span class="card-unit">°C</span>`;
        if (humidityCard) humidityCard.innerHTML = `${data.humidity}<span class="card-unit">%</span>`;
        if (pressureCard) pressureCard.innerHTML = `${data.pressure}<span class="card-unit">hPa</span>`;
        if (co2Card) co2Card.innerHTML = `${data.co2}<span class="card-unit">ppm</span>`;
        if (dustCard) dustCard.innerHTML = `${data.dust}<span class="card-unit">µg/m³</span>`;

        // Update timestamps
        const timestamp = `Cập nhật: ${data.timestamp}`;
        document.getElementById('tempTime').textContent = timestamp;
        document.getElementById('humidityTime').textContent = timestamp;
        document.getElementById('pressureTime').textContent = timestamp;
        document.getElementById('co2Time').textContent = timestamp;
        document.getElementById('dustTime').textContent = timestamp;

        // Update weather API data
        document.getElementById('windSpeedValue').innerHTML = `${data.wind_speed}<span class="card-unit">km/h</span>`;
        document.getElementById('rainfallValue').innerHTML = `${data.rainfall}<span class="card-unit">mm</span>`;
        document.getElementById('uvValue').textContent = data.uv_index;
        document.getElementById('uvLevel').textContent = AppUtils.getUVLevel(data.uv_index);

        // Update system status via API
        const statsResponse = await fetch('/api/system-stats');
        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            document.getElementById('lastDataTime').textContent = stats.last_update;
            document.getElementById('recordsToday').textContent = stats.records_today;
            document.getElementById('activeSensors').textContent = stats.active_sensors;
        }

    } catch (error) {
        console.error('Error loading data:', error);
        // Suppress toast for frequent updates to avoid spam
        if (!document.hidden) {
            console.warn('Failed to load data:', error.message);
        }
    } finally {
        AppUtils.hideLoading(loading);
        if (window.AppState) window.AppState.updateInProgress = false;
    }
}

// Display 7-day forecast
async function displayForecast7Day() {
    try {
        const response = await fetch('/api/ml/predict?hours_ahead=168');
        if (!response.ok) throw new Error('Failed to fetch forecast');
        const data = await response.json();

        const forecastContainer = document.getElementById('forecast7DayContainer');
        if (!forecastContainer || !data.predictions) return;

        forecastContainer.innerHTML = '';

        // Group predictions by day
        const dailyForecasts = {};
        data.predictions.forEach(pred => {
            const date = pred.timestamp.split(' ')[0];
            if (!dailyForecasts[date]) {
                dailyForecasts[date] = {
                    temps: [],
                    humidities: [],
                    date: date
                };
            }
            dailyForecasts[date].temps.push(parseFloat(pred.temperature));
            dailyForecasts[date].humidities.push(parseFloat(pred.humidity));
        });

        // Display first 7 days
        const days = Object.keys(dailyForecasts).slice(0, 7);
        days.forEach(date => {
            const forecast = dailyForecasts[date];
            const avgTemp = (forecast.temps.reduce((a, b) => a + b) / forecast.temps.length).toFixed(1);
            const maxTemp = Math.max(...forecast.temps).toFixed(1);
            const minTemp = Math.min(...forecast.temps).toFixed(1);

            const card = document.createElement('div');
            card.className = 'forecast-day-card';
            card.innerHTML = `
                <div class="forecast-day-name">${date}</div>
                <div class="forecast-day-icon">🌤️</div>
                <div class="forecast-day-temp">${avgTemp}°C</div>
                <div class="forecast-day-range">${minTemp}° - ${maxTemp}°</div>
            `;
            forecastContainer.appendChild(card);
        });

    } catch (error) {
        console.error('Error loading 7-day forecast:', error);
    }
}

// Display hourly forecast
async function displayForecastHourly() {
    try {
        const response = await fetch('/api/ml/predict?hours_ahead=24');
        if (!response.ok) throw new Error('Failed to fetch forecast');
        const data = await response.json();

        const forecastContainer = document.getElementById('forecastHourlyContainer');
        if (!forecastContainer || !data.predictions) return;

        forecastContainer.innerHTML = '';

        // Display every 3 hours
        data.predictions.filter((_, idx) => idx % 3 === 0).slice(0, 8).forEach(pred => {
            const time = pred.timestamp.split(' ')[1].substring(0, 5);

            const card = document.createElement('div');
            card.className = 'forecast-hour-card';
            card.innerHTML = `
                <div class="forecast-hour-time">${time}</div>
                <div class="forecast-hour-icon">🌤️</div>
                <div class="forecast-hour-temp">${pred.temperature}°C</div>
                <div class="forecast-hour-detail">${pred.humidity}%</div>
            `;
            forecastContainer.appendChild(card);
        });

    } catch (error) {
        console.error('Error loading hourly forecast:', error);
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (realtimeUpdateInterval) {
        clearInterval(realtimeUpdateInterval);
    }
});
