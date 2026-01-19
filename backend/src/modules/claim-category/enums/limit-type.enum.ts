export const LimitType = Object.freeze({
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
} as const);
export type LimitType = (typeof LimitType)[keyof typeof LimitType];
