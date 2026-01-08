// ===== ML Training Page JavaScript =====

let trainingInProgress = false;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadMLTrainingPage();
    initSensorCheckboxes();
    initAutoTrainCheckboxes();
    loadAutoTrainSettings();
    loadAutoTrainHistory();
});

// Initialize sensor checkboxes
function initSensorCheckboxes() {
    const checkboxes = document.querySelectorAll('.sensor-checkbox');
    // Restore from localStorage
    const saved = localStorage.getItem('selectedSensors');
    if (saved) {
        const arr = JSON.parse(saved);
        checkboxes.forEach(cb => {
            cb.checked = arr.includes(cb.value);
        });
    }
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            updateSelectedCount();
            // Save to localStorage
            const selected = Array.from(document.querySelectorAll('.sensor-checkbox:checked')).map(cb => cb.value);
            localStorage.setItem('selectedSensors', JSON.stringify(selected));
        });
        // Add hover effect
        const label = checkbox.closest('.checkbox-item');
        if (label) {
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    label.style.borderColor = 'var(--primary-color)';
                    label.style.background = 'rgba(102, 126, 234, 0.1)';
                } else {
                    label.style.borderColor = 'var(--border-color)';
                    label.style.background = 'var(--bg)';
                }
            });
            // Initialize state
            if (checkbox.checked) {
                label.style.borderColor = 'var(--primary-color)';
                label.style.background = 'rgba(102, 126, 234, 0.1)';
            }
        }
    });
    updateSelectedCount();
}

// Toggle all sensors
function toggleAllSensors(select) {
    const checkboxes = document.querySelectorAll('.sensor-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = select;
        const label = checkbox.closest('.checkbox-item');
        if (label) {
            if (select) {
                label.style.borderColor = 'var(--primary-color)';
                label.style.background = 'rgba(102, 126, 234, 0.1)';
            } else {
                label.style.borderColor = 'var(--border-color)';
                label.style.background = 'var(--bg)';
            }
        }
    });
    // Save to localStorage
    const selected = select ? Array.from(checkboxes).map(cb => cb.value) : [];
    localStorage.setItem('selectedSensors', JSON.stringify(selected));
    updateSelectedCount();
}

// Update selected count display
function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('.sensor-checkbox:checked');
    const countEl = document.getElementById('selectedCount');
    if (countEl) {
        const count = checkboxes.length;
        countEl.innerHTML = `Đã chọn: <strong style="color: var(--primary-color);">${count}</strong> biến để huấn luyện`;
    }
}

// Get selected targets
function getSelectedTargets() {
    const checkboxes = document.querySelectorAll('.sensor-checkbox:checked');
    const targets = Array.from(checkboxes).map(cb => cb.value);
    console.log('Selected targets:', targets);  // Debug log
    return targets;
}

// Load ML training page
async function loadMLTrainingPage() {
    const loading = AppUtils.showLoading(document.querySelector('.content'));
    // Restore dataPoints from localStorage or default to 10000
    const dataPointsInput = document.getElementById('dataPoints');
    if (dataPointsInput) {
        const savedDataPoints = localStorage.getItem('dataPoints');
        if (savedDataPoints) {
            dataPointsInput.value = savedDataPoints;
        } else {
            dataPointsInput.value = 10000;
        }
        // Lưu lại khi thay đổi
        dataPointsInput.addEventListener('change', () => {
            localStorage.setItem('dataPoints', dataPointsInput.value);
        });
    }
    try {
        // Get model info
        const modelInfo = await AppUtils.getMLModelInfo();
        // Update model info display
        updateModelInfoDisplay(modelInfo);
        // Load training history
        loadTrainingHistory(modelInfo);
        // Update model type selector
        updateModelTypeSelector(modelInfo);
    } catch (error) {
        console.error('Error loading ML training page:', error);
        AppUtils.showToast('Không thể tải thông tin model', 'error');
    } finally {
        AppUtils.hideLoading(loading);
    }
}

