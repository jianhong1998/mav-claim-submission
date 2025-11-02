/**
 * Unit tests for format-utils.ts
 * Tests date and currency formatting utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  formatAmount,
  formatMonthYear,
  formatDate,
  formatRelativeTime,
} from '../format-utils';

describe('format-utils', () => {
  describe('formatAmount', () => {
    it('should format whole numbers correctly', () => {
      expect(formatAmount(100)).toBe('SGD\u00A0100.00');
      expect(formatAmount(0)).toBe('SGD\u00A00.00');
      expect(formatAmount(1)).toBe('SGD\u00A01.00');
    });

    it('should format decimal amounts correctly', () => {
      expect(formatAmount(100.5)).toBe('SGD\u00A0100.50');
      expect(formatAmount(99.99)).toBe('SGD\u00A099.99');
      expect(formatAmount(1234.56)).toBe('SGD\u00A01,234.56');
    });

    it('should format large amounts with thousand separators', () => {
      expect(formatAmount(1000)).toBe('SGD\u00A01,000.00');
      expect(formatAmount(10000)).toBe('SGD\u00A010,000.00');
      expect(formatAmount(100000)).toBe('SGD\u00A0100,000.00');
      expect(formatAmount(1000000)).toBe('SGD\u00A01,000,000.00');
    });

    it('should handle negative amounts', () => {
      expect(formatAmount(-50)).toBe('-SGD\u00A050.00');
      expect(formatAmount(-1234.56)).toBe('-SGD\u00A01,234.56');
    });

    it('should round to 2 decimal places', () => {
      expect(formatAmount(100.123)).toBe('SGD\u00A0100.12');
      expect(formatAmount(100.126)).toBe('SGD\u00A0100.13');
      expect(formatAmount(99.995)).toBe('SGD\u00A0100.00');
    });

    it('should handle very small amounts', () => {
      expect(formatAmount(0.01)).toBe('SGD\u00A00.01');
      expect(formatAmount(0.1)).toBe('SGD\u00A00.10');
    });

    it('should handle edge case amounts', () => {
      expect(formatAmount(150)).toBe('SGD\u00A0150.00'); // TELCO limit
      expect(formatAmount(50)).toBe('SGD\u00A050.00'); // FITNESS limit
    });
  });

  describe('formatMonthYear', () => {
    it('should format January correctly', () => {
      expect(formatMonthYear(1, 2024)).toBe('January 2024');
    });

    it('should format December correctly', () => {
      expect(formatMonthYear(12, 2023)).toBe('December 2023');
    });

    it('should format all months correctly', () => {
      expect(formatMonthYear(1, 2024)).toBe('January 2024');
      expect(formatMonthYear(2, 2024)).toBe('February 2024');
      expect(formatMonthYear(3, 2024)).toBe('March 2024');
      expect(formatMonthYear(4, 2024)).toBe('April 2024');
      expect(formatMonthYear(5, 2024)).toBe('May 2024');
      expect(formatMonthYear(6, 2024)).toBe('June 2024');
      expect(formatMonthYear(7, 2024)).toBe('July 2024');
      expect(formatMonthYear(8, 2024)).toBe('August 2024');
      expect(formatMonthYear(9, 2024)).toBe('September 2024');
      expect(formatMonthYear(10, 2024)).toBe('October 2024');
      expect(formatMonthYear(11, 2024)).toBe('November 2024');
      expect(formatMonthYear(12, 2024)).toBe('December 2024');
    });

    it('should format different years correctly', () => {
      expect(formatMonthYear(1, 2023)).toBe('January 2023');
      expect(formatMonthYear(1, 2024)).toBe('January 2024');
      expect(formatMonthYear(1, 2025)).toBe('January 2025');
    });

    it('should handle historical dates', () => {
      expect(formatMonthYear(6, 2020)).toBe('June 2020');
      expect(formatMonthYear(12, 2015)).toBe('December 2015');
    });

    it('should handle future dates', () => {
      expect(formatMonthYear(1, 2030)).toBe('January 2030');
      expect(formatMonthYear(12, 2050)).toBe('December 2050');
    });
  });

  describe('formatDate', () => {
    it('should format Date object with default options', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatDate(date);
      // Default format is MM/DD/YYYY
      expect(formatted).toMatch(/1\/15\/2024/);
    });

    it('should format ISO string with default options', () => {
      const formatted = formatDate('2024-01-15T10:30:00Z');
      expect(formatted).toMatch(/1\/15\/2024/);
    });

    it('should format with dateStyle long option', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatDate(date, { dateStyle: 'long' });
      expect(formatted).toContain('January');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });

    it('should format with dateStyle medium option', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatDate(date, { dateStyle: 'medium' });
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });

    it('should format with dateStyle short option', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatDate(date, { dateStyle: 'short' });
      expect(formatted).toMatch(/1\/15\/24/);
    });

    it('should format with custom month and year options', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatDate(date, { month: 'long', year: 'numeric' });
      expect(formatted).toBe('January 2024');
    });

    it('should format with weekday option', () => {
      const date = new Date('2024-01-15T10:30:00Z'); // Monday
      const formatted = formatDate(date, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      expect(formatted).toContain('Monday');
      expect(formatted).toContain('January');
    });

    it('should handle different date objects', () => {
      const date1 = new Date('2023-12-31T00:00:00Z');
      const date2 = new Date('2024-06-15T12:00:00Z');

      expect(formatDate(date1)).toMatch(/12\/31\/2023/);
      expect(formatDate(date2)).toMatch(/6\/15\/2024/);
    });
  });

  describe('formatRelativeTime', () => {
    let originalDateNow: typeof Date.now;
    const MOCK_NOW = new Date('2024-01-15T12:00:00Z').getTime();

    beforeEach(() => {
      originalDateNow = Date.now;
      Date.now = vi.fn(() => MOCK_NOW);
    });

    afterEach(() => {
      Date.now = originalDateNow;
    });

    it('should format seconds ago', () => {
      const thirtySecondsAgo = new Date(MOCK_NOW - 30 * 1000);
      expect(formatRelativeTime(thirtySecondsAgo)).toBe('30 seconds ago');
    });

    it('should format one minute ago', () => {
      const oneMinuteAgo = new Date(MOCK_NOW - 60 * 1000);
      expect(formatRelativeTime(oneMinuteAgo)).toBe('1 minute ago');
    });

    it('should format minutes ago', () => {
      const fiveMinutesAgo = new Date(MOCK_NOW - 5 * 60 * 1000);
      expect(formatRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');
    });

    it('should format one hour ago', () => {
      const oneHourAgo = new Date(MOCK_NOW - 60 * 60 * 1000);
      expect(formatRelativeTime(oneHourAgo)).toBe('1 hour ago');
    });

    it('should format hours ago', () => {
      const twoHoursAgo = new Date(MOCK_NOW - 2 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoHoursAgo)).toBe('2 hours ago');
    });

    it('should format one day ago', () => {
      const oneDayAgo = new Date(MOCK_NOW - 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(oneDayAgo)).toBe('1 day ago');
    });

    it('should format days ago', () => {
      const twoDaysAgo = new Date(MOCK_NOW - 2 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoDaysAgo)).toBe('2 days ago');
    });

    it('should format one week ago', () => {
      const oneWeekAgo = new Date(MOCK_NOW - 7 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(oneWeekAgo)).toBe('1 week ago');
    });

    it('should format weeks ago', () => {
      const twoWeeksAgo = new Date(MOCK_NOW - 14 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoWeeksAgo)).toBe('2 weeks ago');
    });

    it('should format one month ago', () => {
      const oneMonthAgo = new Date(MOCK_NOW - 30 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(oneMonthAgo)).toBe('1 month ago');
    });

    it('should format months ago', () => {
      const threeMonthsAgo = new Date(MOCK_NOW - 90 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(threeMonthsAgo)).toBe('3 months ago');
    });

    it('should format one year ago', () => {
      const oneYearAgo = new Date(MOCK_NOW - 365 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(oneYearAgo)).toBe('1 year ago');
    });

    it('should format years ago', () => {
      const twoYearsAgo = new Date(MOCK_NOW - 2 * 365 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoYearsAgo)).toBe('2 years ago');
    });

    it('should format future times (in X)', () => {
      const inOneHour = new Date(MOCK_NOW + 60 * 60 * 1000);
      expect(formatRelativeTime(inOneHour)).toBe('in 1 hour');

      const inTwoDays = new Date(MOCK_NOW + 2 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(inTwoDays)).toBe('in 2 days');
    });

    it('should format just now for current time', () => {
      const now = new Date(MOCK_NOW);
      const result = formatRelativeTime(now);
      // With numeric: 'always', should be "0 seconds ago" or "in 0 seconds"
      expect(result).toMatch(/0 seconds/);
    });

    it('should handle ISO string input', () => {
      const twoDaysAgo = new Date(
        MOCK_NOW - 2 * 24 * 60 * 60 * 1000,
      ).toISOString();
      expect(formatRelativeTime(twoDaysAgo)).toBe('2 days ago');
    });

    it('should handle edge cases near boundaries', () => {
      const almostOneHour = new Date(MOCK_NOW - 59 * 60 * 1000);
      expect(formatRelativeTime(almostOneHour)).toBe('59 minutes ago');

      const justOverOneHour = new Date(MOCK_NOW - 61 * 60 * 1000);
      expect(formatRelativeTime(justOverOneHour)).toBe('1 hour ago');
    });
  });
});
