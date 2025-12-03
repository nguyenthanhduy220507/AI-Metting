# Test Docker Deployment - Full System

## Mục đích
Test toàn bộ hệ thống trên Docker để đảm bảo máy khác có thể chạy ngon như máy hiện tại.

## Chuẩn bị

### 1. Dừng tất cả services local
- Backend (terminal 3): Ctrl+C
- Python service (terminal 5): Ctrl+C  
- Frontend (terminal 2): Ctrl+C
- Worker (nếu có): Ctrl+C

### 2. Đảm bảo ports trống
```bash
netstat -ano | findstr ":3333 :4000 :5000 :80 :5432 :6379"
```

Không nên thấy kết quả (hoặc chỉ Docker containers).

## Test Docker

### Bước 1: Down containers cũ (nếu có)
```bash
docker compose -f docker-compose.production.yml down -v
```

### Bước 2: Pull images mới nhất
```bash
docker compose -f docker-compose.production.yml pull
```

### Bước 3: Start tất cả
```bash
docker compose -f docker-compose.production.yml --env-file .env.production up -d
```

### Bước 4: Kiểm tra status
```bash
# Đợi 30 giây
Start-Sleep -Seconds 30

# Kiểm tra containers
docker compose -f docker-compose.production.yml ps
```

Phải thấy 8/8 containers Up/Healthy:
- ✅ ai-meeting-postgres (healthy)
- ✅ ai-meeting-redis (healthy)
- ✅ ai-meeting-pgadmin (up)
- ✅ ai-meeting-backend (up)
- ✅ ai-meeting-worker (up)
- ✅ ai-meeting-python (up)
- ✅ ai-meeting-nextjs (up)
- ✅ ai-meeting-dashboard (up)

### Bước 5: Test API endpoints

```powershell
# Backend API
Invoke-WebRequest -Uri http://localhost:3333 | Select-Object StatusCode
# Expected: 200

# Speakers
Invoke-WebRequest -Uri http://localhost:3333/speakers | Select-Object StatusCode, Content
# Expected: 200, có 3 speakers từ init-data.sql

# Frontend Next.js
Invoke-WebRequest -Uri http://localhost | Select-Object StatusCode
# Expected: 200

# Dashboard React
Invoke-WebRequest -Uri http://localhost:4000 | Select-Object StatusCode
# Expected: 200
```

### Bước 6: Test Upload Audio

1. Truy cập: http://localhost:4000
2. Navigate to Upload page
3. Upload file audio
4. Kiểm tra processing

### Bước 7: Check Logs

```bash
# Backend
docker compose -f docker-compose.production.yml logs backend | Select-Object -Last 20

# Worker
docker compose -f docker-compose.production.yml logs backend-worker | Select-Object -Last 20

# Python
docker compose -f docker-compose.production.yml logs python-service | Select-Object -Last 20
```

## Checklist

- [ ] Local services đã dừng
- [ ] Ports trống (3333, 4000, 5000, 80, 5432, 6379)
- [ ] Docker images đã pull
- [ ] 8/8 containers đang chạy
- [ ] Backend API /speakers returns 200 với 3 speakers
- [ ] Frontend Next.js accessible
- [ ] Dashboard React accessible
- [ ] Upload audio thành công
- [ ] Processing hoàn tất
- [ ] Worker logs hiển thị job processing

## Nếu thành công

Hệ thống đã sẵn sàng cho máy khác!

Máy khác chỉ cần:
1. Clone repo
2. Tạo .env.production
3. Pull images
4. Start containers

→ Có hệ thống giống hệt máy này!