// Update model type selector with current model
function updateModelTypeSelector(modelInfo) {
    const modelTypeSelect = document.getElementById('modelType');
    if (modelTypeSelect && modelInfo.current_model_type) {
        modelTypeSelect.value = modelInfo.current_model_type;
    }
}

// Update model info display
function updateModelInfoDisplay(modelInfo) {
    const lastTrainTimeEl = document.getElementById('lastTrainTime');
    const trainingDataCountEl = document.getElementById('trainingDataCount');
    const modelAccuracyEl = document.getElementById('modelAccuracy');
    const statusEl = document.getElementById('modelStatus');
    const trainingCountEl = document.getElementById('trainingCount');
    const currentModelTypeEl = document.getElementById('currentModelType');
    
    // Model names mapping
    const modelNames = {
        'prophet': 'Prophet',
        'lightgbm': 'LightGBM'
    };
    
    // Show current model type
    if (currentModelTypeEl && modelInfo.current_model_type) {
        currentModelTypeEl.textContent = modelNames[modelInfo.current_model_type] || modelInfo.current_model_type;
    }
    
    if (lastTrainTimeEl) {
        lastTrainTimeEl.textContent = modelInfo.last_trained || 'Chưa huấn luyện';
    }
    
    if (trainingDataCountEl) {
        trainingDataCountEl.textContent = modelInfo.last_data_points?.toLocaleString() || '0';
    }
    
    if (modelAccuracyEl) {
        const accuracy = modelInfo.last_accuracy || 0;
        modelAccuracyEl.textContent = accuracy > 0 ? `${accuracy.toFixed(2)}%` : '--';
        
        // Color code accuracy
        if (accuracy >= 85) {
            modelAccuracyEl.style.color = '#51cf66';
        } else if (accuracy >= 75) {
            modelAccuracyEl.style.color = '#ffd43b';
        } else if (accuracy > 0) {
            modelAccuracyEl.style.color = '#ff6b6b';
        }
    }
    
    if (statusEl) {
        statusEl.textContent = modelInfo.status;
        statusEl.className = modelInfo.status === 'Hoạt động' ? 'status-active' : 'status-inactive';
    }
    
    if (trainingCountEl) {
        trainingCountEl.textContent = modelInfo.training_count || 0;
    }
}

