import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Meeting } from './meeting.entity';

@Entity()
export class Upload {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Meeting, (meeting) => meeting.uploads, {
    onDelete: 'CASCADE',
  })
  meeting: Meeting;

  @Column()
  originalFilename: string;

  @Column()
  storedFilename: string;

  @Column()
  mimeType: string;

  @Column({ type: 'bigint' })
  size: number;

  @Column()
  storagePath: string;

  @Column({ type: 'float', nullable: true })
  durationSeconds?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
