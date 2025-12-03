# HƯỚNG DẪN NHANH CHO MÁY KHÁC

**Chỉ cần 5 phút để có hệ thống đầy đủ tính năng!**

---

## ✅ Yêu cầu

- Docker Desktop (BẮT BUỘC)
- Hugging Face Token
- Google API Key

**Không cần:**
- ❌ PostgreSQL local
- ❌ Redis local
- ❌ pgAdmin local
- ❌ Node.js
- ❌ Python

---

## 🚀 4 BƯỚC ĐƠN GIẢN

### Bước 1: Clone Repository

```bash
git clone https://github.com/nguyenthanhduy220507/AI-Metting.git
cd AI-Metting
```

### Bước 2: Tạo file .env.production

**Windows PowerShell:**
```powershell
@"
DOCKER_USERNAME=nguyenthanhduyznake
PYTHON_SERVICE_CALLBACK_TOKEN=73755272400664530092426538745578
HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxx
GOOGLE_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxx
POSTGRES_USER=meeting
POSTGRES_PASSWORD=meeting
POSTGRES_DB=meeting_notes
"@ | Out-File -FilePath .env.production -Encoding utf8
```

**Thay thế:**
- `hf_xxxxx` → Hugging Face token của bạn (https://huggingface.co/settings/tokens)
- `AIzaSyxxxx` → Google API key của bạn (https://makersuite.google.com/app/apikey)

### Bước 3: Chạy script tự động (Khuyến nghị)

```powershell
.\quick-deploy.ps1
```

Script sẽ tự động:
- Pull images từ Docker Hub
- Start tất cả containers
- Kiểm tra status
- Test endpoints

**HOẶC** chạy thủ công:

```bash
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d
```

### Bước 4: Đợi và truy cập

Đợi **30 giây** để containers khởi động, sau đó:

- **Frontend (Next.js)**: http://localhost
- **Dashboard (React)**: http://localhost:4000 ← **Giao diện chính, đầy đủ tính năng**
- **Backend API**: http://localhost:3333
- **pgAdmin**: http://localhost:5050 (admin@admin.com / admin)

---

## 🎯 Có gì trong hệ thống?

### Containers (8 total)
1. PostgreSQL - Database với 3 sample speakers có sẵn
2. Redis - Queue system
3. pgAdmin - Database management
4. Backend API - NestJS (port 3333)
5. Backend Worker - Xử lý audio jobs
6. Python Service - AI processing (WhisperX, Pyannote, Gemini)
7. Frontend Next.js - Giao diện hiện đại (port 80)
8. Dashboard React - Giao diện quản lý đầy đủ (port 4000)

### Sample Data
- ✅ 3 speakers: Nguyễn Văn A, Trần Thị B, Lê Văn C
- ✅ Metadata cho 6 speaker samples
- ✅ Database đã setup sẵn

---

## 🔧 Quản lý

### Xem logs
```bash
docker compose -f docker-compose.production.yml logs -f
```

### Dừng hệ thống
```bash
docker compose -f docker-compose.production.yml down
```

### Khởi động lại
```bash
docker compose -f docker-compose.production.yml up -d
```

### Restart một service
```bash
docker compose -f docker-compose.production.yml restart backend
```

---

## ❓ Troubleshooting

### Port đã được sử dụng

**Lỗi**: `bind: Only one usage of each socket address`

**Fix**: Dừng service đang dùng port hoặc thay đổi port trong .env.production:
```env
POSTGRES_PORT=5433
REDIS_PORT=6380
```

### Container không start

```bash
# Xem logs
docker compose -f docker-compose.production.yml logs

# Xem logs của một service
docker compose -f docker-compose.production.yml logs backend
```

### Frontend lỗi "Application error"

Chờ thêm 30 giây và refresh browser. Next.js cần thời gian khởi động.

### Upload audio thất bại

Kiểm tra:
1. Backend worker đang chạy: `docker compose -f docker-compose.production.yml logs backend-worker`
2. Python service đang chạy: `docker compose -f docker-compose.production.yml logs python-service`
3. Redis connection OK

---

## 🎉 Xong!

Sau khi chạy xong, bạn có:
- ✅ Hệ thống AI Meeting đầy đủ
- ✅ Upload và xử lý audio
- ✅ Speaker diarization và recognition
- ✅ Auto summary generation
- ✅ 2 giao diện web
- ✅ Database management

**Tất cả chỉ với Docker Desktop!**

---

## 📞 Hỗ trợ

- GitHub: https://github.com/nguyenthanhduy220507/AI-Metting
- Issues: https://github.com/nguyenthanhduy220507/AI-Metting/issues

