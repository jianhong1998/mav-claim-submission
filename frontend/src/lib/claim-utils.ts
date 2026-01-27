/**
 * Claim Utilities
 * Centralized claim formatting, validation, and display logic
 */

import { ClaimStatus } from '@project/types';
import { FileText, Send, CheckCircle, XCircle, LucideIcon } from 'lucide-react';

/**
 * Status configuration structure
 */
export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: LucideIcon;
}

/**
 * Gets category display name for UI
 * Converts internal category codes to user-friendly display names
 */
export const getCategoryDisplayName = (
  categoryCode: string,
  categories: Array<{ code: string; name: string }>,
): string => {
  const category = categories.find((cat) => cat.code === categoryCode);
  return category?.name || categoryCode;
};

/**
 * Gets claim status configuration for consistent UI display
 * Returns status label, color classes, border color, and icon
 */
export const getClaimStatusConfig = (status: ClaimStatus): StatusConfig => {
  switch (status) {
    case ClaimStatus.DRAFT:
      return {
        label: 'Draft',
        color: 'text-gray-500',
        bgColor: 'bg-gray-500/10',
        borderColor: 'border-gray-500',
        icon: FileText,
      };
    case ClaimStatus.SENT:
      return {
        label: 'Submitted',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500',
        icon: Send,
      };
    case ClaimStatus.PAID:
      return {
        label: 'Paid',
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500',
        icon: CheckCircle,
      };
    case ClaimStatus.FAILED:
      return {
        label: 'Failed',
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500',
        icon: XCircle,
      };
    default:
      return {
        label: 'Unknown',
        color: 'text-gray-500',
        bgColor: 'bg-gray-500/10',
        borderColor: 'border-gray-500',
        icon: FileText,
      };
  }
};

/**
 * Validation result structure
 */
export interface MonthlyLimitValidation {
  isValid: boolean;
  limit: number | null;
  message?: string;
}

/**
 * Validates if claim amount is within monthly category limit
 *
 * @param categoryCode - Claim category code
 * @param amount - Total claim amount
 * @param existingTotal - Optional total of existing claims in the same month/year
 * @param categories - Array of category definitions with limits
 * @returns Validation result with status and limit information
 */
export const validateMonthlyLimit = (
  categoryCode: string,
  amount: number,
  existingTotal = 0,
  categories: Array<{
    code: string;
    limit: { type: 'monthly' | 'yearly'; amount: number } | null;
  }>,
): MonthlyLimitValidation => {
  const category = categories.find((cat) => cat.code === categoryCode);
  const limit =
    category?.limit?.type === 'monthly' ? category.limit.amount : null;

  // No limit for categories without restrictions
  if (limit === null) {
    return {
      isValid: true,
      limit: null,
    };
  }

  const totalAmount = amount + existingTotal;

  if (totalAmount > limit) {
    return {
      isValid: false,
      limit,
      message: `Total amount (SGD ${totalAmount.toFixed(2)}) exceeds monthly limit of SGD ${limit.toFixed(2)}`,
    };
  }

  return {
    isValid: true,
    limit,
  };
};
