# 🛡️ Hướng dẫn Backup cho GitHub Pages (IndexedDB)

## 🔍 **Đặc điểm IndexedDB trên GitHub Pages**

Ứng dụng hiện tại sử dụng **IndexedDB** thay vì localStorage, có những ưu điểm:

### **✅ Ưu điểm IndexedDB:**
- 📊 **Dung lượng lớn hơn** localStorage (thường 50MB-1GB)
- 🔄 **Không mất** khi F5 refresh trang
- 💾 **Lưu trữ ổn định** hơn localStorage
- 🏗️ **Cấu trúc database** chuyên nghiệp

### **⚠️ Vẫn có rủi ro:**
- 🧹 **Người dùng xóa** storage của trình duyệt
- 🔒 **Chế độ riêng tư** (incognito) không lưu được
- 💻 **Chuyển thiết bị** cần export/import
- 🌐 **Thay đổi domain** GitHub Pages

## ✅ **Giải pháp đã triển khai**

### **1. Hệ thống Auto-Backup IndexedDB**

#### **Tự động backup:**
- ⏰ **Mỗi 10 phút** khi ứng dụng đang chạy
- 🚪 **Khi thoát trang** (beforeunload event)
- 💾 **Lưu trong IndexedDB** (không mất khi F5)

#### **Cơ chế lưu trữ:**
- 🏗️ **Backup trong IndexedDB** với timestamp
- 🔄 **Giữ 5 backup auto** gần nhất (tự động xóa cũ)
- 📝 **Mô tả backup:** "Auto-backup [ngày giờ]"
- 🎯 **Backup thủ công** với mô tả tùy chỉnh

### **2. Backup Management**

#### **Xem danh sách backup:**
- 📋 **Tab Sao lưu** hiển thị tất cả backup
- 📅 **Thời gian** tạo backup
- 📝 **Mô tả** backup (auto hoặc thủ công)
- 🔧 **Thao tác:** Khôi phục, Xóa

#### **Khôi phục backup:**
- ✅ **Chọn backup** từ danh sách
- ⚠️ **Xác nhận** ghi đè dữ liệu hiện tại
- 🔄 **Tự động reload** giao diện

### **3. Backup File thủ công**

#### **Tải file backup:**
- 📁 **Xuất file .json** với tất cả dữ liệu IndexedDB
- 📅 **Tên file:** `vocabulary-indexeddb-backup-2024-01-15.json`
- 💾 **Có thể lưu** vào Google Drive, Dropbox, OneDrive
- 🏷️ **Metadata:** Bao gồm storageType: "IndexedDB"

#### **Nhập file backup:**
- 📂 **Chọn file .json** đã xuất trước đó
- ✅ **Xác nhận** trước khi thay thế dữ liệu IndexedDB
- 💾 **Tự động lưu** vào IndexedDB sau khi nhập
- 🔄 **Reload giao diện** với dữ liệu mới

## 🎯 **Cách sử dụng**

### **Truy cập tab Sao lưu:**
1. Mở ứng dụng
2. Click tab **"🛡️ Sao lưu"**
3. Xem các tùy chọn backup

### **Backup thủ công:**
1. Click **"📁 Tải file backup (.json)"**
2. File sẽ được tải về máy
3. Lưu file này ở nơi an toàn

### **Khôi phục từ file:**
1. Click **"📂 Nhập từ file backup (.json)"**
2. Chọn file backup đã lưu
3. Xác nhận thay thế dữ liệu

### **Kiểm tra trạng thái:**
- ✅ **Auto-backup status** hiển thị trong tab Sao lưu
- 🔄 **"IndexedDB auto-backup mỗi 10 phút"** = đang hoạt động
- 🛡️ **Danh sách backup** hiển thị tất cả backup có sẵn
- 📊 **Storage info** hiển thị dung lượng IndexedDB

## 🚀 **Khuyến nghị sử dụng**

### **Cho người dùng thường xuyên:**
1. 📱 **Để auto-backup chạy** (không cần làm gì)
2. 📁 **Tải file backup** 1 tuần/lần để dự phòng
3. 📧 **Gửi file backup** qua email cho bản thân

### **Cho dữ liệu quan trọng:**
1. 💾 **Backup file** sau mỗi session học
2. ☁️ **Upload lên cloud** (Google Drive, OneDrive)
3. 📱 **Backup trên nhiều thiết bị**

### **Khi chuyển thiết bị:**
1. 📁 **Xuất file backup** từ thiết bị cũ
2. 📂 **Nhập file** vào thiết bị mới
3. ✅ **Kiểm tra** dữ liệu đã đầy đủ

## 🔧 **Xử lý sự cố**

### **Mất dữ liệu:**
1. 🔄 **F5 refresh** trang - auto-restore sẽ chạy
2. 📂 **Nhập file backup** nếu có
3. 🆘 **Liên hệ hỗ trợ** nếu vẫn mất

### **Backup không hoạt động:**
1. 🔍 **Kiểm tra console** (F12 → Console)
2. 🧹 **Xóa cache** trình duyệt
3. 🔄 **Tải lại** trang

### **File backup lỗi:**
1. ✅ **Kiểm tra** file có đúng định dạng .json
2. 📝 **Mở file** bằng text editor xem có hợp lệ
3. 🔄 **Thử file backup** khác

## 📊 **Thống kê Backup**

Hệ thống sẽ tự động:
- 📈 **Theo dõi** số lần backup
- ⏱️ **Ghi nhận** thời gian backup gần nhất
- 🔍 **Phát hiện** và báo lỗi backup
- 📊 **Hiển thị** trạng thái trong console

## 🎉 **Kết luận**

Với hệ thống backup này, dữ liệu của bạn sẽ được bảo vệ tối đa trên GitHub Pages:

- ✅ **Auto-backup** liên tục
- 🛡️ **Nhiều lớp bảo vệ** (5 slots + file backup)
- 🔄 **Tự động khôi phục** khi cần
- 📁 **Backup file** để dự phòng lâu dài

**💡 Tip:** Hãy tải file backup định kỳ để có bản sao lưu ngoài trình duyệt! 