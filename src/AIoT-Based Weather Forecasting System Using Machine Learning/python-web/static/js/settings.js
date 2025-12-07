// ===== Settings Page JavaScript =====

let currentSettings = {};

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadSettingsPage();
});

// Load settings page
async function loadSettingsPage() {
    const loading = AppUtils.showLoading(document.querySelector('.content'));
    
    try {
        currentSettings = await AppUtils.getSettings();
        populateSettingsForm(currentSettings);
    } catch (error) {
        console.error('Error loading settings:', error);
        AppUtils.showToast('Không thể tải cài đặt', 'error');
    } finally {
        AppUtils.hideLoading(loading);
    }
}

// Populate settings form
function populateSettingsForm(settings) {
    // IoT Station settings
    if (settings.station_name) {
        const stationNameEl = document.getElementById('stationName');
        if (stationNameEl) stationNameEl.value = settings.station_name;
    }
    
    if (settings.node1_id) {
        const node1El = document.getElementById('node1Id');
        if (node1El) node1El.value = settings.node1_id;
    }
    
    if (settings.node2_id) {
        const node2El = document.getElementById('node2Id');
        if (node2El) node2El.value = settings.node2_id;
    }
    
    // Location settings
    if (settings.location) {
        const latEl = document.getElementById('latitude');
        const lonEl = document.getElementById('longitude');
        const addressEl = document.getElementById('address');
        
        if (latEl) latEl.value = settings.location.latitude || '';
        if (lonEl) lonEl.value = settings.location.longitude || '';
        if (addressEl) addressEl.value = settings.location.address || '';
    }
    
    // MQTT settings
    if (settings.mqtt) {
        const brokerEl = document.getElementById('mqttBroker');
        const portEl = document.getElementById('mqttPort');
        const topicEl = document.getElementById('mqttTopic');
        
        if (brokerEl) brokerEl.value = settings.mqtt.broker || '';
        if (portEl) portEl.value = settings.mqtt.port || 1883;
        if (topicEl) topicEl.value = settings.mqtt.topic || '';
    }
    
    // API settings
    if (settings.api) {
        const apiEnabledEl = document.getElementById('apiEnabled');
        const apiKeyEl = document.getElementById('apiKey');
        const updateIntervalEl = document.getElementById('updateInterval');
        
        if (apiEnabledEl) apiEnabledEl.checked = settings.api.openweather_enabled || false;
        if (apiKeyEl) apiKeyEl.value = settings.api.api_key || '';
        if (updateIntervalEl) updateIntervalEl.value = settings.api.update_interval || 300;
    }
    
    // Database settings
    if (settings.database) {
        const dbHostEl = document.getElementById('dbHost');
        const dbPortEl = document.getElementById('dbPort');
        const dbNameEl = document.getElementById('dbName');
        const retentionEl = document.getElementById('dataRetention');
        
        if (dbHostEl) dbHostEl.value = settings.database.host || 'localhost';
        if (dbPortEl) dbPortEl.value = settings.database.port || 3306;
        if (dbNameEl) dbNameEl.value = settings.database.database || 'weather_forecasting';
        if (retentionEl) retentionEl.value = settings.database.retention_days || 90;
    }
    
    // Alert settings
    if (settings.alerts) {
        const tempMaxEl = document.getElementById('tempMax');
        const tempMinEl = document.getElementById('tempMin');
        const humidityMaxEl = document.getElementById('humidityMax');
        const humidityMinEl = document.getElementById('humidityMin');
        const aqiThresholdEl = document.getElementById('aqiThreshold');
        const emailNotifEl = document.getElementById('emailNotifications');
        const emailEl = document.getElementById('alertEmail');
        
        if (tempMaxEl) tempMaxEl.value = settings.alerts.temperature_max || 40;
        if (tempMinEl) tempMinEl.value = settings.alerts.temperature_min || 10;
        if (humidityMaxEl) humidityMaxEl.value = settings.alerts.humidity_max || 90;
        if (humidityMinEl) humidityMinEl.value = settings.alerts.humidity_min || 20;
        if (aqiThresholdEl) aqiThresholdEl.value = settings.alerts.aqi_threshold || 150;
        if (emailNotifEl) emailNotifEl.checked = settings.alerts.email_notifications || false;
        if (emailEl) emailEl.value = settings.alerts.email || '';
    }
}

// Save IoT config
async function saveIoTConfig(event) {
    if (event) event.preventDefault();
    
    const stationName = document.getElementById('stationName')?.value;
    const node1Id = document.getElementById('node1Id')?.value;
    const node2Id = document.getElementById('node2Id')?.value;
    
    const newSettings = {
        ...currentSettings,
        station_name: stationName,
        node1_id: node1Id,
        node2_id: node2Id
    };
    
    await saveSettings(newSettings, 'Đã lưu cấu hình trạm IoT');
}

// Save location config
async function saveLocationConfig(event) {
    if (event) event.preventDefault();
    
    const latitude = parseFloat(document.getElementById('latitude')?.value);
    const longitude = parseFloat(document.getElementById('longitude')?.value);
    const address = document.getElementById('address')?.value;
    
    const newSettings = {
        ...currentSettings,
        location: {
            latitude,
            longitude,
            address
        }
    };
    
    await saveSettings(newSettings, 'Đã lưu cấu hình vị trí');
}

