# Test Flow Checklist

## Pre-requisites
- [ ] Redis running (docker compose up -d redis)
- [ ] PostgreSQL running (docker compose up -d postgres)
- [ ] Backend running (npm run start:dev)
- [ ] Worker running (npm run start:worker) - **QUAN TRỌNG**
- [ ] Python service running (uvicorn api:app --port 5000)

## Test 1: f.mp4 (Short file ~4 minutes)

### Expected Flow:
1. Upload file → Meeting created with status PROCESSING
2. Audio segmented → 1 segment created (file < 10 min)
3. Segment job added to queue → Job ID: segment-{meetingId}-0
4. Worker picks up job → Log: "Processing segment 0"
5. Python service processes → Log: "Starting segment processing"
6. Callback received → Log: "Received segment callback"
7. Merge job triggered → Log: "All segments completed"
8. Summary generated → Meeting status: COMPLETED

### Checkpoints:
- [ ] Segment job created in queue
- [ ] Worker logs show "Processing segment 0"
- [ ] Python service receives request
- [ ] Callback received with transcript
- [ ] Merge process runs
- [ ] Final meeting has summary and transcript

## Test 2: metting.mkv (Long file ~2 hours)

### Expected Flow:
1. Upload file → Meeting created
2. Audio segmented → ~13 segments created
3. Multiple segment jobs added → Jobs processed in parallel (8 workers)
4. All segments complete → Merge job runs
5. Summary generated → Meeting completed

### Checkpoints:
- [ ] Multiple segments created (13 segments)
- [ ] Segment jobs processed in parallel
- [ ] completedSegments increases over time
- [ ] Merge runs after all segments complete
- [ ] Final meeting has complete transcript

## Common Issues:

### Jobs stuck in PENDING:
- Check worker is running: `npm run start:worker`
- Check Redis connection
- Check worker logs for errors

### Segment callback not received:
- Check Python service is running
- Check callback URL is correct
- Check callback token matches

### Empty transcript:
- Check Python service logs
- Check segment has transcript in database
- Check merge process receives transcript

