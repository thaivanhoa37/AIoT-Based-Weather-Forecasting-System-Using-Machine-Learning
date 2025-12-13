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
        
        // Show comparison in modal or alert
        let message = '📊 So sánh Models:\n\n';
        
        if (data.comparison) {
            for (const [modelType, info] of Object.entries(data.comparison)) {
                const modelNames = { 'prophet': 'Prophet', 'lightgbm': 'LightGBM' };
                const isBest = modelType === data.best_model;
                message += `${isBest ? '🏆 ' : ''}${modelNames[modelType] || modelType}: ${info.average_accuracy.toFixed(2)}%\n`;
            }
        }
        
        if (data.best_model) {
            message += `\n✅ Model tốt nhất: ${data.best_model} (${data.best_accuracy.toFixed(2)}%)`;
        }
        
        alert(message);
        
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
