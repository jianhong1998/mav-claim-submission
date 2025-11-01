/**
 * format-utils.ts
 *
 * Centralized date and currency formatting utilities.
 * Replaces 5 duplicate formatAmount() and 4 duplicate formatMonthYear() implementations.
 * Uses browser Intl APIs for consistent internationalization.
 */

/**
 * Formats amount in SGD currency
 *
 * @param amount - The numeric amount to format
 * @returns Formatted currency string (e.g., "SGD 100.00")
 *
 * @example
 * formatAmount(100) // "SGD 100.00"
 * formatAmount(1234.56) // "SGD 1,234.56"
 */
export const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SGD',
  }).format(amount);
};

/**
 * Formats month and year for display
 *
 * @param month - Month number (1-12)
 * @param year - Full year (e.g., 2024)
 * @returns Formatted month and year string (e.g., "January 2024")
 *
 * @example
 * formatMonthYear(1, 2024) // "January 2024"
 * formatMonthYear(12, 2023) // "December 2023"
 */
export const formatMonthYear = (month: number, year: number): string => {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

/**
 * Formats a date with customizable options
 *
 * @param date - Date object or ISO string
 * @param options - Intl.DateTimeFormat options (optional)
 * @returns Formatted date string
 *
 * @example
 * formatDate(new Date('2024-01-15')) // "1/15/2024"
 * formatDate(new Date('2024-01-15'), { dateStyle: 'long' }) // "January 15, 2024"
 * formatDate('2024-01-15T10:30:00Z', { dateStyle: 'medium', timeStyle: 'short' }) // "Jan 15, 2024, 10:30 AM"
 */
export const formatDate = (
  date: Date | string,
  options?: Intl.DateTimeFormatOptions,
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', options);
};

/**
 * Formats a date as relative time (e.g., "2 days ago", "in 3 hours")
 *
 * @param date - Date object or ISO string
 * @returns Relative time string
 *
 * @example
 * formatRelativeTime(new Date(Date.now() - 2 * 60 * 60 * 1000)) // "2 hours ago"
 * formatRelativeTime(new Date(Date.now() - 24 * 60 * 60 * 1000)) // "1 day ago"
 * formatRelativeTime(new Date(Date.now() + 60 * 60 * 1000)) // "in 1 hour"
 */
export const formatRelativeTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = Date.now();
  const diffInSeconds = Math.floor((now - dateObj.getTime()) / 1000);

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'always' });

  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
    { label: 'second', seconds: 1 },
  ] as const;

  for (const interval of intervals) {
    const count = Math.floor(Math.abs(diffInSeconds) / interval.seconds);
    if (count >= 1) {
      return rtf.format(diffInSeconds < 0 ? count : -count, interval.label);
    }
  }

  return rtf.format(0, 'second');
};
