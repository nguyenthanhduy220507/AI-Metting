# Hướng dẫn Test và Debug

## Vấn đề hiện tại
- Jobs được tạo trong queue nhưng worker không xử lý
- Cần kiểm tra logs để xác định vấn đề

## Các bước test

### 1. Khởi động services

**Terminal 1 - Python Service:**
```bash
cd python-service
venv\Scripts\activate
uvicorn api:app --host 0.0.0.0 --port 5000
```

**Terminal 2 - Backend API:**
```bash
cd backend
npm run start:dev
```

**Terminal 3 - Worker:**
```bash
cd backend
npm run start:worker
```

### 2. Kiểm tra Redis
```bash
docker compose ps
# Đảm bảo redis container đang chạy
```

### 3. Test với file f.mp4

**Cách 1: Sử dụng PowerShell script (Khuyến nghị):**
```powershell
# Từ thư mục root của project
.\test-upload.ps1 -file "python-service\f.mp4" -title "Test f.mp4"
```

**Cách 2: Sử dụng Postman:**
- Method: POST
- URL: `http://localhost:3333/meetings`
- Body: form-data
  - `file`: Chọn file `python-service/f.mp4`
  - `title`: "Test f.mp4"
  - `description`: "Test segmentation"

**Cách 3: Sử dụng curl (nếu có):**
```bash
curl -X POST http://localhost:3333/meetings \
  -F "file=@python-service/f.mp4" \
  -F "title=Test f.mp4" \
  -F "description=Test segmentation"
```

### 4. Xem logs

**Backend logs sẽ hiển thị:**
- `[DEBUG] Starting processing job for meeting ...`
- `[DEBUG] Audio segmented into X segments`
- `[DEBUG] Segment X job added with ID: ...`
- `[TEMP_DEBUG] Queue status - Waiting: X, Active: Y`

**Worker logs sẽ hiển thị:**
- `[TEMP_DEBUG] SegmentProcessorWorker received job: ...`
- `[DEBUG] Processing segment X for meeting ...`
- `[DEBUG] Calling Python service: ...`

**Python service logs sẽ hiển thị:**
- `[DEBUG] Received process-segment request:`
- `[DEBUG] Starting segment processing for meeting ...`

### 5. Kiểm tra queue status (Tùy chọn)

Nếu cần kiểm tra queue trực tiếp, có thể dùng Redis CLI:
```bash
docker exec -it meeting-notes-redis redis-cli
# Sau đó trong redis-cli:
KEYS bull:audio-processing:*
LLEN bull:audio-processing:wait
LLEN bull:audio-processing:active
```

### 6. Nếu jobs không được xử lý

1. Kiểm tra Redis connection:
   - Backend và Worker phải dùng cùng Redis host/port
   - Kiểm tra trong `.env` file

2. Kiểm tra queue name:
   - Phải là `audio-processing` (xem `AUDIO_PROCESSING_QUEUE`)

3. Kiểm tra worker đang chạy:
   - Worker phải log `[INIT] SegmentProcessorWorker initialized`
   - Worker phải log `[TEMP_DEBUG] SegmentProcessorWorker received job` khi có job

4. Xóa jobs cũ nếu cần:
   ```bash
   redis-cli
   FLUSHDB
   ```

### 7. Test với file lớn (metting.mkv)

Sau khi test f.mp4 thành công, test với metting.mkv:
```powershell
.\test-upload.ps1 -file "python-service\metting.mkv" -title "Test metting.mkv" -description "Test long video"
```

**Lưu ý:** File này lớn hơn, sẽ mất nhiều thời gian hơn để xử lý. Kiểm tra logs để theo dõi tiến độ.

## Debug logs

Tất cả logs có prefix `[TEMP_DEBUG]` sẽ được xóa sau khi fix xong.

## Expected flow

1. Upload file → Backend tạo meeting và segment audio
2. Backend tạo jobs trong queue
3. Worker nhận jobs và gọi Python service
4. Python service xử lý segment và callback về Backend
5. Backend merge segments và generate summary
6. Meeting status = COMPLETED

