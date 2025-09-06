import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Check,
  type Relation,
} from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';
import { AttachmentEntity } from './attachment.entity';
import { ClaimStatus } from '../enums/claim-status.enum';
import { ClaimCategory } from '../enums/claim-category.enum';

@Entity('claims')
@Index(['userId'])
@Index(['status'])
@Index(['category'])
@Index(['month', 'year'])
@Index(['submissionDate'])
@Check(`"totalAmount" > 0`)
@Check(`"month" >= 1 AND "month" <= 12`)
@Check(`"year" >= 2020 AND "year" <= 2100`)
export class ClaimEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  userId: string;

  @Column({
    type: 'enum',
    enum: ClaimCategory,
    nullable: false,
  })
  category: ClaimCategory;

  @Column({ type: 'varchar', length: 255, nullable: true })
  claimName: string | null;

  @Column({ type: 'int', nullable: false })
  month: number;

  @Column({ type: 'int', nullable: false })
  year: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  totalAmount: number;

  @Column({
    type: 'enum',
    enum: ClaimStatus,
    nullable: false,
    default: ClaimStatus.DRAFT,
  })
  status: ClaimStatus;

  @Column({ type: 'timestamp with time zone', nullable: true })
  submissionDate: Date | null;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: Relation<UserEntity>;

  @OneToMany(() => AttachmentEntity, (attachment) => attachment.claim, {
    cascade: true,
  })
  attachments?: Relation<AttachmentEntity>[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
  deletedAt?: Date;
}
