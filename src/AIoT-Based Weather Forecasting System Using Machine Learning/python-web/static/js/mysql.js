// ===== MySQL Management Page JavaScript =====
// Full-featured database management interface

let currentPage = 0;
let pageSize = 50;
let totalRecords = 0;
let mysqlRefreshInterval = null;
let currentTimeFilter = 'all';
let currentNodeFilter = 'all';

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
    initializeMySQLPage();
    loadTableData();
    
    // Auto-refresh every 15 seconds
    mysqlRefreshInterval = setInterval(() => {
        loadTableData();
    }, 15000);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (mysqlRefreshInterval) {
        clearInterval(mysqlRefreshInterval);
    }
});

function initializeMySQLPage() {
    // Initialize event listeners
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchData();
            }
        });
    }

    // Initialize node filter
    const nodeFilter = document.getElementById('nodeFilter');
    if (nodeFilter) {
        nodeFilter.addEventListener('change', (e) => {
            currentNodeFilter = e.target.value;
            currentPage = 0;
            loadTableData();
        });
    }

    // Initialize delete date inputs
    initDeleteDateInputs();

    // Initialize delete date inputs change event
    const deleteStartDate = document.getElementById('deleteStartDate');
    const deleteEndDate = document.getElementById('deleteEndDate');
    if (deleteStartDate && deleteEndDate) {
        deleteStartDate.addEventListener('change', previewDeleteCount);
        deleteEndDate.addEventListener('change', previewDeleteCount);
    }
}

// ===== Time Filter Management =====
function setTimeFilter(filter) {
    currentTimeFilter = filter;
    currentPage = 0;
    
    // Update button styles
    document.querySelectorAll('.filter-row .btn-group .btn').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
    });
    
    // Mark current filter as active
    const activeBtn = Array.from(document.querySelectorAll('.filter-row .btn-group .btn'))
        .find(btn => btn.textContent.toLowerCase().includes(getFilterLabel(filter).toLowerCase()));
    if (activeBtn) {
        activeBtn.classList.remove('btn-secondary');
        activeBtn.classList.add('btn-primary');
    }
    
    loadTableData();
}

function getFilterLabel(filter) {
    const labels = {
        'today': 'Hôm nay',
        '24h': '24 giờ qua',
        '7d': '7 ngày qua',
        'all': 'Tất cả'
    };
    return labels[filter] || filter;
}

