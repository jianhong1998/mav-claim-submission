export type IClaimCategoryLimit = {
  type: 'monthly' | 'yearly';
  amount: number; // In dollars for frontend
};

export type IClaimCategory = {
  uuid: string;
  code: string;
  name: string;
  limit: IClaimCategoryLimit | null;
};

export type IClaimCategoryListResponse = {
  success: boolean;
  categories: IClaimCategory[];
};
