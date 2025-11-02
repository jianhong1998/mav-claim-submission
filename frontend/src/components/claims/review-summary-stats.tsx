/**
 * ReviewSummaryStats Component
 * Displays summary statistics for draft claims in the review interface
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatAmount } from '@/lib/format-utils';

export interface ReviewSummaryStatsProps {
  /**
   * Total number of draft claims
   */
  totalClaims: number;

  /**
   * Total amount across all draft claims
   */
  totalAmount: number;

  /**
   * Total number of attachments across all claims
   */
  totalAttachments: number;

  /**
   * Number of claims without any attachments
   */
  claimsWithoutAttachments: number;
}

export const ReviewSummaryStats = React.memo<ReviewSummaryStatsProps>(
  ({
    totalClaims,
    totalAmount,
    totalAttachments,
    claimsWithoutAttachments,
  }) => {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Summary</CardTitle>
          <CardDescription>
            Review your draft claims before emailing and submitting them for
            processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-500/10 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {totalClaims}
              </div>
              <div className="text-sm text-muted-foreground">Draft Claims</div>
            </div>
            <div className="text-center p-3 bg-green-500/10 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatAmount(totalAmount)}
              </div>
              <div className="text-sm text-muted-foreground">Total Amount</div>
            </div>
            <div className="text-center p-3 bg-purple-500/10 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {totalAttachments}
              </div>
              <div className="text-sm text-muted-foreground">Total Files</div>
            </div>
            <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {claimsWithoutAttachments}
              </div>
              <div className="text-sm text-muted-foreground">Without Files</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  },
);

ReviewSummaryStats.displayName = 'ReviewSummaryStats';
