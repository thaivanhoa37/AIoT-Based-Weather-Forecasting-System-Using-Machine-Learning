// ===== Forecast Page JavaScript (Full Implementation) =====

let forecastData = null;
let forecastUpdateInterval = null;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Initialize app state
    if (!window.AppState) {
        window.AppState = { 
            updateInProgress: false,
            theme: localStorage.getItem('theme') || 'light'
        };
    }
    
    // Apply theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
    
    loadForecastData();
    
    // Auto-refresh every 30 seconds
    forecastUpdateInterval = setInterval(() => {
        loadForecastData();
    }, 30000);
    
    // Listen for language change to update table
    window.addEventListener('languageChanged', () => {
        if (forecastData && forecastData.forecasts) {
            updateForecastTable(forecastData.forecasts);
            updateForecastGrid(forecastData.forecasts);
        }
    });
    
    // Handle hamburger menu
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebar = document.getElementById('sidebar');
    if (hamburgerBtn && sidebar) {
        hamburgerBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }
    
    // Handle theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        // Apply saved theme
        const isDarkMode = localStorage.getItem('theme') === 'dark';
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            themeToggle.textContent = '☀️';
        } else {
            document.body.classList.remove('dark-mode');
            themeToggle.textContent = '🌙';
        }
        
        themeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const isDark = document.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            themeToggle.textContent = isDark ? '☀️' : '🌙';
            
            // Animate
            themeToggle.style.transform = 'rotate(180deg)';
            setTimeout(() => {
                themeToggle.style.transform = 'rotate(0deg)';
            }, 300);
        });
        
        themeToggle.style.transition = 'transform 0.3s ease';
    }
    
    // Update clock
    updateClock();
    setInterval(updateClock, 1000);
});

// Update clock display
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const clockDisplay = document.getElementById('clockTime');
    if (clockDisplay) {
        clockDisplay.textContent = `${hours}:${minutes}:${seconds}`;
    }
}

