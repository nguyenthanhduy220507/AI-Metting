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
export class Utterance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Meeting, (meeting) => meeting.utterances, {
    onDelete: 'CASCADE',
  })
  meeting: Meeting;

  @Column()
  speaker: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ nullable: true })
  timestamp?: string;

  @Column({ type: 'float', nullable: true })
  start?: number;

  @Column({ type: 'float', nullable: true })
  end?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
