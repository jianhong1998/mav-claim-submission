/**
 * ClaimReviewItem Component
 * Individual claim card in the review list with attachment details
 */

import React, { useState, useCallback } from 'react';
import { IClaimMetadata } from '@project/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AttachmentList } from '@/components/attachments/AttachmentList';
import { getCategoryDisplayName } from '@/lib/claim-utils';
import { formatAmount, formatMonthYear } from '@/lib/format-utils';
import {
  Calendar,
  DollarSign,
  FileText,
  AlertCircle,
  Edit,
} from 'lucide-react';

export interface ClaimReviewItemProps {
  /**
   * Claim to display
   */
  claim: IClaimMetadata;

  /**
   * Callback when user clicks edit button
   */
  onEdit: (claim: IClaimMetadata) => void;

  /**
   * Whether this claim is currently being updated
   */
  isUpdating: boolean;
}

export const ClaimReviewItem = React.memo<ClaimReviewItemProps>(
  ({ claim, onEdit, isUpdating }) => {
    const [showAttachments, setShowAttachments] = useState(false);
    const attachmentCount = claim.attachments?.length || 0;

    const handleEditClick = useCallback(() => {
      onEdit(claim);
    }, [claim, onEdit]);

    return (
      <Card
        className={cn('relative transition-all', isUpdating && 'opacity-50')}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base">
                {claim.claimName ||
                  `${getCategoryDisplayName(claim.category)} Claim`}
              </CardTitle>
              <CardDescription className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatMonthYear(claim.month, claim.year)}
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {formatAmount(claim.totalAmount)}
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {attachmentCount} file{attachmentCount !== 1 ? 's' : ''}
                </span>
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEditClick}
                disabled={isUpdating}
                className="h-8 w-8 p-0"
                title="Edit claim"
              >
                <Edit className="h-4 w-4" />
                <span className="sr-only">Edit claim</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div>Category: {getCategoryDisplayName(claim.category)}</div>
            <div>Status: {claim.status}</div>
          </div>

          {attachmentCount > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Attachments</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAttachments(!showAttachments)}
                  className="h-auto p-1 text-xs"
                >
                  {showAttachments ? 'Hide' : 'Show'} Details
                </Button>
              </div>

              {showAttachments && (
                <div className="ml-2">
                  <AttachmentList
                    claimId={claim.id}
                    showActions={false}
                    className="space-y-2"
                  />
                </div>
              )}
            </div>
          )}

          {attachmentCount === 0 && (
            <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-700 dark:text-yellow-300">
                No attachments uploaded for this claim
              </span>
            </div>
          )}
        </CardContent>

        {isUpdating && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-xl">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Updating...
            </div>
          </div>
        )}
      </Card>
    );
  },
);

ClaimReviewItem.displayName = 'ClaimReviewItem';
