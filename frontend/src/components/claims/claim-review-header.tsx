'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClaimReviewHeaderProps {
  onRefresh: () => void;
  onBack?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export const ClaimReviewHeader: React.FC<ClaimReviewHeaderProps> = ({
  onRefresh,
  onBack,
  isLoading = false,
  disabled = false,
}) => {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold">Review Claims</h1>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={disabled}
        >
          <RefreshCw
            className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')}
          />
          Refresh
        </Button>
        {onBack && (
          <Button
            variant="outline"
            onClick={onBack}
            disabled={disabled}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}
      </div>
    </div>
  );
};
