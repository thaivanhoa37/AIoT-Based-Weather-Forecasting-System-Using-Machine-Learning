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

    // Listen for language change event to refresh forecast displays
    window.addEventListener('languageChanged', () => {
        console.log('Language changed - refreshing forecasts');
        displayForecast7Day();
        displayForecastHourly();
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

// Display 7-day forecast from ML Model - Improved version
async function displayForecast7Day() {
    const grid = document.getElementById('forecast7DayGrid');
    if (!grid) return;
    
    // Helper function to get translation - use i18n system
    const t = (key) => window.i18n && typeof window.i18n.t === 'function' ? window.i18n.t(key) : key.split('.').pop();
    
    grid.innerHTML = `<div class="loading-text" style="grid-column: 1/-1; text-align: center; padding: 20px;">🔄 ${t('index.loadingForecastML')}</div>`;
    
    try {
        const response = await fetch('/api/ml/predict?hours_ahead=168');
        if (!response.ok) throw new Error('Failed to fetch forecast');
        const data = await response.json();

        if (!data.forecasts || data.forecasts.length === 0) {
            throw new Error('No forecast data - Model chưa được train');
        }

        // Group forecasts by day
        const dailyForecasts = {};
        data.forecasts.forEach(forecast => {
            const date = forecast.timestamp.split(' ')[0]; // Get date part (DD/MM/YYYY)
            if (!dailyForecasts[date]) {
                dailyForecasts[date] = [];
            }
            dailyForecasts[date].push(forecast);
        });

        // Calculate daily averages and display first 7 days
        const days = Object.keys(dailyForecasts).slice(0, 7);
        grid.innerHTML = '';

        days.forEach((date, index) => {
            const dayData = dailyForecasts[date];
            const temps = dayData.map(d => parseFloat(d.temperature)).filter(t => !isNaN(t));
            const humidities = dayData.map(d => parseFloat(d.humidity)).filter(h => !isNaN(h));
            const rainfalls = dayData.map(d => parseFloat(d.rainfall) || 0);
            const uvIndices = dayData.map(d => parseFloat(d.uv_index) || 0);
            
            // Count rain based on rainfall > 0.5 OR willRain flag
            const rainCount = dayData.filter(d => d.willRain || (parseFloat(d.rainfall) || 0) > 0.5).length;

            const tempMax = temps.length > 0 ? Math.max(...temps) : '--';
            const tempMin = temps.length > 0 ? Math.min(...temps) : '--';
            const avgHumidity = humidities.length > 0 ? humidities.reduce((a, b) => a + b, 0) / humidities.length : 0;
            const totalRainfall = rainfalls.reduce((a, b) => a + b, 0);
            const avgUV = uvIndices.filter(u => u > 0).length > 0 ? 
                uvIndices.filter(u => u > 0).reduce((a, b) => a + b, 0) / uvIndices.filter(u => u > 0).length : 0;
            const rainChance = dayData.length > 0 ? (rainCount / dayData.length) * 100 : 0;

            // Improved weather determination based on rainfall, UV and humidity
            let icon = '☀️';
            let condition = t('forecast.sunny') || 'Nắng';
            let conditionKey = 'sunny';
            
            if (totalRainfall > 10 || rainChance > 70) {
                // Heavy rain expected
                icon = '🌧️';
                condition = t('forecast.rain') || 'Mưa';
                conditionKey = 'rain';
            } else if (totalRainfall > 2 || rainChance > 50) {
                // Light rain possible
                icon = '🌦️';
                condition = t('forecast.mayRain') || 'Có thể mưa';
                conditionKey = 'mayRain';
            } else if (rainChance > 30) {
                // Chance of showers
                icon = '⛅';
                condition = t('forecast.cloudy') || 'Có mây';
                conditionKey = 'cloudy';
            } else if (avgUV >= 6) {
                // High UV - sunny day
                icon = '☀️';
                condition = t('forecast.sunny') || 'Nắng';
                conditionKey = 'sunny';
            } else if (avgUV >= 3) {
                // Moderate UV - partly sunny
                icon = '🌤️';
                condition = t('forecast.sunnyLight') || 'Nắng nhẹ';
                conditionKey = 'sunnyLight';
            } else if (avgHumidity > 85) {
                // High humidity, low UV - cloudy
                icon = '☁️';
                condition = t('forecast.manyClouds') || 'Nhiều mây';
                conditionKey = 'manyClouds';
            } else if (avgUV > 0) {
                // Low UV but some sunshine
                icon = '⛅';
                condition = t('forecast.cloudy') || 'Có mây';
                conditionKey = 'cloudy';
            }

            // Parse date (DD/MM/YYYY format)
            const dateParts = date.split('/');
            let dayName = date;
            let displayDate = date;
            
            if (dateParts.length === 3) {
                const [day, month, year] = dateParts;
                const dateObj = new Date(year, month - 1, day);
                // Use i18n for day names
                const currentLang = localStorage.getItem('language') || 'vi';
                const dayNamesVi = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const dayNames = currentLang === 'en' ? dayNamesEn : dayNamesVi;
                dayName = dayNames[dateObj.getDay()];
                displayDate = `${day}/${month}`;
            }

            const card = document.createElement('div');
            card.className = 'forecast-card-7day';
            if (index === 0) card.classList.add('today');

            card.innerHTML = `
                <div class="forecast-date">${dayName}, ${displayDate}</div>
                <div class="forecast-icon" style="font-size: 32px;">${icon}</div>
                <div class="forecast-condition">${condition}</div>
                <div class="forecast-temp">
                    <span class="temp-max">${typeof tempMax === 'number' ? tempMax.toFixed(0) : tempMax}°</span>
                    <span class="temp-min">${typeof tempMin === 'number' ? tempMin.toFixed(0) : tempMin}°</span>
                </div>
                <div class="forecast-details">
                    <span>💧 ${avgHumidity.toFixed(0)}%</span>
                    ${avgUV > 0 ? `<span>☀️ UV ${avgUV.toFixed(1)}</span>` : ''}
                </div>
                <div class="forecast-rain">☔ ${rainChance.toFixed(0)}%${totalRainfall > 0 ? ` (${totalRainfall.toFixed(1)}mm)` : ''}</div>
            `;
            grid.appendChild(card);
        });

        // Show model info
        if (data.modelInfo) {
            console.log('ML Model Info:', data.modelInfo.name, '- Accuracy:', data.modelInfo.accuracy + '%');
        }

        // Add scroll buttons (defined in index.html)
        if (typeof addScrollButtonsFor7Day === 'function') {
            addScrollButtonsFor7Day();
        }

    } catch (error) {
        console.error('Error loading 7-day forecast:', error);
        grid.innerHTML = `
            <div class="error-text" style="grid-column: 1/-1; text-align: center; padding: 30px; color: var(--danger);">
                <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                <div style="font-size: 16px; font-weight: bold;">Không thể tải dự báo 7 ngày</div>
                <div style="font-size: 14px; color: var(--text-secondary); margin-top: 10px;">
                    ${error.message}<br>
                    <a href="/ml-training" style="color: var(--primary-color);">👉 Vui lòng train model trước</a>
                </div>
            </div>
        `;
    }
}

// Display hourly forecast from ML Model (24 hours) - Using same logic as forecast page
async function displayForecastHourly() {
    const grid = document.getElementById('forecastHourlyGrid');
    if (!grid) return;
    
    // Helper function to get translation - use i18n system
    const t = (key) => window.i18n && typeof window.i18n.t === 'function' ? window.i18n.t(key) : key.split('.').pop();
    
    grid.innerHTML = `<div class="loading-text" style="grid-column: 1/-1; text-align: center; padding: 20px;">🔄 ${t('index.loadingForecast')}</div>`;
    
    try {
        const response = await fetch('/api/ml/predict?hours_ahead=24');
        if (!response.ok) throw new Error('Failed to fetch forecast');
        const data = await response.json();

        if (!data.forecasts || data.forecasts.length === 0) {
            throw new Error('No forecast data');
        }

        grid.innerHTML = '';
        
        // Lấy giờ hiện tại để highlight
        const now = new Date();
        const currentHour = now.getHours();

        // Display all 24 hours
        data.forecasts.slice(0, 24).forEach((forecast, index) => {
            const tempValue = parseFloat(forecast.temperature);
            const humidityValue = parseFloat(forecast.humidity);
            const uvIndex = parseFloat(forecast.uv_index) || 0;
            const rainfall = parseFloat(forecast.rainfall) || 0;
            const confidence = parseInt(forecast.confidence) || 0;

            // Get hour from timestamp
            const timeStr = forecast.timestamp.split(' ')[1] || '00:00:00';
            const hour = parseInt(timeStr.split(':')[0]) || 0;
            const isDaytime = hour >= 10 && hour <= 18;  // UV chỉ có từ 10h-18h (same as forecast page)

            // Determine weather icon and condition - Using same logic as forecast page
            let weatherIcon, rainText, isRain;

            if (forecast.weather_icon && forecast.weather_condition_key) {
                // Sử dụng key dịch từ backend
                weatherIcon = forecast.weather_icon;
                rainText = t(`forecast.${forecast.weather_condition_key}`);
                isRain = forecast.willRain || false;
            } else if (forecast.weather_icon && forecast.weather_condition) {
                // Sử dụng trực tiếp từ backend (fallback)
                weatherIcon = forecast.weather_icon;
                rainText = forecast.weather_condition;
                isRain = forecast.willRain || false;
            } else if (forecast.weather_condition) {
                // Chỉ có condition, tự xác định icon theo giờ
                const condition = forecast.weather_condition;
                isRain = condition.includes('Mưa') || condition.includes('Rain');
                rainText = condition;
                
                if (condition.includes('Mưa') || condition.includes('Rain')) {
                    weatherIcon = '🌧️';
                } else if (condition.includes('Nắng') || condition.includes('Sunny')) {
                    weatherIcon = isDaytime ? '☀️' : '🌙';
                } else if (condition.includes('mây') || condition.includes('Mây') || condition.includes('Cloud')) {
                    weatherIcon = '☁️';
                } else if (condition.includes('Đêm') || condition.includes('đêm') || condition.includes('Night')) {
                    weatherIcon = '🌙';
                } else if (condition.includes('Sương') || condition.includes('Fog')) {
                    weatherIcon = '🌫️';
                } else if (condition.includes('Sáng sớm') || condition.includes('Morning')) {
                    weatherIcon = '🌅';
                } else if (condition.includes('Chiều tối') || condition.includes('Evening')) {
                    weatherIcon = '🌆';
                } else {
                    weatherIcon = isDaytime ? '⛅' : '🌙';
                }
            } else {
                // Fallback: tính toán dựa trên giờ, UV, humidity, rainfall
                if (rainfall > 0.5 || forecast.willRain) {
                    isRain = true;
                    weatherIcon = '🌧️';
                    rainText = t('forecast.rain');
                } else if (isDaytime) {
                    // Ban ngày: dùng UV
                    if (uvIndex >= 6) {
                        isRain = false;
                        weatherIcon = '☀️';
                        rainText = t('forecast.sunny');
                    } else if (uvIndex >= 3) {
                        isRain = false;
                        weatherIcon = '🌤️';
                        rainText = t('forecast.sunnyLight');
                    } else {
                        isRain = false;
                        weatherIcon = '☁️';
                        rainText = t('forecast.manyClouds');
                    }
                } else {
                    // Ban đêm: theo giờ cụ thể
                    if (rainfall > 0) {
                        isRain = true;
                        weatherIcon = '🌧️';
                        rainText = t('forecast.nightRain');
                    } else if (humidityValue > 90) {
                        isRain = false;
                        weatherIcon = '🌫️';
                        rainText = t('forecast.fog');
                    } else if (hour >= 6 && hour < 10) {
                        isRain = false;
                        weatherIcon = '🌅';
                        rainText = t('forecast.earlyMorning');
                    } else if (hour > 18 && hour <= 20) {
                        isRain = false;
                        weatherIcon = '🌆';
                        rainText = t('forecast.evening');
                    } else {
                        isRain = false;
                        weatherIcon = '🌙';
                        rainText = t('forecast.clearNight');
                    }
                }
            }

            const card = document.createElement('div');
            card.className = 'forecast-card';
            
            // Kiểm tra xem có phải giờ hiện tại không
            const isCurrentHour = hour === currentHour;
            if (isCurrentHour) {
                card.classList.add('current-hour');
            }
            card.dataset.hour = hour;
            card.style.animation = `fadeInUp 0.3s ease ${index * 0.03}s both`;

            card.innerHTML = `
                <div class="forecast-time">${timeStr.substring(0, 5)}</div>
                <div class="forecast-icon">${weatherIcon}</div>
                <div class="forecast-temp">${isNaN(tempValue) ? '--' : tempValue}°C</div>
                <div class="forecast-details">
                    💧 ${isNaN(humidityValue) ? '--' : humidityValue}%<br>
                    📊 ${forecast.pressure || '--'} hPa
                </div>
                <div class="rain-indicator ${isRain ? 'rain-yes' : 'rain-no'}">
                    ${weatherIcon} ${rainText}
                </div>
                <div class="confidence-badge" style="margin-top: 6px;">📊 ${confidence}%</div>
            `;
            grid.appendChild(card);
        });
        
        // Scroll đến giờ hiện tại sau khi render
        setTimeout(() => {
            const currentCard = grid.querySelector('.forecast-card.current-hour');
            if (currentCard) {
                const container = grid.parentElement;
                if (container) {
                    const cardLeft = currentCard.offsetLeft;
                    const cardWidth = currentCard.offsetWidth;
                    const containerWidth = container.offsetWidth;
                    
                    // Scroll để card hiện tại ở giữa màn hình
                    const scrollPosition = cardLeft - (containerWidth / 2) + (cardWidth / 2);
                    container.scrollTo({
                        left: Math.max(0, scrollPosition),
                        behavior: 'smooth'
                    });
                }
            }
        }, 100);

    } catch (error) {
        console.error('Error loading hourly forecast:', error);
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 30px; color: var(--danger);">
                <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                <div style="font-size: 16px; font-weight: bold;">${t('index.errorLoadForecast')}</div>
                <div style="font-size: 14px; color: var(--text-secondary); margin-top: 10px;">${error.message}</div>
            </div>
        `;
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (realtimeUpdateInterval) {
        clearInterval(realtimeUpdateInterval);
    }
});
