-- AI Meeting Notes Platform - Initial Data
-- This file contains sample data for quick setup

-- Insert sample speakers
INSERT INTO speakers (id, name, status, extra, "createdAt", "updatedAt")
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'Nguyễn Văn A', 'ACTIVE', '{"description": "Sample speaker 1", "department": "Engineering"}', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440002', 'Trần Thị B', 'ACTIVE', '{"description": "Sample speaker 2", "department": "Product"}', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440003', 'Lê Văn C', 'ACTIVE', '{"description": "Sample speaker 3", "department": "Design"}', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Insert sample speaker_samples metadata
INSERT INTO speaker_samples (id, "speakerId", "originalFilename", "storedFilename", "storagePath", "mimeType", size, "createdAt")
VALUES 
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'nguyen_van_a_sample_1.wav', 'sample_1.wav', 'speakers/550e8400-e29b-41d4-a716-446655440001/sample_1.wav', 'audio/wav', 1024000, NOW()),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'nguyen_van_a_sample_2.wav', 'sample_2.wav', 'speakers/550e8400-e29b-41d4-a716-446655440001/sample_2.wav', 'audio/wav', 1024000, NOW()),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', 'tran_thi_b_sample_1.wav', 'sample_1.wav', 'speakers/550e8400-e29b-41d4-a716-446655440002/sample_1.wav', 'audio/wav', 1024000, NOW()),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', 'tran_thi_b_sample_2.wav', 'sample_2.wav', 'speakers/550e8400-e29b-41d4-a716-446655440002/sample_2.wav', 'audio/wav', 1024000, NOW()),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440003', 'le_van_c_sample_1.wav', 'sample_1.wav', 'speakers/550e8400-e29b-41d4-a716-446655440003/sample_1.wav', 'audio/wav', 1024000, NOW()),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440003', 'le_van_c_sample_2.wav', 'sample_2.wav', 'speakers/550e8400-e29b-41d4-a716-446655440003/sample_2.wav', 'audio/wav', 1024000, NOW())
ON CONFLICT DO NOTHING;

