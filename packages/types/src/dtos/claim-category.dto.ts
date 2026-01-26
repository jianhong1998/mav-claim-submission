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

/**
 * Known category codes from database seed data.
 * Used primarily for testing and type-safe category references.
 */
export const ClaimCategory = Object.freeze({
  TELCO: 'telco',
  FITNESS: 'fitness',
  DENTAL: 'dental',
  SKILL_ENHANCEMENT: 'skill-enhancement',
  COMPANY_EVENT: 'company-event',
  COMPANY_LUNCH: 'company-lunch',
  COMPANY_DINNER: 'company-dinner',
  OTHERS: 'others',
} as const);
