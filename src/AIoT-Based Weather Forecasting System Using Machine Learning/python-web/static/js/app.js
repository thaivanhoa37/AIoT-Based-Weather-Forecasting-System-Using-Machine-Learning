// ===== Global State =====
const AppState = {
    theme: localStorage.getItem('theme') || 'light',
    sidebarOpen: localStorage.getItem('sidebarOpen') !== 'false',
    mysqlConnected: true,
    lastDataTime: new Date(),
    updateInProgress: false, // Prevent concurrent updates
    lastUpdateData: {}, // Cache for smooth transitions
};

// ===== Debounce Helper =====
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===== Smooth Value Transition =====
function smoothUpdateValue(elementId, newValue, duration = 300) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const currentText = element.textContent;
    const currentValue = parseFloat(currentText);
    
    // If not a number or same value, update directly
    if (isNaN(currentValue) || currentValue === newValue) {
        element.textContent = newValue;
        return;
    }
    
    // Animate the transition
    const startValue = currentValue;
    const startTime = performance.now();
    
    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeProgress = progress < 0.5 
            ? 2 * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        const currentVal = startValue + (newValue - startValue) * easeProgress;
        element.textContent = currentVal.toFixed(1);
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            element.textContent = newValue;
        }
    }
    
    requestAnimationFrame(animate);
}

// ===== Initialize App =====
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initSidebar();
    initClock();
    initMySQLStatus();
    highlightActiveNav();
    initLanguageSwitcher();
});

// ===== Language Switcher =====
function initLanguageSwitcher() {
    // Initialize i18n system if available
    if (typeof i18n !== 'undefined' && typeof i18n.init === 'function') {
        i18n.init();
    }
    // Update active flag indicator on load
    updateLanguageFlags();
}

function toggleLanguage() {
    const currentLang = localStorage.getItem('language') || 'vi';
    const newLang = currentLang === 'vi' ? 'en' : 'vi';
    
    // Save new language
    localStorage.setItem('language', newLang);
    
    // Update flags visual
    updateLanguageFlags();
    
    // Update page content using i18n
    if (typeof i18n !== 'undefined') {
        i18n.switchLanguage(newLang);
    }
    
    // Show toast notification
    if (typeof showToast === 'function') {
        const msg = newLang === 'vi' ? '🇻🇳 Đã chuyển sang Tiếng Việt' : '🇬🇧 Switched to English';
        showToast(msg, 'success');
    }
}

function updateLanguageFlags() {
    const currentLang = localStorage.getItem('language') || 'vi';
    const flagVi = document.getElementById('langFlagVi');
    const flagEn = document.getElementById('langFlagEn');
    
    if (flagVi && flagEn) {
        if (currentLang === 'vi') {
            flagVi.classList.add('active');
            flagEn.classList.remove('active');
        } else {
            flagVi.classList.remove('active');
            flagEn.classList.add('active');
        }
    }
}

// ===== Theme Toggle =====
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    // Apply saved theme on page load
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.innerHTML = '☀️';
        AppState.theme = 'dark';
    } else {
        document.body.classList.remove('dark-mode');
        themeToggle.innerHTML = '🌙';
        AppState.theme = 'light';
    }

    // Toggle theme on click
    themeToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const isDark = document.body.classList.toggle('dark-mode');
        AppState.theme = isDark ? 'dark' : 'light';
        
        // Save preference
        localStorage.setItem('theme', AppState.theme);
        
        // Update button
        themeToggle.innerHTML = isDark ? '☀️' : '🌙';
        
        // Trigger animation
        themeToggle.style.transform = 'rotate(180deg)';
        setTimeout(() => {
            themeToggle.style.transform = 'rotate(0deg)';
        }, 300);
        
        // Show toast notification
        if (typeof AppUtils !== 'undefined' && AppUtils.showToast) {
            const themeName = isDark ? '🌙 Chế độ tối' : '☀️ Chế độ sáng';
            AppUtils.showToast(`Chuyển sang ${themeName}`, 'info');
        }
    });
    
    // Add smooth transition
    themeToggle.style.transition = 'transform 0.3s ease';
}