// Load forecast data from API
async function loadForecastData() {
    // Prevent concurrent updates
    if (window.AppState && window.AppState.updateInProgress) return;
    if (window.AppState) window.AppState.updateInProgress = true;
    
    try {
        // Fetch forecast from API
        const response = await fetch('/api/ml/predict?hours_ahead=24');
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        forecastData = await response.json();
        
        if (!forecastData.success) {
            throw new Error(forecastData.detail || 'Không thể tải dữ liệu dự báo');
        }
        
        // Update all sections
        updateSummaryBox(forecastData);
        updateForecastGrid(forecastData.forecasts);
        updateForecastTable(forecastData.forecasts);
        updateStatistics(forecastData);
        updateModelInfo(forecastData.modelInfo);
        
        // Show success toast
        const now = Date.now();
        if (!window.lastSuccessUpdate || now - window.lastSuccessUpdate > 60000) {
            AppUtils.showToast('✅ Đã cập nhật dự báo', 'success');
            window.lastSuccessUpdate = now;
        }
        
    } catch (error) {
        console.error('Error loading forecast:', error);
        
        // Show error in grid
        const grid = document.getElementById('forecastGrid');
        if (grid) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 30px; color: var(--danger);">
                    <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                    <div style="font-size: 16px; font-weight: bold;">Lỗi tải dự báo</div>
                    <div style="font-size: 14px; color: var(--text-secondary); margin-top: 10px;">${error.message}</div>
                </div>
            `;
        }
        
        // Show error toast (rate limited to once per minute)
        const now = Date.now();
        if (!window.lastForecastError || now - window.lastForecastError > 60000) {
            AppUtils.showToast(`❌ ${error.message}`, 'error');
            window.lastForecastError = now;
        }
        
    } finally {
        if (window.AppState) window.AppState.updateInProgress = false;
    }
}

// Update summary box
function updateSummaryBox(data) {
    const summaryIcon = document.getElementById('summaryIcon');
    const summaryText = document.getElementById('summaryText');
    const summaryDetail = document.getElementById('summaryDetail');
    
    if (!summaryIcon || !summaryText || !summaryDetail) return;
    
    // Determine icon based on rain probability
    let icon = '☀️';
    if (data.rainProbability > 60) icon = '⛈️';
    else if (data.rainProbability > 30) icon = '🌧️';
    else if (data.rainProbability > 0) icon = '🌥️';
    
    summaryIcon.textContent = icon;
    summaryText.textContent = data.summary;
    summaryDetail.textContent = data.detail;
}

// Update forecast grid (cards)
function updateForecastGrid(forecasts) {
    const grid = document.getElementById('forecastGrid');
    if (!grid) return;
    
    // Show all available forecasts (up to 24 hours)
    const displayForecasts = forecasts.slice(0, 24);
    
    if (displayForecasts.length === 0) {
        grid.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-secondary); grid-column: 1/-1;">📭 Không có dữ liệu dự báo</div>';
        return;
    }
    
    grid.innerHTML = displayForecasts.map((forecast, index) => {
        const tempValue = parseFloat(forecast.temperature);
        const humidityValue = parseFloat(forecast.humidity);
        const uvIndex = parseFloat(forecast.uv_index) || 0;
        const rainfall = parseFloat(forecast.rainfall) || 0;
        
        // Helper function to get translation
        const t = (key) => getTranslation(key);
        
        // Lấy giờ từ timestamp để xác định ban ngày/đêm
        const timeStr = forecast.timestamp.split(' ')[1] || '00:00:00';
        const hour = parseInt(timeStr.split(':')[0]) || 0;
        const isDaytime = hour >= 10 && hour <= 18;  // UV chỉ có từ 10h-18h
        
        // Sử dụng weather_icon và weather_condition từ backend nếu có
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
        
        const confidence = parseInt(forecast.confidence) || 0;
        
        return `
            <div class="forecast-card" style="animation: fadeInUp 0.3s ease ${index * 0.05}s both;">
                <div class="forecast-time">${forecast.timestamp.split(' ')[1] || '--:--'}</div>
                <div class="forecast-icon">${weatherIcon || '🌤️'}</div>
                <div class="forecast-temp">${isNaN(tempValue) ? '--' : tempValue}°C</div>
                <div class="forecast-details">
                    💧 ${isNaN(humidityValue) ? '--' : humidityValue}%<br>
                    📊 ${forecast.pressure || '--'} hPa
                </div>
                <div class="rain-indicator ${isRain ? 'rain-yes' : 'rain-no'}">
                    ${weatherIcon} ${rainText}
                </div>
                <div class="confidence-badge" style="margin-top: 6px;">📊 ${confidence}%</div>
            </div>
        `;
    }).join('');
    
    // Add animation styles if not exists
    if (!document.getElementById('forecastAnimationStyle')) {
        const style = document.createElement('style');
        style.id = 'forecastAnimationStyle';
        style.textContent = `
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Auto-scroll to start
    const container = document.getElementById('forecastGridContainer');
    if (container) {
        container.scrollLeft = 0;
    }
}

// Update forecast table
function updateForecastTable(forecasts) {
    const tableBody = document.getElementById('forecastTableBody');
    if (!tableBody) return;
    
    // Helper function to get translation
    const t = (key) => window.i18n ? window.i18n.t(key) : key;
    
    if (forecasts.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 40px; color: var(--text-secondary);">📭 ${t('forecastExt.noData')}</td></tr>`;
        return;
    }
    
    tableBody.innerHTML = forecasts.map((forecast, index) => {
        const tempValue = parseFloat(forecast.temperature) || '--';
        const humidityValue = parseFloat(forecast.humidity) || '--';
        const pressureValue = parseFloat(forecast.pressure) || '--';
        const windSpeed = parseFloat(forecast.wind_speed) || '--';
        const rainfall = parseFloat(forecast.rainfall) || 0;
        const uvIndex = parseFloat(forecast.uv_index) || '--';
        const confidence = parseInt(forecast.confidence) || 0;
        
        // Lấy giờ từ timestamp để xác định ban ngày/đêm
        const timeStr = forecast.timestamp.split(' ')[1] || '00:00:00';
        const hour = parseInt(timeStr.split(':')[0]) || 0;
        const isDaytime = hour >= 10 && hour <= 18;
        
        // Xác định mùa dựa trên tháng
        const timestamp = forecast.timestamp || '';
        const month = timestamp ? parseInt(timestamp.split('/')[1]) : new Date().getMonth() + 1;
        let season = `🌸 ${t('forecastExt.seasonSpring')}`;
        if (month >= 4 && month <= 6) season = `☀️ ${t('forecastExt.seasonSummer')}`;
        else if (month >= 7 && month <= 9) season = `🍂 ${t('forecastExt.seasonAutumn')}`;
        else if (month >= 10 || month <= 1) season = `❄️ ${t('forecastExt.seasonWinter')}`;
        
        // Xác định thời tiết với icon phù hợp theo giờ
        let weatherCondition = '';
        let weatherClass = 'weather-sunny';
        
        // Sử dụng weather_icon và weather_condition_key từ backend nếu có
        if (forecast.weather_icon && forecast.weather_condition_key) {
            weatherCondition = `${forecast.weather_icon} ${t(`forecast.${forecast.weather_condition_key}`)}`;
            if (forecast.weather_condition_key.includes('Rain') || forecast.weather_condition_key.includes('rain')) {
                weatherClass = 'weather-rain';
            } else if (forecast.weather_condition_key.includes('Cloud') || forecast.weather_condition_key.includes('cloud')) {
                weatherClass = 'weather-cloudy';
            }
        } else if (forecast.weather_icon && forecast.weather_condition) {
            weatherCondition = `${forecast.weather_icon} ${forecast.weather_condition}`;
            if (forecast.weather_condition.includes('Mưa') || forecast.weather_condition.includes('Rain')) {
                weatherClass = 'weather-rain';
            } else if (forecast.weather_condition.includes('mây') || forecast.weather_condition.includes('Mây') || forecast.weather_condition.includes('Cloud')) {
                weatherClass = 'weather-cloudy';
            }
        } else if (forecast.weather_condition) {
            const condition = forecast.weather_condition;
            let icon;
            if (condition.includes('Mưa') || condition.includes('Rain')) {
                icon = '🌧️';
                weatherClass = 'weather-rain';
            } else if (condition.includes('Nắng') || condition.includes('Sunny')) {
                icon = isDaytime ? '☀️' : '🌙';
                weatherClass = 'weather-sunny';
            } else if (condition.includes('mây') || condition.includes('Mây') || condition.includes('Cloud')) {
                icon = '☁️';
                weatherClass = 'weather-cloudy';
            } else if (condition.includes('Đêm') || condition.includes('đêm') || condition.includes('Night')) {
                icon = '🌙';
            } else if (condition.includes('Sương') || condition.includes('Fog')) {
                icon = '🌫️';
            } else if (condition.includes('Sáng sớm') || condition.includes('Morning')) {
                icon = '🌅';
            } else if (condition.includes('Chiều tối') || condition.includes('Evening')) {
                icon = '🌆';
            } else {
                icon = isDaytime ? '⛅' : '🌙';
            }
            weatherCondition = `${icon} ${condition}`;
        } else {
            // Fallback theo giờ và điều kiện
            if (forecast.willRain || rainfall > 0.5) {
                weatherCondition = `🌧️ ${t('forecast.rain')}`;
                weatherClass = 'weather-rain';
            } else if (isDaytime) {
                if (uvIndex !== '--' && uvIndex >= 6) {
                    weatherCondition = `☀️ ${t('forecast.sunny')}`;
                } else if (uvIndex !== '--' && uvIndex >= 3) {
                    weatherCondition = `🌤️ ${t('forecast.sunnyLight')}`;
                } else {
                    weatherCondition = `☁️ ${t('forecast.manyClouds')}`;
                    weatherClass = 'weather-cloudy';
                }
            } else {
                // Ban đêm
                if (rainfall > 0) {
                    weatherCondition = `🌧️ ${t('forecast.nightRain')}`;
                    weatherClass = 'weather-rain';
                } else if (humidityValue > 90) {
                    weatherCondition = `🌫️ ${t('forecast.fog')}`;
                } else if (hour >= 6 && hour < 10) {
                    weatherCondition = `🌅 ${t('forecast.earlyMorning')}`;
                } else if (hour > 18 && hour <= 20) {
                    weatherCondition = `🌆 ${t('forecast.evening')}`;
                } else {
                    weatherCondition = `🌙 ${t('forecast.clearNight')}`;
                }
            }
        }
        
        // UV Level badge
        let uvBadge = '--';
        if (uvIndex !== '--') {
            let uvColor = '#22543d'; // Low
            let uvLabel = t('forecastExt.uvLow');
            if (uvIndex >= 3 && uvIndex < 6) { uvColor = '#744210'; uvLabel = t('forecastExt.uvMedium'); }
            else if (uvIndex >= 6 && uvIndex < 8) { uvColor = '#c05621'; uvLabel = t('forecastExt.uvHigh'); }
            else if (uvIndex >= 8 && uvIndex < 11) { uvColor = '#c53030'; uvLabel = t('forecastExt.uvVeryHigh'); }
            else if (uvIndex >= 11) { uvColor = '#702459'; uvLabel = t('forecastExt.uvExtreme'); }
            uvBadge = `<span style="background: ${uvColor}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${uvIndex} (${uvLabel})</span>`;
        }
        
        return `
            <tr style="animation: slideIn 0.3s ease ${index * 0.02}s both; opacity: 0;">
                <td><small><strong>${forecast.timestamp}</strong></small></td>
                <td><strong style="font-size: 15px; color: var(--primary-color);">${tempValue}${tempValue !== '--' ? '°C' : ''}</strong></td>
                <td>${humidityValue}${humidityValue !== '--' ? '%' : ''}</td>
                <td>${pressureValue !== '--' ? pressureValue + ' mb' : '--'}</td>
                <td>${windSpeed !== '--' ? windSpeed + ' km/h' : '--'}</td>
                <td>${rainfall > 0 ? rainfall + ' mm' : '0 mm'}</td>
                <td>${uvBadge}</td>
                <td><span style="font-size: 12px;">${season}</span></td>
                <td><span class="${weatherClass}" style="font-weight: 600;">${weatherCondition}</span></td>
                <td><span class="confidence-badge" style="background: ${confidence >= 80 ? '#22543d' : confidence >= 50 ? '#744210' : '#c53030'}; color: white;">📊 ${confidence}%</span></td>
            </tr>
        `;
    }).join('');
    
    // Add animation style if not exists
    if (!document.getElementById('tableAnimationStyle')) {
        const style = document.createElement('style');
        style.id = 'tableAnimationStyle';
        style.textContent = `
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateX(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            tbody tr:hover {
                background-color: rgba(102, 126, 234, 0.05);
                transition: all 0.2s ease;
            }
        `;
        document.head.appendChild(style);
    }
}

// Update statistics
function updateStatistics(data) {
    if (!data.forecasts || data.forecasts.length === 0) return;
    
    const temps = data.forecasts.map(f => parseFloat(f.temperature)).filter(t => !isNaN(t));
    const humidity = data.forecasts.map(f => parseFloat(f.humidity)).filter(h => !isNaN(h));
    
    const avgTemp = temps.length > 0 ? (temps.reduce((a, b) => a + b) / temps.length).toFixed(1) : '--';
    const maxTemp = temps.length > 0 ? Math.max(...temps).toFixed(1) : '--';
    const minTemp = temps.length > 0 ? Math.min(...temps).toFixed(1) : '--';
    const avgHumidity = humidity.length > 0 ? (humidity.reduce((a, b) => a + b) / humidity.length).toFixed(1) : '--';
    
    const rainCount = data.forecasts.filter(f => f.willRain).length;
    const rainProb = data.rainProbability || (data.forecasts.length > 0 ? (rainCount / data.forecasts.length * 100).toFixed(1) : 0);
    
    // Update stat elements
    const statUpdates = {
        'statAvgTemp': avgTemp,
        'statMaxTemp': maxTemp,
        'statMinTemp': minTemp,
        'statAvgHumidity': avgHumidity,
        'statRainProb': rainProb
    };
    
    Object.entries(statUpdates).forEach(([id, value]) => {
        const elem = document.getElementById(id);
        if (elem) {
            if (id.includes('RainProb')) {
                elem.textContent = `${value}%`;
            } else if (id.includes('Humidity')) {
                elem.textContent = `${value}%`;
            } else {
                elem.textContent = `${value}°C`;
            }
        }
    });
}

// Update model info
function updateModelInfo(modelInfo) {
    if (!modelInfo) return;
    
    // Model type names mapping
    const modelNames = {
        'prophet': 'Prophet',
        'randomforest': 'Random Forest',
        'lightgbm': 'LightGBM'
    };
    
    // Get current model type
    const currentModelType = modelInfo.currentModelType || 'prophet';
    const modelTypeName = modelNames[currentModelType] || currentModelType;
    
    // Format model name based on type
    const modelName = `${modelTypeName} (Multi-Sensor)`;
    
    const updates = {
        'modelName': modelName,
        'modelType': modelTypeName,
        'modelStatus': modelInfo.status || 'Chưa huấn luyện',
        'lastTrained': modelInfo.lastTrained || 'Chưa huấn luyện',
        'modelAccuracy': modelInfo.accuracy ? `${modelInfo.accuracy.toFixed(2)}%` : '--'
    };
    
    Object.entries(updates).forEach(([id, value]) => {
        const elem = document.getElementById(id);
        if (elem) {
            if (elem.tagName === 'INPUT') {
                elem.value = value;
            } else {
                elem.textContent = value;
            }
        }
    });
    
    // Update trained models list
    const trainedModelsDiv = document.getElementById('trainedModels');
    if (trainedModelsDiv && modelInfo.modelsTrained) {
        const modelEmojis = {
            'temperature': '🌡️',
            'humidity': '💧',
            'aqi': '💨',
            'pressure': '📊'
        };
        
        if (modelInfo.modelsTrained.length > 0) {
            trainedModelsDiv.innerHTML = modelInfo.modelsTrained
                .map(m => `<span class="tag">${modelEmojis[m] || '📊'} ${m.charAt(0).toUpperCase() + m.slice(1)}</span>`)
                .join('');
        } else {
            trainedModelsDiv.innerHTML = '<span class="tag">Chưa train model nào</span>';
        }
    }
    
    // Update model type badge if exists
    const modelTypeBadge = document.getElementById('modelTypeBadge');
    if (modelTypeBadge) {
        const colors = {
            'prophet': '#667eea',
            'randomforest': '#48bb78',
            'lightgbm': '#ed8936'
        };
        modelTypeBadge.textContent = modelTypeName;
        modelTypeBadge.style.backgroundColor = colors[currentModelType] || '#667eea';
    }
    
    // Update training count
    const trainingCountEl = document.getElementById('trainingCount');
    if (trainingCountEl && modelInfo.trainingCount !== undefined) {
        trainingCountEl.textContent = modelInfo.trainingCount;
    }
    
    // Update data rows
    const dataRowsEl = document.getElementById('dataRows');
    if (dataRowsEl && modelInfo.dataRows !== undefined) {
        dataRowsEl.textContent = modelInfo.dataRows.toLocaleString();
    }
}

// Export forecast data
function exportForecast(format = 'csv') {
    if (!forecastData || !forecastData.forecasts) {
        AppUtils.showToast('Không có dữ liệu để xuất', 'error');
        return;
    }
    
    const data = forecastData.forecasts;
    
    if (format === 'csv') {
        // Convert to CSV
        const headers = ['Thời gian', 'Nhiệt độ (°C)', 'Độ ẩm (%)', 'Áp suất (hPa)', 'AQI', 'Có mưa?', 'Độ tin cậy (%)'];
        const rows = data.map(row => [
            row.timestamp,
            row.temperature,
            row.humidity,
            row.pressure,
            row.aqi || '--',
            row.willRain ? 'Có' : 'Không',
            row.confidence
        ]);
        
        const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
        downloadFile(csv, 'forecast_' + new Date().toISOString().split('T')[0] + '.csv', 'text/csv');
        
    } else if (format === 'json') {
        // Export as JSON
        const json = JSON.stringify(data, null, 2);
        downloadFile(json, 'forecast_' + new Date().toISOString().split('T')[0] + '.json', 'application/json');
    }
    
    AppUtils.showToast(`✅ Đã xuất dự báo (${format.toUpperCase()})`, 'success');
}

// Helper function to download file
function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Utility object (enhanced)
if (typeof AppUtils === 'undefined') {
    var AppUtils = {
        fetchForecastData: async () => {
            const response = await fetch('/api/ml/predict?hours_ahead=24');
            if (!response.ok) throw new Error('API Error');
            return await response.json();
        },
        
        showToast: (message, type = 'info') => {
            const container = document.getElementById('toastContainer');
            if (!container) return;
            
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 15px 20px;
                background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#4299e1'};
                color: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 1000;
                animation: slideIn 0.3s ease-out;
            `;
            
            container.appendChild(toast);
            
            setTimeout(() => {
                toast.style.animation = 'slideOut 0.3s ease-out forwards';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    };
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (forecastUpdateInterval) {
        clearInterval(forecastUpdateInterval);
    }
});

// ===== Export Functions =====

// Helper function to get translation
function getTranslation(key) {
    return window.i18n ? window.i18n.t(key) : key;
}

// Get season name based on month
function getSeasonName(month) {
    if (month >= 2 && month <= 3) return getTranslation('forecastExt.seasonSpring');
    if (month >= 4 && month <= 6) return getTranslation('forecastExt.seasonSummer');
    if (month >= 7 && month <= 9) return getTranslation('forecastExt.seasonAutumn');
    return getTranslation('forecastExt.seasonWinter');
}

// Get weather condition based on data (sử dụng giờ + UV index để xác định)
function getWeatherCondition(forecast, rainfall, humidityValue) {
    // Sử dụng weather_condition_key từ backend nếu có (để dịch)
    if (forecast.weather_condition_key) {
        return getTranslation(`forecast.${forecast.weather_condition_key}`);
    }
    
    // Sử dụng weather_condition từ backend nếu có (fallback)
    if (forecast.weather_condition) {
        return forecast.weather_condition;
    }
    
    const uvIndex = parseFloat(forecast.uv_index) || 0;
    
    // Lấy giờ từ timestamp
    const timeStr = forecast.timestamp ? forecast.timestamp.split(' ')[1] : '12:00:00';
    const hour = parseInt(timeStr.split(':')[0]) || 12;
    const isDaytime = hour >= 10 && hour <= 18;
    
    // Logic dựa trên giờ + UV index + rainfall
    if (forecast.willRain || rainfall > 0.5) {
        return getTranslation('forecast.rain');
    }
    
    if (isDaytime) {
        // Ban ngày: dùng UV
        if (uvIndex >= 6) {
            return getTranslation('forecast.sunny');
        }
        if (uvIndex >= 3) {
            return getTranslation('forecast.sunnyLight');
        }
        return getTranslation('forecast.manyClouds');
    } else {
        // Ban đêm: không dùng UV
        if (rainfall > 0) {
            return getTranslation('forecast.nightRain');
        }
        if (humidityValue > 90) {
            return getTranslation('forecast.fog');
        }
        if (hour >= 6 && hour < 10) {
            return getTranslation('forecast.earlyMorning');
        }
        if (hour > 18 && hour <= 20) {
            return getTranslation('forecast.evening');
        }
        return getTranslation('forecast.clearNight');
    }
}

// Get UV level label
function getUVLabel(uvIndex) {
    if (uvIndex >= 11) return getTranslation('forecastExt.uvExtreme');
    if (uvIndex >= 8) return getTranslation('forecastExt.uvVeryHigh');
    if (uvIndex >= 6) return getTranslation('forecastExt.uvHigh');
    if (uvIndex >= 3) return getTranslation('forecastExt.uvMedium');
    return getTranslation('forecastExt.uvLow');
}

// Export to CSV
function exportToCSV() {
    if (!forecastData || !forecastData.forecasts || forecastData.forecasts.length === 0) {
        AppUtils.showToast(getTranslation('forecastExt.noData'), 'error');
        return;
    }
    
    const t = getTranslation;
    
    // Create CSV header
    const headers = [
        t('forecastExt.tableTime'),
        t('forecastExt.tableTemp'),
        t('forecastExt.tableHumidity'),
        t('forecastExt.tablePressure'),
        t('forecastExt.tableWindSpeed'),
        t('forecastExt.tableRainfall'),
        t('forecastExt.tableUV'),
        t('forecastExt.tableSeason'),
        t('forecastExt.tableWeather'),
        t('forecastExt.tableConfidence')
    ];
    
    // Create CSV rows
    const rows = forecastData.forecasts.map(forecast => {
        const timestamp = forecast.timestamp || '';
        const month = timestamp ? parseInt(timestamp.split('/')[1]) : new Date().getMonth() + 1;
        const humidityValue = parseFloat(forecast.humidity) || 0;
        const rainfall = parseFloat(forecast.rainfall) || 0;
        const uvIndex = parseFloat(forecast.uv_index) || 0;
        
        return [
            forecast.timestamp || '--',
            (parseFloat(forecast.temperature) || '--') + '°C',
            (parseFloat(forecast.humidity) || '--') + '%',
            (parseFloat(forecast.pressure) || '--') + ' mb',
            (parseFloat(forecast.wind_speed) || '--') + ' km/h',
            rainfall + ' mm',
            uvIndex + ' (' + getUVLabel(uvIndex) + ')',
            getSeasonName(month),
            getWeatherCondition(forecast, rainfall, humidityValue),
            (parseInt(forecast.confidence) || 0) + '%'
        ];
    });
    
    // Combine headers and rows
    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
    
    // Add BOM for UTF-8
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Download file
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `forecast_data_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    AppUtils.showToast(t('forecastExt.exportSuccess'), 'success');
}

// Export to Excel (using HTML table format that Excel can open)
function exportToExcel() {
    if (!forecastData || !forecastData.forecasts || forecastData.forecasts.length === 0) {
        AppUtils.showToast(getTranslation('forecastExt.noData'), 'error');
        return;
    }
    
    const t = getTranslation;
    
    // Create HTML table for Excel
    let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="UTF-8">
            <!--[if gte mso 9]>
            <xml>
                <x:ExcelWorkbook>
                    <x:ExcelWorksheets>
                        <x:ExcelWorksheet>
                            <x:Name>Forecast Data</x:Name>
                            <x:WorksheetOptions>
                                <x:DisplayGridlines/>
                            </x:WorksheetOptions>
                        </x:ExcelWorksheet>
                    </x:ExcelWorksheets>
                </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
                table { border-collapse: collapse; }
                th, td { border: 1px solid #000; padding: 8px; text-align: center; }
                th { background-color: #667eea; color: white; font-weight: bold; }
                tr:nth-child(even) { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <table>
                <thead>
                    <tr>
                        <th>${t('forecastExt.tableTime')}</th>
                        <th>${t('forecastExt.tableTemp')}</th>
                        <th>${t('forecastExt.tableHumidity')}</th>
                        <th>${t('forecastExt.tablePressure')}</th>
                        <th>${t('forecastExt.tableWindSpeed')}</th>
                        <th>${t('forecastExt.tableRainfall')}</th>
                        <th>${t('forecastExt.tableUV')}</th>
                        <th>${t('forecastExt.tableSeason')}</th>
                        <th>${t('forecastExt.tableWeather')}</th>
                        <th>${t('forecastExt.tableConfidence')}</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    forecastData.forecasts.forEach(forecast => {
        const timestamp = forecast.timestamp || '';
        const month = timestamp ? parseInt(timestamp.split('/')[1]) : new Date().getMonth() + 1;
        const humidityValue = parseFloat(forecast.humidity) || 0;
        const rainfall = parseFloat(forecast.rainfall) || 0;
        const uvIndex = parseFloat(forecast.uv_index) || 0;
        
        html += `
            <tr>
                <td>${forecast.timestamp || '--'}</td>
                <td>${(parseFloat(forecast.temperature) || '--')}°C</td>
                <td>${(parseFloat(forecast.humidity) || '--')}%</td>
                <td>${(parseFloat(forecast.pressure) || '--')} mb</td>
                <td>${(parseFloat(forecast.wind_speed) || '--')} km/h</td>
                <td>${rainfall} mm</td>
                <td>${uvIndex} (${getUVLabel(uvIndex)})</td>
                <td>${getSeasonName(month)}</td>
                <td>${getWeatherCondition(forecast, rainfall, humidityValue)}</td>
                <td>${(parseInt(forecast.confidence) || 0)}%</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </body>
        </html>
    `;
    
    // Download file
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `forecast_data_${new Date().toISOString().split('T')[0]}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    AppUtils.showToast(t('forecastExt.exportSuccess'), 'success');
}