// Save MQTT config
async function saveMQTTConfig(event) {
    if (event) event.preventDefault();
    
    const broker = document.getElementById('mqttBroker')?.value;
    const port = parseInt(document.getElementById('mqttPort')?.value);
    const topic = document.getElementById('mqttTopic')?.value;
    
    const newSettings = {
        ...currentSettings,
        mqtt: {
            broker,
            port,
            topic
        }
    };
    
    await saveSettings(newSettings, 'Đã lưu cấu hình MQTT');
}

// Save API config
async function saveAPIConfig(event) {
    if (event) event.preventDefault();
    
    const enabled = document.getElementById('apiEnabled')?.checked;
    const apiKey = document.getElementById('apiKey')?.value;
    const updateInterval = parseInt(document.getElementById('updateInterval')?.value);
    
    const newSettings = {
        ...currentSettings,
        api: {
            openweather_enabled: enabled,
            api_key: apiKey,
            update_interval: updateInterval
        }
    };
    
    await saveSettings(newSettings, 'Đã lưu cấu hình API');
}

// Save database config
async function saveDatabaseConfig(event) {
    if (event) event.preventDefault();
    
    const host = document.getElementById('dbHost')?.value;
    const port = parseInt(document.getElementById('dbPort')?.value);
    const database = document.getElementById('dbName')?.value;
    const retentionDays = parseInt(document.getElementById('dataRetention')?.value);
    
    const newSettings = {
        ...currentSettings,
        database: {
            host,
            port,
            database,
            retention_days: retentionDays
        }
    };
    
    await saveSettings(newSettings, 'Đã lưu cấu hình database');
}

// Save alert config
async function saveAlertConfig(event) {
    if (event) event.preventDefault();
    
    const tempMax = parseFloat(document.getElementById('tempMax')?.value);
    const tempMin = parseFloat(document.getElementById('tempMin')?.value);
    const humidityMax = parseFloat(document.getElementById('humidityMax')?.value);
    const humidityMin = parseFloat(document.getElementById('humidityMin')?.value);
    const aqiThreshold = parseFloat(document.getElementById('aqiThreshold')?.value);
    const emailNotifications = document.getElementById('emailNotifications')?.checked;
    const email = document.getElementById('alertEmail')?.value;
    
    const newSettings = {
        ...currentSettings,
        alerts: {
            temperature_max: tempMax,
            temperature_min: tempMin,
            humidity_max: humidityMax,
            humidity_min: humidityMin,
            aqi_threshold: aqiThreshold,
            email_notifications: emailNotifications,
            email: email
        }
    };
    
    await saveSettings(newSettings, 'Đã lưu cấu hình cảnh báo');
}

// Save settings helper
async function saveSettings(settings, successMessage) {
    const loading = AppUtils.showLoading(document.querySelector('.content'));
    
    try {
        const result = await AppUtils.updateSettings(settings);
        
        if (result.success) {
            currentSettings = settings;
            AppUtils.showToast(successMessage, 'success');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        AppUtils.showToast('Không thể lưu cài đặt', 'error');
    } finally {
        AppUtils.hideLoading(loading);
    }
}

// Test MySQL connection
async function testMySQLConnection() {
    const loading = AppUtils.showLoading(document.querySelector('.content'));
    
    try {
        const result = await AppUtils.testConnection('mysql');
        
        if (result.success) {
            AppUtils.showToast(`MySQL: ${result.status} (${result.latency})`, 'success');
        }
    } catch (error) {
        AppUtils.showToast('Kết nối MySQL thất bại', 'error');
    } finally {
        AppUtils.hideLoading(loading);
    }
}

// Test MQTT connection
async function testMQTTConnection() {
    const loading = AppUtils.showLoading(document.querySelector('.content'));
    
    try {
        const result = await AppUtils.testConnection('mqtt');
        
        if (result.success) {
            AppUtils.showToast(`MQTT: ${result.status} (${result.latency})`, 'success');
        }
    } catch (error) {
        AppUtils.showToast('Kết nối MQTT thất bại', 'error');
    } finally {
        AppUtils.hideLoading(loading);
    }
}

// Test API connection
async function testAPIConnection() {
    const loading = AppUtils.showLoading(document.querySelector('.content'));
    
    try {
        const result = await AppUtils.testConnection('api');
        
        if (result.success) {
            AppUtils.showToast(`API: ${result.status} (${result.latency})`, 'success');
        }
    } catch (error) {
        AppUtils.showToast('Kết nối API thất bại', 'error');
    } finally {
        AppUtils.hideLoading(loading);
    }
}

// Reset all settings
function resetAllSettings() {
    AppUtils.showModal(
        'Đặt lại cài đặt',
        'Bạn có chắc muốn đặt lại TẤT CẢ cài đặt về mặc định?',
        () => {
            // Reset to defaults
            loadSettingsPage();
            AppUtils.showToast('Đã đặt lại cài đặt về mặc định', 'success');
        }
    );
}

// Export settings
function exportSettings() {
    const dataStr = JSON.stringify(currentSettings, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `settings_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    AppUtils.showToast('Đã xuất cài đặt', 'success');
}

// Import settings
function importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const settings = JSON.parse(event.target.result);
                await saveSettings(settings, 'Đã nhập cài đặt thành công');
                populateSettingsForm(settings);
            } catch (error) {
                AppUtils.showToast('File cài đặt không hợp lệ', 'error');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}
