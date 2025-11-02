/**
 * ReviewActions Component
 * Action buttons for claim review (send email and submit)
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';

export interface ReviewActionsProps {
  /**
   * Number of claims to be submitted
   */
  claimCount: number;

  /**
   * Callback when user clicks send email and submit button
   */
  onSendEmail: () => void;

  /**
   * Whether the action is currently in progress
   */
  isLoading: boolean;

  /**
   * Whether the action button should be disabled
   */
  disabled: boolean;
}

export const ReviewActions = React.memo<ReviewActionsProps>(
  ({ claimCount, onSendEmail, isLoading, disabled }) => {
    return (
      <div className="flex items-center justify-center gap-4 pt-6 border-t">
        <Button
          variant="default"
          size="lg"
          onClick={onSendEmail}
          disabled={disabled || claimCount === 0}
          className="min-w-48"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Sending Emails & Submitting...
            </>
          ) : (
            <>
              <Mail className="w-4 h-4 mr-2" />
              Email & Submit All {claimCount} Claim
              {claimCount !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </div>
    );
  },
);

ReviewActions.displayName = 'ReviewActions';
