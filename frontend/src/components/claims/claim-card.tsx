/**
 * ClaimCard Component
 * Reusable claim card for individual claim display with status management
 */

'use client';

import React from 'react';
import { IClaimMetadata } from '@project/types';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import ClaimStatusBadge from '@/components/common/badges/claim-status-badge';
import { getCategoryDisplayName } from '@/lib/claim-utils';
import { formatAmount, formatMonthYear } from '@/lib/format-utils';
import { ClaimStatusButtons } from './ClaimStatusButtons';
import { FileText, Calendar, DollarSign } from 'lucide-react';

export interface ClaimCardProps {
  /**
   * Claim metadata to display
   */
  claim: IClaimMetadata;

  /**
   * Callback when claim status changes
   */
  onStatusChange: () => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * ClaimCard renders a single claim with all its information
 * Extracted from ClaimsListComponent.tsx lines 241-366
 */
const ClaimCard = React.memo<ClaimCardProps>(
  ({ claim, onStatusChange, className }) => {
    const claimTitle =
      claim.claimName || `${getCategoryDisplayName(claim.category)} Claim`;
    const claimDate = formatMonthYear(claim.month, claim.year);

    return (
      <article
        className={cn('relative', className)}
        role="listitem"
        aria-labelledby={`claim-title-${claim.id}`}
        aria-describedby={`claim-details-${claim.id}`}
      >
        <Card className="h-full">
          <CardHeader className="pb-3 px-4 py-4 sm:px-6 sm:py-4">
            {/* Mobile: Stack content vertically, Desktop: Side by side */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <CardTitle
                    id={`claim-title-${claim.id}`}
                    className="text-base truncate min-w-0"
                  >
                    {claimTitle}
                  </CardTitle>
                  <ClaimStatusBadge
                    status={claim.status}
                    size="sm"
                    showIcon={false}
                    className="min-h-[32px] sm:min-h-[24px] touch-manipulation flex-shrink-0"
                  />
                </div>
                {/* Mobile: Stack details vertically, Desktop: Horizontal */}
                <CardDescription
                  id={`claim-details-${claim.id}`}
                  className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm"
                >
                  <span
                    className="flex items-center gap-1"
                    aria-label={`Claim period: ${claimDate}`}
                  >
                    <Calendar
                      className="h-3 w-3 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <time
                      dateTime={`${claim.year}-${claim.month.toString().padStart(2, '0')}`}
                    >
                      {claimDate}
                    </time>
                  </span>
                  <span
                    className="flex items-center gap-1"
                    aria-label={`Amount: ${formatAmount(claim.totalAmount)}`}
                  >
                    <DollarSign
                      className="h-3 w-3 flex-shrink-0"
                      aria-hidden="true"
                    />
                    {formatAmount(claim.totalAmount)}
                  </span>
                  {claim.attachments && claim.attachments.length > 0 && (
                    <span
                      className="flex items-center gap-1"
                      aria-label={`${claim.attachments.length} attachment${claim.attachments.length !== 1 ? 's' : ''}`}
                    >
                      <FileText
                        className="h-3 w-3 flex-shrink-0"
                        aria-hidden="true"
                      />
                      {claim.attachments.length} file
                      {claim.attachments.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0 px-4 sm:px-6">
            <footer className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                <span
                  aria-label={`Category: ${getCategoryDisplayName(claim.category)}`}
                >
                  Category: {getCategoryDisplayName(claim.category)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                <span
                  aria-label={`Created on ${new Date(claim.createdAt).toLocaleDateString('en-GB')}`}
                >
                  Created{' '}
                  <time dateTime={claim.createdAt}>
                    {new Date(claim.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </time>
                </span>
              </div>
            </footer>

            {/* Status Management Buttons */}
            <div className="mt-4 pt-4 border-t border-border">
              <ClaimStatusButtons
                claimId={claim.id}
                currentStatus={claim.status}
                onStatusChange={onStatusChange}
              />
            </div>
          </CardContent>
        </Card>
      </article>
    );
  },
);

ClaimCard.displayName = 'ClaimCard';

export default ClaimCard;
