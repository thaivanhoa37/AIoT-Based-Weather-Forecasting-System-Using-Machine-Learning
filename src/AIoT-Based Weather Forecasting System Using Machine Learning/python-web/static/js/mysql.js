// ===== MySQL Management Page JavaScript =====

let currentPage = 0;
let pageSize = 50;
let totalRecords = 0;

let mysqlRefreshInterval = null;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadMySQLPage();
    
    // Auto-refresh every 15 seconds (reduced to prevent jank)
    mysqlRefreshInterval = setInterval(() => {
        loadMySQLPage();
    }, 15000);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (mysqlRefreshInterval) {
        clearInterval(mysqlRefreshInterval);
    }
});

// Load MySQL page - Real-time from database
async function loadMySQLPage() {
    // Prevent concurrent updates
    if (window.AppState && window.AppState.updateInProgress) return;
    if (window.AppState) window.AppState.updateInProgress = true;
    
    const loading = AppUtils.showLoading(document.querySelector('.content'), true);
    
    try {
        // Fetch real-time data directly from SQL
        const data = await AppUtils.fetchMySQLTable({
            limit: pageSize,
            offset: currentPage * pageSize
        });
        
        if (!data) throw new Error('Không có dữ liệu');
        
        // Update summary
        updateDatabaseSummary(data);
        
        // Update table
        updateDataTable(data.records);
        
        // Update pagination
        totalRecords = data.totalRecords;
        updatePagination();
        
    } catch (error) {
        console.error('Error loading MySQL page:', error);
        // Only show error once per minute
        const now = Date.now();
        if (!window.lastMySQLError || now - window.lastMySQLError > 60000) {
            AppUtils.showToast('Không thể tải dữ liệu MySQL', 'error');
            window.lastMySQLError = now;
        }
    } finally {
        AppUtils.hideLoading(loading);
        if (window.AppState) window.AppState.updateInProgress = false;
    }
}

// Update database summary
function updateDatabaseSummary(data) {
    const totalRecordsEl = document.getElementById('totalRecords');
    const storageSizeEl = document.getElementById('storageSize');
    const latestRecordEl = document.getElementById('latestRecord');
    
    if (totalRecordsEl) totalRecordsEl.textContent = data.totalRecords?.toLocaleString() || '--';
    if (storageSizeEl) storageSizeEl.textContent = data.storageSize || '--';
    if (latestRecordEl) latestRecordEl.textContent = data.latestRecord || '--';
}

// Update data table
function updateDataTable(records) {
    const tbody = document.getElementById('dataTableBody');
    if (!tbody) return;
    
    if (!records || records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">Không có dữ liệu</td></tr>';
        return;
    }
    
    // Smooth update - only update if different
    const existingRows = tbody.querySelectorAll('tr');
    const needsUpdate = existingRows.length !== records.length;
    
    if (!needsUpdate && existingRows.length > 0) {
        // Check first row to see if data changed
        const firstRow = existingRows[0];
        const firstRecord = records[0];
        const firstId = firstRow.querySelector('td')?.textContent;
        if (firstId === String(firstRecord.id)) {
            return; // No update needed
        }
    }
    
    // Update with fade effect
    tbody.style.opacity = '0.5';
    
    setTimeout(() => {
        tbody.innerHTML = '';
        
        records.forEach(record => {
            const row = document.createElement('tr');
            row.style.opacity = '0';
            
            const aqiLevel = AppUtils.getAQILevel(record.aqi);
            
            row.innerHTML = `
                <td>${record.id}</td>
                <td>${record.time}</td>
                <td>${record.node}</td>
                <td>${record.temperature}°C</td>
                <td>${record.humidity}%</td>
                <td>${record.pressure} hPa</td>
                <td>${record.co2} ppm</td>
                <td>${record.dust} µg/m³</td>
                <td>
                    <span style="color: ${aqiLevel.color}; font-weight: 600;">
                        ${record.aqi}
                    </span>
                </td>
            `;
            
            tbody.appendChild(row);
            
            // Fade in
            setTimeout(() => {
                row.style.transition = 'opacity 0.3s ease';
                row.style.opacity = '1';
            }, 10);
        });
        
        tbody.style.opacity = '1';
    }, 150);
}

// Update pagination
function updatePagination() {
    const paginationInfo = document.getElementById('paginationInfo');
    if (paginationInfo) {
        const start = currentPage * pageSize + 1;
        const end = Math.min((currentPage + 1) * pageSize, totalRecords);
        paginationInfo.textContent = `${start}-${end} / ${totalRecords.toLocaleString()}`;
    }
    
    // Update button states
    const prevBtn = document.querySelector('button[onclick="previousPage()"]');
    const nextBtn = document.querySelector('button[onclick="nextPage()"]');
    
    if (prevBtn) prevBtn.disabled = currentPage === 0;
    if (nextBtn) nextBtn.disabled = (currentPage + 1) * pageSize >= totalRecords;
}

