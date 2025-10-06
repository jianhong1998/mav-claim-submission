import { ClaimCategory } from '@project/types';

export const CLAIM_CATEGORY_DISPLAY_MAP = new Map<ClaimCategory, string>([
  [ClaimCategory.TELCO, 'Telecommunications'],
  [ClaimCategory.FITNESS, 'Fitness & Wellness'],
  [ClaimCategory.DENTAL, 'Dental Care'],
  [ClaimCategory.SKILL_ENHANCEMENT, 'Skill Enhancement'],
  [ClaimCategory.COMPANY_EVENT, 'Company Event'],
  [ClaimCategory.COMPANY_LUNCH, 'Company Lunch'],
  [ClaimCategory.COMPANY_DINNER, 'Company Dinner'],
  [ClaimCategory.OTHERS, 'Others'],
]);
