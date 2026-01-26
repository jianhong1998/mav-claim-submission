/**
 * Known category codes from database seed data.
 * Used for testing with type-safe category references.
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
