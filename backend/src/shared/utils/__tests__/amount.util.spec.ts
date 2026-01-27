import { describe, it, expect } from 'vitest';
import { AmountUtil } from '../amount.util';

describe('AmountUtil', () => {
  describe('convertCentToDollar', () => {
    it('should convert 100 cents to 1 dollar', () => {
      expect(AmountUtil.convertCentToDollar(100)).toBe(1);
    });

    it('should convert 0 cents to 0 dollars', () => {
      expect(AmountUtil.convertCentToDollar(0)).toBe(0);
    });

    it('should convert 50 cents to 0.5 dollars', () => {
      expect(AmountUtil.convertCentToDollar(50)).toBe(0.5);
    });

    it('should convert 1 cent to 0.01 dollars', () => {
      expect(AmountUtil.convertCentToDollar(1)).toBe(0.01);
    });

    it('should handle large amounts', () => {
      expect(AmountUtil.convertCentToDollar(1000000)).toBe(10000);
    });

    it('should handle negative cents', () => {
      expect(AmountUtil.convertCentToDollar(-500)).toBe(-5);
    });
  });
});