// ===== Sidebar Toggle =====
function initSidebar() {
    const hamburger = document.getElementById('hamburgerBtn');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');

    if (!hamburger || !sidebar || !mainContent) return;

    // Apply saved sidebar state
    if (!AppState.sidebarOpen) {
        sidebar.classList.add('collapsed');
        mainContent.classList.add('expanded');
    }

    // Toggle sidebar on click
    hamburger.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');

        // On mobile, add 'active' class to show sidebar
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('active');
        }

        AppState.sidebarOpen = !sidebar.classList.contains('collapsed');
        localStorage.setItem('sidebarOpen', AppState.sidebarOpen);
    });

    // Close sidebar on mobile when clicking outside
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        }
    });
}

// ===== Digital Clock (GMT+7) =====
function initClock() {
    const clockElement = document.getElementById('clockTime');
    if (!clockElement) return;

    function updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        clockElement.textContent = `${hours}:${minutes}:${seconds}`;
    }

    updateClock();
    setInterval(updateClock, 1000);
}

// ===== MySQL Status Indicator =====
function initMySQLStatus() {
    const statusBadge = document.getElementById('mysqlStatus');
    if (!statusBadge) return;

    updateMySQLStatus();
    // Check status every 10 seconds
    setInterval(updateMySQLStatus, 10000);
}

async function updateMySQLStatus() {
    const statusBadge = document.getElementById('mysqlStatus');
    if (!statusBadge) return;

    try {
        // Check real MySQL connection via API
        const response = await fetch('/api/system-stats');
        AppState.mysqlConnected = response.ok;

        if (AppState.mysqlConnected) {
            statusBadge.className = 'status-badge connected';
            statusBadge.innerHTML = '<span class="status-dot"></span> MySQL: Connected';
        } else {
            throw new Error('Connection failed');
        }
    } catch (error) {
        AppState.mysqlConnected = false;
        statusBadge.className = 'status-badge error';
        statusBadge.innerHTML = '<span class="status-dot"></span> MySQL: Error';
    }
}

// ===== Highlight Active Navigation =====
function highlightActiveNav() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage) {
            link.classList.add('active');
        }
    });
}

