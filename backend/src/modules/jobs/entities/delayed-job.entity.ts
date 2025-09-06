import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { JobStatus } from '../enums/job-status.enum';
import { JobType } from '../enums/job-type.enum';

@Entity('delayed_jobs')
@Index(['status'])
@Index(['type'])
@Index(['scheduledAt'])
@Index(['priority'])
export class DelayedJobEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  type: JobType;

  @Column({
    type: 'enum',
    enum: JobStatus,
    nullable: false,
    default: JobStatus.PENDING,
  })
  status: JobStatus;

  @Column({ type: 'jsonb', nullable: false })
  payload: Record<string, unknown>;

  @Column({ type: 'int', nullable: false, default: 0 })
  priority: number;

  @Column({ type: 'int', nullable: false, default: 0 })
  retryCount: number;

  @Column({ type: 'int', nullable: false, default: 3 })
  maxRetries: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  scheduledAt: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  failedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
