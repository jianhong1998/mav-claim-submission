import { ClaimCategoryEntity } from 'src/modules/claim-category/entities/claim-category.entity';

export interface IClaimCreationData {
  userId: string;
  category: ClaimCategoryEntity;
  claimName?: string;
  month: number;
  year: number;
  totalAmount: number;
}
