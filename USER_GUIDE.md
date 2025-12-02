# Hướng dẫn sử dụng cho Người dùng

**Chỉ cần Docker Desktop - không cần cài đặt gì khác!**

## Bước 1: Cài đặt Docker Desktop

Tải và cài đặt Docker Desktop:
- Windows/Mac: https://www.docker.com/products/docker-desktop

Kiểm tra Docker đã cài:
```bash
docker --version
docker compose version
```

## Bước 2: Clone Repository

```bash
git clone https://github.com/nguyenthanhduy220507/AI-Metting.git
cd AI-Metting
```

## Bước 3: Tạo file cấu hình

Tạo file `.env.production` với nội dung:

```env
# Docker Hub Username (không cần thay đổi)
DOCKER_USERNAME=nguyenthanhduyznake

# Database Configuration
POSTGRES_USER=meeting
POSTGRES_PASSWORD=meeting_secure_password
POSTGRES_DB=meeting_notes

# Security Token (PHẢI thay đổi!)
PYTHON_SERVICE_CALLBACK_TOKEN=your-secret-token-change-this-123456

# API Keys (Lấy từ các link bên dưới)
HF_TOKEN=your-huggingface-token-here
GOOGLE_API_KEY=your-google-api-key-here
```

**Lấy API Keys:**
- Hugging Face Token: https://huggingface.co/settings/tokens
- Google API Key: https://makersuite.google.com/app/apikey

## Bước 4: Pull Images và Khởi động

```bash
# Pull images từ Docker Hub (chỉ cần làm 1 lần)
docker compose -f docker-compose.production.yml pull

# Khởi động tất cả services
docker compose -f docker-compose.production.yml up -d
```

**Chờ vài phút** để containers khởi động lần đầu.

## Bước 5: Kiểm tra Status

```bash
docker compose -f docker-compose.production.yml ps
```

Bạn sẽ thấy 5 containers đang chạy:
- `ai-meeting-postgres` - Database
- `ai-meeting-redis` - Queue
- `ai-meeting-pgadmin` - Database management
- `ai-meeting-backend` - Backend API
- `ai-meeting-python` - Python processing service
- `ai-meeting-frontend` - Frontend dashboard

## Bước 6: Truy cập Ứng dụng

- **Frontend Dashboard**: http://localhost
- **Backend API**: http://localhost:3333
- **pgAdmin**: http://localhost:5050
  - Email: `admin@admin.com`
  - Password: `admin`
- **Python Service Docs**: http://localhost:5000/docs

## Bước 7: Seed Sample Data (Optional)

```bash
docker exec ai-meeting-backend npm run seed
```

## Quản lý Services

### Xem logs

```bash
# Tất cả services
docker compose -f docker-compose.production.yml logs -f

# Chỉ backend
docker compose -f docker-compose.production.yml logs -f backend

# Chỉ Python service
docker compose -f docker-compose.production.yml logs -f python-service
```

### Restart

```bash
# Restart tất cả
docker compose -f docker-compose.production.yml restart

# Restart một service
docker compose -f docker-compose.production.yml restart backend
```

### Stop

```bash
docker compose -f docker-compose.production.yml down
```

### Start lại

```bash
docker compose -f docker-compose.production.yml up -d
```

## Troubleshooting

### Port đã được sử dụng

Nếu port 80, 3333, 5000, 5432 đã được dùng, thay đổi trong `.env.production`:

```env
POSTGRES_PORT=5433
PGADMIN_PORT=5051
REDIS_PORT=6380
```

Hoặc dừng service đang dùng port đó.

### Container không start

```bash
# Xem logs
docker compose -f docker-compose.production.yml logs

# Restart
docker compose -f docker-compose.production.yml restart
```

### Cần reset toàn bộ

```bash
# Xóa containers và volumes (CẢNH BÁO: Mất dữ liệu!)
docker compose -f docker-compose.production.yml down -v

# Khởi động lại
docker compose -f docker-compose.production.yml up -d
```

## Cập nhật Images

Khi có phiên bản mới:

```bash
# Pull images mới
docker compose -f docker-compose.production.yml pull

# Restart với images mới
docker compose -f docker-compose.production.yml up -d
```

## Lưu ý

- Dữ liệu được lưu trong Docker volumes - không mất khi restart
- Lần đầu pull images có thể mất vài phút (tùy tốc độ internet)
- Cần ít nhất 8GB RAM và 20GB disk space
- Tất cả chạy trên Docker - không cần cài PostgreSQL/pgAdmin/Redis local

## Liên hệ

- GitHub: https://github.com/nguyenthanhduy220507/AI-Metting
- Issues: https://github.com/nguyenthanhduy220507/AI-Metting/issues

