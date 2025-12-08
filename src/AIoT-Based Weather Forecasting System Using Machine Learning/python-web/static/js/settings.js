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
        const nameEl = document.getElementById('locationName');
        const latEl = document.getElementById('latitude');
        const lonEl = document.getElementById('longitude');
        const addressEl = document.getElementById('locationAddress');
        const altEl = document.getElementById('altitude');
        const tzEl = document.getElementById('timezone');
        
        if (nameEl) nameEl.value = settings.location.name || '';
        if (latEl) latEl.value = settings.location.latitude || '';
        if (lonEl) lonEl.value = settings.location.longitude || '';
        if (addressEl) addressEl.value = settings.location.address || '';
        if (altEl) altEl.value = settings.location.altitude || '';
        if (tzEl) tzEl.value = settings.location.timezone || 'Asia/Ho_Chi_Minh';
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
    const address = document.getElementById('locationAddress')?.value;
    const name = document.getElementById('locationName')?.value;
    const altitude = parseFloat(document.getElementById('altitude')?.value) || 0;
    const timezone = document.getElementById('timezone')?.value || 'Asia/Ho_Chi_Minh';
    
    const newSettings = {
        ...currentSettings,
        location: {
            name,
            latitude,
            longitude,
            address,
            altitude,
            timezone
        }
    };
    
    await saveSettings(newSettings, 'Đã lưu cấu hình vị trí');
    
    // Update location display on index page
    localStorage.setItem('locationName', name);
    window.dispatchEvent(new CustomEvent('locationUpdated', { detail: { name, latitude, longitude, address } }));
}

// Alias function for saveLocationConfig
async function saveLocationSettings(event) {
    return saveLocationConfig(event);
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

// Get device location using Geolocation API
async function getDeviceLocation() {
    const loading = AppUtils.showLoading(document.querySelector('.content'));
    
    console.log('Attempting to get device location...');
    console.log('Navigator geolocation available:', !!navigator.geolocation);
    
    if (!navigator.geolocation) {
        AppUtils.showToast('⚠️ Thiết bị này không hỗ trợ Geolocation. Vui lòng nhập tọa độ thủ công', 'warning');
        AppUtils.hideLoading(loading);
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            console.log('Geolocation success:', position);
            const { latitude, longitude, altitude } = position.coords;
            
            // Update form fields
            document.getElementById('latitude').value = latitude.toFixed(6);
            document.getElementById('longitude').value = longitude.toFixed(6);
            if (altitude) {
                document.getElementById('altitude').value = altitude.toFixed(1);
            }
            
            // Try to reverse geocode to get address
            try {
                const address = await reverseGeocode(latitude, longitude);
                if (address) {
                    document.getElementById('locationAddress').value = address;
                    
                    // Extract district/province info for location name
                    const locationName = extractLocationName(address);
                    if (locationName) {
                        document.getElementById('locationName').value = locationName;
                    }
                }
            } catch (error) {
                console.error('Reverse geocoding error:', error);
                // Still show success if we got coordinates
            }
            
            AppUtils.showToast(`✓ Đã lấy vị trí: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, 'success');
            AppUtils.hideLoading(loading);
        },
        (error) => {
            console.error('Geolocation error:', error);
            let message = 'Không thể lấy vị trí';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    message = 'Vui lòng cho phép truy cập vị trí trong cài đặt trình duyệt';
                    break;
                case error.POSITION_UNAVAILABLE:
                    message = 'GPS không có sẵn. Vui lòng nhập tọa độ thủ công';
                    break;
                case error.TIMEOUT:
                    message = 'Hết thời gian chờ GPS (>10s). Vui lòng nhập tọa độ thủ công';
                    break;
            }
            AppUtils.showToast(message, 'warning');
            AppUtils.hideLoading(loading);
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
}

// Search location by name using Nominatim API
async function searchLocationByName() {
    const searchInput = document.getElementById('searchLocationInput');
    const locationName = searchInput.value.trim();
    
    if (!locationName) {
        AppUtils.showToast('⚠️ Vui lòng nhập tên địa điểm', 'warning');
        return;
    }
    
    const loading = AppUtils.showLoading(document.querySelector('.content'));
    
    try {
        console.log('Searching location:', locationName);
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1&countrycodes=vn`,
            {
                headers: {
                    'Accept-Language': 'vi'
                }
            }
        );
        
        if (!response.ok) throw new Error('Search failed');
        
        const data = await response.json();
        console.log('Search results:', data);
        
        if (data && data.length > 0) {
            const location = data[0];
            const lat = parseFloat(location.lat);
            const lon = parseFloat(location.lon);
            
            // Update form fields
            document.getElementById('latitude').value = lat.toFixed(6);
            document.getElementById('longitude').value = lon.toFixed(6);
            document.getElementById('locationName').value = locationName;
            
            // Get full address using reverse geocoding
            try {
                const address = await reverseGeocode(lat, lon);
                if (address) {
                    document.getElementById('locationAddress').value = address;
                }
            } catch (error) {
                console.error('Error getting address:', error);
                // Use the display name from search result
                document.getElementById('locationAddress').value = location.display_name || locationName;
            }
            
            AppUtils.showToast(`✓ Tìm thấy: ${locationName} (${lat.toFixed(4)}, ${lon.toFixed(4)})`, 'success');
        } else {
            AppUtils.showToast('✗ Không tìm thấy địa điểm. Vui lòng thử tên khác', 'warning');
        }
    } catch (error) {
        console.error('Search location error:', error);
        AppUtils.showToast('✗ Lỗi khi tìm kiếm: ' + error.message, 'error');
    } finally {
        AppUtils.hideLoading(loading);
    }
}

// Reverse geocode using OpenStreetMap Nominatim API (free, no API key needed)
async function reverseGeocode(latitude, longitude) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
            {
                headers: {
                    'Accept-Language': 'vi'
                }
            }
        );
        
        if (!response.ok) throw new Error('Reverse geocoding failed');
        
        const data = await response.json();
        
        if (data.address) {
            // Build address from components
            const { address } = data;
            const parts = [];
            
            // Add street if available
            if (address.road) parts.push(address.road);
            
            // Add ward
            if (address.suburb || address.village) {
                parts.push(address.suburb || address.village);
            }
            
            // Add district
            if (address.county) parts.push(address.county);
            
            // Add province
            if (address.state) parts.push(address.state);
            
            return parts.join(', ');
        }
        
        return null;
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return null;
    }
}

// Extract location name (district/province) from address
function extractLocationName(address) {
    if (!address) return null;
    
    const parts = address.split(',').map(p => p.trim());
    
    // Usually the last parts are district and province
    // Try to get "District, Province" format
    if (parts.length >= 2) {
        // Get last 2 meaningful parts
        const filtered = parts.filter(p => p.length > 0);
        if (filtered.length >= 2) {
            return filtered.slice(-2).join(', ');
        }
    }
    
    return null;
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
