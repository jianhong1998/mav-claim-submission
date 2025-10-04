import { ClaimCategory } from '../enums/claim-category.enum';

/**
 * Monthly claim limits by category (in dollars)
 * Categories without limits can have unlimited claims
 */
export const CLAIM_MONTHLY_LIMITS = Object.freeze({
  [ClaimCategory.TELCO]: 150,
  [ClaimCategory.FITNESS]: 50,
} as const satisfies Record<string, number>);

/**
 * Yearly claim limits by category (in dollars)
 * Categories without limits can have unlimited claims
 */
export const CLAIM_YEARLY_LIMITS = Object.freeze({
  [ClaimCategory.DENTAL]: 300,
} as const satisfies Record<string, number>);
