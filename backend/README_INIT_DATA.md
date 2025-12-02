# Init Data SQL Script

File `init-data.sql` chứa dữ liệu khởi tạo cho database.

## Cách hoạt động

Khi PostgreSQL container khởi động lần đầu:
1. Docker tự động chạy tất cả file `.sql` trong `/docker-entrypoint-initdb.d/`
2. File `init-data.sql` được mount vào thư mục này
3. PostgreSQL tự động thực thi script
4. Dữ liệu sample được tạo tự động

## Dữ liệu được tạo

### Speakers (3 sample speakers)
- Nguyễn Văn A (Engineering) - ACTIVE
- Trần Thị B (Product) - ACTIVE  
- Lê Văn C (Design) - ACTIVE

### Speaker Samples (2 samples per speaker)
- Metadata cho 6 audio samples
- **Lưu ý**: Đây chỉ là metadata, không có audio files thật

## Chỉ chạy lần đầu

Script chỉ chạy khi:
- Volume `postgres_data` chưa tồn tại (lần đầu tiên)
- Hoặc đã xóa volume: `docker compose down -v`

Nếu đã có volume, script sẽ **không chạy lại**.

## Force chạy lại

Để chạy lại init script:

```bash
# Xóa volume
docker compose -f docker-compose.production.yml down -v

# Start lại (sẽ chạy init script)
docker compose -f docker-compose.production.yml up -d
```

## Customize dữ liệu

Chỉnh sửa file `init-data.sql` để thêm/sửa dữ liệu sample.

Ví dụ thêm speaker:

```sql
INSERT INTO speakers (id, name, status, extra, "createdAt", "updatedAt")
VALUES 
  ('550e8400-e29b-41d4-a716-446655440004', 'Phạm Văn D', 'ACTIVE', '{"department": "Sales"}', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;
```

## Kiểm tra dữ liệu

Sau khi container start:

```bash
# Via pgAdmin
# http://localhost:5050 → Servers → AI Meeting Database → Tables → speakers

# Via SQL
docker exec ai-meeting-postgres psql -U meeting meeting_notes -c "SELECT name, status FROM speakers;"
```

