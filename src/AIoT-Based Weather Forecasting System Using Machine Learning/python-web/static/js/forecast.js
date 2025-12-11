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
        const rainChance = forecast.willRain ? '🌧️' : '✅';
        const confidence = parseInt(forecast.confidence) || 0;
        
        return `
            <div class="forecast-card" style="animation: fadeInUp 0.3s ease ${index * 0.05}s both;">
                <div class="forecast-time">${forecast.timestamp.split(' ')[1] || '--:--'}</div>
                <div class="forecast-icon">${forecast.weatherIcon || '🌤️'}</div>
                <div class="forecast-temp">${isNaN(tempValue) ? '--' : tempValue}°C</div>
                <div class="forecast-details">
                    💧 ${isNaN(humidityValue) ? '--' : humidityValue}%<br>
                    📊 ${forecast.pressure || '--'} hPa
                </div>
                <div class="rain-indicator ${forecast.willRain ? 'rain-yes' : 'rain-no'}">
                    ${rainChance} ${forecast.willRain ? 'Mưa' : 'Nắng'}
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
    
    if (forecasts.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--text-secondary);">📭 Không có dữ liệu</td></tr>';
        return;
    }
    
    tableBody.innerHTML = forecasts.map((forecast, index) => {
        const tempValue = parseFloat(forecast.temperature) || '--';
        const humidityValue = parseFloat(forecast.humidity) || '--';
        const aqiValue = parseFloat(forecast.aqi) || '--';
        const confidence = parseInt(forecast.confidence) || 0;
        const rainBadge = forecast.willRain 
            ? '<span style="color: #c53030; font-weight: 600;">🌧️ Có</span>' 
            : '<span style="color: #22543d; font-weight: 600;">✅ Không</span>';
        
        return `
            <tr style="animation: slideIn 0.3s ease ${index * 0.02}s both; opacity: 0;">
                <td><small><strong>${forecast.timestamp}</strong></small></td>
                <td><strong style="font-size: 15px; color: var(--primary-color);">${tempValue}${tempValue !== '--' ? '°C' : ''}</strong></td>
                <td>${humidityValue}${humidityValue !== '--' ? '%' : ''}</td>
                <td>${forecast.pressure || '--'} hPa</td>
                <td><span style="font-weight: 600;">${aqiValue}</span></td>
                <td>${rainBadge}</td>
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
        'lstm': 'LSTM'
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
            'lstm': '#ed8936'
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

