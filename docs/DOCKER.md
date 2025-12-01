# Docker Setup và pgAdmin Guide

Hướng dẫn chi tiết về Docker setup và cách sử dụng pgAdmin.

**🎯 Lưu ý quan trọng**: 
- ✅ Tất cả services (PostgreSQL, pgAdmin, Redis) đều chạy trên Docker
- ✅ **KHÔNG CẦN** cài đặt PostgreSQL local
- ✅ **KHÔNG CẦN** cài đặt pgAdmin local
- ✅ **KHÔNG CẦN** cài đặt Redis local
- ✅ Chỉ cần Docker Desktop là đủ!

## Docker Compose Services

File `docker-compose.yml` định nghĩa 3 services:

1. **PostgreSQL** - Database server (chạy trên Docker)
2. **pgAdmin** - Web-based PostgreSQL administration tool (chạy trên Docker) - **Không cần cài local!**
3. **Redis** - In-memory data store cho BullMQ queue (chạy trên Docker)

## Khởi động Services

### Start

```bash
docker compose up -d
```

Flag `-d` chạy containers ở background (detached mode).

### Stop

```bash
docker compose down
```

### Restart

```bash
docker compose restart
```

Hoặc restart từng service:

```bash
docker compose restart postgres
docker compose restart redis
docker compose restart pgadmin
```

## Xem Logs

### Tất cả services

```bash
docker compose logs -f
```

### Từng service

```bash
docker compose logs -f postgres
docker compose logs -f redis
docker compose logs -f pgadmin
```

## Kiểm tra Status

```bash
docker compose ps
```

Output sẽ hiển thị:
- Container name
- Status (Up/Down)
- Ports mapping
- Health status

## Database Management

### Reset Database (Xóa toàn bộ dữ liệu)

**Cảnh báo**: Lệnh này sẽ xóa toàn bộ dữ liệu!

```bash
docker compose down -v
docker compose up -d
```

### Backup Database

```bash
docker exec ai-meeting-postgres pg_dump -U meeting meeting_notes > backup.sql
```

### Restore Database

```bash
docker exec -i ai-meeting-postgres psql -U meeting meeting_notes < backup.sql
```

### Access PostgreSQL CLI

```bash
docker exec -it ai-meeting-postgres psql -U meeting meeting_notes
```

Trong PostgreSQL CLI, bạn có thể chạy SQL:

```sql
-- Xem tất cả tables
\dt

-- Xem dữ liệu trong table
SELECT * FROM meetings LIMIT 10;

-- Thoát
\q
```

## Redis Management

### Access Redis CLI

```bash
docker exec -it ai-meeting-redis redis-cli
```

### Test Redis Connection

```bash
docker exec -it ai-meeting-redis redis-cli ping
```

Should return: `PONG`

### Xem Queue Jobs (nếu dùng BullMQ)

```bash
docker exec -it ai-meeting-redis redis-cli
> KEYS bull:audio-processing:*
> GET bull:audio-processing:waiting
```

## pgAdmin Setup

### 1. Truy cập pgAdmin

Mở browser và truy cập: http://localhost:5050

### 2. Đăng nhập lần đầu

- **Email**: `admin@admin.com` (mặc định)
- **Password**: `admin` (mặc định)

**Lưu ý**: Sau lần đăng nhập đầu tiên, pgAdmin có thể yêu cầu set master password. Bạn có thể bỏ qua hoặc set một password.

### 3. Kết nối với PostgreSQL Server

#### Cách 1: Auto-detection

pgAdmin có thể tự động detect PostgreSQL server trong cùng Docker network.

1. Click vào **Servers** trong left panel
2. Nếu thấy server được suggest, click vào và điền password

#### Cách 2: Manual Connection

1. Click chuột phải vào **Servers** → **Register** → **Server**

2. Tab **General**:
   - **Name**: `AI Meeting Database` (hoặc tên bạn muốn)

3. Tab **Connection**:
   - **Host name/address**: `postgres` (tên service trong docker-compose, không phải `localhost`)
   - **Port**: `5432`
   - **Maintenance database**: `meeting_notes`
   - **Username**: `meeting`
   - **Password**: `meeting` (hoặc password bạn đã set trong docker-compose.yml)
   - ✅ **Save password** (tùy chọn, để không phải nhập lại)

4. Tab **Advanced** (tùy chọn):
   - **DB restriction**: `meeting_notes` (chỉ hiển thị database này)

