import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Speaker } from './speaker.entity';

@Entity({ name: 'speaker_samples' })
export class SpeakerSample {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Speaker, (speaker) => speaker.samples, {
    onDelete: 'CASCADE',
  })
  speaker: Speaker;

  @Column()
  originalFilename: string;

  @Column()
  storedFilename: string;

  @Column()
  storagePath: string;

  @Column()
  mimeType: string;

  @Column({ type: 'bigint' })
  size: number;

  @CreateDateColumn()
  createdAt: Date;
}

