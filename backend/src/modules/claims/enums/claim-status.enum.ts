export const ClaimStatus = Object.freeze({
  DRAFT: 'draft',
  SENT: 'sent',
  FAILED: 'failed',
  PAID: 'paid',
} as const);
export type ClaimStatus = (typeof ClaimStatus)[keyof typeof ClaimStatus];
