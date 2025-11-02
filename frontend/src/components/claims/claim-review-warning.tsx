'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ClaimReviewWarningProps {
  claimsWithoutAttachments: number;
}

export const ClaimReviewWarning: React.FC<ClaimReviewWarningProps> = ({
  claimsWithoutAttachments,
}) => {
  if (claimsWithoutAttachments === 0) return null;

  return (
    <div className="flex items-center gap-2 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
      <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
      <div className="text-sm text-yellow-700 dark:text-yellow-300">
        <strong>{claimsWithoutAttachments}</strong> claim
        {claimsWithoutAttachments !== 1 ? 's' : ''}{' '}
        {claimsWithoutAttachments !== 1 ? 'have' : 'has'} no attachments.
        Consider adding supporting documents before finalizing.
      </div>
    </div>
  );
};
