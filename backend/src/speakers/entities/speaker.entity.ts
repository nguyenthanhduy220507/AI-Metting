import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SpeakerSample } from './speaker-sample.entity';

export enum SpeakerStatus {
  PENDING = 'PENDING',
  ENROLLING = 'ENROLLING',
  ACTIVE = 'ACTIVE',
  FAILED = 'FAILED',
}

@Entity({ name: 'speakers' })
export class Speaker {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({
    type: 'enum',
    enum: SpeakerStatus,
    default: SpeakerStatus.PENDING,
  })
  status: SpeakerStatus;

  @Column({ type: 'jsonb', nullable: true })
  extra?: Record<string, unknown>;

  @OneToMany(() => SpeakerSample, (sample) => sample.speaker)
  samples: SpeakerSample[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

