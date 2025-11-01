/**
 * Unit tests for claim-utils.ts
 * Tests claim formatting, status configuration, and monthly limit validation
 */

import { describe, it, expect } from 'vitest';
import { ClaimCategory, ClaimStatus } from '@project/types';
import {
  getCategoryDisplayName,
  getClaimStatusConfig,
  validateMonthlyLimit,
  MONTHLY_LIMITS,
} from '../claim-utils';
import { FileText, Send, CheckCircle, XCircle } from 'lucide-react';

describe('claim-utils', () => {
  describe('getCategoryDisplayName', () => {
    it('should return correct display name for TELCO category', () => {
      expect(getCategoryDisplayName(ClaimCategory.TELCO)).toBe(
        'Telecommunications',
      );
    });

    it('should return correct display name for FITNESS category', () => {
      expect(getCategoryDisplayName(ClaimCategory.FITNESS)).toBe(
        'Fitness & Wellness',
      );
    });

    it('should return correct display name for DENTAL category', () => {
      expect(getCategoryDisplayName(ClaimCategory.DENTAL)).toBe('Dental Care');
    });

    it('should return correct display name for SKILL_ENHANCEMENT category', () => {
      expect(getCategoryDisplayName(ClaimCategory.SKILL_ENHANCEMENT)).toBe(
        'Skill Enhancement',
      );
    });

    it('should return correct display name for COMPANY_EVENT category', () => {
      expect(getCategoryDisplayName(ClaimCategory.COMPANY_EVENT)).toBe(
        'Company Event',
      );
    });

    it('should return correct display name for COMPANY_LUNCH category', () => {
      expect(getCategoryDisplayName(ClaimCategory.COMPANY_LUNCH)).toBe(
        'Company Lunch',
      );
    });

    it('should return correct display name for COMPANY_DINNER category', () => {
      expect(getCategoryDisplayName(ClaimCategory.COMPANY_DINNER)).toBe(
        'Company Dinner',
      );
    });

    it('should return correct display name for OTHERS category', () => {
      expect(getCategoryDisplayName(ClaimCategory.OTHERS)).toBe('Others');
    });

    it('should return original category for unknown category', () => {
      expect(getCategoryDisplayName('unknown' as ClaimCategory)).toBe(
        'unknown',
      );
    });
  });

  describe('getClaimStatusConfig', () => {
    it('should return correct config for DRAFT status', () => {
      const config = getClaimStatusConfig(ClaimStatus.DRAFT);
      expect(config.label).toBe('Draft');
      expect(config.color).toBe('text-gray-500');
      expect(config.bgColor).toBe('bg-gray-500/10');
      expect(config.borderColor).toBe('border-gray-500');
      expect(config.icon).toBe(FileText);
    });

    it('should return correct config for SENT status', () => {
      const config = getClaimStatusConfig(ClaimStatus.SENT);
      expect(config.label).toBe('Submitted');
      expect(config.color).toBe('text-blue-500');
      expect(config.bgColor).toBe('bg-blue-500/10');
      expect(config.borderColor).toBe('border-blue-500');
      expect(config.icon).toBe(Send);
    });

    it('should return correct config for PAID status', () => {
      const config = getClaimStatusConfig(ClaimStatus.PAID);
      expect(config.label).toBe('Paid');
      expect(config.color).toBe('text-green-500');
      expect(config.bgColor).toBe('bg-green-500/10');
      expect(config.borderColor).toBe('border-green-500');
      expect(config.icon).toBe(CheckCircle);
    });

    it('should return correct config for FAILED status', () => {
      const config = getClaimStatusConfig(ClaimStatus.FAILED);
      expect(config.label).toBe('Failed');
      expect(config.color).toBe('text-red-500');
      expect(config.bgColor).toBe('bg-red-500/10');
      expect(config.borderColor).toBe('border-red-500');
      expect(config.icon).toBe(XCircle);
    });

    it('should return default config for unknown status', () => {
      const config = getClaimStatusConfig('unknown' as ClaimStatus);
      expect(config.label).toBe('Unknown');
      expect(config.color).toBe('text-gray-500');
      expect(config.bgColor).toBe('bg-gray-500/10');
      expect(config.borderColor).toBe('border-gray-500');
      expect(config.icon).toBe(FileText);
    });
  });

  describe('MONTHLY_LIMITS', () => {
    it('should have correct limit for TELCO category', () => {
      expect(MONTHLY_LIMITS[ClaimCategory.TELCO]).toBe(150);
    });

    it('should have correct limit for FITNESS category', () => {
      expect(MONTHLY_LIMITS[ClaimCategory.FITNESS]).toBe(50);
    });

    it('should have no limit for DENTAL category', () => {
      expect(MONTHLY_LIMITS[ClaimCategory.DENTAL]).toBeNull();
    });

    it('should have no limit for SKILL_ENHANCEMENT category', () => {
      expect(MONTHLY_LIMITS[ClaimCategory.SKILL_ENHANCEMENT]).toBeNull();
    });

    it('should have no limit for COMPANY_EVENT category', () => {
      expect(MONTHLY_LIMITS[ClaimCategory.COMPANY_EVENT]).toBeNull();
    });

    it('should have no limit for COMPANY_LUNCH category', () => {
      expect(MONTHLY_LIMITS[ClaimCategory.COMPANY_LUNCH]).toBeNull();
    });

    it('should have no limit for COMPANY_DINNER category', () => {
      expect(MONTHLY_LIMITS[ClaimCategory.COMPANY_DINNER]).toBeNull();
    });

    it('should have no limit for OTHERS category', () => {
      expect(MONTHLY_LIMITS[ClaimCategory.OTHERS]).toBeNull();
    });
  });

  describe('validateMonthlyLimit', () => {
    describe('TELCO category (150 SGD limit)', () => {
      it('should validate when amount is within limit', () => {
        const result = validateMonthlyLimit(ClaimCategory.TELCO, 100);
        expect(result.isValid).toBe(true);
        expect(result.limit).toBe(150);
        expect(result.message).toBeUndefined();
      });

      it('should validate when amount exactly equals limit', () => {
        const result = validateMonthlyLimit(ClaimCategory.TELCO, 150);
        expect(result.isValid).toBe(true);
        expect(result.limit).toBe(150);
        expect(result.message).toBeUndefined();
      });

      it('should fail validation when amount exceeds limit', () => {
        const result = validateMonthlyLimit(ClaimCategory.TELCO, 200);
        expect(result.isValid).toBe(false);
        expect(result.limit).toBe(150);
        expect(result.message).toContain('exceeds monthly limit');
        expect(result.message).toContain('SGD 200.00');
        expect(result.message).toContain('SGD 150.00');
      });

      it('should validate when amount with existing total is within limit', () => {
        const result = validateMonthlyLimit(ClaimCategory.TELCO, 50, 80);
        expect(result.isValid).toBe(true);
        expect(result.limit).toBe(150);
      });

      it('should fail validation when amount with existing total exceeds limit', () => {
        const result = validateMonthlyLimit(ClaimCategory.TELCO, 100, 80);
        expect(result.isValid).toBe(false);
        expect(result.limit).toBe(150);
        expect(result.message).toContain('SGD 180.00');
      });
    });

    describe('FITNESS category (50 SGD limit)', () => {
      it('should validate when amount is within limit', () => {
        const result = validateMonthlyLimit(ClaimCategory.FITNESS, 30);
        expect(result.isValid).toBe(true);
        expect(result.limit).toBe(50);
      });

      it('should validate when amount exactly equals limit', () => {
        const result = validateMonthlyLimit(ClaimCategory.FITNESS, 50);
        expect(result.isValid).toBe(true);
        expect(result.limit).toBe(50);
      });

      it('should fail validation when amount exceeds limit', () => {
        const result = validateMonthlyLimit(ClaimCategory.FITNESS, 60);
        expect(result.isValid).toBe(false);
        expect(result.limit).toBe(50);
        expect(result.message).toContain('exceeds monthly limit');
      });

      it('should validate when amount with existing total is within limit', () => {
        const result = validateMonthlyLimit(ClaimCategory.FITNESS, 20, 25);
        expect(result.isValid).toBe(true);
        expect(result.limit).toBe(50);
      });

      it('should fail validation when amount with existing total exceeds limit', () => {
        const result = validateMonthlyLimit(ClaimCategory.FITNESS, 30, 25);
        expect(result.isValid).toBe(false);
        expect(result.limit).toBe(50);
      });
    });

    describe('Categories without limits', () => {
      it('should always validate DENTAL category regardless of amount', () => {
        const result = validateMonthlyLimit(ClaimCategory.DENTAL, 10000);
        expect(result.isValid).toBe(true);
        expect(result.limit).toBeNull();
        expect(result.message).toBeUndefined();
      });

      it('should always validate SKILL_ENHANCEMENT category regardless of amount', () => {
        const result = validateMonthlyLimit(
          ClaimCategory.SKILL_ENHANCEMENT,
          5000,
        );
        expect(result.isValid).toBe(true);
        expect(result.limit).toBeNull();
      });

      it('should always validate COMPANY_EVENT category regardless of amount', () => {
        const result = validateMonthlyLimit(ClaimCategory.COMPANY_EVENT, 2000);
        expect(result.isValid).toBe(true);
        expect(result.limit).toBeNull();
      });

      it('should always validate COMPANY_LUNCH category regardless of amount', () => {
        const result = validateMonthlyLimit(ClaimCategory.COMPANY_LUNCH, 500);
        expect(result.isValid).toBe(true);
        expect(result.limit).toBeNull();
      });

      it('should always validate COMPANY_DINNER category regardless of amount', () => {
        const result = validateMonthlyLimit(ClaimCategory.COMPANY_DINNER, 1000);
        expect(result.isValid).toBe(true);
        expect(result.limit).toBeNull();
      });

      it('should always validate OTHERS category regardless of amount', () => {
        const result = validateMonthlyLimit(ClaimCategory.OTHERS, 99999);
        expect(result.isValid).toBe(true);
        expect(result.limit).toBeNull();
      });
    });

    describe('Edge cases', () => {
      it('should handle zero amount', () => {
        const result = validateMonthlyLimit(ClaimCategory.TELCO, 0);
        expect(result.isValid).toBe(true);
        expect(result.limit).toBe(150);
      });

      it('should handle decimal amounts', () => {
        const result = validateMonthlyLimit(ClaimCategory.TELCO, 149.99);
        expect(result.isValid).toBe(true);
        expect(result.limit).toBe(150);
      });

      it('should handle decimal amounts that exceed limit', () => {
        const result = validateMonthlyLimit(ClaimCategory.TELCO, 150.01);
        expect(result.isValid).toBe(false);
        expect(result.limit).toBe(150);
      });
    });
  });
});
