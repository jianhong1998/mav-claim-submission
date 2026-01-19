import { ClaimCategoryLimitEntity } from '../entities/claim-category-limit.entity';
import { ClaimCategoryEntity } from '../entities/claim-category.entity';

export type IClaimCategoryLimitCreationParams = Pick<
  ClaimCategoryLimitEntity,
  'type' | 'amount'
> & {
  category: ClaimCategoryEntity;
};
