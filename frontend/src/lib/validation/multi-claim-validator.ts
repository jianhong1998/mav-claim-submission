import {
  IClaimMetadata,
  IClaimCreateRequest,
  IClaimCategory,
} from '@project/types';

/**
 * Multi-Claim Validation Utilities
 *
 * Provides client-side validation for multiple claims including:
 * - Monthly limit aggregation (Requirements 2.1, 2.2)
 * - Business rules validation
 * - Cross-claim validation logic
 */

// Business constants
const CLAIM_SUBMISSION_DEADLINE_MONTHS = 2;

export interface ValidationError {
  field: string;
  message: string;
  type: 'limit' | 'business' | 'format';
}

export interface ClaimValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface MultiClaimValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  claimErrors: Record<string, ValidationError[]>;
}

/**
 * Category limit information extracted from category lookup
 */
interface CategoryLimit {
  hasLimit: boolean;
  amount: number | null;
}

/**
 * Single O(1) lookup for category limit information.
 * Replaces redundant hasMonthlyLimit() + getMonthlyLimit() calls.
 */
function getCategoryLimit(
  category: string,
  categoryMap: Map<string, IClaimCategory>,
): CategoryLimit {
  const cat = categoryMap.get(category);
  if (!cat || cat.limit?.type !== 'monthly') {
    return { hasLimit: false, amount: null };
  }
  return { hasLimit: true, amount: cat.limit.amount };
}

/**
 * Build category lookup map for O(1) access.
 * Called once per validation cycle instead of O(n) searches per category.
 */
function buildCategoryMap(
  categories: IClaimCategory[],
): Map<string, IClaimCategory> {
  return new Map(categories.map((cat) => [cat.code, cat]));
}

/**
 * Validates a single claim for basic business rules
 */
