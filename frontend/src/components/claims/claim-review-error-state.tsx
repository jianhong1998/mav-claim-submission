'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ClaimReviewErrorStateProps {
  onRefresh: () => void;
}

export const ClaimReviewErrorState: React.FC<ClaimReviewErrorStateProps> = ({
  onRefresh,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-destructive/20 bg-destructive/5">
      <AlertCircle className="w-12 h-12 text-destructive mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-2">
        Failed to load claims
      </h3>
      <p className="text-sm text-muted-foreground text-center mb-4">
        Please check your connection and try again.
      </p>
      <Button
        variant="outline"
        onClick={onRefresh}
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Try Again
      </Button>
    </div>
  );
};