// ===== Data Loading =====
async function loadTableData() {
    if (window.AppState?.updateInProgress) return;
    if (window.AppState) window.AppState.updateInProgress = true;
    
    const tableBody = document.getElementById('dataTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 30px;"><div class="loading"></div></td></tr>';

    try {
        const data = await fetchMySQLTableData({
            limit: pageSize,
            offset: currentPage * pageSize,
            timeFilter: currentTimeFilter,
            nodeFilter: currentNodeFilter
        });

        if (!data) throw new Error('Không có dữ liệu');

        // Update summary stats
        updateDatabaseSummary(data);

        // Update table
        updateDataTable(data.records);

        // Update pagination
        totalRecords = data.totalRecords;
        updatePagination();

        // Ẩn thông báo load thành công để tránh giật
        // AppUtils.showToast('Đã tải dữ liệu thành công', 'success');
    } catch (error) {
        console.error('Error loading MySQL data:', error);
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 30px; color: var(--danger);">Lỗi: ${error.message}</td></tr>`;
        AppUtils.showToast('Không thể tải dữ liệu', 'error');
    } finally {
        if (window.AppState) window.AppState.updateInProgress = false;
    }
}

async function fetchMySQLTableData(filters) {
    try {
        // Apply time filter offset
        let daysOffset = 0;
        switch(filters.timeFilter) {
            case 'today': daysOffset = 0; break;
            case '24h': daysOffset = 1; break;
            case '7d': daysOffset = 7; break;
            default: daysOffset = 999;
        }

        const response = await fetch(`/api/sensor-data/history?limit=${filters.limit}&offset=${filters.offset}&days=${daysOffset}`);
        if (!response.ok) throw new Error('API Error');
        const data = await response.json();
        
        const statsResponse = await fetch('/api/system-stats');
        const stats = await statsResponse.json();
        
        return {
            records: data.records.map((r, idx) => ({
                id: r.id || (10000 + idx),
                time: formatDateTime(r.timestamp),
                node: r.node_id || 'Node 1',
                temperature: (r.temperature || 0).toFixed(1),
                humidity: (r.humidity || 0).toFixed(1),
                pressure: (r.pressure || 0).toFixed(1),
                co2: (r.co2 || 0).toFixed(0),
                dust: (r.dust || 0).toFixed(1),
                aqi: Math.round(r.aqi || 0)
            })),
            totalRecords: stats.sensor_records || data.total || 0,
            storageSize: stats.database_size || '0 MB',
            latestRecord: stats.last_update || '--'
        };
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

function formatDateTime(timestamp) {
    if (!timestamp) return '--';
    try {
        const date = new Date(timestamp);
        return date.toLocaleString('vi-VN');
    } catch {
        return timestamp;
    }
}

// ===== UI Updates =====
function updateDatabaseSummary(data) {
    const totalRecordsEl = document.getElementById('totalRecords');
    const storageSizeEl = document.getElementById('storageSize');
    const latestRecordEl = document.getElementById('latestRecord');
    
    if (totalRecordsEl) {
        totalRecordsEl.textContent = (data.totalRecords || 0).toLocaleString('vi-VN');
    }
    if (storageSizeEl) {
        storageSizeEl.textContent = data.storageSize || '--';
    }
    if (latestRecordEl) {
        latestRecordEl.textContent = data.latestRecord || '--';
    }
}

function updateDataTable(records) {
    const tbody = document.getElementById('dataTableBody');
    if (!tbody) return;
    
    if (!records || records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">Không có dữ liệu</td></tr>';
        return;
    }

    // Clear with fade effect
    tbody.style.opacity = '0.5';
    
    setTimeout(() => {
        tbody.innerHTML = '';
        
        records.forEach((record, index) => {
            const row = document.createElement('tr');
            row.style.opacity = '0';
            
            const aqiLevel = getAQILevel(record.aqi);
            
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
            
            // Fade in with stagger
            setTimeout(() => {
                row.style.transition = 'opacity 0.3s ease';
                row.style.opacity = '1';
            }, index * 30);
        });
        
        tbody.style.opacity = '1';
    }, 150);
}

function updatePagination() {
    const paginationInfo = document.getElementById('paginationInfo');
    if (paginationInfo) {
        const start = currentPage * pageSize + 1;
        const end = Math.min((currentPage + 1) * pageSize, totalRecords);
        paginationInfo.textContent = `${start}-${end} / ${totalRecords.toLocaleString('vi-VN')}`;
    }

    // Update button states
    const prevBtn = document.querySelector('button[onclick="previousPage()"]');
    const nextBtn = document.querySelector('button[onclick="nextPage()"]');
    
    if (prevBtn) prevBtn.disabled = currentPage === 0;
    if (nextBtn) nextBtn.disabled = (currentPage + 1) * pageSize >= totalRecords;
}

function getAQILevel(aqi) {
    const value = parseInt(aqi) || 0;
    if (value <= 50) return { label: 'Tốt', color: '#4ade80' };
    if (value <= 100) return { label: 'Chấp nhận được', color: '#fbbf24' };
    if (value <= 150) return { label: 'Nhạy cảm', color: '#f97316' };
    if (value <= 200) return { label: 'Không lành mạnh', color: '#ef4444' };
    if (value <= 300) return { label: 'Rất không lành mạnh', color: '#991b1b' };
    return { label: 'Nguy hiểm', color: '#7c2d12' };
}

// ===== Pagination =====
function previousPage() {
    if (currentPage > 0) {
        currentPage--;
        loadTableData();
    }
}

function nextPage() {
    if ((currentPage + 1) * pageSize < totalRecords) {
        currentPage++;
        loadTableData();
    }
}

// ===== Search & Filter =====
function searchData() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput?.value.trim();
    
    if (!searchTerm) {
        AppUtils.showToast('Vui lòng nhập từ khóa tìm kiếm', 'warning');
        return;
    }

    currentPage = 0;
    loadTableData();
}

// ===== Data Export =====
async function showExportDialog() {
    const format = prompt('Chọn định dạng xuất dữ liệu:\ncsv - CSV file\njson - JSON format\nexcel - Excel file', 'csv');
    
    if (!format) return;
    
    const validFormats = ['csv', 'json', 'excel'];
    if (!validFormats.includes(format.toLowerCase())) {
        AppUtils.showToast('Định dạng không hợp lệ', 'error');
        return;
    }

    await exportDatabase(format.toLowerCase());
}

async function exportDatabase(format = 'csv') {
    const loading = AppUtils.showLoading(document.querySelector('.content'), true);
    
    try {
        const result = await fetch(`/api/database/export?format=${format}&table=sensor_data&limit=10000`)
            .then(r => {
                if (!r.ok) throw new Error('Export failed');
                return r.json();
            });

        if (result.success || result.records_count) {
            AppUtils.showToast(`Đã xuất ${result.records_count || 0} bản ghi`, 'success');
            
            // Generate download
            let content = '';
            const filename = `sensor_data_${new Date().toISOString().split('T')[0]}.${format}`;
            
            if (format === 'json') {
                content = JSON.stringify(result.data, null, 2);
            } else if (format === 'csv') {
                content = convertToCSV(result.data);
            } else if (format === 'excel') {
                content = JSON.stringify(result.data, null, 2);
            }

            downloadFile(content, filename, format);
        }
    } catch (error) {
        console.error('Export error:', error);
        AppUtils.showToast('Không thể xuất dữ liệu: ' + error.message, 'error');
    } finally {
        AppUtils.hideLoading(loading);
    }
}

function convertToCSV(data) {
    if (!Array.isArray(data) || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csv = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => {
                const value = row[header];
                return typeof value === 'string' && value.includes(',') 
                    ? `"${value}"` 
                    : value;
            }).join(',')
        )
    ];
    
    return csv.join('\n');
}

