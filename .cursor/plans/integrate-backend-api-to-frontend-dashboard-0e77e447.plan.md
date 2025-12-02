<!-- 0e77e447-3330-4877-9c33-aa4a1cc3bd63 e202fc3d-c277-470f-8d92-5345f2ebe448 -->
# Điều chỉnh giao diện Progress Section và Minutes Display

## Mục tiêu

1. **Progress Indicator (ảnh 1→2)**: Chuyển từ layout ngang sang layout dọc

- Progress circle ở trên
- "Completed" text và legend ở dưới circle
- Layout dọc thay vì ngang

2. **Minutes processed (ảnh 3→4)**: Redesign hiển thị thời gian

- Hiển thị thời gian dạng MM:SS (ví dụ "13:56") với font lớn
- Text "Minutes processed" hiển thị bên dưới với font nhỏ hơn
- Waveform icon ở bên trái

## Các thay đổi

### File: `fe-dashboard/src/pages/private/Meetings/MeetingDetail.tsx`

1. **Điều chỉnh Progress Indicator Section**:

- Thay đổi layout từ `flex items-center space-x-8` (ngang) sang layout dọc
- Di chuyển "Completed" text vào trong/ngay dưới progress circle
- Di chuyển Legend xuống dưới progress circle
- Điều chỉnh spacing và alignment

2. **Redesign Minutes processed Display**:

- Tạo component mới với layout dọc:
- Waveform icon bên trái
- Thời gian MM:SS hiển thị lớn (ví dụ "13:56")
- Text "Minutes processed" hiển thị nhỏ bên dưới
- Cập nhật hàm `formatMinutes` hoặc tạo hàm mới để format MM:SS

3. **Điều chỉnh Top Section Layout**:

- Sắp xếp lại các phần tử để phù hợp với layout mới
- Đảm bảo spacing và alignment đúng

### To-dos

