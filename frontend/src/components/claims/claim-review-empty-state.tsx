'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';

interface ClaimReviewEmptyStateProps {
  onBack?: () => void;
}

export const ClaimReviewEmptyState: React.FC<ClaimReviewEmptyStateProps> = ({
  onBack,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Review Claims</h1>
        {onBack && (
          <Button
            variant="outline"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}
      </div>

      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold text-foreground mt-4">
          No draft claims to review
        </h3>
        <p className="text-sm text-muted-foreground mt-2">
          Create some claims first to review and finalize them.
        </p>
        {onBack && (
          <Button
            className="mt-4"
            onClick={onBack}
          >
            Create Claims
          </Button>
        )}
      </div>
    </div>
  );
};
