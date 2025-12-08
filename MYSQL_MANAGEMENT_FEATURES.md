# Tính năng quản lý dữ liệu MySQL - Nâng cấp đầy đủ

## Tóm tắt những cải tiến

Trang **Quản lý dữ liệu MySQL** đã được nâng cấp với những tính năng quản lý dữ liệu toàn diện:

### 🎨 Giao diện người dùng (mysql.html)

1. **Bảng tóm tắt cơ sở dữ liệu**
   - Tổng số bản ghi
   - Dung lượng ước tính
   - Thông tin bản ghi mới nhất

2. **Bộ lọc & Tìm kiếm nâng cao**
   - Lọc theo khoảng thời gian: Hôm nay / 24 giờ / 7 ngày / Tất cả
   - Lọc theo Node (Node 1, Node 2, etc.)
   - Tìm kiếm theo ID hoặc thời gian

3. **Bảng dữ liệu tương tác**
   - Hiển thị 50 bản ghi trên một trang
   - Phân trang đơn giản (Trước / Sau)
   - Thông tin AQI với mã màu chỉ thị mức độ chất lượng không khí

4. **Công cụ quản lý dữ liệu** (4 thẻ công cụ)
   - **📊 Xuất dữ liệu**: Hỗ trợ CSV, JSON, Excel
   - **💾 Sao lưu**: Tạo bản sao lưu cơ sở dữ liệu
   - **🔧 Tối ưu hóa**: Tái tổ chức bảng và index
   - **📈 Thống kê**: Xem chi tiết thống kê database

5. **Dọn dẹp dữ liệu**
   - Xóa dữ liệu cũ (7/30/90 ngày)
   - Xóa toàn bộ dữ liệu (với xác nhận 2 lần)

### 💻 JavaScript (mysql.js)

Các hàm chức năng chính:

#### Tải dữ liệu & Hiển thị
- `loadTableData()` - Tải dữ liệu từ API
- `fetchMySQLTableData()` - Lấy dữ liệu từ server
- `updateDatabaseSummary()` - Cập nhật thống kê
- `updateDataTable()` - Cập nhật bảng với hiệu ứng fade
- `formatDateTime()` - Định dạng thời gian theo chuẩn VN

#### Bộ lọc & Tìm kiếm
- `setTimeFilter()` - Đặt bộ lọc thời gian
- `searchData()` - Tìm kiếm dữ liệu
- Hỗ trợ node filter

#### Xuất dữ liệu
- `showExportDialog()` - Hiển thị hộp thoại chọn định dạng
- `exportDatabase()` - Xuất dữ liệu
- `convertToCSV()` - Chuyển đổi sang CSV
- `downloadFile()` - Tải xuống tệp

#### Sao lưu & Dọn dẹp
- `confirmBackup()` - Xác nhận sao lưu
- `backupDatabase()` - Tạo backup
- `confirmDelete()` - Xác nhận xóa dữ liệu cũ
- `clearAllData()` - Xóa toàn bộ dữ liệu
- `deleteOldData()` - Xóa dữ liệu theo số ngày
- `deleteAllData()` - Xóa tất cả

#### Tối ưu hóa & Thống kê
- `confirmOptimize()` - Xác nhận tối ưu hóa
- `optimizeDatabase()` - Tối ưu database
- `showStatistics()` - Hiển thị thống kê chi tiết

#### Hỗ trợ AQI
- `getAQILevel()` - Phân loại chất lượng không khí theo AQI

### 🔌 API Endpoints (api.py)

Các endpoint mới được thêm vào:

1. **DELETE /api/database/delete-old**
   - Tham số: `days` (1-365)
   - Xóa dữ liệu cũ hơn số ngày chỉ định
   - Trả về số bản ghi đã xóa

2. **POST /api/database/optimize**
   - Tối ưu hóa bảng và index
   - Hỗ trợ tất cả các loại database

3. **GET /api/database/statistics**
   - Lấy thống kê chi tiết:
     - Số bản ghi từng bảng
     - Dung lượng dữ liệu
     - Dung lượng index
     - Thời gian cập nhật cuối cùng

### 🎯 Tính năng chính