- [ ] Setup API Service Layer - Create api.ts, meetings.service.ts, speakers.service.ts
- [ ] Create Types/Interfaces - Meeting.type.ts and Speaker.type.ts
- [ ] Replace Transactions with Meetings - Create AllMeetings.tsx and MeetingDetail.tsx
- [ ] Create Speakers Page - AllSpeakers.tsx and CreateSpeaker.tsx
- [ ] Update Dashboard - Stats cards and recent meetings
- [ ] Update Routing and Navigation - App.tsx, SideBar.tsx, pages/index.ts
- [ ] Update Header - Dynamic breadcrumb
- [ ] Error Handling and Loading States - Add loading spinners and toast notifications
- [ ] Clean up old files - Delete Transactions files and old types
- [ ] Setup API Service Layer - Create api.ts, meetings.service.ts, speakers.service.ts
- [ ] Create Types/Interfaces - Meeting.type.ts and Speaker.type.ts
- [ ] Replace Transactions with Meetings - Create AllMeetings.tsx and MeetingDetail.tsx
- [ ] Create Speakers Page - AllSpeakers.tsx and CreateSpeaker.tsx
- [ ] Update Dashboard - Stats cards and recent meetings
- [ ] Update Routing and Navigation - App.tsx, SideBar.tsx, pages/index.ts
- [ ] Update Header - Dynamic breadcrumb
- [ ] Error Handling and Loading States - Add loading spinners and toast notifications
- [ ] Clean up old files - Delete Transactions files and old types
- [ ] Setup API Service Layer - Create api.ts, meetings.service.ts, speakers.service.ts
- [ ] Create Types/Interfaces - Meeting.type.ts and Speaker.type.ts
- [ ] Replace Transactions with Meetings - Create AllMeetings.tsx and MeetingDetail.tsx
- [ ] Create Speakers Page - AllSpeakers.tsx and CreateSpeaker.tsx
- [ ] Update Dashboard - Stats cards and recent meetings
- [ ] Update Routing and Navigation - App.tsx, SideBar.tsx, pages/index.ts
- [ ] Update Header - Dynamic breadcrumb
- [ ] Error Handling and Loading States - Add loading spinners and toast notifications
- [ ] Clean up old files - Delete Transactions files and old types
- [ ] Setup API Service Layer - Create api.ts, meetings.service.ts, speakers.service.ts
- [ ] Create Types/Interfaces - Meeting.type.ts and Speaker.type.ts
- [ ] Replace Transactions with Meetings - Create AllMeetings.tsx and MeetingDetail.tsx
- [ ] Create Speakers Page - AllSpeakers.tsx and CreateSpeaker.tsx
- [ ] Update Dashboard - Stats cards and recent meetings
- [ ] Update Routing and Navigation - App.tsx, SideBar.tsx, pages/index.ts
- [ ] Update Header - Dynamic breadcrumb
- [ ] Error Handling and Loading States - Add loading spinners and toast notifications
- [ ] Clean up old files - Delete Transactions files and old types
- [ ] Setup API Service Layer - Create api.ts, meetings.service.ts, speakers.service.ts
- [ ] Create Types/Interfaces - Meeting.type.ts and Speaker.type.ts
- [ ] Replace Transactions with Meetings - Create AllMeetings.tsx and MeetingDetail.tsx
- [ ] Create Speakers Page - AllSpeakers.tsx and CreateSpeaker.tsx
- [ ] Update Dashboard - Stats cards and recent meetings
- [ ] Update Routing and Navigation - App.tsx, SideBar.tsx, pages/index.ts
- [ ] Update Header - Dynamic breadcrumb
- [ ] Error Handling and Loading States - Add loading spinners and toast notifications
- [ ] Clean up old files - Delete Transactions files and old types
- [ ] Setup API Service Layer - Create api.ts, meetings.service.ts, speakers.service.ts
- [ ] Create Types/Interfaces - Meeting.type.ts and Speaker.type.ts
- [ ] Replace Transactions with Meetings - Create AllMeetings.tsx and MeetingDetail.tsx
- [ ] Create Speakers Page - AllSpeakers.tsx and CreateSpeaker.tsx
- [ ] Update Dashboard - Stats cards and recent meetings
- [ ] Update Routing and Navigation - App.tsx, SideBar.tsx, pages/index.ts
- [ ] Update Header - Dynamic breadcrumb
- [ ] Error Handling and Loading States - Add loading spinners and toast notifications
- [ ] Clean up old files - Delete Transactions files and old types
- [ ] Setup API Service Layer - Create api.ts, meetings.service.ts, speakers.service.ts
- [ ] Create Types/Interfaces - Meeting.type.ts and Speaker.type.ts
- [ ] Replace Transactions with Meetings - Create AllMeetings.tsx and MeetingDetail.tsx
- [ ] Create Speakers Page - AllSpeakers.tsx and CreateSpeaker.tsx
- [ ] Update Dashboard - Stats cards and recent meetings
- [ ] Update Routing and Navigation - App.tsx, SideBar.tsx, pages/index.ts
- [ ] Update Header - Dynamic breadcrumb
- [ ] Error Handling and Loading States - Add loading spinners and toast notifications
- [ ] Clean up old files - Delete Transactions files and old types
- [ ] Setup API Service Layer - Create api.ts, meetings.service.ts, speakers.service.ts
- [ ] Create Types/Interfaces - Meeting.type.ts and Speaker.type.ts
- [ ] Replace Transactions with Meetings - Create AllMeetings.tsx and MeetingDetail.tsx
- [ ] Create Speakers Page - AllSpeakers.tsx and CreateSpeaker.tsx
- [ ] Update Dashboard - Stats cards and recent meetings
- [ ] Update Routing and Navigation - App.tsx, SideBar.tsx, pages/index.ts
- [ ] Update Header - Dynamic breadcrumb
- [ ] Error Handling and Loading States - Add loading spinners and toast notifications
- [ ] Clean up old files - Delete Transactions files and old types
- [ ] Setup API Service Layer - Create api.ts, meetings.service.ts, speakers.service.ts
- [ ] Create Types/Interfaces - Meeting.type.ts and Speaker.type.ts
- [ ] Replace Transactions with Meetings - Create AllMeetings.tsx and MeetingDetail.tsx
- [ ] Create Speakers Page - AllSpeakers.tsx and CreateSpeaker.tsx
- [ ] Update Dashboard - Stats cards and recent meetings
- [ ] Update Routing and Navigation - App.tsx, SideBar.tsx, pages/index.ts
- [ ] Update Header - Dynamic breadcrumb
- [ ] Error Handling and Loading States - Add loading spinners and toast notifications
- [ ] Clean up old files - Delete Transactions files and old types
- [ ] Setup API Service Layer - Create api.ts, meetings.service.ts, speakers.service.ts
- [ ] Create Types/Interfaces - Meeting.type.ts and Speaker.type.ts
- [ ] Replace Transactions with Meetings - Create AllMeetings.tsx and MeetingDetail.tsx
- [ ] Create Speakers Page - AllSpeakers.tsx and CreateSpeaker.tsx
- [ ] Update Dashboard - Stats cards and recent meetings
- [ ] Update Routing and Navigation - App.tsx, SideBar.tsx, pages/index.ts
- [ ] Update Header - Dynamic breadcrumb
- [ ] Error Handling and Loading States - Add loading spinners and toast notifications
- [ ] Clean up old files - Delete Transactions files and old types
- [ ] Setup API Service Layer - Create api.ts, meetings.service.ts, speakers.service.ts
- [ ] Create Types/Interfaces - Meeting.type.ts and Speaker.type.ts
- [ ] Replace Transactions with Meetings - Create AllMeetings.tsx and MeetingDetail.tsx
- [ ] Create Speakers Page - AllSpeakers.tsx and CreateSpeaker.tsx
- [ ] Update Dashboard - Stats cards and recent meetings
- [ ] Update Routing and Navigation - App.tsx, SideBar.tsx, pages/index.ts
- [ ] Update Header - Dynamic breadcrumb
- [ ] Error Handling and Loading States - Add loading spinners and toast notifications
- [ ] Clean up old files - Delete Transactions files and old types
- [ ] Setup API Service Layer - Create api.ts, meetings.service.ts, speakers.service.ts
- [ ] Create Types/Interfaces - Meeting.type.ts and Speaker.type.ts
- [ ] Replace Transactions with Meetings - Create AllMeetings.tsx and MeetingDetail.tsx
- [ ] Create Speakers Page - AllSpeakers.tsx and CreateSpeaker.tsx
- [ ] Update Dashboard - Stats cards and recent meetings
- [ ] Update Routing and Navigation - App.tsx, SideBar.tsx, pages/index.ts
- [ ] Update Header - Dynamic breadcrumb
- [ ] Error Handling and Loading States - Add loading spinners and toast notifications