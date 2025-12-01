import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Utterance } from './utterance.entity';
import { Upload } from './upload.entity';
import { MeetingSegment } from './meeting-segment.entity';

export enum MeetingStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity()
export class Meeting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  title?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: MeetingStatus,
    default: MeetingStatus.UPLOADED,
  })
  status: MeetingStatus;

  @Column({ type: 'text', nullable: true })
  summary?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  summaryPhases?: Array<{ title: string; points: string[] }> | null;

  @Column({ type: 'jsonb', nullable: true })
  formattedLines?:
    | Array<{
    speaker: string;
    text: string;
    timestamp?: string;
      }>
    | null;

  @Column({ type: 'jsonb', nullable: true })
  rawTranscript?:
    | Array<{
    speaker: string;
    text: string;
    start?: number;
    end?: number;
    timestamp?: string;
      }>
    | null;

  @Column({ type: 'jsonb', nullable: true })
  apiPayload?: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  extra?: Record<string, unknown> | null;

  @OneToMany(() => Upload, (upload) => upload.meeting, {
    cascade: true,
  })
  uploads: Upload[];

  @OneToMany(() => Utterance, (utterance) => utterance.meeting, {
    cascade: true,
  })
  utterances: Utterance[];

  @OneToMany(() => MeetingSegment, (segment) => segment.meeting, {
    cascade: true,
  })
  segments: MeetingSegment[];

  @Column({ type: 'int', default: 0 })
  totalSegments: number;

  @Column({ type: 'int', default: 0 })
  completedSegments: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
