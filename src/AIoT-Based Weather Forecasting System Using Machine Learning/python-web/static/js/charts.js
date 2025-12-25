// ===== Charts Page JavaScript =====

let currentTimeRange = '24h';
let currentSensors = ['temperature', 'humidity', 'pressure'];
let chartUpdateInterval = null;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadChartsPage();
    setupEventListeners();
    
    // Auto-refresh every 10 seconds (reduced to prevent UI jank)
    chartUpdateInterval = setInterval(() => {
        loadChartsPage();
    }, 10000);
});

// Setup event listeners
function setupEventListeners() {
    // Time range buttons
    const timeButtons = ['btnToday', 'btn24h', 'btn7d', 'btn30d'];
    timeButtons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => {
                timeButtons.forEach(id => {
                    document.getElementById(id)?.classList.remove('btn-primary');
                    document.getElementById(id)?.classList.add('btn-secondary');
                });
                btn.classList.remove('btn-secondary');
                btn.classList.add('btn-primary');
            });
        }
    });
}

// Set time range and reload charts
function setTimeRange(range) {
    const rangeMap = {
        'today': 'today',
        '24h': '24h',
        '7d': '7d',
        '30d': '30d',
        'custom': '24h'
    };
    
    currentTimeRange = rangeMap[range] || '24h';
    loadChartsPage();
}

// Apply filters
function applyFilters() {
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;
    
    // Get selected sensors
    const sensorCheckboxes = document.querySelectorAll('input[name="sensors"]:checked');
    currentSensors = Array.from(sensorCheckboxes).map(cb => cb.value);
    
    if (currentSensors.length === 0) {
        AppUtils.showToast('Vui lòng chọn ít nhất một cảm biến', 'warning');
        return;
    }
    
    loadChartsPage();
    AppUtils.showToast('Đã áp dụng bộ lọc', 'success');
}

// Reset filters
function resetFilters() {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    
    // Reset sensor checkboxes
    document.querySelectorAll('input[name="sensors"]').forEach(cb => {
        cb.checked = ['temperature', 'humidity', 'pressure'].includes(cb.value);
    });
    
    currentTimeRange = '24h';
    currentSensors = ['temperature', 'humidity', 'pressure'];
    
    // Reset button styles
    document.getElementById('btn24h')?.classList.add('btn-primary');
    document.getElementById('btn24h')?.classList.remove('btn-secondary');
    
    loadChartsPage();
    AppUtils.showToast('Đã đặt lại bộ lọc', 'success');
}

// Load charts page data
async function loadChartsPage() {
    // Prevent concurrent updates
    if (window.AppState && window.AppState.updateInProgress) return;
    if (window.AppState) window.AppState.updateInProgress = true;
    
    const loading = AppUtils.showLoading(document.querySelector('.content'), true);
    
    try {
        // Fetch charts data from API - Real-time from SQL
        const data = await AppUtils.fetchChartsData(currentTimeRange, currentSensors);
        
        if (!data || Object.keys(data).length === 0) {
            throw new Error('Không có dữ liệu');
        }
        
        // Draw main charts
        drawMainCharts(data);
        
        // Update statistics
        updateChartStatistics(data);
        
    } catch (error) {
        console.error('Error loading charts:', error);
        // Only show error once per minute to avoid spam
        const now = Date.now();
        if (!window.lastChartError || now - window.lastChartError > 60000) {
            AppUtils.showToast('Không thể tải dữ liệu biểu đồ', 'error');
            window.lastChartError = now;
        }
    } finally {
        AppUtils.hideLoading(loading);
        if (window.AppState) window.AppState.updateInProgress = false;
    }
}

// Draw main charts
function drawMainCharts(data) {
    const colors = {
        temperature: '#f56565',
        humidity: '#4299e1',
        pressure: '#48bb78',
        co2: '#ed8936',
        dust: '#9f7aea',
        aqi: '#ecc94b'
    };
    
    currentSensors.forEach(sensor => {
        const canvas = document.getElementById(`chart${sensor.charAt(0).toUpperCase() + sensor.slice(1)}`);
        if (canvas && data[sensor]) {
            AppUtils.drawLineChart(canvas, data[sensor], {
                color: colors[sensor],
                padding: 50
            });
        }
    });
}

// Update chart statistics
function updateChartStatistics(data) {
    const stats = {};
    
    // Calculate statistics for each sensor
    Object.keys(data).forEach(sensor => {
        if (!data[sensor] || data[sensor].length === 0) return;
        
        const values = data[sensor].map(d => parseFloat(d.value));
        stats[sensor] = {
            avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1),
            min: Math.min(...values).toFixed(1),
            max: Math.max(...values).toFixed(1),
            latest: values[values.length - 1].toFixed(1)
        };
    });
    
    // Update UI (if stats elements exist)
    Object.keys(stats).forEach(sensor => {
        const avgEl = document.getElementById(`${sensor}Avg`);
        const minEl = document.getElementById(`${sensor}Min`);
        const maxEl = document.getElementById(`${sensor}Max`);
        
        if (avgEl) avgEl.textContent = stats[sensor].avg;
        if (minEl) minEl.textContent = stats[sensor].min;
        if (maxEl) maxEl.textContent = stats[sensor].max;
    });
}

// Export chart data
async function exportChartData(format) {
    const loading = AppUtils.showLoading(document.querySelector('.content'));
    
    try {
        const result = await AppUtils.exportData(format, 'sensor_data', 1000);
        
        if (result.success) {
            // In real implementation, trigger download
            AppUtils.showToast(`Đã xuất ${result.records_count} bản ghi dạng ${format.toUpperCase()}`, 'success');
            
            // For demo, show data in console
            console.log('Exported data:', result.data);
        }
    } catch (error) {
        console.error('Export error:', error);
        AppUtils.showToast('Không thể xuất dữ liệu', 'error');
    } finally {
        AppUtils.hideLoading(loading);
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (chartUpdateInterval) {
        clearInterval(chartUpdateInterval);
    }
});
