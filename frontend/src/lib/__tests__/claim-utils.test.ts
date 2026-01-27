/**
 * Unit tests for claim-utils.ts
 * Tests claim formatting, status configuration, and monthly limit validation
 */

import { describe, it, expect } from 'vitest';
import { ClaimStatus } from '@project/types';
import {
  getCategoryDisplayName,
  getClaimStatusConfig,
  validateMonthlyLimit,
} from '../claim-utils';
import { FileText, Send, CheckCircle, XCircle } from 'lucide-react';

// Mock categories data for testing
const mockCategories = [
  {
    code: 'telco',
    name: 'Telecommunications',
    limit: { type: 'monthly' as const, amount: 150 },
  },
  {
    code: 'fitness',
    name: 'Fitness & Wellness',
    limit: { type: 'monthly' as const, amount: 50 },
  },
  { code: 'dental', name: 'Dental Care', limit: null },
  { code: 'skill-enhancement', name: 'Skill Enhancement', limit: null },
  { code: 'company-event', name: 'Company Event', limit: null },
  { code: 'company-lunch', name: 'Company Lunch', limit: null },
  { code: 'company-dinner', name: 'Company Dinner', limit: null },
  { code: 'others', name: 'Others', limit: null },
];

describe('claim-utils', () => {
  describe('getCategoryDisplayName', () => {
    it('should return correct display name for telco category', () => {
      expect(getCategoryDisplayName('telco', mockCategories)).toBe(
        'Telecommunications',
      );
    });

    it('should return correct display name for fitness category', () => {
      expect(getCategoryDisplayName('fitness', mockCategories)).toBe(
        'Fitness & Wellness',
      );
    });

    it('should return correct display name for dental category', () => {
      expect(getCategoryDisplayName('dental', mockCategories)).toBe(
        'Dental Care',
      );
    });

    it('should return correct display name for skill-enhancement category', () => {
      expect(getCategoryDisplayName('skill-enhancement', mockCategories)).toBe(
        'Skill Enhancement',
      );
    });

    it('should return correct display name for company-event category', () => {
      expect(getCategoryDisplayName('company-event', mockCategories)).toBe(
        'Company Event',
      );
    });

    it('should return correct display name for company-lunch category', () => {
      expect(getCategoryDisplayName('company-lunch', mockCategories)).toBe(
        'Company Lunch',
      );
    });

    it('should return correct display name for company-dinner category', () => {
      expect(getCategoryDisplayName('company-dinner', mockCategories)).toBe(
        'Company Dinner',
      );
    });

    it('should return correct display name for others category', () => {
      expect(getCategoryDisplayName('others', mockCategories)).toBe('Others');
    });

    it('should return original category code for unknown category', () => {
      expect(getCategoryDisplayName('unknown', mockCategories)).toBe('unknown');
    });

    it('should handle empty categories array', () => {
      expect(getCategoryDisplayName('telco', [])).toBe('telco');
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

  describe('validateMonthlyLimit', () => {
    describe('telco category (150 SGD limit)', () => {
      it('should validate when amount is within limit', () => {
        const result = validateMonthlyLimit('telco', 100, 0, mockCategories);
        expect(result.isValid).toBe(true);
        expect(result.limit).toBe(150);
        expect(result.message).toBeUndefined();
      });

      it('should validate when amount exactly equals limit', () => {
        const result = validateMonthlyLimit('telco', 150, 0, mockCategories);
        expect(result.isValid).toBe(true);
        expect(result.limit).toBe(150);
        expect(result.message).toBeUndefined();
      });

      it('should fail validation when amount exceeds limit', () => {
        const result = validateMonthlyLimit('telco', 200, 0, mockCategories);
        expect(result.isValid).toBe(false);
        expect(result.limit).toBe(150);
        expect(result.message).toContain('exceeds monthly limit');
        expect(result.message).toContain('SGD 200.00');
        expect(result.message).toContain('SGD 150.00');
      });

      it('should validate when amount with existing total is within limit', () => {
        const result = validateMonthlyLimit('telco', 50, 80, mockCategories);
        expect(result.isValid).toBe(true);
        expect(result.limit).toBe(150);
      });

      it('should fail validation when amount with existing total exceeds limit', () => {
        const result = validateMonthlyLimit('telco', 100, 80, mockCategories);
        expect(result.isValid).toBe(false);
        expect(result.limit).toBe(150);
        expect(result.message).toContain('SGD 180.00');
      });
    });

    describe('fitness category (50 SGD limit)', () => {
      it('should validate when amount is within limit', () => {
        const result = validateMonthlyLimit('fitness', 30, 0, mockCategories);
        expect(result.isValid).toBe(true);
        expect(result.limit).toBe(50);
      });

      it('should validate when amount exactly equals limit', () => {
        const result = validateMonthlyLimit('fitness', 50, 0, mockCategories);
        expect(result.isValid).toBe(true);
        expect(result.limit).toBe(50);
      });

      it('should fail validation when amount exceeds limit', () => {
        const result = validateMonthlyLimit('fitness', 60, 0, mockCategories);
        expect(result.isValid).toBe(false);
        expect(result.limit).toBe(50);
        expect(result.message).toContain('exceeds monthly limit');
      });

      it('should validate when amount with existing total is within limit', () => {
        const result = validateMonthlyLimit('fitness', 20, 25, mockCategories);
        expect(result.isValid).toBe(true);
        expect(result.limit).toBe(50);
      });

      it('should fail validation when amount with existing total exceeds limit', () => {
        const result = validateMonthlyLimit('fitness', 30, 25, mockCategories);
        expect(result.isValid).toBe(false);
        expect(result.limit).toBe(50);
      });
    });

    describe('Categories without limits', () => {
      it('should always validate dental category regardless of amount', () => {
        const result = validateMonthlyLimit('dental', 10000, 0, mockCategories);
        expect(result.isValid).toBe(true);
        expect(result.limit).toBeNull();
        expect(result.message).toBeUndefined();
      });

      it('should always validate skill-enhancement category regardless of amount', () => {
        const result = validateMonthlyLimit(
          'skill-enhancement',
          5000,
          0,
          mockCategories,
        );
        expect(result.isValid).toBe(true);
        expect(result.limit).toBeNull();
      });

      it('should always validate company-event category regardless of amount', () => {
        const result = validateMonthlyLimit(
          'company-event',
          2000,
          0,
          mockCategories,
        );
        expect(result.isValid).toBe(true);
        expect(result.limit).toBeNull();
      });

      it('should always validate company-lunch category regardless of amount', () => {
        const result = validateMonthlyLimit(
          'company-lunch',
          500,
          0,
          mockCategories,
        );
        expect(result.isValid).toBe(true);
        expect(result.limit).toBeNull();
      });

      it('should always validate company-dinner category regardless of amount', () => {
        const result = validateMonthlyLimit(
          'company-dinner',
          1000,
          0,
          mockCategories,
        );
        expect(result.isValid).toBe(true);
        expect(result.limit).toBeNull();
      });

      it('should always validate others category regardless of amount', () => {
        const result = validateMonthlyLimit('others', 99999, 0, mockCategories);
        expect(result.isValid).toBe(true);
        expect(result.limit).toBeNull();
      });
    });

    describe('Edge cases', () => {
      it('should handle zero amount', () => {
        const result = validateMonthlyLimit('telco', 0, 0, mockCategories);
        expect(result.isValid).toBe(true);
        expect(result.limit).toBe(150);
      });

      it('should handle decimal amounts', () => {
        const result = validateMonthlyLimit('telco', 149.99, 0, mockCategories);
        expect(result.isValid).toBe(true);
        expect(result.limit).toBe(150);
      });

      it('should handle decimal amounts that exceed limit', () => {
        const result = validateMonthlyLimit('telco', 150.01, 0, mockCategories);
        expect(result.isValid).toBe(false);
        expect(result.limit).toBe(150);
      });

      it('should handle unknown category code', () => {
        const result = validateMonthlyLimit('unknown', 100, 0, mockCategories);
        expect(result.isValid).toBe(true);
        expect(result.limit).toBeNull();
      });

      it('should handle empty categories array', () => {
        const result = validateMonthlyLimit('telco', 100, 0, []);
        expect(result.isValid).toBe(true);
        expect(result.limit).toBeNull();
      });
    });
  });
});