// ===== Toast Notifications =====
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) {
        // Create container if it doesn't exist
        const newContainer = document.createElement('div');
        newContainer.id = 'toastContainer';
        newContainer.className = 'toast-container';
        document.body.appendChild(newContainer);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : '⚠';
    toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
  `;

    document.getElementById('toastContainer').appendChild(toast);

    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== Modal Helpers =====
function showModal(title, message, onConfirm, onCancel) {
    const overlay = document.getElementById('modalOverlay');
    if (!overlay) return;

    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const confirmBtn = document.getElementById('modalConfirm');
    const cancelBtn = document.getElementById('modalCancel');

    modalTitle.textContent = title;
    modalBody.innerHTML = message;

    overlay.classList.add('active');

    // Remove old event listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    // Add new event listeners
    newConfirmBtn.addEventListener('click', () => {
        overlay.classList.remove('active');
        if (onConfirm) onConfirm();
    });

    newCancelBtn.addEventListener('click', () => {
        overlay.classList.remove('active');
        if (onCancel) onCancel();
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
            if (onCancel) onCancel();
        }
    });
}

// ===== Loading State =====
function showLoading(element, minimal = true) {
    // For frequent updates, use minimal loading indicator
    if (minimal) {
        const existingLoader = element.querySelector('.mini-loader');
        if (existingLoader) return existingLoader;
        
        const miniLoader = document.createElement('div');
        miniLoader.className = 'mini-loader';
        miniLoader.style.cssText = 'position: absolute; top: 10px; right: 10px; width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; z-index: 1000;';
        element.style.position = 'relative';
        element.appendChild(miniLoader);
        return miniLoader;
    }
    
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = '<div class="loading"></div>';
    element.style.position = 'relative';
    element.appendChild(loadingOverlay);
    return loadingOverlay;
}

function hideLoading(loadingOverlay) {
    if (loadingOverlay && loadingOverlay.parentNode) {
        loadingOverlay.remove();
    }
}

// ===== API Fetch Functions =====

async function fetchRealtimeData() {
    try {
        const response = await fetch('/api/realtime-data');
        if (!response.ok) throw new Error('API Error');
        return await response.json();
    } catch (error) {
        console.error('Error fetching realtime data:', error);
        throw error;
    }
}

async function fetchChartsData(timeRange = '24h', sensors = ['temperature', 'humidity']) {
    try {
        const sensorsParam = sensors.join(',');
        const response = await fetch(`/api/charts-data?time_range=${timeRange}&sensors=${sensorsParam}`);
        if (!response.ok) throw new Error('API Error');
        return await response.json();
    } catch (error) {
        console.error('Error fetching charts data:', error);
        throw error;
    }
}

async function fetchForecastData() {
    try {
        // Get predictions
        const predResponse = await fetch('/api/ml/predict?hours_ahead=12');
        if (!predResponse.ok) throw new Error('API Error');
        const predData = await predResponse.json();
        
        // Get model info
        let modelInfo = { name: 'Prophet', lastTrained: '--', dataRows: 0 };
        try {
            const modelResponse = await fetch('/api/ml/model-info');
            if (modelResponse.ok) {
                const modelData = await modelResponse.json();
                modelInfo = {
                    name: (modelData.models_available || ['Prophet']).join(', '),
                    lastTrained: modelData.last_trained || '--',
                    dataRows: modelData.last_data_points || 0
                };
            }
        } catch (e) {
            console.warn('Could not fetch model info:', e);
        }
        
        return {
            summary: predData.predictions && predData.predictions.length > 0 ? 'Dự báo 12 giờ tới' : 'Không có dữ liệu',
            rainProbability: null,
            forecasts: predData.predictions.map(p => ({
                time: p.timestamp,
                temperature: p.temperature,
                humidity: p.humidity,
                pressure: p.pressure || 1013,
                willRain: false,
                confidence: p.confidence
            })),
            modelInfo: modelInfo
        };
    } catch (error) {
        console.error('Error fetching forecast data:', error);
        throw error;
    }
}

async function fetchMySQLTable(filters = {}) {
    try {
        const limit = filters.limit || 50;
        const offset = filters.offset || 0;
        const response = await fetch(`/api/sensor-data/history?limit=${limit}&offset=${offset}`);
        if (!response.ok) throw new Error('API Error');
        const data = await response.json();
        
        const statsResponse = await fetch('/api/system-stats');
        const stats = await statsResponse.json();
        
        return {
            records: data.records.map((r, idx) => ({
                id: r.id || (10000 + idx),
                time: r.timestamp,
                node: 'Node 1',
                temperature: r.temperature,
                humidity: r.humidity,
                pressure: r.pressure,
                co2: r.co2,
                dust: r.dust,
                aqi: r.aqi
            })),
            totalRecords: stats.sensor_records || data.total,
            storageSize: stats.database_size || '0 MB',
            latestRecord: stats.last_update || '--'
        };
    } catch (error) {
        console.error('Error fetching MySQL data:', error);
        throw error;
    }
}

// ML Training Functions
async function trainMLModel(modelType = 'prophet', dataPoints = 1000) {
    try {
        const response = await fetch(`/api/ml/train?model_type=${modelType}&data_points=${dataPoints}`, {
            method: 'POST'
        });
        if (!response.ok) throw new Error('Training failed');
        return await response.json();
    } catch (error) {
        console.error('Error training model:', error);
        throw error;
    }
}

async function getMLModelInfo() {
    try {
        const response = await fetch('/api/ml/model-info');
        if (!response.ok) throw new Error('API Error');
        return await response.json();
    } catch (error) {
        console.error('Error fetching model info:', error);
        throw error;
    }
}

// Database Management Functions
async function clearDatabase(table, confirm = false) {
    try {
        const response = await fetch(`/api/database/clear?table=${table}&confirm=${confirm}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Clear failed');
        return await response.json();
    } catch (error) {
        console.error('Error clearing database:', error);
        throw error;
    }
}

