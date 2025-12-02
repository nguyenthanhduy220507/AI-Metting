# Docker Deployment Guide

Hướng dẫn deploy AI Meeting Notes Platform sử dụng Docker.

## Prerequisites

- Docker Desktop đã cài đặt
- Docker Compose đã cài đặt
- 8GB RAM tối thiểu (khuyến nghị 16GB)
- 20GB disk space

## Quick Start (Người dùng)

### Bước 1: Tạo file cấu hình

Tạo file `.env.production`:

```bash
# Docker Hub Configuration
DOCKER_USERNAME=nguyenthanhduy220507
VERSION=latest

# Database Configuration
POSTGRES_USER=meeting
POSTGRES_PASSWORD=meeting_secure_password_123
POSTGRES_DB=meeting_notes

# Security Token (PHẢI thay đổi!)
PYTHON_SERVICE_CALLBACK_TOKEN=your-secret-token-change-this-123456

# Python Service API Keys
HF_TOKEN=your-huggingface-token-here
GOOGLE_API_KEY=your-google-api-key-here

# Language
DEFAULT_LANGUAGE=vi
```

### Bước 2: Pull images và khởi động

```bash
# Pull images từ Docker Hub
docker compose -f docker-compose.production.yml pull

# Khởi động tất cả services
docker compose -f docker-compose.production.yml up -d
```

### Bước 3: Kiểm tra status

```bash
docker compose -f docker-compose.production.yml ps
```

Đợi vài phút để các services khởi động hoàn tất.

### Bước 4: Seed database (Optional)

```bash
docker exec ai-meeting-backend npm run seed
```

### Bước 5: Truy cập ứng dụng

- **Frontend (Next.js)**: http://localhost - Giao diện chính
- **Dashboard (React)**: http://localhost:4000 - Giao diện quản lý chi tiết
- **Backend API**: http://localhost:3333
- **pgAdmin**: http://localhost:5050
  - Email: `admin@admin.com`
  - Password: `admin`
- **Python Service Docs**: http://localhost:5000/docs

**Lưu ý**: Hệ thống có 2 giao diện, cả 2 đều chạy đồng thời:
- Frontend (Next.js) - Giao diện hiện đại, đơn giản
- Dashboard (React) - Đầy đủ tính năng (audio player, highlights, comments, notes)

## Commands

### Xem logs

```bash
# Tất cả services
docker compose -f docker-compose.production.yml logs -f

# Chỉ backend
docker compose -f docker-compose.production.yml logs -f backend

# Chỉ Python service
docker compose -f docker-compose.production.yml logs -f python-service
```

### Restart services

```bash
# Restart tất cả
docker compose -f docker-compose.production.yml restart

# Restart một service
docker compose -f docker-compose.production.yml restart backend
```

### Stop services

```bash
docker compose -f docker-compose.production.yml down
```

### Stop và xóa volumes (CẢNH BÁO: Mất dữ liệu!)

```bash
docker compose -f docker-compose.production.yml down -v
```

## Build và Push Images (Dành cho Developer)

### Bước 1: Login Docker Hub

```bash
docker login
```

### Bước 2: Tạo file cấu hình

Copy `.env.production.example` thành `.env.production` và điền Docker Hub username:

```env
DOCKER_USERNAME=your-dockerhub-username
VERSION=latest
```

### Bước 3: Build và Push

**Linux/Mac:**
```bash
chmod +x build-and-push.sh
./build-and-push.sh
```

**Windows PowerShell:**
```powershell
.\build-and-push.ps1
```

### Bước 4: Share images

Chia sẻ Docker Hub username với người dùng:
```
docker pull your-dockerhub-username/ai-meeting-backend:latest
docker pull your-dockerhub-username/ai-meeting-frontend:latest
docker pull your-dockerhub-username/ai-meeting-python:latest
```

## Troubleshooting

### Container không start

```bash
# Xem logs
docker compose -f docker-compose.production.yml logs

# Kiểm tra port conflicts
netstat -an | findstr "3333 5000 5432"  # Windows
lsof -i :3333,:5000,:5432  # Linux/Mac
```

### Backend không kết nối database

1. Kiểm tra PostgreSQL container đang chạy:
```bash
docker compose -f docker-compose.production.yml ps postgres
```

2. Kiểm tra database credentials trong `.env.production`

3. Restart backend:
```bash
docker compose -f docker-compose.production.yml restart backend
```

### Python service không load models

1. Kiểm tra `HF_TOKEN` trong `.env.production`
2. Xem logs:
```bash
docker compose -f docker-compose.production.yml logs python-service
```

### Out of memory

Tăng Docker Desktop memory limit:
- Windows/Mac: Docker Desktop → Settings → Resources → Memory

## Backup và Restore

### Backup Database

```bash
docker exec ai-meeting-postgres pg_dump -U meeting meeting_notes > backup.sql
```

### Restore Database

```bash
docker exec -i ai-meeting-postgres psql -U meeting meeting_notes < backup.sql
```

## Production Recommendations

1. **Thay đổi passwords mặc định** trong `.env.production`
2. **Sử dụng HTTPS** với reverse proxy (nginx/traefik)
3. **Setup monitoring** (Prometheus, Grafana)
4. **Regular backups** của database
5. **Update images thường xuyên**

## Security Notes

- Không commit file `.env.production` lên Git
- Thay đổi tất cả default passwords
- Sử dụng strong tokens cho `PYTHON_SERVICE_CALLBACK_TOKEN`
- Giới hạn truy cập pgAdmin trong production