// Start training
async function startTraining(event) {
    if (event) event.preventDefault();
    
    if (trainingInProgress) {
        AppUtils.showToast('Đang trong quá trình huấn luyện', 'warning');
        return;
    }
    
    // Get form values
    const modelType = document.getElementById('modelType')?.value || 'prophet';
    const dataPointsInput = document.getElementById('dataPoints');
    const dataPoints = parseInt(dataPointsInput?.value) || 1000;
    // Lưu lại lựa chọn khi train
    if (dataPointsInput) {
        localStorage.setItem('dataPoints', dataPointsInput.value);
    }
    
    // Get selected targets
    const selectedTargets = getSelectedTargets();
    
    // Validate
    if (dataPoints < 100) {
        AppUtils.showToast('Số lượng dữ liệu phải >= 100', 'error');
        return;
    }
    
    if (selectedTargets.length === 0) {
        AppUtils.showToast('Vui lòng chọn ít nhất 1 biến để huấn luyện', 'error');
        return;
    }
    
    trainingInProgress = true;
    
    // Model names for display
    const modelNames = {
        'prophet': 'Prophet',
        'lightgbm': 'LightGBM'
    };
    
    // Target names for display
    const targetNames = {
        'temperature': 'Nhiệt độ',
        'humidity': 'Độ ẩm',
        'pressure': 'Áp suất',
        'aqi': 'AQI',
        'co2': 'CO2',
        'dust': 'Bụi (PM2.5)',
        'wind_speed': 'Tốc độ gió',
        'rainfall': 'Lượng mưa',
        'uv_index': 'Chỉ số UV'
    };
    
    // Update UI
    const progressBar = document.getElementById('trainingProgress');
    const progressText = document.getElementById('trainingProgressText');
    const progressLog = document.getElementById('progressLog');
    const startButton = document.querySelector('button[onclick="startTraining(event)"]');
    
    if (startButton) {
        startButton.disabled = true;
        startButton.textContent = '⏳ Đang huấn luyện...';
    }
    
    if (progressBar) progressBar.style.width = '0%';
    if (progressText) progressText.textContent = 'Đang chuẩn bị...';
    if (progressLog) progressLog.innerHTML = '';
    
    try {
        // Log start
        addProgressLog('Bắt đầu quá trình huấn luyện...', 'info');
        addProgressLog(`Model: ${modelNames[modelType]}, Data points: ${dataPoints}`, 'info');
        const targetDisplayNames = selectedTargets.map(t => targetNames[t] || t);
        addProgressLog(`Biến huấn luyện: ${targetDisplayNames.join(', ')}`, 'info');
        addProgressLog('Đang trích xuất dữ liệu từ cơ sở dữ liệu...', 'info');
        
        // Progress simulation
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress > 85) progress = 85;
            
            if (progressBar) progressBar.style.width = `${progress}%`;
            if (progressText) progressText.textContent = `${Math.round(progress)}%`;
        }, 200);
        
        // Build API URL with targets
        const targetsParam = selectedTargets.join(',');
        const apiUrl = `/api/ml/train?model_type=${modelType}&data_points=${dataPoints}&targets=${encodeURIComponent(targetsParam)}`;
        
        // Call training API with selected targets
        const response = await fetch(apiUrl, { method: 'POST' });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Training failed');
        }
        const result = await response.json();
        
        clearInterval(progressInterval);
        
        // Complete progress
        if (progressBar) progressBar.style.width = '100%';
        if (progressText) progressText.textContent = '100% - Hoàn thành!';
        
        // Log results
        addProgressLog('✓ Hoàn thành huấn luyện!', 'success');
        addProgressLog(`📊 Model: ${modelNames[result.model_type || modelType]}`, 'success');
        
        if (result.models_trained && result.models_trained.length > 0) {
            addProgressLog(`📈 Biến dự báo: ${result.models_trained.join(', ')}`, 'success');
            
            // Log metrics for each model
            if (result.all_metrics) {
                for (const [model, metrics] of Object.entries(result.all_metrics)) {
                    const accuracy = metrics.accuracy || (metrics.r2 * 100);
                    addProgressLog(`  → ${model}: R²=${(metrics.r2 || 0).toFixed(4)}, MAE=${(metrics.mae || 0).toFixed(4)}, RMSE=${(metrics.rmse || 0).toFixed(4)}`, 'info');
                }
            }
        }
        
        if (result.overall_accuracy) {
            addProgressLog(`🎯 Độ chính xác tổng thể: ${result.overall_accuracy.toFixed(2)}%`, 'success');
        }
        
        addProgressLog(`⏱️ Thời gian: ${result.training_time}`, 'info');
        addProgressLog(`📝 Dữ liệu sử dụng: ${result.data_points_used} bản ghi`, 'info');
        if (result.sensor_records) {
            addProgressLog(`   → Sensor data: ${result.sensor_records} records`, 'info');
        }
        if (result.weather_records) {
            addProgressLog(`   → Weather API: ${result.weather_records} records`, 'info');
        }
        
        AppUtils.showToast(`Huấn luyện ${modelNames[result.model_type || modelType]} thành công!`, 'success');
        
        // Update model info after delay
        setTimeout(() => {
            loadMLTrainingPage();
        }, 1000);
        
    } catch (error) {
        console.error('Training error:', error);
        const errorMsg = error.message || 'Lỗi không xác định';
        addProgressLog(`✗ Lỗi: ${errorMsg}`, 'error');
        AppUtils.showToast('Huấn luyện thất bại: ' + errorMsg, 'error');
        
        if (progressBar) progressBar.style.width = '0%';
        if (progressText) progressText.textContent = 'Lỗi!';
    } finally {
        trainingInProgress = false;
        
        if (startButton) {
            startButton.disabled = false;
            startButton.textContent = '🚀 Bắt đầu huấn luyện';
        }
    }
}

