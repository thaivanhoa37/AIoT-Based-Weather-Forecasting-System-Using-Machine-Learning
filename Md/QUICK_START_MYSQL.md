# 📚 Hướng dẫn Nhanh - Quản lý Dữ liệu MySQL

## 🎯 Tính năng có sẵn

### 1. Xem & Lọc Dữ liệu
```
• Lọc theo thời gian: Hôm nay | 24 giờ | 7 ngày | Tất cả
• Lọc theo Node: Node 1 | Node 2 | Tất cả
• Tìm kiếm: Nhập ID hoặc thời gian, nhấn Enter
• Phân trang: Xem 50 bản ghi/trang
```

### 2. Xuất Dữ liệu 📊
```
Nhấn: "Xuất dữ liệu" → Chọn định dạng:
  • CSV (Comma-separated values)
  • JSON (Định dạng JSON)
  • Excel (Tệp Excel)
→ Tệp tự động tải xuống
```

### 3. Sao Lưu Database 💾
```
Nhấn: "Sao lưu" → Xác nhận → 
Backup file sẽ được tạo với timestamp
Ví dụ: backup_20250108_143022.sql
```

### 4. Xóa Dữ liệu Cũ 🗑️
```
Chọn khoảng thời gian:
  ☐ 7 ngày
  ☐ 30 ngày  
  ☐ 90 ngày
Nhấn: "Xóa dữ liệu cũ"
→ Xác nhận → Xóa hoàn tất
```

### 5. Xóa Toàn bộ Dữ liệu ⚠️
```
Nhấn: "Xóa tất cả dữ liệu"
→ Modal yêu cầu xác nhận
→ Nhập: "XÁC NHẬN"
→ Tất cả dữ liệu sẽ bị xóa vĩnh viễn
```

### 6. Tối ưu hóa Database 🔧
```
Nhấn: "Tối ưu" 
→ Xác nhận
→ Tái tổ chức bảng & index
→ Hoàn tất
```

### 7. Xem Thống kê 📈
```
Nhấn: "Xem"
→ Modal hiển thị:
  - Số bản ghi từng bảng
  - Dung lượng dữ liệu
  - Thời gian cập nhật cuối
```

## 🔄 Tự động làm mới

- Trang tự động cập nhật mỗi 15 giây
- Bạn có thể thay đổi bộ lọc bất kỳ lúc nào
- Phân trang sẽ reset khi đổi bộ lọc

## ⚠️ Cảnh báo bảo mật

- ❌ Xóa dữ liệu **KHÔNG THỂ HOÀN TÁC**
- ✅ Luôn sao lưu trước khi xóa
- ✅ Kiểm tra bộ lọc trước khi xóa
- ✅ Xác nhận 2 lần cho các thao tác nguy hiểm

## 📊 Chỉ thị AQI

```
AQI ≤ 50     → 🟢 Tốt (Thoải mái)
AQI 51-100   → 🟡 Chấp nhận được (Bình thường)
AQI 101-150  → 🟠 Nhạy cảm (Có hại cho nhóm nhạy cảm)
AQI 151-200  → 🔴 Không lành mạnh (Có hại cho sức khỏe)
AQI 201-300  → 🟣 Rất không lành mạnh (Rất có hại)
AQI > 300    → 🟤 Nguy hiểm (Khủng khiếp)
```

## 🎮 Nút bấm nhanh

| Nút | Chức năng | Nguy hiểm? |
|-----|-----------|-----------|
| 🔍 Làm mới | Tải lại dữ liệu | ❌ |
| 📊 Xuất | Tải xuống dữ liệu | ❌ |
| 💾 Sao lưu | Tạo backup | ❌ |
| 🔧 Tối ưu | Tối ưu hóa | ❌ |
| 📈 Thống kê | Xem chi tiết | ❌ |
| 🗑️ Xóa cũ | Xóa dữ liệu cũ | ⚠️ |
| 🗑️ Xóa tất cả | Xóa mọi dữ liệu | 🔴 |

## 🛠️ Khắc phục sự cố

### Không thể tải dữ liệu?
```
→ Kiểm tra kết nối Internet
→ Kiểm tra Server PHP-MySQL
→ Xem console (F12) để lỗi chi tiết
```

### Export không hoạt động?
```
→ Kiểm tra quyền ghi tệp
→ Thử format khác (CSV → JSON)
→ Reload trang & thử lại
```

### Không thể xóa?
```
→ Kiểm tra kết nối database
→ Kiểm tra quyền delete
→ Thử backup & xóa cũ trước
```

## 💡 Mẹo & Thủ thuật

1. **Trước khi xóa lớn**: Luôn sao lưu trước
2. **Xuất định kỳ**: Xuất dữ liệu hàng tuần
3. **Dọn dẹp**: Xóa dữ liệu > 90 ngày hàng tháng
4. **Tối ưu**: Tối ưu database hàng quý
5. **Giám sát**: Kiểm tra AQI và thống kê hàng ngày

## 📞 Hỗ trợ

Nếu gặp vấn đề:
1. Kiểm tra lại các bước
2. Xem tab "Console" (F12)
3. Kiểm tra logs server
4. Liên hệ quản trị viên hệ thống