| Tính năng | Mô tả | Trạng thái |
|----------|-------|-----------|
| Xem dữ liệu | Hiển thị danh sách bản ghi với phân trang | ✅ |
| Lọc dữ liệu | Lọc theo thời gian, node | ✅ |
| Tìm kiếm | Tìm kiếm nhanh | ✅ |
| Xuất dữ liệu | CSV, JSON, Excel | ✅ |
| Sao lưu | Backup cơ sở dữ liệu | ✅ |
| Xóa dữ liệu | Xóa dữ liệu cũ hoặc tất cả | ✅ |
| Tối ưu hóa | Tối ưu bảng & index | ✅ |
| Thống kê | Xem chi tiết thống kê | ✅ |
| Xác nhận | Xác nhận 2 lần cho hành động nguy hiểm | ✅ |
| Thông báo | Toast notifications cho phản hồi người dùng | ✅ |

### 🔒 Bảo mật

- Yêu cầu xác nhận 2 lần trước khi xóa dữ liệu
- Nhập "XÁC NHẬN" để xóa toàn bộ dữ liệu
- Các thao tác nguy hiểm có cảnh báo rõ ràng
- Validation input từ phía client

### 📊 Hiệu suất

- Auto-refresh mỗi 15 giây
- Fade animation khi cập nhật bảng
- Prevent concurrent updates
- Staggered row animation
- Smooth value transitions

### 🎨 Giao diện & Trải nghiệm

- Hỗ trợ Dark Mode
- Responsive design (grid layout tự động)
- AQI color-coding (Tốt/Chấp nhận/Nhạy cảm/Không lành mạnh)
- Loading indicators
- Error handling
- Toast notifications
- Modal confirmations

### 📝 Định dạng & Chuẩn

- Ngôn ngữ: Tiếng Việt (vi-VN)
- Định dạng ngày/giờ: DD/MM/YYYY HH:MM:SS
- Thập phân: 1 chữ số cho nhiệt độ/độ ẩm/bụi, 0 cho CO2
- Số phân cách hàng: Locale VN

### 🚀 Cách sử dụng

#### Xem dữ liệu
1. Vào trang "Quản lý dữ liệu MySQL"
2. Chọn bộ lọc thời gian (Hôm nay, 24h, 7 ngày, Tất cả)
3. Chọn Node từ dropdown
4. Sử dụng phân trang để duyệt dữ liệu

#### Xuất dữ liệu
1. Nhấn nút "Xuất dữ liệu"
2. Chọn định dạng (CSV, JSON, Excel)
3. Tệp sẽ tự động tải xuống

#### Sao lưu Database
1. Nhấn nút "Sao lưu"
2. Xác nhận
3. Backup sẽ được tạo với tên có chứa timestamp

#### Xóa dữ liệu cũ
1. Chọn khoảng thời gian (7/30/90 ngày)
2. Nhấn "Xóa dữ liệu cũ"
3. Xác nhận trong modal
4. Dữ liệu sẽ bị xóa

#### Xóa toàn bộ dữ liệu
1. Nhấn nút "Xóa tất cả dữ liệu"
2. Xác nhận lần 1 trong modal
3. Nhập "XÁC NHẬN" khi được yêu cầu
4. Toàn bộ dữ liệu sẽ bị xóa vĩnh viễn

#### Tối ưu hóa Database
1. Nhấn nút "Tối ưu"
2. Xác nhận
3. Database sẽ được tối ưu hóa

#### Xem Thống kê
1. Nhấn nút "Xem"
2. Modal sẽ hiển thị:
   - Thông tin chi tiết từng bảng
   - Tổng số bản ghi
   - Thời gian cập nhật cuối

### 📦 Tệp được cập nhật

1. `/templates/mysql.html` - Giao diện người dùng
2. `/static/js/mysql.js` - Logic ứng dụng
3. `/routes/api.py` - API endpoints

### ✅ Kiểm tra chất lượng

- ✅ Kiểm tra syntax Python (api.py)
- ✅ Kiểm tra syntax JavaScript (mysql.js)
- ✅ Kiểm tra cấu trúc HTML (mysql.html)

Tất cả các tệp đều có syntax hợp lệ và sẵn sàng sử dụng!
