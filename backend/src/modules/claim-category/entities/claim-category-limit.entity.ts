import { type UUID } from 'crypto';
import { LimitType } from '../enums/limit-type.enum';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { ClaimCategoryEntity } from './claim-category.entity';

@Entity('claim_category_limits')
export class ClaimCategoryLimitEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: UUID;

  @OneToOne(() => ClaimCategoryEntity, {
    nullable: false,
  })
  @JoinColumn({
    name: 'category_id',
  })
  category?: Relation<ClaimCategoryEntity>;

  @Column({
    type: 'enum',
    enum: LimitType,
  })
  type: LimitType;

  /**
   * Limit amount in SGD cents.
   *
   * Example: `1,000` for `SGD 10`
   */
  @Column({
    type: 'integer',
    default: 0,
  })
  amount: number;
}