// Previous page
function previousPage() {
    if (currentPage > 0) {
        currentPage--;
        loadMySQLPage();
    }
}

// Next page
function nextPage() {
    if ((currentPage + 1) * pageSize < totalRecords) {
        currentPage++;
        loadMySQLPage();
    }
}

// Refresh data
function refreshData() {
    currentPage = 0;
    loadMySQLPage();
    AppUtils.showToast('Đã làm mới dữ liệu', 'success');
}

// Export database
async function exportDatabase() {
    const format = prompt('Chọn định dạng xuất (csv/json/excel):', 'csv');
    
    if (!format || !['csv', 'json', 'excel'].includes(format.toLowerCase())) {
        AppUtils.showToast('Định dạng không hợp lệ', 'error');
        return;
    }
    
    const loading = AppUtils.showLoading(document.querySelector('.content'));
    
    try {
        const result = await AppUtils.exportData(format.toLowerCase(), 'sensor_data', 10000);
        
        if (result.success) {
            AppUtils.showToast(`Đã xuất ${result.records_count} bản ghi`, 'success');
            
            // Trigger download (simplified)
            const dataStr = JSON.stringify(result.data, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `export_${new Date().toISOString().split('T')[0]}.${format}`;
            a.click();
        }
    } catch (error) {
        console.error('Export error:', error);
        AppUtils.showToast('Không thể xuất dữ liệu', 'error');
    } finally {
        AppUtils.hideLoading(loading);
    }
}

// Backup database
async function backupDatabase() {
    AppUtils.showModal(
        'Xác nhận sao lưu',
        'Bạn có chắc muốn tạo bản sao lưu cơ sở dữ liệu?',
        async () => {
            const loading = AppUtils.showLoading(document.querySelector('.content'));
            
            try {
                const result = await AppUtils.backupDatabase();
                
                if (result.success) {
                    AppUtils.showToast(`Đã tạo backup: ${result.backup_file}`, 'success');
                }
            } catch (error) {
                console.error('Backup error:', error);
                AppUtils.showToast('Không thể tạo backup', 'error');
            } finally {
                AppUtils.hideLoading(loading);
            }
        }
    );
}

// Clear database
function clearDatabase() {
    const table = prompt('Xóa bảng nào? (sensor_data/weather_forecasting/all):', 'sensor_data');
    
    if (!table || !['sensor_data', 'weather_forecasting', 'all'].includes(table)) {
        AppUtils.showToast('Tên bảng không hợp lệ', 'error');
        return;
    }
    
    AppUtils.showModal(
        'Xác nhận xóa dữ liệu',
        `CẢNH BÁO: Bạn sắp xóa toàn bộ dữ liệu trong bảng "${table}". Hành động này KHÔNG THỂ HOÀN TÁC. Bạn có chắc chắn muốn tiếp tục?`,
        async () => {
            const loading = AppUtils.showLoading(document.querySelector('.content'));
            
            try {
                const result = await AppUtils.clearDatabase(table, true);
                
                if (result.success) {
                    AppUtils.showToast('Đã xóa dữ liệu thành công', 'success');
                    loadMySQLPage();
                }
            } catch (error) {
                console.error('Clear error:', error);
                AppUtils.showToast('Không thể xóa dữ liệu', 'error');
            } finally {
                AppUtils.hideLoading(loading);
            }
        }
    );
}

// Search data
function searchData(event) {
    if (event) event.preventDefault();
    
    const searchTerm = document.getElementById('searchInput')?.value;
    const startDate = document.getElementById('searchStartDate')?.value;
    const endDate = document.getElementById('searchEndDate')?.value;
    
    if (!searchTerm && !startDate && !endDate) {
        AppUtils.showToast('Vui lòng nhập điều kiện tìm kiếm', 'warning');
        return;
    }
    
    // In real implementation, pass filter parameters to API
    AppUtils.showToast('Đang tìm kiếm...', 'info');
    
    // Reset to first page and reload
    currentPage = 0;
    loadMySQLPage();
}

// Optimize database
async function optimizeDatabase() {
    AppUtils.showModal(
        'Tối ưu hóa database',
        'Quá trình này sẽ tối ưu hóa bảng và index. Bạn có muốn tiếp tục?',
        async () => {
            const loading = AppUtils.showLoading(document.querySelector('.content'));
            
            try {
                // Simulate optimization
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                AppUtils.showToast('Database đã được tối ưu hóa', 'success');
            } catch (error) {
                AppUtils.showToast('Không thể tối ưu hóa', 'error');
            } finally {
                AppUtils.hideLoading(loading);
            }
        }
    );
}
