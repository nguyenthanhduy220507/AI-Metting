# 🔧 FIX SUMMARY - Windows Path Upload Issue

## 🎯 VẤN ĐỀ ĐÃ PHÁT HIỆN:

### **Lỗi 1: Path Double-Escaping**
**Triệu chứng:**
```
Python service error: "Audio path not found"
Request data: "E:\\\\ai-meeting\\\\backend\\\\uploads\\\\..."
```

**Nguyên nhân:**
- Backend tạo Windows path với backslash: `E:\ai-meeting\...`
- Khi serialize JSON qua HTTP, backslash bị escape: `E:\\ai-meeting\\...`
- Axios double-escape: `E:\\\\ai-meeting\\\\...`
- Python nhận path sai, không tìm thấy file

### **Lỗi 2: Service Timing Issue**
**Triệu chứng:**
```
Backend error: ECONNREFUSED ::1:5000
Backend error: ECONNREFUSED 127.0.0.1:5000
```

**Nguyên nhân:**
- Python service mất 20-30 giây để load AI models (WhisperX, Pyannote, ECAPA-TDNN)
- Backend thử connect ngay lập tức, trước khi Python service sẵn sàng
- Không có retry mechanism

---

## ✅ GIẢI PHÁP ĐÃ THỰC HIỆN:

### **1. Path Normalization (Backend)**

**File: `backend/src/jobs/jobs.service.ts`**
```typescript
// Convert Windows backslash to forward slash before sending
const normalizedAudioPath = audioPath.replace(/\\/g, '/');
// Result: E:/ai-meeting/backend/uploads/... ✅
```

**File: `backend/src/workers/segment-processor.worker.ts`**
```typescript
// Same normalization for segment paths
const normalizedSegmentPath = segmentPath.replace(/\\/g, '/');
```

**Lợi ích:**
- ✅ Không có escape issues khi send qua HTTP JSON
- ✅ Cross-platform compatible (Windows, Linux, Mac)
- ✅ Python Path() có thể parse đúng

---

### **2. Path Denormalization (Python Service)**

**File: `python-service-metting/api.py`**
```python
import platform

# Convert forward slash back to backslash on Windows
if platform.system() == "Windows":
    normalized_path = request.audio_path.replace("/", "\\")
else:
    normalized_path = request.audio_path
# Result on Windows: E:\ai-meeting\backend\uploads\... ✅
```

**Lợi ích:**
- ✅ Tự động detect OS
- ✅ Path.exists() hoạt động đúng trên Windows
- ✅ Compatible với cả Unix-like systems

---

### **3. Health Check Endpoint (Python)**

**File: `python-service-metting/api.py`**
```python
@app.get("/health")
async def health_check():
    """Verify service is ready."""
    system_instance = get_system()
    return {
        "status": "healthy",
        "models_loaded": True,
        "enrolled_speakers": len(system_instance.recognizer.get_enrolled_speakers()),
    }
```

**Lợi ích:**
- ✅ Backend có thể check Python service đã sẵn sàng chưa
- ✅ Tránh gọi API khi models đang load
- ✅ Monitoring và debugging dễ dàng

---

### **4. Retry Mechanism với Exponential Backoff (Backend)**

**File: `backend/src/jobs/jobs.service.ts`**
```typescript
private async waitForPythonService(
  pythonServiceUrl: string,
  maxRetries = 5,
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(`${pythonServiceUrl}/health`, {
        timeout: 5000,
      });
      if (response.status === 200) return true;
    } catch (error) {
      const waitTime = Math.min(1000 * Math.pow(2, i), 10000);
      // Wait: 1s, 2s, 4s, 8s, 10s
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
  return false;
}
```

**File: `backend/src/workers/segment-processor.worker.ts`**
```typescript
// Same retry mechanism for workers
private async waitForPythonService(maxRetries = 3): Promise<boolean> {
  // Similar implementation with 3 retries
}
```

**Lợi ích:**
- ✅ Tự động retry khi Python service chưa sẵn sàng
- ✅ Exponential backoff tránh spam requests
- ✅ Graceful handling của startup delays

---

## 🔄 LUỒNG XỬ LÝ MỚI:

