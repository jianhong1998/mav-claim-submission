'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FileUploadComponent } from './FileUploadComponent';
import { IClaimMetadata } from '@project/types';
import { CheckCircle2, AlertCircle, RotateCcw, Paperclip } from 'lucide-react';
import { getCategoryDisplayName } from '@/lib/claim-utils';
import { formatAmount, formatMonthYear } from '@/lib/format-utils';

export interface BulkUploadClaimCardProps {
  claim: IClaimMetadata;
  isExpanded: boolean;
  onToggleExpansion: () => void;
  onUploadSuccess: (fileName: string) => void;
  onUploadError: (fileName: string, error: string) => void;
  className?: string;
}

/**
 * BulkUploadClaimCard renders individual claim card with upload section
 * Integrates FileUploadComponent for file management
 */
export const BulkUploadClaimCard = React.memo<BulkUploadClaimCardProps>(
  ({
    claim,
    isExpanded,
    onToggleExpansion,
    onUploadSuccess,
    onUploadError,
    className,
  }) => {
    const fileCount = claim.attachments?.length || 0;

    return (
      <Card
        className={cn(
          'transition-all duration-200',
          isExpanded && 'ring-1 ring-ring',
          fileCount > 0 && 'border-green-500/50',
          className,
        )}
      >
        <CardHeader
          className="cursor-pointer hover:bg-muted/25 transition-colors"
          onClick={onToggleExpansion}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base flex items-center gap-2">
                {claim.claimName ||
                  `${getCategoryDisplayName(claim.category)} Claim`}
                {fileCount > 0 && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs">
                    <Paperclip className="h-3 w-3" />
                    {fileCount} file{fileCount !== 1 ? 's' : ''}
                  </div>
                )}
              </CardTitle>
              <CardDescription className="flex items-center gap-4 text-sm">
                <span>{formatMonthYear(claim.month, claim.year)}</span>
                <span>{formatAmount(claim.totalAmount)}</span>
                <span className="text-xs bg-muted px-2 py-0.5 rounded">
                  {getCategoryDisplayName(claim.category)}
                </span>
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              {fileCount > 0 ? (
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-xs">Ready</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs">No Files</span>
                </div>
              )}
              <div
                className={cn(
                  'transition-transform duration-200',
                  isExpanded && 'rotate-180',
                )}
              >
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0">
            <div className="border-t border-muted/25 pt-4">
              <FileUploadComponent
                claimId={claim.id}
                onUploadSuccess={onUploadSuccess}
                onUploadError={onUploadError}
                multiple={true}
              />
            </div>
          </CardContent>
        )}
      </Card>
    );
  },
);

BulkUploadClaimCard.displayName = 'BulkUploadClaimCard';
