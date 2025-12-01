import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Meeting } from './meeting.entity';

export enum SegmentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity()
export class MeetingSegment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Meeting, (meeting) => meeting.segments, {
    onDelete: 'CASCADE',
  })
  meeting: Meeting;

  @Column()
  segmentIndex: number;

  @Column({ type: 'float' })
  startTime: number;

  @Column({ type: 'float' })
  endTime: number;

  @Column()
  filePath: string;

  @Column({
    type: 'enum',
    enum: SegmentStatus,
    default: SegmentStatus.PENDING,
  })
  status: SegmentStatus;

  @Column({ type: 'jsonb', nullable: true })
  transcript?: Array<{
    speaker: string;
    text: string;
    start: number;
    end: number;
    timestamp?: string;
  }>;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