function downloadFile(content, filename, format) {
    const mimeType = {
        'csv': 'text/csv',
        'json': 'application/json',
        'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }[format] || 'text/plain';

    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// ===== Database Backup =====
function confirmBackup() {
    AppUtils.showModal(
        'Xác nhận sao lưu',
        'Tạo bản sao lưu cơ sở dữ liệu? Quá trình này có thể mất vài phút.',
        backupDatabase
    );
}

async function backupDatabase() {
    const loading = AppUtils.showLoading(document.querySelector('.content'), true);
    
    try {
        const result = await fetch('/api/database/backup', { method: 'POST' })
            .then(r => {
                if (!r.ok) throw new Error('Backup failed');
                return r.json();
            });

        if (result.success) {
            AppUtils.showToast(`Đã tạo backup: ${result.backup_file}`, 'success');
        }
    } catch (error) {
        console.error('Backup error:', error);
        AppUtils.showToast('Không thể tạo backup: ' + error.message, 'error');
    } finally {
        AppUtils.hideLoading(loading);
    }
}

// ===== Data Cleanup =====
function clearAllData() {
    AppUtils.showModal(
        'Xác nhận xóa toàn bộ dữ liệu',
        '⚠️ CẢNH BÁO NGUY HIỂM: Bạn sắp xóa TẤT CẢ dữ liệu trong database. Hành động này KHÔNG THỂ HOÀN TÁC. Nhập "XÁC NHẬN" để tiếp tục.',
        () => {
            const confirm = prompt('Nhập "XÁC NHẬN" để tiếp tục xóa toàn bộ dữ liệu:');
            if (confirm === 'XÁC NHẬN') {
                deleteAllData();
            } else {
                AppUtils.showToast('Hủy xóa dữ liệu', 'info');
            }
        }
    );
}

async function deleteOldData(days) {
    const loading = AppUtils.showLoading(document.querySelector('.content'), true);
    
    try {
        const result = await fetch(`/api/database/delete-old?days=${days}`, { method: 'DELETE' })
            .then(r => {
                if (!r.ok) throw new Error('Delete failed');
                return r.json();
            });

        if (result.success) {
            AppUtils.showToast(`Đã xóa ${result.deleted_records || 0} bản ghi`, 'success');
            currentPage = 0;
            loadTableData();
        }
    } catch (error) {
        console.error('Delete error:', error);
        AppUtils.showToast('Không thể xóa dữ liệu: ' + error.message, 'error');
    } finally {
        AppUtils.hideLoading(loading);
    }
}

// ===== Custom Date Range Delete Functions =====
function initDeleteDateInputs() {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const deleteStartDate = document.getElementById('deleteStartDate');
    const deleteEndDate = document.getElementById('deleteEndDate');
    
    if (deleteStartDate && deleteEndDate) {
        deleteStartDate.value = formatDateTimeLocal(oneWeekAgo);
        deleteEndDate.value = formatDateTimeLocal(now);
        previewDeleteCount();
    }
}

function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function setDeleteQuickRange(range) {
    const now = new Date();
    let startDate, endDate;
    
    switch (range) {
        case 'lastWeek':
            // Tuần trước (7-14 ngày trước)
            endDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
            break;
        case 'lastMonth':
            // Tháng trước (30-60 ngày trước)
            endDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            startDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
            break;
        case 'last3Months':
            // 3 tháng trước (90-180 ngày trước)
            endDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
            break;
        case 'olderThan7Days':
            // Cũ hơn 7 ngày (từ đầu đến 7 ngày trước)
            endDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            startDate = new Date(2020, 0, 1); // Từ 01/01/2020
            break;
        case 'olderThan30Days':
            // Cũ hơn 30 ngày (từ đầu đến 30 ngày trước)
            endDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            startDate = new Date(2020, 0, 1); // Từ 01/01/2020
            break;
        default:
            return;
    }
    
    const deleteStartDate = document.getElementById('deleteStartDate');
    const deleteEndDate = document.getElementById('deleteEndDate');
    
    if (deleteStartDate && deleteEndDate) {
        deleteStartDate.value = formatDateTimeLocal(startDate);
        deleteEndDate.value = formatDateTimeLocal(endDate);
        previewDeleteCount();
    }
}

async function previewDeleteCount() {
    const startDate = document.getElementById('deleteStartDate').value;
    const endDate = document.getElementById('deleteEndDate').value;
    const previewEl = document.getElementById('deletePreviewCount');
    
    if (!startDate || !endDate) {
        previewEl.innerHTML = '<span>⏳ Chọn khoảng thời gian để xem số bản ghi sẽ bị xóa</span>';
        return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
        previewEl.innerHTML = '<span style="color: var(--danger);">⚠️ Ngày bắt đầu phải nhỏ hơn ngày kết thúc</span>';
        return;
    }
    
    previewEl.innerHTML = '<span>⏳ Đang đếm số bản ghi...</span>';
    
    try {
        const response = await fetch(`/api/database/count-range?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`);
        if (!response.ok) throw new Error('Failed to count');
        const data = await response.json();
        
        const count = data.count || 0;
        previewEl.className = 'info-text mt-10 warning';
        previewEl.innerHTML = `<span>⚠️ Sẽ xóa <span class="count">${count.toLocaleString()}</span> bản ghi từ <strong>${formatDisplayDate(start)}</strong> đến <strong>${formatDisplayDate(end)}</strong></span>`;
    } catch (error) {
        console.error('Count error:', error);
        previewEl.innerHTML = '<span style="color: var(--danger);">❌ Không thể đếm số bản ghi</span>';
    }
}

function formatDisplayDate(date) {
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function confirmDeleteByRange() {
    const startDate = document.getElementById('deleteStartDate').value;
    const endDate = document.getElementById('deleteEndDate').value;
    
    if (!startDate || !endDate) {
        AppUtils.showToast('Vui lòng chọn khoảng thời gian', 'warning');
        return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
        AppUtils.showToast('Ngày bắt đầu phải nhỏ hơn ngày kết thúc', 'error');
        return;
    }
    
    AppUtils.showModal(
        'Xác nhận xóa dữ liệu theo khoảng thời gian',
        `⚠️ CẢNH BÁO: Bạn sắp xóa dữ liệu từ <strong>${formatDisplayDate(start)}</strong> đến <strong>${formatDisplayDate(end)}</strong>. Hành động này KHÔNG THỂ HOÀN TÁC. Bạn có chắc chắn?`,
        () => deleteDataByRange(startDate, endDate)
    );
}

async function deleteDataByRange(startDate, endDate) {
    const loading = AppUtils.showLoading(document.querySelector('.content'), true);
    
    try {
        const result = await fetch(`/api/database/delete-range?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`, { 
            method: 'DELETE' 
        }).then(r => {
            if (!r.ok) throw new Error('Delete failed');
            return r.json();
        });

        if (result.success) {
            AppUtils.showToast(`✅ Đã xóa ${result.deleted_records || 0} bản ghi`, 'success');
            currentPage = 0;
            loadTableData();
            
            // Reset form
            document.getElementById('delete7').checked = true;
            document.getElementById('customDateRange').style.display = 'none';
            document.getElementById('btnDeleteByRange').style.display = 'none';
            document.querySelector('.btn-danger[onclick="confirmDelete()"]').style.display = 'inline-block';
        }
    } catch (error) {
        console.error('Delete error:', error);
        AppUtils.showToast('Không thể xóa dữ liệu: ' + error.message, 'error');
    } finally {
        AppUtils.hideLoading(loading);
    }
}

async function deleteAllData() {
    const loading = AppUtils.showLoading(document.querySelector('.content'), true);
    
    try {
        const result = await fetch('/api/database/clear?table=sensor_data&confirm=true', { method: 'DELETE' })
            .then(r => {
                if (!r.ok) throw new Error('Clear failed');
                return r.json();
            });

        if (result.success) {
            AppUtils.showToast('Đã xóa toàn bộ dữ liệu', 'success');
            currentPage = 0;
            loadTableData();
        }
    } catch (error) {
        console.error('Clear error:', error);
        AppUtils.showToast('Không thể xóa dữ liệu: ' + error.message, 'error');
    } finally {
        AppUtils.hideLoading(loading);
    }
}

// ===== Database Optimization =====
function confirmOptimize() {
    AppUtils.showModal(
        'Tối ưu hóa Database',
        'Quá trình tối ưu hóa sẽ tái tổ chức các bảng và index. Bạn có muốn tiếp tục?',
        optimizeDatabase
    );
}

async function optimizeDatabase() {
    const loading = AppUtils.showLoading(document.querySelector('.content'), true);
    
    try {
        const result = await fetch('/api/database/optimize', { method: 'POST' })
            .then(r => {
                if (!r.ok) throw new Error('Optimize failed');
                return r.json();
            });

        if (result.success) {
            AppUtils.showToast(result.message || 'Database đã được tối ưu hóa', 'success');
        }
    } catch (error) {
        console.error('Optimize error:', error);
        AppUtils.showToast('Không thể tối ưu hóa: ' + error.message, 'error');
    } finally {
        AppUtils.hideLoading(loading);
    }
}

// ===== Statistics =====
function showStatistics() {
    AppUtils.showModal(
        'Thống kê Cơ sở dữ liệu',
        'Đang tải dữ liệu thống kê...',
        null
    );

    // Fetch statistics
    fetch('/api/database/statistics')
        .then(r => r.json())
        .then(data => {
            let statsHTML = '<div style="text-align: left; font-size: 14px;">';
            
            if (data.tables) {
                statsHTML += '<h4>📊 Thông tin Bảng:</h4>';
                for (const [tableName, tableInfo] of Object.entries(data.tables)) {
                    statsHTML += `
                        <div style="margin: 10px 0;">
                            <strong>${tableName}:</strong><br/>
                            Số bản ghi: ${tableInfo.row_count || 0}<br/>
                            Dung lượng: ${tableInfo.data_length || '0'} MB<br/>
                            Index: ${tableInfo.index_length || '0'} MB
                        </div>
                    `;
                }
            }
            
            if (data.summary) {
                statsHTML += '<h4>📈 Tóm tắt:</h4>';
                statsHTML += `
                    <div>
                        Tổng dung lượng: ${data.summary.total_size || '0'} MB<br/>
                        Tổng bản ghi: ${data.summary.total_records || 0}<br/>
                        Lần cập nhật cuối: ${data.summary.last_update || '--'}
                    </div>
                `;
            }
            
            statsHTML += '</div>';
            
            // Update modal with stats
            const modalBody = document.getElementById('modalBody');
            if (modalBody) {
                modalBody.innerHTML = statsHTML;
            }
        })
        .catch(error => {
            AppUtils.showToast('Không thể tải thống kê: ' + error.message, 'error');
        });
}
