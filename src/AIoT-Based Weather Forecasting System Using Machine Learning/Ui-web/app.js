// ===== Global State =====
const AppState = {
    theme: localStorage.getItem('theme') || 'light',
    sidebarOpen: localStorage.getItem('sidebarOpen') !== 'false',
    mysqlConnected: true, // Dummy state
    lastDataTime: new Date(),
};

// ===== Initialize App =====
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initSidebar();
    initClock();
    initMySQLStatus();
    highlightActiveNav();
});

// ===== Theme Toggle =====
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    // Apply saved theme
    if (AppState.theme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.innerHTML = '☀️';
    } else {
        themeToggle.innerHTML = '🌙';
    }

    // Toggle theme on click
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        AppState.theme = isDark ? 'dark' : 'light';
        localStorage.setItem('theme', AppState.theme);
        themeToggle.innerHTML = isDark ? '☀️' : '🌙';
    });
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

function updateMySQLStatus() {
    const statusBadge = document.getElementById('mysqlStatus');
    if (!statusBadge) return;

    // Simulate random connection status (90% connected)
    AppState.mysqlConnected = Math.random() > 0.1;

    if (AppState.mysqlConnected) {
        statusBadge.className = 'status-badge connected';
        statusBadge.innerHTML = '<span class="status-dot"></span> MySQL: Connected';
    } else {
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
    modalBody.textContent = message;

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
function showLoading(element) {
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

// ===== API Fetch Functions (Dummy Data) =====

async function fetchRealtimeData() {
    // Simulate API call delay
    await delay(500);

    // Simulate occasional errors (5% chance)
    if (Math.random() < 0.05) {
        throw new Error('Không thể kết nối đến server');
    }

    return {
        temperature: (25 + Math.random() * 10).toFixed(1),
        humidity: (60 + Math.random() * 20).toFixed(0),
        pressure: (1010 + Math.random() * 10).toFixed(0),
        co2: (400 + Math.random() * 100).toFixed(0),
        dust: (15 + Math.random() * 20).toFixed(1),
        windSpeed: (5 + Math.random() * 15).toFixed(1),
        windDirection: ['Bắc', 'Đông Bắc', 'Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc'][Math.floor(Math.random() * 8)],
        rainfall: (Math.random() * 5).toFixed(1),
        uvIndex: Math.floor(Math.random() * 11),
        timestamp: new Date().toLocaleString('vi-VN'),
    };
}

async function fetchChartsData(timeRange = '24h', sensors = ['temperature', 'humidity']) {
    await delay(800);

    const dataPoints = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : timeRange === '30d' ? 720 : 48;
    const data = {};

    sensors.forEach(sensor => {
        data[sensor] = [];
        let baseValue = sensor === 'temperature' ? 28 : sensor === 'humidity' ? 70 : sensor === 'co2' ? 450 : 20;

        for (let i = 0; i < dataPoints; i++) {
            const variation = (Math.random() - 0.5) * 10;
            const timestamp = new Date(Date.now() - (dataPoints - i) * 3600000);

            // Format with detailed date and time
            const dateStr = timestamp.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            const timeStr = timestamp.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            data[sensor].push({
                time: `${dateStr} ${timeStr}`,
                timestamp: timestamp,
                value: (baseValue + variation).toFixed(1),
            });
        }
    });

    return data;
}

async function fetchForecastData() {
    await delay(600);

    const forecasts = [];
    for (let i = 1; i <= 12; i++) {
        const time = new Date(Date.now() + i * 3600000);
        forecasts.push({
            time: time.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
            temperature: (26 + Math.random() * 6).toFixed(1),
            humidity: (65 + Math.random() * 15).toFixed(0),
            pressure: (1012 + Math.random() * 5).toFixed(0),
            willRain: Math.random() > 0.7,
            confidence: (75 + Math.random() * 20).toFixed(0),
        });
    }

    return {
        summary: Math.random() > 0.5 ? 'Không mưa trong 3 giờ tới' : 'Có mưa trong 3 giờ tới',
        rainProbability: Math.random() > 0.5 ? null : (60 + Math.random() * 30).toFixed(0),
        forecasts,
        modelInfo: {
            name: 'Prophet',
            lastTrained: new Date(Date.now() - 86400000 * 2).toLocaleString('vi-VN'),
            dataRows: 15000 + Math.floor(Math.random() * 5000),
        },
    };
}

async function fetchMySQLTable(filters = {}) {
    await delay(700);

    const records = [];
    const recordCount = 50;

    for (let i = 0; i < recordCount; i++) {
        const time = new Date(Date.now() - i * 600000); // Every 10 minutes
        records.push({
            id: 10000 + i,
            time: time.toLocaleString('vi-VN'),
            node: Math.random() > 0.5 ? 'Node 1' : 'Node 2',
            temperature: (25 + Math.random() * 10).toFixed(1),
            humidity: (60 + Math.random() * 20).toFixed(0),
            pressure: (1010 + Math.random() * 10).toFixed(0),
            co2: (400 + Math.random() * 100).toFixed(0),
            dust: (15 + Math.random() * 20).toFixed(1),
            aqi: Math.floor(50 + Math.random() * 100),
        });
    }

    return {
        records,
        totalRecords: 18543,
        storageSize: '245 MB',
        latestRecord: records[0].time,
    };
}

// ===== Chart Drawing Helpers =====

function drawLineChart(canvas, data, options = {}) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
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
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';

    // X-axis labels (show every nth label to avoid crowding)
    const labelInterval = Math.max(1, Math.ceil(data.length / 8)); // Show max 8 labels
    ctx.save(); // Save context state

    data.forEach((point, index) => {
        if (index % labelInterval === 0 || index === data.length - 1) {
            const x = padding + (width - 2 * padding) * index / (data.length - 1);

            // Split time into date and time parts for better display
            const timeParts = point.time.split(' ');
            const datepart = timeParts[0] || '';
            const timepart = timeParts[1] || '';

            // Draw date on first line
            ctx.fillText(datepart, x, height - 25);
            // Draw time on second line
            ctx.fillText(timepart, x, height - 10);
        }
    });

    ctx.restore(); // Restore context state

    // Y-axis labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const value = minValue + (range * (5 - i) / 5);
        const y = padding + (height - 2 * padding) * i / 5;
        ctx.fillText(value.toFixed(1), padding - 10, y + 4);
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
    drawLineChart,
    drawMiniChart,
    drawBarChart,
    formatTimestamp,
    getUVLevel,
    getAQILevel,
};