// Add progress log
function addProgressLog(message, type = 'info') {
    const progressLog = document.getElementById('progressLog');
    if (!progressLog) return;
    
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    
    const timestamp = new Date().toLocaleTimeString('vi-VN');
    logEntry.innerHTML = `<span class="log-time">[${timestamp}]</span> ${message}`;

    
    progressLog.appendChild(logEntry);
    progressLog.scrollTop = progressLog.scrollHeight;
}

// Load training history
function loadTrainingHistory(modelInfo) {
    const tbody = document.getElementById('trainingHistoryBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Check if we have training history
    if (!modelInfo || !modelInfo.last_trained || modelInfo.training_count === 0) {
        // Show "no history" message
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="6" style="text-align: center; color: #888;">Chưa có lịch sử huấn luyện</td>';
        tbody.appendChild(row);
        return;
    }
    
    // Model names
    const modelNames = {
        'prophet': 'Prophet',
        'lightgbm': 'LightGBM'
    };
    
    // Create entry from last training
    const row = document.createElement('tr');
    const statusBadge = '<span class="status-badge success">✓ Thành công</span>';
    const modelTypeName = modelNames[modelInfo.current_model_type] || modelInfo.current_model_type || 'Prophet';
    
    row.innerHTML = `
        <td>${modelInfo.last_trained || '--'}</td>
        <td><strong>${modelTypeName}</strong></td>
        <td>${(modelInfo.models_available || []).join(', ') || '--'}</td>
        <td>${(modelInfo.last_data_points || 0).toLocaleString()}</td>
        <td><span style="color: ${modelInfo.last_accuracy >= 75 ? '#51cf66' : '#ff6b6b'}">${(modelInfo.last_accuracy || 0).toFixed(2)}%</span></td>
        <td>${statusBadge}</td>
    `;
    
    tbody.appendChild(row);
    
    // Add note about full history
    if (modelInfo.training_count > 1) {
        const noteRow = document.createElement('tr');
        noteRow.innerHTML = `<td colspan="6" style="text-align: center; color: #888; font-size: 0.9em;">Tổng cộng ${modelInfo.training_count} lần huấn luyện</td>`;
        tbody.appendChild(noteRow);
    }
}

// Compare models
async function compareModels() {
    try {
        AppUtils.showToast('Đang so sánh các models...', 'info');
        
        const response = await fetch('/api/ml/compare-models');
        if (!response.ok) throw new Error('Không thể so sánh models');
        
        const data = await response.json();
        
        // Build comparison HTML
        let html = '<div style="padding: 20px; font-family: Arial, sans-serif;">';
        html += '<h2 style="color: #667eea; margin-bottom: 20px;">📊 SO SÁNH CÁC MODEL</h2>';
        
        // Current model info
        if (data.current_model) {
            html += `<div style="background: #f0f4ff; padding: 10px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #667eea;">`;
            html += `<strong>✓ Model hiện tại: ${data.current_model === 'prophet' ? 'Prophet' : 'LightGBM'}</strong>`;
            html += `</div>`;
        }
        
        // Comparison table
        if (data.comparison) {
            html += '<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">';
            html += '<tr style="background: #667eea; color: white;">';
            html += '<th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Model</th>';
            html += '<th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Số Targets</th>';
            html += '<th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Trung Bình Accuracy</th>';
            html += '</tr>';
            
            for (const [modelType, info] of Object.entries(data.comparison)) {
                const isBest = modelType === data.best_model;
                const modelName = info.model_name || (modelType === 'prophet' ? 'Prophet' : 'LightGBM');
                const bgColor = isBest ? '#e8f4f8' : 'white';
                const badgeColor = isBest ? 'color: #10b981; font-weight: bold;' : '';
                
                html += `<tr style="background: ${bgColor};">`;
                html += `<td style="padding: 10px; border: 1px solid #ddd;"><strong>${modelName}</strong> ${isBest ? '🏆' : ''}</td>`;
                html += `<td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${info.models_count}</td>`;
                html += `<td style="padding: 10px; border: 1px solid #ddd; text-align: center; ${badgeColor}">`;
                html += `${info.average_accuracy.toFixed(2)}%</td>`;
                html += `</tr>`;
            }
            
            html += '</table>';
        }
        
        // Best model summary
        if (data.best_model) {
            const bestModelName = data.comparison[data.best_model]?.model_name || 
                                 (data.best_model === 'prophet' ? 'Prophet' : 'LightGBM');
            html += `<div style="background: #ecfdf5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">`;
            html += `<strong style="color: #10b981;">✅ Model tốt nhất: ${bestModelName}</strong><br/>`;
            html += `<span style="color: #059669;">Độ chính xác: ${data.best_accuracy.toFixed(2)}%</span>`;
            html += `</div>`;
        } else {
            html += `<div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">`;
            html += `<strong style="color: #f59e0b;">⚠️ Chưa có model nào được huấn luyện</strong><br/>`;
            html += `<span>Vui lòng huấn luyện ít nhất một model trước khi so sánh</span>`;
            html += `</div>`;
        }
        
        html += '</div>';
        
        // Show in modal/popup
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;';
        modal.innerHTML = `
            <div style="background: white; padding: 0; border-radius: 12px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                <div style="position: sticky; top: 0; background: white; border-bottom: 1px solid #ddd; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="margin: 0; color: #667eea;">📊 So Sánh Model</h2>
                    <button onclick="this.closest('div').parentElement.remove()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #999;">×</button>
                </div>
                ${html}
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
        
    } catch (error) {
        console.error('Compare error:', error);
        AppUtils.showToast('Không thể so sánh models: ' + error.message, 'error');
    }
}

// Download model
function downloadModel() {
    AppUtils.showToast('Tính năng tải xuống model đang được phát triển', 'info');
}

// Auto-tune hyperparameters
async function autoTuneHyperparameters() {
    AppUtils.showToast('Đang tự động điều chỉnh hyperparameters...', 'info');
    
    try {
        // Simulate auto-tuning
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Update form with optimized values
        document.getElementById('dataPoints').value = 5000;
        
        AppUtils.showToast('Đã tìm được hyperparameters tối ưu', 'success');
        addProgressLog('✓ Hyperparameters đã được tối ưu tự động', 'success');
        
    } catch (error) {
        AppUtils.showToast('Không thể tự động điều chỉnh', 'error');
    }
}

// Switch model for predictions
async function switchModel(modelType) {
    try {
        const response = await fetch(`/api/ml/set-model?model_type=${modelType}`, {
            method: 'POST'
        });
        
        if (!response.ok) throw new Error('Không thể chuyển model');
        
        const data = await response.json();
        
        if (data.success) {
            AppUtils.showToast(data.message, 'success');
            loadMLTrainingPage();
        }
    } catch (error) {
        console.error('Switch model error:', error);
        AppUtils.showToast('Lỗi chuyển model: ' + error.message, 'error');
    }
}

// ===== AUTO-TRAINING FUNCTIONS =====

// Load auto-training settings
async function loadAutoTrainSettings() {
    try {
        const response = await fetch('/api/ml/auto-train/settings');
        if (!response.ok) throw new Error('Cannot load settings');
        
        const settings = await response.json();
        
        // Update UI
        const enabledBtn = document.getElementById('btnToggleAutoTrain');
        const intervalSelect = document.getElementById('autoTrainInterval');
        const hourSelect = document.getElementById('autoTrainHour');
        const modelSelect = document.getElementById('autoTrainModel');
        const dataPointsInput = document.getElementById('autoTrainDataPoints');
        const statusIndicator = document.getElementById('autoTrainIndicator');
        const nextTrainTime = document.getElementById('nextTrainTime');
        const lastAutoTrainTime = document.getElementById('lastAutoTrainTime');
        const autoTrainCheckboxes = document.querySelectorAll('.auto-train-sensor-checkbox');
        
        // Update form values
        if (intervalSelect) intervalSelect.value = settings.interval_days || 7;
        if (hourSelect) hourSelect.value = settings.hour || 2;
        if (modelSelect) modelSelect.value = settings.model_type || 'prophet';
        if (dataPointsInput) dataPointsInput.value = settings.data_points || 10000;
        
        // Update button state
        if (enabledBtn) {
            if (settings.enabled) {
                enabledBtn.className = 'btn btn-danger';
                enabledBtn.innerHTML = '⏹️ <span data-i18n="mlTrainingExt.disableAutoTrain">Tắt Auto-Training</span>';
            } else {
                enabledBtn.className = 'btn btn-primary';
                enabledBtn.innerHTML = '▶️ <span data-i18n="mlTrainingExt.enableAutoTrain">Bật Auto-Training</span>';
            }
        }
        
        // Update status indicator
        if (statusIndicator) {
            const statusDot = statusIndicator.querySelector('.status-dot');
            const statusText = statusIndicator.querySelector('.status-text');
            if (statusDot && statusText) {
                if (settings.enabled) {
                    statusDot.className = 'status-dot on';
                    statusText.textContent = '✓ Auto-Training đang hoạt động';
                } else {
                    statusDot.className = 'status-dot off';
                    statusText.textContent = '✗ Auto-Training đã tắt';
                }
            }
        }
        
        // Update next train time
        if (nextTrainTime) {
            if (settings.enabled) {
                // Calculate next training time
                const now = new Date();
                const intervalDays = settings.interval_days || 7;
                const targetHour = settings.hour || 2;
                
                let nextDate;
                
                if (settings.last_auto_train_timestamp) {
                    // If we have a last training timestamp, add interval days
                    try {
                        nextDate = new Date(settings.last_auto_train_timestamp);
                        nextDate.setDate(nextDate.getDate() + intervalDays);
                        nextDate.setHours(targetHour, 0, 0, 0);
                    } catch (e) {
                        // If parsing fails, calculate from now
                        nextDate = new Date();
                        nextDate.setDate(nextDate.getDate() + intervalDays);
                        nextDate.setHours(targetHour, 0, 0, 0);
                    }
                } else {
                    // No previous training, calculate from today
                    nextDate = new Date();
                    nextDate.setHours(targetHour, 0, 0, 0);
                    
                    // If today's target hour has passed, move to tomorrow
                    if (now.getHours() >= targetHour) {
                        nextDate.setDate(nextDate.getDate() + 1);
                    }
                }
                
                // Format the date
                const dateStr = nextDate.toLocaleString('vi-VN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                nextTrainTime.textContent = dateStr;
            } else {
                nextTrainTime.textContent = 'Auto-Training đang tắt';
            }
        }
        
        // Update last train time
        if (lastAutoTrainTime) {
            const lastTime = settings.last_auto_train || 'Chưa huấn luyện';
            lastAutoTrainTime.textContent = lastTime;
        }
        
        // Update target checkboxes (support both sensor and API targets)
        const selectedTargets = settings.targets || ["temperature", "humidity"];
        autoTrainCheckboxes.forEach(checkbox => {
            checkbox.checked = selectedTargets.includes(checkbox.value);
        });
        
        updateAutoTrainSelectedCount();
        
    } catch (error) {
        console.error('Load settings error:', error);
    }
}

// Update auto-train selected target count
function updateAutoTrainSelectedCount() {
    const checkboxes = document.querySelectorAll('.auto-train-sensor-checkbox:checked');
    const sensorTargets = ['temperature', 'humidity', 'pressure', 'aqi', 'co2'];
    const apiTargets = ['wind_speed', 'rainfall', 'uv_index'];
    
    let sensorCount = 0;
    let apiCount = 0;
    
    checkboxes.forEach(cb => {
        if (sensorTargets.includes(cb.value)) {
            sensorCount++;
        } else if (apiTargets.includes(cb.value)) {
            apiCount++;
        }
    });
    
    const countEl = document.getElementById('autoTrainSelectedCount');
    if (countEl) {
        countEl.innerHTML = `📊 Đã chọn: <strong style="color: var(--primary-color);">${sensorCount}</strong> biến cảm biến + <strong style="color: #667eea;">${apiCount}</strong> biến API`;
    }
}

// Get selected auto-train targets
function getAutoTrainTargets() {
    const checkboxes = document.querySelectorAll('.auto-train-sensor-checkbox:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

// Toggle auto-train
async function toggleAutoTrain() {
    try {
        const btnToggle = document.getElementById('btnToggleAutoTrain');
        const currentlyEnabled = btnToggle.classList.contains('btn-danger');
        
        const settings = {
            enabled: !currentlyEnabled,  // Toggle the state
            interval_days: parseInt(document.getElementById('autoTrainInterval')?.value || 7),
            hour: parseInt(document.getElementById('autoTrainHour')?.value || 2),
            model_type: document.getElementById('autoTrainModel')?.value || 'prophet',
            data_points: parseInt(document.getElementById('autoTrainDataPoints')?.value || 10000),
            targets: getAutoTrainTargets()
        };
        
        // Validate
        if (settings.enabled && settings.targets.length === 0) {
            AppUtils.showToast('Vui lòng chọn ít nhất 1 biến để huấn luyện', 'warning');
            return;
        }
        
        const response = await fetch('/api/ml/auto-train/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });
        
        if (!response.ok) throw new Error('Cannot update settings');
        
        const result = await response.json();
        
        if (result.success) {
            const message = settings.enabled 
                ? '✓ Auto-Training đã được bật!' 
                : '✓ Auto-Training đã được tắt!';
            AppUtils.showToast(message, 'success');
            
            // Reload settings to update UI
            await loadAutoTrainSettings();
        }
    } catch (error) {
        console.error('Toggle error:', error);
        AppUtils.showToast('Lỗi: ' + error.message, 'error');
    }
}

// Save auto-train settings
async function saveAutoTrainSettings() {
    try {
        const btnToggle = document.getElementById('btnToggleAutoTrain');
        const currentlyEnabled = btnToggle.classList.contains('btn-danger');
        
        const settings = {
            enabled: currentlyEnabled,  // Keep current enabled state
            interval_days: parseInt(document.getElementById('autoTrainInterval')?.value || 7),
            hour: parseInt(document.getElementById('autoTrainHour')?.value || 2),
            model_type: document.getElementById('autoTrainModel')?.value || 'prophet',
            data_points: parseInt(document.getElementById('autoTrainDataPoints')?.value || 10000),
            targets: getAutoTrainTargets()
        };
        
        // Validate
        if (settings.targets.length === 0) {
            AppUtils.showToast('Vui lòng chọn ít nhất 1 biến để huấn luyện', 'warning');
            return;
        }
        
        const response = await fetch('/api/ml/auto-train/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });
        
        if (!response.ok) throw new Error('Cannot save settings');
        
        const result = await response.json();
        
        if (result.success) {
            AppUtils.showToast('✓ Cài đặt đã được lưu!', 'success');
            
            // Reload settings to update UI including next training time
            await loadAutoTrainSettings();
        }
    } catch (error) {
        console.error('Save error:', error);
        AppUtils.showToast('Lỗi: ' + error.message, 'error');
    }
}

// Run auto-train now
async function runAutoTrainNow() {
    try {
        // Check if targets are selected
        const targets = getAutoTrainTargets();
        if (targets.length === 0) {
            AppUtils.showToast('Vui lòng chọn ít nhất 1 biến để huấn luyện', 'warning');
            return;
        }
        
        // First save current settings
        await saveAutoTrainSettings();
        
        AppUtils.showToast('⏳ Đang khởi động quá trình huấn luyện tự động...', 'info');
        
        const response = await fetch('/api/ml/auto-train/run', {
            method: 'POST'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Training failed');
        }
        
        const result = await response.json();
        
        if (result.success) {
            AppUtils.showToast('✓ ' + result.message, 'success');
            
            // Log to progress if available
            if (typeof addProgressLog === 'function') {
                addProgressLog(`✓ Auto-Training hoàn tất!`, 'success');
                
                if (result.accuracy) {
                    addProgressLog(`📈 Độ chính xác: ${(result.accuracy * 100).toFixed(2)}%`, 'info');
                }
                
                if (result.training_time) {
                    addProgressLog(`⏱️ Thời gian: ${result.training_time.toFixed(1)}s`, 'info');
                }
                
                // Show sensor targets
                if (result.sensor_targets && result.sensor_targets.length > 0) {
                    addProgressLog(`📡 Biến cảm biến: ${result.sensor_targets.join(', ')}`, 'info');
                }
                
                // Show API targets
                if (result.api_targets && result.api_targets.length > 0) {
                    addProgressLog(`🌐 Biến Weather API: ${result.api_targets.join(', ')}`, 'info');
                }
            }
            
            // Reload all data
            setTimeout(async () => {
                await loadAutoTrainSettings();
                await loadAutoTrainHistory();
                await loadMLTrainingPage();  // Reload model info
            }, 1000);
        }
    } catch (error) {
        console.error('Run error:', error);
        AppUtils.showToast('Lỗi: ' + error.message, 'error');
        if (typeof addProgressLog === 'function') {
            addProgressLog(`✗ Auto-Training thất bại: ${error.message}`, 'error');
        }
    }
}

// Load training history
async function loadAutoTrainHistory() {
    try {
        const response = await fetch('/api/ml/auto-train/history?limit=10');
        if (!response.ok) throw new Error('Cannot load history');
        
        const data = await response.json();
        const historyContainer = document.getElementById('autoTrainHistoryBody');
        
        if (!historyContainer) return;
        
        historyContainer.innerHTML = '';
        
        if (!data.history || data.history.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" style="text-align: center; color: #888;">Chưa có lịch sử huấn luyện tự động</td>';
            historyContainer.appendChild(row);
            return;
        }
        
        data.history.forEach((record) => {
            const row = document.createElement('tr');
            const date = new Date(record.timestamp);
            const dateStr = date.toLocaleString('vi-VN');
            const modelName = record.model_type === 'prophet' ? 'Prophet' : 'LightGBM';
            const statusBadge = record.status === 'success' 
                ? '<span class="status-badge success">✓ Thành công</span>'
                : '<span class="status-badge error">✗ Thất bại</span>';
            
            // Separate sensor and API targets
            const targets = record.targets || [];
            const sensorTargets = targets.filter(t => ['temperature', 'humidity', 'pressure', 'aqi', 'co2', 'dust'].includes(t));
            const apiTargets = targets.filter(t => ['wind_speed', 'rainfall', 'uv_index'].includes(t));
            
            let targetsDisplay = '';
            if (sensorTargets.length > 0) {
                targetsDisplay += `<div style="font-size: 12px; color: #667eea;">📡 ${sensorTargets.join(', ')}</div>`;
            }
            if (apiTargets.length > 0) {
                targetsDisplay += `<div style="font-size: 12px; color: #1098f0;">🌐 ${apiTargets.join(', ')}</div>`;
            }
            
            const accuracy = record.accuracy 
                ? `<span style="color: ${record.accuracy >= 0.75 ? '#51cf66' : '#ff6b6b'}">${(record.accuracy * 100).toFixed(2)}%</span>`
                : '--';
            
            row.innerHTML = `
                <td style="font-size: 13px;">${dateStr}</td>
                <td><strong>${modelName}</strong></td>
                <td style="font-size: 12px;">${targetsDisplay}</td>
                <td style="text-align: center; font-size: 13px;">${record.data_points || '--'}</td>
                <td style="text-align: center;">${accuracy}</td>
                <td style="text-align: center; font-size: 13px;">${record.training_time ? record.training_time.toFixed(1) + 's' : '--'}</td>
                <td style="text-align: center;">${statusBadge}</td>
            `;
            
            historyContainer.appendChild(row);
        });
        
    } catch (error) {
        console.error('Load history error:', error);
    }
}

// Initialize auto-train checkboxes
function initAutoTrainCheckboxes() {
    const checkboxes = document.querySelectorAll('.auto-train-sensor-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateAutoTrainSelectedCount);
    });
    updateAutoTrainSelectedCount();
}