```
1. User uploads file via Frontend
   ↓
2. Backend receives file
   ↓
3. Backend saves file: E:\ai-meeting\backend\uploads\xxx\file.m4a
   ↓
4. Backend normalizes path: E:/ai-meeting/backend/uploads/xxx/file.m4a
   ↓
5. Backend checks Python service health (with retries)
   ↓
   ├─ Not ready → Wait (1s, 2s, 4s, 8s, 10s) → Retry
   └─ Ready → Continue
   ↓
6. Backend sends normalized path to Python service
   ↓
7. Python denormalizes path: E:\ai-meeting\backend\uploads\xxx\file.m4a
   ↓
8. Python verifies file exists ✅
   ↓
9. Python processes file (transcribe, diarize, identify, summarize)
   ↓
10. Python sends results back to Backend via callback
   ↓
11. Backend updates meeting status: COMPLETED ✅
```

---

## 📝 DEBUG LOGS THÊM VÀO:

### Backend:
- `[DEBUG] Original path:` - Path gốc từ storage
- `[DEBUG] Normalized path:` - Path sau normalization
- `[DEBUG] Waiting for Python service to be ready...` - Bắt đầu health check
- `[SUCCESS] Python service is healthy:` - Health check thành công
- `[WARN] Python service not ready yet (attempt X/Y)` - Đang retry

### Python Service:
- `[DEBUG] Original path:` - Path nhận từ backend
- `[DEBUG] Normalized path:` - Path sau denormalization
- `[DEBUG] Path exists:` - Kết quả check file tồn tại

---

## 🧪 TESTING CHECKLIST:

- [ ] Test upload file < 10 minutes (direct processing)
- [ ] Test upload file > 10 minutes (segmentation)
- [ ] Test với file .m4a, .wav, .mp3
- [ ] Test upload khi Python service chưa start (should retry and succeed)
- [ ] Test upload khi Python service đang load models (should wait)
- [ ] Verify path trong log: `E:/...` không phải `E:\\\\...`
- [ ] Verify meeting status: PROCESSING → COMPLETED
- [ ] Verify transcript và summary được tạo

---

## 🚀 CÁCH VERIFY FIX:

### 1. Restart Services:
```bash
# Terminal 14: Python service
cd python-service-metting
.\venv\Scripts\activate
uvicorn api:app --host 0.0.0.0 --port 5000 --reload

# Terminal 3: Backend
cd backend
npm run start:dev
```

### 2. Run Test Script:
```powershell
.\test-upload.ps1
```

### 3. Upload File:
- Qua Frontend: http://localhost:4000
- Hoặc qua API test script: `.\test-upload-api.ps1`

### 4. Monitor Logs:
- Terminal 3: Backend logs
- Terminal 14: Python logs
- Tìm `[DEBUG]` lines để verify path normalization

### 5. Check Result:
```bash
# Get meeting status
curl http://localhost:3333/meetings/{meeting_id}

# Should show:
# - status: "COMPLETED"
# - rawTranscript: [...]
# - summary: "..."
```

---

## 🎯 KẾT QUẢ MONG ĐỢI:

### Backend Log:
```
[DEBUG] File is short (X.XX min), skipping segmentation
[DEBUG] Original path: E:\ai-meeting\backend\uploads\xxx\file.m4a
[DEBUG] Normalized path: E:/ai-meeting/backend/uploads/xxx/file.m4a
[DEBUG] Waiting for Python service to be ready...
[SUCCESS] Python service is healthy: {"status":"healthy","models_loaded":true,"enrolled_speakers":7}
[DEBUG] Calling Python service /process endpoint
[SUCCESS] Direct processing job queued: queued
```

### Python Log:
```
[DEBUG] Original path: E:/ai-meeting/backend/uploads/xxx/file.m4a
[DEBUG] Normalized path: E:\ai-meeting\backend\uploads\xxx\file.m4a
[DEBUG] Path exists: True
INFO:     127.0.0.1:xxxxx - "POST /process HTTP/1.1" 200 OK
[STEP 1] Normalizing audio...
[STEP 2] Enrolling speakers...
[STEP 3] Transcribing audio...
[STEP 4] Diarizing speakers...
[STEP 5] Merging and identifying speakers...
[STEP 6] Generating meeting summary...
[OK] Processing complete!
```

---

## 🔧 TROUBLESHOOTING:

### Nếu vẫn lỗi "Audio path not found":
1. Check path trong log có đúng format `E:/...` không
2. Verify file tồn tại: `Test-Path "E:\..."`
3. Check Python service có quyền read file không

### Nếu vẫn lỗi "ECONNREFUSED":
1. Verify Python service đã start xong: `curl http://localhost:5000/health`
2. Check port 5000: `netstat -ano | findstr :5000`
3. Tăng retry count trong `waitForPythonService()` nếu máy chậm

### Nếu upload thành công nhưng không có kết quả:
1. Check callback token match giữa backend và Python
2. Check callback URL đúng không
3. Xem Python log có error không

