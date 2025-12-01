# Seed Data Guide

Hướng dẫn về seed data và cách sử dụng seed script.

## Tổng quan

Seed script tạo sample data để test hệ thống, bao gồm:
- Sample speakers với status ACTIVE
- Sample speaker samples metadata (không có audio files thật)

## Chạy Seed Script

### Cách 1: Sử dụng npm script (Khuyến nghị)

```bash
cd backend
npm run seed
```

### Cách 2: Chạy trực tiếp với ts-node

```bash
cd backend
npx ts-node -r tsconfig-paths/register src/database/seed.ts
```

## Seed Data được tạo

### Speakers

Script tạo 3 sample speakers:

1. **Nguyễn Văn A**
   - Status: ACTIVE
   - Department: Engineering
   - 2 sample metadata entries

2. **Trần Thị B**
   - Status: ACTIVE
   - Department: Product
   - 2 sample metadata entries

3. **Lê Văn C**
   - Status: ACTIVE
   - Department: Design
   - 2 sample metadata entries

### Speaker Samples

Mỗi speaker có 2 sample metadata entries (không có audio files thật):
- `{speaker_name}_sample_1.wav`
- `{speaker_name}_sample_2.wav`

**Lưu ý**: Đây chỉ là metadata. Để speaker recognition hoạt động, bạn cần upload audio files thật qua API hoặc frontend.

## Customize Seed Data

### Thay đổi Speakers

Chỉnh sửa `backend/src/database/seed.ts`:

```typescript
const sampleSpeakers = [
  {
    name: 'Tên Speaker Mới',
    status: SpeakerStatus.ACTIVE,
    extra: {
      description: 'Mô tả',
      department: 'Department Name',
    },
  },
  // Thêm speakers khác...
];
```

### Thay đổi số lượng Samples

Trong seed script, tìm phần tạo samples:

```typescript
// Tạo 2 sample metadata entries per speaker
const sample1 = sampleRepository.create({...});
const sample2 = sampleRepository.create({...});
```

Thêm hoặc bớt số lượng samples tùy ý.

### Thêm Meetings (Optional)

Để seed sample meetings, thêm vào seed script:

```typescript
import { Meeting, MeetingStatus } from '../meetings/entities/meeting.entity';

// Trong hàm seed()
const meetingRepository = dataSource.getRepository(Meeting);

const sampleMeeting = meetingRepository.create({
  title: 'Sample Meeting',
  description: 'This is a sample meeting',
  status: MeetingStatus.COMPLETED,
  // ... other fields
});

await meetingRepository.save(sampleMeeting);
```

## Xem Seed Data

### Qua pgAdmin

1. Mở pgAdmin: http://localhost:5050
2. Kết nối với database
3. Navigate: **Databases** → **meeting_notes** → **Schemas** → **public** → **Tables**
4. Click chuột phải vào `speakers` → **View/Edit Data** → **All Rows**

### Qua API

```bash
# List speakers
curl http://localhost:3333/speakers

# Get specific speaker
curl http://localhost:3333/speakers/{speaker-id}
```

### Qua Frontend

1. Mở http://localhost:4000
2. Navigate đến **Speakers** page
3. Bạn sẽ thấy 3 sample speakers

## Xóa Seed Data

### Xóa tất cả Speakers

Qua pgAdmin Query Tool:

```sql
DELETE FROM speaker_samples;
DELETE FROM speakers;
```

Hoặc qua API (nếu có endpoint delete):

```bash
# Lấy list speakers
curl http://localhost:3333/speakers

# Xóa từng speaker (nếu có DELETE endpoint)
curl -X DELETE http://localhost:3333/speakers/{speaker-id}
```

### Reset toàn bộ Database

```bash
docker compose down -v
docker compose up -d
cd backend
npm run seed
```

## Seed Script Logic

### Flow

1. **Load environment variables** từ `.env`
2. **Connect to database** qua TypeORM
3. **Clean existing seed data** (optional - chỉ xóa speakers có tên trùng)
4. **Create speakers** với status ACTIVE
5. **Create sample metadata** cho mỗi speaker
6. **Display summary** với thống kê

### Error Handling

Script có error handling:
- Database connection errors
- Duplicate speaker names
- Missing environment variables

Nếu có lỗi, script sẽ:
- Log error message
- Close database connection
- Exit với code 1

## Troubleshooting

### "Cannot connect to database"

**Nguyên nhân**:
- PostgreSQL container chưa chạy
- Database credentials sai
- Port bị conflict

**Giải pháp**:
1. Kiểm tra Docker: `docker compose ps`
2. Kiểm tra `.env` file có đúng credentials không
3. Test connection: `docker exec -it ai-meeting-postgres psql -U meeting meeting_notes`

### "Speaker already exists"

**Nguyên nhân**: Đã chạy seed trước đó

**Giải pháp**: 
- Script sẽ skip speakers đã tồn tại
- Hoặc xóa speakers cũ trước khi seed lại

### "Table does not exist"

**Nguyên nhân**: Database chưa được sync

**Giải pháp**:
1. Khởi động backend một lần để TypeORM sync schema:
   ```bash
   cd backend
   npm run start:dev
   # Chờ vài giây để sync, rồi Ctrl+C
   ```
2. Chạy seed lại

## Best Practices

1. **Development**: Chạy seed để có data test
2. **Production**: Không chạy seed, chỉ dùng real data
3. **Testing**: Có thể customize seed data để test các scenarios khác nhau
4. **Cleanup**: Xóa seed data trước khi deploy production

## Advanced Usage

### Seed với Real Audio Files

Để seed với audio files thật, bạn cần:

1. Copy audio files vào `backend/uploads/speakers/{speaker-id}/`
2. Update seed script để tạo `SpeakerSample` với paths thật
3. Hoặc upload qua API sau khi seed

### Seed từ CSV/JSON

Có thể modify seed script để đọc từ file:

```typescript
import * as fs from 'fs';
import * as csv from 'csv-parser';

const speakers = [];
fs.createReadStream('speakers.csv')
  .pipe(csv())
  .on('data', (row) => speakers.push(row))
  .on('end', () => {
    // Process speakers
  });
```

### Conditional Seed

Chỉ seed nếu database trống:

```typescript
const existingCount = await speakerRepository.count();
if (existingCount > 0) {
  console.log('Database already has data. Skipping seed.');
  process.exit(0);
}
```

