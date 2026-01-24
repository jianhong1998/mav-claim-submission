import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { ClaimCategoryLimitEntity } from './claim-category-limit.entity';
import { type UUID } from 'crypto';

@Entity('claim_categories')
export class ClaimCategoryEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: UUID;

  @Column({ type: 'varchar', length: 50, unique: true, nullable: false })
  code: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ type: 'boolean', nullable: false, default: true })
  isEnabled: boolean;

  /**
   * Category limit. `null` for unlimited.
   */
  @OneToOne(() => ClaimCategoryLimitEntity, (limit) => limit.category, {
    nullable: true,
    eager: true,
  })
  limit: Relation<ClaimCategoryLimitEntity> | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone' })
  deletedAt: Date;
}
