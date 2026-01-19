import { ClaimCategoryEntity } from '../entities/claim-category.entity';

export type IClaimCategoryCreationParams = Pick<
  ClaimCategoryEntity,
  'code' | 'name'
>;
