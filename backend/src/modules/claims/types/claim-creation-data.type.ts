import { ClaimCategory } from '../enums/claim-category.enum';

export interface IClaimCreationData {
  userId: string;
  category: ClaimCategory;
  claimName?: string;
  month: number;
  year: number;
  totalAmount: number;
}
