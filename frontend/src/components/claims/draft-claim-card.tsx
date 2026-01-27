'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { IClaimMetadata, IClaimCategory } from '@project/types';
import {
  Edit,
  Trash2,
  FileText,
  Calendar,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Eye,
} from 'lucide-react';
import { getCategoryDisplayName } from '@/lib/claim-utils';
import { formatAmount, formatMonthYear } from '@/lib/format-utils';
import { FileUploadComponent } from '@/components/attachments/FileUploadComponent';
import { cn } from '@/lib/utils';

export interface DraftClaimCardProps {
  claim: IClaimMetadata;
  onEdit: (claim: IClaimMetadata) => void;
  onDelete: (claim: IClaimMetadata) => void;
  onPreview: (claim: IClaimMetadata) => void;
  categories: IClaimCategory[];
  isDeleting?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

/**
 * DraftClaimCard renders individual draft claim card with edit/delete buttons
 * Mobile-responsive layout: full-width buttons on mobile, icon-only on desktop
 * Supports collapsible file upload section
 */
export const DraftClaimCard = React.memo<DraftClaimCardProps>(
  ({
    claim,
    onEdit,
    onDelete,
    onPreview,
    categories,
    isDeleting = false,
    defaultExpanded = false,
    className,
  }) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    const hasAttachments = claim.attachments?.length ?? 0;

    const cardBackgroundClass = hasAttachments
      ? 'bg-green-500/10'
      : 'bg-orange-500/10';

    const cardBorderClass = hasAttachments
      ? 'border-green-600'
      : 'border-orange-300';

    return (
      <Card className={cn(className, cardBackgroundClass, cardBorderClass)}>
        <CardHeader className="pb-3">
          {/* Mobile: Stack content vertically, Desktop: Side by side */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
            <div className="space-y-1 min-w-0 flex-1">
              <CardTitle className="text-base truncate">
                {claim.claimName ||
                  `${getCategoryDisplayName(claim.category, categories)}`}
              </CardTitle>
              {/* Mobile: Stack details vertically, Desktop: Horizontal */}
              <CardDescription className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 flex-shrink-0" />
                  {formatMonthYear(claim.month, claim.year)}
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 flex-shrink-0" />
                  {formatAmount(claim.totalAmount)}
                </span>
                {claim.attachments && (
                  <span
                    className={cn(
                      'flex items-center gap-1',
                      claim.attachments.length ? '' : 'text-orange-300/90',
                    )}
                  >
                    <FileText className="h-3 w-3 flex-shrink-0" />
                    {claim.attachments.length} file
                    {claim.attachments.length !== 1 ? 's' : ''}
                  </span>
                )}
              </CardDescription>
            </div>

            {/* Mobile: Full width buttons, Desktop: Compact buttons */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-1 sm:flex-shrink-0 sm:flex-nowrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                disabled={isDeleting}
                className="flex-1 sm:flex-none min-h-10 sm:min-h-8 touch-manipulation cursor-pointer"
                aria-label={
                  isExpanded ? 'Collapse file upload' : 'Expand file upload'
                }
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 sm:mr-0 mr-1" />
                ) : (
                  <ChevronDown className="h-4 w-4 sm:mr-0 mr-1" />
                )}
                <span className="sm:sr-only">
                  {isExpanded ? 'Collapse' : 'Expand'}
                </span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPreview(claim)}
                disabled={isDeleting}
                className="flex-1 sm:flex-none min-h-10 sm:min-h-8 touch-manipulation cursor-pointer"
                aria-label="Preview email"
              >
                <Eye className="h-4 w-4 sm:mr-0 mr-1" />
                <span className="sm:sr-only">Preview</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(claim)}
                disabled={isDeleting}
                className="flex-1 sm:flex-none min-h-10 sm:min-h-8 touch-manipulation cursor-pointer"
              >
                <Edit className="h-4 w-4 sm:mr-0 mr-1" />
                <span className="sm:sr-only">Edit</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(claim)}
                disabled={isDeleting}
                className="flex-1 sm:flex-none min-h-10 sm:min-h-8 text-destructive hover:text-destructive touch-manipulation cursor-pointer"
              >
                <Trash2 className="h-4 w-4 sm:mr-0 mr-1" />
                <span className="sm:sr-only">Delete</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Category: {getCategoryDisplayName(claim.category, categories)}
            </div>
            <div className="text-xs text-muted-foreground">
              Created{' '}
              {new Date(claim.createdAt).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </div>
          </div>
        </CardContent>

        {/* Collapsible File Upload Section */}
        {isExpanded && (
          <CardContent className="pt-4 border-t">
            <FileUploadComponent
              claimId={claim.id}
              disabled={isDeleting}
              multiple={true}
            />
          </CardContent>
        )}

        {isDeleting && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-xl">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Deleting...
            </div>
          </div>
        )}
      </Card>
    );
  },
);

DraftClaimCard.displayName = 'DraftClaimCard';