5. Click **Save**

### 4. Sử dụng pgAdmin

Sau khi kết nối thành công, bạn có thể:

#### Xem Tables

1. Expand: **Servers** → **AI Meeting Database** → **Databases** → **meeting_notes** → **Schemas** → **public** → **Tables**

2. Các tables chính:
   - `meetings` - Thông tin meetings
   - `speakers` - Thông tin speakers
   - `speaker_samples` - Audio samples của speakers
   - `utterances` - Transcript entries
   - `meeting_segments` - Audio segments
   - `uploads` - Uploaded files metadata

#### Xem Dữ liệu

1. Click chuột phải vào table → **View/Edit Data** → **All Rows**

2. Hoặc dùng Query Tool:
   - Click chuột phải vào database → **Query Tool**
   - Gõ SQL query:
   ```sql
   SELECT * FROM meetings ORDER BY "createdAt" DESC LIMIT 10;
   ```
   - Click **Execute** (F5)

#### Chạy SQL Queries

1. Click chuột phải vào database → **Query Tool**

2. Ví dụ queries:

```sql
-- Đếm số meetings
SELECT COUNT(*) FROM meetings;

-- Xem meetings theo status
SELECT status, COUNT(*) 
FROM meetings 
GROUP BY status;

-- Xem speakers và số samples
SELECT s.name, s.status, COUNT(ss.id) as sample_count
FROM speakers s
LEFT JOIN speaker_samples ss ON ss."speakerId" = s.id
GROUP BY s.id, s.name, s.status;

-- Xem meetings gần đây
SELECT id, title, status, "createdAt"
FROM meetings
ORDER BY "createdAt" DESC
LIMIT 10;
```

#### Export Data

1. Click chuột phải vào table → **Backup...**

2. Chọn:
   - **Format**: `Plain` hoặc `Custom`
   - **Filename**: Chọn nơi lưu file
   - Click **Backup**

#### Import Data

1. Click chuột phải vào database → **Restore...**

2. Chọn file backup và click **Restore**

### 5. Thay đổi pgAdmin Credentials

Chỉnh sửa `docker-compose.yml`:

```yaml
pgadmin:
  environment:
    PGADMIN_DEFAULT_EMAIL: your-email@example.com
    PGADMIN_DEFAULT_PASSWORD: your-secure-password
```

Restart service:

```bash
docker compose restart pgadmin
```

## Customize Docker Configuration

### Thay đổi Ports

Chỉnh sửa `docker-compose.yml`:

```yaml
postgres:
  ports:
    - "5433:5432"  # Thay đổi host port từ 5432 sang 5433

pgadmin:
  ports:
    - "5051:80"  # Thay đổi host port từ 5050 sang 5051

redis:
  ports:
    - "6380:6379"  # Thay đổi host port từ 6379 sang 6380
```

**Lưu ý**: Nếu thay đổi PostgreSQL port, cần update `POSTGRES_PORT` trong backend `.env`.

### Thay đổi Database Credentials

Chỉnh sửa `docker-compose.yml`:

```yaml
postgres:
  environment:
    POSTGRES_USER: myuser
    POSTGRES_PASSWORD: mypassword
    POSTGRES_DB: mydatabase
```

Và update backend `.env` tương ứng.

### Thêm Volume Mounts

Để persist data ra ngoài container:

```yaml
postgres:
  volumes:
    - ./postgres_data:/var/lib/postgresql/data
    - postgres_data:/var/lib/postgresql/data  # Named volume (khuyến nghị)
```

## Troubleshooting

### Container không start

```bash
# Xem logs
docker compose logs postgres

# Kiểm tra port conflicts
netstat -an | findstr 5432  # Windows
lsof -i :5432  # Linux/Mac
```

### Không kết nối được từ pgAdmin

- Đảm bảo dùng `postgres` làm hostname (không phải `localhost`)
- Kiểm tra password đúng
- Kiểm tra container đang chạy: `docker compose ps`

### Database connection refused từ backend

- Kiểm tra `POSTGRES_HOST=localhost` trong backend `.env`
- Kiểm tra port mapping đúng
- Kiểm tra container health: `docker compose ps`

### Redis connection issues

- Kiểm tra Redis container: `docker compose ps`
- Test connection: `docker exec -it ai-meeting-redis redis-cli ping`
- Kiểm tra `REDIS_HOST` và `REDIS_PORT` trong backend `.env`