async function backupDatabase() {
    try {
        const response = await fetch('/api/database/backup', {
            method: 'POST'
        });
        if (!response.ok) throw new Error('Backup failed');
        return await response.json();
    } catch (error) {
        console.error('Error backing up database:', error);
        throw error;
    }
}

async function exportData(format = 'csv', table = 'sensor_data', limit = 1000) {
    try {
        const response = await fetch(`/api/database/export?format=${format}&table=${table}&limit=${limit}`);
        if (!response.ok) throw new Error('Export failed');
        return await response.json();
    } catch (error) {
        console.error('Error exporting data:', error);
        throw error;
    }
}

// Settings Functions
async function getSettings() {
    try {
        const response = await fetch('/api/settings');
        if (!response.ok) throw new Error('API Error');
        return await response.json();
    } catch (error) {
        console.error('Error fetching settings:', error);
        throw error;
    }
}

async function updateSettings(settings) {
    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });
        if (!response.ok) throw new Error('Update failed');
        return await response.json();
    } catch (error) {
        console.error('Error updating settings:', error);
        throw error;
    }
}

async function testConnection(connectionType) {
    try {
        const response = await fetch(`/api/settings/test-connection?connection_type=${connectionType}`, {
            method: 'POST'
        });
        if (!response.ok) throw new Error('Test failed');
        return await response.json();
    } catch (error) {
        console.error('Error testing connection:', error);
        throw error;
    }
}

async function fetchSystemStats() {
    try {
        const response = await fetch('/api/system-stats');
        if (!response.ok) throw new Error('API Error');
        return await response.json();
    } catch (error) {
        console.error('Error fetching system stats:', error);
        throw error;
    }
}

// ===== Chart Drawing Helpers =====

