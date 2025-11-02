import { useMemo } from 'react';
import { IClaimMetadata } from '@project/types';

export interface ClaimReviewSummary {
  totalClaims: number;
  totalAmount: number;
  totalAttachments: number;
  claimsWithoutAttachments: number;
}

export const useClaimReviewSummary = (
  draftClaims: IClaimMetadata[],
): ClaimReviewSummary => {
  return useMemo(() => {
    const totalAmount = draftClaims.reduce(
      (sum, claim) => sum + claim.totalAmount,
      0,
    );
    const totalAttachments = draftClaims.reduce(
      (sum, claim) => sum + (claim.attachments?.length || 0),
      0,
    );
    const claimsWithoutAttachments = draftClaims.filter(
      (claim) => !claim.attachments?.length,
    ).length;

    return {
      totalClaims: draftClaims.length,
      totalAmount,
      totalAttachments,
      claimsWithoutAttachments,
    };
  }, [draftClaims]);
};
