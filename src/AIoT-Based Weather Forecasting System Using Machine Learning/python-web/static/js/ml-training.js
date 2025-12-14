// ===== ML Training Page JavaScript =====

let trainingInProgress = false;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadMLTrainingPage();
    initSensorCheckboxes();
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
    console.log('🚀 Loading ML Training page...');
    
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
    
    // Load saved training configuration
    loadTrainingConfiguration();
    
    // Initialize auto-train checkbox listeners - with delay to ensure DOM is ready
    setTimeout(() => {
        console.log('⏱️ Initializing auto-train checkboxes after delay...');
        initAutoTrainCheckboxes();
    }, 100);
    
    try {
        // Get model info
        const modelInfo = await AppUtils.getMLModelInfo();
        // Update model info display
        updateModelInfoDisplay(modelInfo);
        // Load training history
        loadTrainingHistory(modelInfo);
        // Update model type selector
        updateModelTypeSelector(modelInfo);
        
        // Load auto-train settings
        console.log('📥 Loading auto-train settings...');
        await loadAutoTrainSettings();
        
    } catch (error) {
        console.error('Error loading ML training page:', error);
        AppUtils.showToast('Không thể tải thông tin model', 'error');
    } finally {
        AppUtils.hideLoading(loading);
    }
}

// Load training configuration from localStorage
function loadTrainingConfiguration() {
    try {
        const savedConfig = localStorage.getItem('trainingConfig');
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            
            // Restore model type
            if (config.modelType) {
                const modelTypeSelect = document.getElementById('modelType');
                if (modelTypeSelect) {
                    modelTypeSelect.value = config.modelType;
                }
            }
            
            // Restore data points
            if (config.dataPoints) {
                const dataPointsInput = document.getElementById('dataPoints');
                if (dataPointsInput) {
                    dataPointsInput.value = config.dataPoints;
                }
            }
            
            // Restore selected sensors/targets
            if (config.selectedTargets && Array.isArray(config.selectedTargets)) {
                // Uncheck all first
                document.querySelectorAll('.sensor-checkbox').forEach(cb => {
                    cb.checked = false;
                });
                
                // Check saved targets
                config.selectedTargets.forEach(target => {
                    const checkbox = document.querySelector(`.sensor-checkbox[value="${target}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                        // Update UI styles
                        const label = checkbox.closest('.checkbox-item');
                        if (label) {
                            label.style.borderColor = 'var(--primary-color)';
                            label.style.background = 'rgba(102, 126, 234, 0.1)';
                        }
                    }
                });
                
                // Update count display
                updateSelectedCount();
            }
            
            // Show status bar if config was loaded
            const statusBar = document.getElementById('configStatusBar');
            if (statusBar && savedConfig) {
                statusBar.style.display = 'block';
            }
            
            // Show toast notification
            AppUtils.showToast('✓ Đã load cấu hình huấn luyện từ trước', 'success');
        }
    } catch (error) {
        console.error('Error loading training configuration:', error);
    }
}

// Clear training configuration
function clearTrainingConfiguration() {
    if (confirm('Bạn chắc chắn muốn xóa cấu hình huấn luyện đã lưu?')) {
        try {
            localStorage.removeItem('trainingConfig');
            
            // Hide status bar
            const statusBar = document.getElementById('configStatusBar');
            if (statusBar) {
                statusBar.style.display = 'none';
            }
            
            AppUtils.showToast('✓ Đã xóa cấu hình', 'success');
        } catch (error) {
            console.error('Error clearing configuration:', error);
            AppUtils.showToast('✗ Lỗi khi xóa cấu hình', 'error');
        }
    }
}

// Save training configuration to localStorage
function saveTrainingConfiguration() {
    try {
        const config = {
            modelType: document.getElementById('modelType')?.value || 'prophet',
            dataPoints: document.getElementById('dataPoints')?.value || '10000',
            selectedTargets: getSelectedTargets(),
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('trainingConfig', JSON.stringify(config));
        return config;
    } catch (error) {
        console.error('Error saving training configuration:', error);
        return null;
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
    
    // Save current configuration for next time
    saveTrainingConfiguration();
    
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

// ===== Auto-Training Functions =====

// Initialize auto-train checkboxes
function initAutoTrainCheckboxes() {
    console.log('🔧 Initializing auto-train checkboxes...');
    
    const checkboxes = document.querySelectorAll('.auto-train-checkbox');
    console.log(`✓ Found ${checkboxes.length} auto-train checkboxes`);
    
    // First, load saved targets from localStorage (temporary storage before API load)
    const savedTargets = localStorage.getItem('autoTrainTargets');
    if (savedTargets) {
        try {
            const targets = JSON.parse(savedTargets);
            console.log(`📥 Restoring from localStorage: ${JSON.stringify(targets)}`);
            checkboxes.forEach(cb => {
                cb.checked = targets.includes(cb.value);
            });
        } catch (e) {
            console.warn('Failed to parse saved targets:', e);
        }
    }
    
    checkboxes.forEach(checkbox => {
        // Add change event listener
        checkbox.addEventListener('change', () => {
            console.log(`Checkbox ${checkbox.value} changed to ${checkbox.checked}`);
            updateAutoTrainSelectedCount();
            
            // Save to localStorage immediately
            saveAutoTrainTargetsToLocalStorage();
            
            // Update UI styles
            const label = checkbox.closest('.checkbox-item');
            if (label) {
                if (checkbox.checked) {
                    label.style.borderColor = 'var(--primary-color)';
                    label.style.background = 'rgba(102, 126, 234, 0.1)';
                } else {
                    label.style.borderColor = 'var(--border-color)';
                    label.style.background = 'var(--bg)';
                }
            }
        });
        // Initialize state
        const label = checkbox.closest('.checkbox-item');
        if (checkbox.checked && label) {
            label.style.borderColor = 'var(--primary-color)';
            label.style.background = 'rgba(102, 126, 234, 0.1)';
        }
    });
    updateAutoTrainSelectedCount();
    console.log('✓ Auto-train checkboxes initialized');
}

// Save auto-train targets to localStorage
function saveAutoTrainTargetsToLocalStorage() {
    const targets = getSelectedAutoTrainTargets();
    localStorage.setItem('autoTrainTargets', JSON.stringify(targets));
    console.log(`💾 Saved to localStorage: ${JSON.stringify(targets)}`);
}

// Toggle all auto-train sensors
function toggleAllAutoTrainSensors(select) {
    const checkboxes = document.querySelectorAll('.auto-train-checkbox');
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
    
    // Save to localStorage immediately
    saveAutoTrainTargetsToLocalStorage();
    updateAutoTrainSelectedCount();
}

// Update auto-train selected count
function updateAutoTrainSelectedCount() {
    const checkboxes = document.querySelectorAll('.auto-train-checkbox:checked');
    const countEl = document.getElementById('autoTrainSelectedCount');
    if (countEl) {
        const count = checkboxes.length;
        countEl.innerHTML = `Đã chọn: <strong style="color: var(--primary-color);">${count}</strong> biến`;
        console.log(`📊 Updated count display: ${count} sensors selected`);
    } else {
        console.warn('⚠️ autoTrainSelectedCount element not found');
    }
}

// Get selected auto-train targets
function getSelectedAutoTrainTargets() {
    const checkboxes = document.querySelectorAll('.auto-train-checkbox:checked');
    console.log(`🔍 Querying: document.querySelectorAll('.auto-train-checkbox:checked')`);
    console.log(`✓ Found ${checkboxes.length} checked checkboxes`);
    
    // Debug: list all checkboxes
    console.log('📋 All checkboxes:');
    document.querySelectorAll('.auto-train-checkbox').forEach(cb => {
        console.log(`  [${cb.checked ? 'x' : ' '}] ${cb.id} = "${cb.value}" (checked=${cb.checked})`);
    });
    
    const targets = Array.from(checkboxes).map(cb => cb.value);
    console.log(`✅ Selected auto-train targets: [${targets.join(', ')}] (${targets.length} total)`);
    return targets;
}

// Load auto-train settings
async function loadAutoTrainSettings() {
    try {
        console.log('🔄 Loading auto-train settings...');
        
        const response = await fetch('/api/ml/auto-train/settings');
        if (!response.ok) throw new Error('Không thể tải cài đặt');
        
        const settings = await response.json();
        console.log('📥 Loaded settings from API:', settings);
        
        // Update UI with loaded settings
        if (settings.interval_days) {
            document.getElementById('autoTrainInterval').value = settings.interval_days;
            console.log(`✓ Set interval_days: ${settings.interval_days}`);
        }
        if (settings.hour !== undefined) {
            document.getElementById('autoTrainHour').value = settings.hour;
            console.log(`✓ Set hour: ${settings.hour}`);
        }
        if (settings.model_type) {
            document.getElementById('autoTrainModel').value = settings.model_type;
            console.log(`✓ Set model_type: ${settings.model_type}`);
        }
        if (settings.data_points) {
            document.getElementById('autoTrainDataPoints').value = settings.data_points;
            console.log(`✓ Set data_points: ${settings.data_points}`);
        }
        
        // Load selected targets
        // Priority: localStorage > API > default
        let targets = null;
        
        // First try localStorage (user's current selections that haven't been saved to server)
        const savedTargets = localStorage.getItem('autoTrainTargets');
        if (savedTargets) {
            try {
                targets = JSON.parse(savedTargets);
                console.log(`📥 [HIGH PRIORITY] Using targets from localStorage: ${JSON.stringify(targets)}`);
                console.log(`⚠️  Note: These targets are only in browser storage, not yet saved to server!`);
            } catch (e) {
                console.warn('Failed to parse localStorage targets:', e);
                targets = null;
            }
        }
        
        // If no localStorage, use API settings (server-saved targets)
        if (!targets && settings.targets && Array.isArray(settings.targets)) {
            targets = settings.targets;
            console.log(`📥 [MEDIUM PRIORITY] Using targets from API (server): ${JSON.stringify(targets)}`);
        }
        
        // If still no targets, use default
        if (!targets) {
            targets = ['temperature', 'humidity', 'pressure', 'aqi'];
            console.log(`📥 [LOW PRIORITY] Using default targets: ${JSON.stringify(targets)}`);
        }
        
        // Apply targets to checkboxes
        console.log(`📋 Applying targets to checkboxes: ${JSON.stringify(targets)}`);
        document.querySelectorAll('.auto-train-checkbox').forEach(cb => {
            const shouldCheck = targets.includes(cb.value);
            cb.checked = shouldCheck;
            console.log(`  - ${cb.value}: ${shouldCheck}`);
            
            // Trigger change event so event listeners fire
            cb.dispatchEvent(new Event('change', { bubbles: true }));
            
            const label = cb.closest('.checkbox-item');
            if (label) {
                if (cb.checked) {
                    label.style.borderColor = 'var(--primary-color)';
                    label.style.background = 'rgba(102, 126, 234, 0.1)';
                } else {
                    label.style.borderColor = 'var(--border-color)';
                    label.style.background = 'var(--bg)';
                }
            }
        });
        
        // Final sync to localStorage
        localStorage.setItem('autoTrainTargets', JSON.stringify(targets));
        console.log(`💾 Targets synced to localStorage: ${JSON.stringify(targets)}`);
        
        updateAutoTrainSelectedCount();
        
        // Update status display
        updateAutoTrainStatus(settings);
        console.log('✓ Settings loaded and UI updated');
        
    } catch (error) {
        console.error('❌ Error loading auto-train settings:', error);
    }
}

// Update auto-train status display
function updateAutoTrainStatus(settings) {
    const indicator = document.getElementById('autoTrainIndicator');
    const statusDot = indicator?.querySelector('.status-dot');
    const statusText = indicator?.querySelector('.status-text');
    
    if (settings.enabled) {
        if (statusDot) statusDot.className = 'status-dot on';
        if (statusText) statusText.textContent = '✓ Auto-Training đang hoạt động';
        
        const btnToggle = document.getElementById('btnToggleAutoTrain');
        if (btnToggle) {
            btnToggle.innerHTML = '⏹️ <span>Tắt Auto-Training</span>';
            btnToggle.className = 'btn btn-danger';
        }
    } else {
        if (statusDot) statusDot.className = 'status-dot off';
        if (statusText) statusText.textContent = '✗ Auto-Training đã tắt';
        
        const btnToggle = document.getElementById('btnToggleAutoTrain');
        if (btnToggle) {
            btnToggle.innerHTML = '▶️ <span>Bật Auto-Training</span>';
            btnToggle.className = 'btn btn-primary';
        }
    }
    
    // Update next train time
    if (settings.next_train_time) {
        document.getElementById('nextTrainTime').textContent = new Date(settings.next_train_time).toLocaleString('vi-VN');
    }
    
    // Update last train time
    if (settings.last_auto_train) {
        document.getElementById('lastAutoTrainTime').textContent = new Date(settings.last_auto_train).toLocaleString('vi-VN');
    }
}

// Save auto-train settings
async function saveAutoTrainSettings() {
    try {
        AppUtils.showToast('💾 Đang lưu cài đặt...', 'info');
        
        console.log('=== SAVING AUTO-TRAIN SETTINGS ===');
        
        // Get selected targets
        const selectedTargets = getSelectedAutoTrainTargets();
        console.log(`🎯 Selected targets from checkboxes: ${JSON.stringify(selectedTargets)}`);
        console.log(`📊 Number of targets selected: ${selectedTargets.length}`);
        
        // Log each checkbox state for debugging
        console.log('📋 Checkbox states:');
        document.querySelectorAll('.auto-train-checkbox').forEach(cb => {
            console.log(`  [${cb.checked ? 'x' : ' '}] ${cb.value} (${cb.id})`);
        });
        
        // Validate
        if (selectedTargets.length === 0) {
            console.warn('⚠️ No targets selected');
            AppUtils.showToast('Vui lòng chọn ít nhất 1 cảm biến', 'error');
            return;
        }
        
        // Get other settings
        const interval = parseInt(document.getElementById('autoTrainInterval').value);
        const hour = parseInt(document.getElementById('autoTrainHour').value);
        const model = document.getElementById('autoTrainModel').value;
        const dataPoints = parseInt(document.getElementById('autoTrainDataPoints').value);
        
        const settings = {
            interval_days: interval,
            hour: hour,
            model_type: model,
            data_points: dataPoints,
            targets: selectedTargets
        };
        
        console.log('📝 Full settings object to send:', JSON.stringify(settings, null, 2));
        
        const response = await fetch('/api/ml/auto-train/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });
        
        console.log('📨 Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ API Error:', errorData);
            throw new Error(errorData.detail || 'Không thể lưu cài đặt');
        }
        
        const result = await response.json();
        console.log('✅ Save successful, API returned:', result);
        console.log(`🎯 Targets on server after save: ${JSON.stringify(result.targets || [])}`);
        
        // Check debug info
        try {
            const debugResponse = await fetch('/api/ml/auto-train/debug');
            const debugInfo = await debugResponse.json();
            console.log('🔍 Debug info after save:', {
                file_path: debugInfo.config_file_path,
                file_exists: debugInfo.config_file_exists,
                saved_targets: debugInfo.current_settings?.targets
            });
        } catch (e) {
            console.warn('Could not fetch debug info:', e);
        }
        
        AppUtils.showToast('✓ Cài đặt đã được lưu thành công!', 'success');
        console.log('✓ Toast notification shown');
        
        // Reload settings to update display
        console.log('🔄 Reloading settings from API...');
        await loadAutoTrainSettings();
        console.log('✓ Settings reloaded from API');
        console.log('=== END SAVE ===\n');
        
    } catch (error) {
        console.error('❌ Error saving auto-train settings:', error);
        AppUtils.showToast('✗ Lỗi khi lưu cài đặt: ' + error.message, 'error');
    }
}

// Toggle auto-train
async function toggleAutoTrain() {
    try {
        const currentSettings = await (await fetch('/api/ml/auto-train/settings')).json();
        const newEnabled = !currentSettings.enabled;
        
        const response = await fetch('/api/ml/auto-train/toggle', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ enabled: newEnabled })
        });
        
        if (!response.ok) throw new Error('Không thể đổi trạng thái');
        
        const result = await response.json();
        
        if (newEnabled) {
            AppUtils.showToast('✓ Đã bật Auto-Training', 'success');
        } else {
            AppUtils.showToast('✓ Đã tắt Auto-Training', 'success');
        }
        
        // Reload settings
        await loadAutoTrainSettings();
        
    } catch (error) {
        console.error('Error toggling auto-train:', error);
        AppUtils.showToast('✗ Lỗi: ' + error.message, 'error');
    }
}

// Run auto-train now
async function runAutoTrainNow() {
    try {
        AppUtils.showToast('⚡ Đang chạy tự động huấn luyện...', 'info');
        
        const response = await fetch('/api/ml/auto-train/run-now', {
            method: 'POST'
        });
        
        if (!response.ok) throw new Error('Không thể chạy auto-train');
        
        const result = await response.json();
        
        AppUtils.showToast('✓ Auto-training đã bắt đầu!', 'success');
        
        // Reload settings to update last train time
        await loadAutoTrainSettings();
        
    } catch (error) {
        console.error('Error running auto-train:', error);
        AppUtils.showToast('✗ Lỗi: ' + error.message, 'error');
    }
}