function drawLineChart(canvas, data, options = {}) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Get actual display size
    const displayWidth = canvas.clientWidth || canvas.width / dpr;
    const displayHeight = canvas.clientHeight || canvas.height / dpr;
    
    // Set canvas buffer size to match display size * dpr
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    
    // Scale context to match dpr
    ctx.scale(dpr, dpr);
    
    // Use display dimensions for drawing
    const width = displayWidth;
    const height = displayHeight;
    const padding = options.padding || 40;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (!data || data.length === 0) return;

    // Find min and max values
    const values = data.map(d => parseFloat(d.value));
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;

    // Draw background
    const isDark = document.body.classList.contains('dark-mode');
    ctx.fillStyle = isDark ? '#2d3748' : '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = isDark ? '#4a5568' : '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + (height - 2 * padding) * i / 5;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }

    // Draw line
    const color = options.color || '#48bb78';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((point, index) => {
        const x = padding + (width - 2 * padding) * index / (data.length - 1);
        const y = height - padding - ((parseFloat(point.value) - minValue) / range) * (height - 2 * padding);

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();

    // Draw filled area
    ctx.lineTo(width - padding, height - padding);
    ctx.lineTo(padding, height - padding);
    ctx.closePath();
    ctx.fillStyle = color + '20';
    ctx.fill();

    // Draw labels
    ctx.fillStyle = isDark ? '#cbd5e0' : '#718096';
    
    // Responsive font size
    const fontSize = width < 300 ? 8 : (width < 400 ? 9 : 10);
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'center';

    // X-axis labels (show fewer labels on small screens)
    const maxLabels = width < 300 ? 4 : (width < 400 ? 5 : 8);
    const labelInterval = Math.max(1, Math.ceil(data.length / maxLabels));
    ctx.save();

    data.forEach((point, index) => {
        if (index % labelInterval === 0 || index === data.length - 1) {
            const x = padding + (width - 2 * padding) * index / (data.length - 1);

            // Split time into date and time parts
            const timeParts = point.time.split(' ');
            const timepart = timeParts[1] || timeParts[0] || '';

            // Only show time on mobile for cleaner look
            if (width < 350) {
                ctx.fillText(timepart.substring(0, 5), x, height - 8);
            } else {
                const datepart = timeParts[0] || '';
                ctx.fillText(datepart, x, height - 18);
                ctx.fillText(timepart, x, height - 6);
            }
        }
    });

    ctx.restore();

    // Y-axis labels
    ctx.textAlign = 'right';
    const yLabelCount = width < 300 ? 3 : 5;
    for (let i = 0; i <= yLabelCount; i++) {
        const value = minValue + (range * (yLabelCount - i) / yLabelCount);
        const y = padding + (height - 2 * padding) * i / yLabelCount;
        ctx.fillText(value.toFixed(1), padding - 5, y + 4);
    }
}

function drawMiniChart(canvas, data, color) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    if (!data || data.length === 0) return;

    const values = data.map(d => parseFloat(d.value));
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((point, index) => {
        const x = (width * index) / (data.length - 1);
        const y = height - ((parseFloat(point.value) - minValue) / range) * height;

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();

    // Fill area
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = color + '30';
    ctx.fill();
}

function drawBarChart(canvas, data, options = {}) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = options.padding || 40;

    ctx.clearRect(0, 0, width, height);

    if (!data || data.length === 0) return;

    const isDark = document.body.classList.contains('dark-mode');
    ctx.fillStyle = isDark ? '#2d3748' : '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const values = data.map(d => parseFloat(d.value));
    const maxValue = Math.max(...values);

    const barWidth = (width - 2 * padding) / data.length * 0.8;
    const color = options.color || '#48bb78';

    data.forEach((point, index) => {
        const x = padding + (width - 2 * padding) * index / data.length + barWidth * 0.1;
        const barHeight = (parseFloat(point.value) / maxValue) * (height - 2 * padding);
        const y = height - padding - barHeight;

        ctx.fillStyle = color;
        ctx.fillRect(x, y, barWidth, barHeight);

        // Label
        ctx.fillStyle = isDark ? '#cbd5e0' : '#718096';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(point.label, x + barWidth / 2, height - 10);
    });
}

// ===== Utility Functions =====

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function formatTimestamp(date) {
    return date.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function getUVLevel(uvIndex) {
    if (uvIndex <= 2) return 'Thấp';
    if (uvIndex <= 5) return 'Trung bình';
    if (uvIndex <= 7) return 'Cao';
    if (uvIndex <= 10) return 'Rất cao';
    return 'Nguy hiểm';
}

function getAQILevel(aqi) {
    if (aqi <= 50) return { level: 'Tốt', color: '#48bb78' };
    if (aqi <= 100) return { level: 'Trung bình', color: '#ecc94b' };
    if (aqi <= 150) return { level: 'Kém', color: '#ed8936' };
    if (aqi <= 200) return { level: 'Xấu', color: '#f56565' };
    return { level: 'Rất xấu', color: '#9b2c2c' };
}

// ===== Export for use in page-specific scripts =====
window.AppUtils = {
    showToast,
    showModal,
    showLoading,
    hideLoading,
    fetchRealtimeData,
    fetchChartsData,
    fetchForecastData,
    fetchMySQLTable,
    fetchSystemStats,
    trainMLModel,
    getMLModelInfo,
    clearDatabase,
    backupDatabase,
    exportData,
    getSettings,
    updateSettings,
    testConnection,
    drawLineChart,
    drawMiniChart,
    drawBarChart,
    formatTimestamp,
    getUVLevel,
    getAQILevel,
};
