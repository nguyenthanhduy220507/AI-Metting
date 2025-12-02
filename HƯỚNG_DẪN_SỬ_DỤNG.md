# HƯỚNG DẪN SỬ DỤNG - AI MEETING NOTES PLATFORM

**Chỉ cần Docker Desktop - KHÔNG cần cài đặt gì khác!**

---

## ⚡ QUICK START (3 BƯỚC)

### Bước 1: Cài Docker Desktop

Tải và cài đặt: https://www.docker.com/products/docker-desktop

### Bước 2: Clone Repository

```bash
git clone https://github.com/nguyenthanhduy220507/AI-Metting.git
cd AI-Metting
```

### Bước 3: Tạo file cấu hình

**Windows PowerShell:**
```powershell
@"
DOCKER_USERNAME=nguyenthanhduyznake
PYTHON_SERVICE_CALLBACK_TOKEN=my-secret-token-123
HF_TOKEN=hf_your_token_here
GOOGLE_API_KEY=your_google_key_here
"@ | Out-File -FilePath .env.production -Encoding utf8
```

**Linux/Mac:**
```bash
cat > .env.production << 'EOF'
DOCKER_USERNAME=nguyenthanhduyznake
PYTHON_SERVICE_CALLBACK_TOKEN=my-secret-token-123
HF_TOKEN=hf_your_token_here
GOOGLE_API_KEY=your_google_key_here
EOF
```

**Lấy API Keys:**
- 🔑 Hugging Face Token: https://huggingface.co/settings/tokens
- 🔑 Google API Key: https://makersuite.google.com/app/apikey

### Bước 4: Chạy hệ thống

```bash
# Pull images từ Docker Hub
docker compose -f docker-compose.production.yml pull

# Khởi động tất cả services
docker compose -f docker-compose.production.yml up -d
```

**Chờ 2-3 phút** để containers khởi động lần đầu.

### Bước 5: Truy cập

- ✅ **Frontend (Next.js)**: http://localhost - **Giao diện chính**
- ✅ **Dashboard (React)**: http://localhost:4000 - **Giao diện quản lý chi tiết**
- ✅ **pgAdmin**: http://localhost:5050 (admin@admin.com / admin)
- ✅ **Backend API**: http://localhost:3333

**Lưu ý**: Hệ thống có 2 giao diện:
- **Frontend (Next.js)** - Port 80 - Giao diện đẹp, hiện đại
- **Dashboard (React)** - Port 4000 - Đầy đủ tính năng quản lý (audio player, highlights, comments)

---

## 📁 VỊ TRÍ FILE .env.production

Tạo file `.env.production` ở **thư mục root** (cùng cấp với docker-compose.production.yml):

```
AI-Metting/
├── .env.production          ← TẠO Ở ĐÂY
├── docker-compose.production.yml
├── README.md
├── backend/
├── fe-dashboard/
└── python-service-metting/
```

---

## 🔧 QUẢN LÝ HỆ THỐNG

### Xem logs

```bash
# Tất cả services
docker compose -f docker-compose.production.yml logs -f

# Chỉ backend
docker compose -f docker-compose.production.yml logs -f backend
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

## 🌱 SEED SAMPLE DATA

```bash
docker exec ai-meeting-backend npm run seed
```

Sẽ tạo 3 sample speakers để test.

---

## ❓ TROUBLESHOOTING

### Lỗi: "repository does not exist"

**Nguyên nhân**: Docker Hub username sai hoặc images chưa được push.

**Giải pháp**: Đảm bảo file `.env.production` có:
```env
DOCKER_USERNAME=nguyenthanhduyznake
```

### Lỗi: "port is already allocated"

**Nguyên nhân**: Port đã được sử dụng bởi service khác.

**Giải pháp**: Thêm vào `.env.production`:
```env
POSTGRES_PORT=5433
REDIS_PORT=6380
```

### Container không start

```bash
# Xem logs chi tiết
docker compose -f docker-compose.production.yml logs

# Restart
docker compose -f docker-compose.production.yml restart
```

### Reset toàn bộ (Xóa dữ liệu)

```bash
docker compose -f docker-compose.production.yml down -v
docker compose -f docker-compose.production.yml up -d
```

---

## 💾 BACKUP VÀ RESTORE

### Backup Database

```bash
docker exec ai-meeting-postgres pg_dump -U meeting meeting_notes > backup.sql
```

### Restore Database

```bash
docker exec -i ai-meeting-postgres psql -U meeting meeting_notes < backup.sql
```

---

## 🔄 CẬP NHẬT HỆ THỐNG

Khi có phiên bản mới:

```bash
# Pull images mới
docker compose -f docker-compose.production.yml pull

# Restart với images mới
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml up -d
```

---

## 📊 KIỂM TRA CONTAINERS

```bash
docker compose -f docker-compose.production.yml ps
```

Phải thấy 7 containers đang chạy:
- ✅ ai-meeting-postgres (healthy) - Database
- ✅ ai-meeting-redis (healthy) - Queue
- ✅ ai-meeting-pgadmin (Up) - Database management
- ✅ ai-meeting-backend (Up) - Backend API
- ✅ ai-meeting-worker (Up) - **Worker xử lý jobs** (QUAN TRỌNG!)
- ✅ ai-meeting-python (Up) - Python processing service
- ✅ ai-meeting-nextjs (Up) - Frontend (Next.js)
- ✅ ai-meeting-dashboard (Up) - Dashboard (React)

---

## 🎯 CHECKLIST

- [ ] Docker Desktop đã cài và đang chạy
- [ ] Clone repository về máy
- [ ] Tạo file `.env.production` ở thư mục root
- [ ] Điền HF_TOKEN và GOOGLE_API_KEY
- [ ] Chạy `docker compose -f docker-compose.production.yml pull`
- [ ] Chạy `docker compose -f docker-compose.production.yml up -d`
- [ ] Kiểm tra `docker compose -f docker-compose.production.yml ps`
- [ ] Truy cập http://localhost để test

---

## 📞 HỖ TRỢ

- GitHub: https://github.com/nguyenthanhduy220507/AI-Metting
- Issues: https://github.com/nguyenthanhduy220507/AI-Metting/issues

---

**🎉 CHÚC BẠN SỬ DỤNG THÀNH CÔNG!**

