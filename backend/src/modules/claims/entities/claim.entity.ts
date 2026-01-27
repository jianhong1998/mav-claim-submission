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
import { ClaimCategoryEntity } from 'src/modules/claim-category/entities/claim-category.entity';

@Entity('claims')
@Index(['userId'])
@Index(['status'])
@Index(['categoryEntity'])
@Index(['month', 'year'])
@Index(['submissionDate'])
@Index(
  'idx_claims_user_category_month_year',
  ['userId', 'categoryEntity', 'month', 'year'],
  {
    where: '"deletedAt" IS NULL',
  },
)
@Index('idx_claims_user_category_year', ['userId', 'categoryEntity', 'year'], {
  where: '"deletedAt" IS NULL',
})
@Check(`"totalAmount" > 0`)
@Check(`"month" >= 1 AND "month" <= 12`)
@Check(`"year" >= 2020 AND "year" <= 2100`)
export class ClaimEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  userId: string;

  @Column({ type: 'uuid', name: 'category_id', nullable: false })
  categoryId: string;

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

  @ManyToOne(() => ClaimCategoryEntity, {
    nullable: false,
  })
  @JoinColumn({
    name: 'category_id',
  })
  categoryEntity: Relation<ClaimCategoryEntity>;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
  deletedAt?: Date;
}