export function validateSingleClaim(
  claim: IClaimCreateRequest,
): ClaimValidationResult {
  const errors: ValidationError[] = [];

  // Amount validation
  if (!claim.totalAmount || claim.totalAmount <= 0) {
    errors.push({
      field: 'totalAmount',
      message: 'Amount must be positive',
      type: 'business',
    });
  }

  // Month validation
  if (!claim.month || claim.month < 1 || claim.month > 12) {
    errors.push({
      field: 'month',
      message: 'Invalid month',
      type: 'format',
    });
  }

  // Year validation
  const currentYear = new Date().getFullYear();
  if (!claim.year || claim.year < 2020 || claim.year > currentYear + 1) {
    errors.push({
      field: 'year',
      message: 'Invalid year',
      type: 'format',
    });
  }

  // Submission deadline validation (2-month rule)
  if (claim.month && claim.year) {
    const expenseDate = new Date(claim.year, claim.month - 1, 1);
    const currentDate = new Date();
    const deadlineDate = new Date(expenseDate);
    deadlineDate.setMonth(
      deadlineDate.getMonth() + CLAIM_SUBMISSION_DEADLINE_MONTHS,
    );

    if (currentDate > deadlineDate) {
      errors.push({
        field: 'month',
        message: `Claims must be submitted within ${CLAIM_SUBMISSION_DEADLINE_MONTHS} months of expense date`,
        type: 'business',
      });
    }
  }

  // Category-specific validation
  if (claim.category === 'others' && !claim.claimName?.trim()) {
    errors.push({
      field: 'claimName',
      message: 'Claim name is required for Others category',
      type: 'business',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates monthly limits for claims with the same category, month, and year
 */
export function validateMonthlyLimits(
  claims: IClaimCreateRequest[],
  existingClaims: IClaimMetadata[] = [],
  categories: IClaimCategory[] = [],
): ClaimValidationResult {
  const errors: ValidationError[] = [];
  const categoryMap = buildCategoryMap(categories);

  // Group claims by category, month, and year
  const claimGroups = new Map<
    string,
    { claims: IClaimCreateRequest[]; total: number }
  >();

  // Add existing claims to the groups
  existingClaims.forEach((existingClaim) => {
    const key = `${existingClaim.category}-${existingClaim.month}-${existingClaim.year}`;
    if (!claimGroups.has(key)) {
      claimGroups.set(key, { claims: [], total: 0 });
    }
    claimGroups.get(key)!.total += existingClaim.totalAmount;
  });

  // Add new claims to the groups
  claims.forEach((claim) => {
    const key = `${claim.category}-${claim.month}-${claim.year}`;
    if (!claimGroups.has(key)) {
      claimGroups.set(key, { claims: [], total: 0 });
    }
    const group = claimGroups.get(key)!;
    group.claims.push(claim);
    group.total += claim.totalAmount;
  });

  // Check monthly limits for limited categories
  claimGroups.forEach((group, key) => {
    const [category, month, year] = key.split('-');
    const categoryLimit = getCategoryLimit(category, categoryMap);

    if (!categoryLimit.hasLimit || group.total <= categoryLimit.amount!) {
      return;
    }

    errors.push({
      field: 'totalAmount',
      message: `${category.toUpperCase()} monthly limit of $${categoryLimit.amount} exceeded ($${group.total.toFixed(2)}) for ${month}/${year}`,
      type: 'limit',
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Comprehensive validation for multiple claims
 */
export function validateMultipleClaims(
  claims: IClaimCreateRequest[],
  existingClaims: IClaimMetadata[] = [],
  categories: IClaimCategory[] = [],
): MultiClaimValidationResult {
  const claimErrors: Record<string, ValidationError[]> = {};
  const globalErrors: ValidationError[] = [];

  // Validate each claim individually
  claims.forEach((claim, index) => {
    const claimValidation = validateSingleClaim(claim);
    if (!claimValidation.isValid) {
      claimErrors[`claim-${index}`] = claimValidation.errors;
    }
  });

  // Validate monthly limits across all claims
  const monthlyLimitValidation = validateMonthlyLimits(
    claims,
    existingClaims,
    categories,
  );
  if (!monthlyLimitValidation.isValid) {
    globalErrors.push(...monthlyLimitValidation.errors);
  }

  // Check for duplicate claims (same category, month, year within the submission)
  const claimKeys = new Map<string, number[]>();
  claims.forEach((claim, index) => {
    const key = `${claim.category}-${claim.month}-${claim.year}`;
    if (!claimKeys.has(key)) {
      claimKeys.set(key, []);
    }
    claimKeys.get(key)!.push(index);
  });

  claimKeys.forEach((indices, key) => {
    if (indices.length > 1) {
      const [category, month, year] = key.split('-');
      indices.forEach((index) => {
        if (!claimErrors[`claim-${index}`]) {
          claimErrors[`claim-${index}`] = [];
        }
        claimErrors[`claim-${index}`].push({
          field: 'category',
          message: `Duplicate claim for ${category.toUpperCase()} in ${month}/${year}`,
          type: 'business',
        });
      });
    }
  });

  const hasClaimErrors = Object.keys(claimErrors).length > 0;
  const hasGlobalErrors = globalErrors.length > 0;

  return {
    isValid: !hasClaimErrors && !hasGlobalErrors,
    errors: globalErrors,
    claimErrors,
  };
}

/**
 * Check if a category has monthly limits
 */
export function hasMonthlyLimit(
  category: string,
  categories: IClaimCategory[],
): boolean {
  const categoryMap = buildCategoryMap(categories);
  return getCategoryLimit(category, categoryMap).hasLimit;
}

/**
 * Get the monthly limit for a category
 */
export function getMonthlyLimit(
  category: string,
  categories: IClaimCategory[],
): number | null {
  const categoryMap = buildCategoryMap(categories);
  return getCategoryLimit(category, categoryMap).amount;
}

/**
 * Calculate remaining limit for a category in a specific month/year
 */
export function calculateRemainingLimit(
  category: string,
  month: number,
  year: number,
  existingClaims: IClaimMetadata[],
  categories: IClaimCategory[],
): number | null {
  const categoryMap = buildCategoryMap(categories);
  const categoryLimit = getCategoryLimit(category, categoryMap);

  if (!categoryLimit.hasLimit) {
    return null;
  }

  const usedAmount = existingClaims
    .filter(
      (claim) =>
        claim.category === category &&
        claim.month === month &&
        claim.year === year,
    )
    .reduce((sum, claim) => sum + claim.totalAmount, 0);

  return Math.max(0, categoryLimit.amount! - usedAmount);
}

/**
 * Utility function to format validation errors for display
 */
export function formatValidationErrors(
  result: MultiClaimValidationResult,
): string[] {
  const messages: string[] = [];

  // Add global errors
  result.errors.forEach((error) => {
    messages.push(error.message);
  });

  // Add claim-specific errors
  Object.entries(result.claimErrors).forEach(([claimKey, errors]) => {
    const claimIndex = claimKey.replace('claim-', '');
    errors.forEach((error) => {
      messages.push(`Claim ${parseInt(claimIndex) + 1}: ${error.message}`);
    });
  });

  return messages;
}
