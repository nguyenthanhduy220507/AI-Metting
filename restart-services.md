# 🔄 HƯỚNG DẪN RESTART SERVICES

## ✅ Code đã được fix:

### Backend (NestJS):
1. ✅ `jobs.service.ts` - Path normalization + Health check với retry
2. ✅ `segment-processor.worker.ts` - Path normalization + Health check với retry

### Python Service:
1. ✅ `api.py` - Path normalization (Windows-aware) + Health check endpoint

---

## 📋 BƯỚC RESTART:

### **Terminal 14 (Python Service):**
```bash
# 1. Nếu đang chạy: Ctrl+C để dừng
# 2. Start lại:
cd python-service-metting
.\venv\Scripts\activate
uvicorn api:app --host 0.0.0.0 --port 5000 --reload
# 3. Đợi thấy: "Application startup complete"
```

### **Terminal 3 (Backend):**
```bash
# 1. Nếu đang chạy: Ctrl+C để dừng
# 2. Start lại:
cd backend
npm run start:dev
# 3. Đợi thấy: "Nest application successfully started"
```

### **Worker (nếu có chạy riêng):**
```bash
cd backend
npm run start:worker
```

---

## 🧪 TEST UPLOAD:

### Cách 1: Upload qua Frontend
1. Mở: http://localhost:4000
2. Upload file audio
3. Xem log trong Terminal 3 và 14

### Cách 2: Upload qua API (PowerShell)
```powershell
# Test với file audio có sẵn
$testFile = "E:\ai-meeting\python-service-metting\speaker_samples\duc.wav"

$headers = @{
    "Content-Type" = "multipart/form-data"
}

# Sử dụng curl.exe (không phải PowerShell alias)
curl.exe -X POST http://localhost:3333/meetings `
  -F "file=@$testFile" `
  -F "title=Test Upload - Path Fix" `
  -F "description=Testing Windows path normalization"
```

---

## 📊 LOG CẦN QUAN SÁT:

### Backend (Terminal 3):
```
[DEBUG] Original path: E:\ai-meeting\backend\uploads\...
[DEBUG] Normalized path: E:/ai-meeting/backend/uploads/...
[DEBUG] Waiting for Python service to be ready...
[SUCCESS] Python service is healthy: {"status":"healthy",...}
[SUCCESS] Direct processing job queued: queued
```

### Python Service (Terminal 14):
```
[DEBUG] Original path: E:/ai-meeting/backend/uploads/...
[DEBUG] Normalized path: E:\ai-meeting\backend\uploads\...
[DEBUG] Path exists: True
INFO:     127.0.0.1:xxxxx - "POST /process HTTP/1.1" 200 OK
```

---

## ✅ KẾT QUẢ MONG ĐỢI:

1. ✅ File được upload thành công
2. ✅ Path được normalize đúng (backslash → forward slash)
3. ✅ Python service nhận và xử lý file
4. ✅ Meeting status chuyển từ PROCESSING → COMPLETED
5. ✅ Transcript và summary được tạo ra

---

## 🐛 NẾU VẪN CÓ LỖI:

Gửi cho tôi:
1. Log từ Terminal 3 (Backend)
2. Log từ Terminal 14 (Python)
3. Screenshot lỗi trên frontend (nếu có)

