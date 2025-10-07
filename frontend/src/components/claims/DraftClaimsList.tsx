'use client';

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  IClaimMetadata,
  IClaimListResponse,
  ClaimCategory,
  IClaimResponse,
} from '@project/types';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Edit, Trash2, FileText, Calendar, DollarSign } from 'lucide-react';

interface DraftClaimsListProps {
  onEditClaim?: (claim: IClaimMetadata) => void;
  className?: string;
}

/**
 * Gets category display name for UI
 */
const getCategoryDisplayName = (category: ClaimCategory): string => {
  const categoryNames = {
    [ClaimCategory.TELCO]: 'Telecommunications',
    [ClaimCategory.FITNESS]: 'Fitness & Wellness',
    [ClaimCategory.DENTAL]: 'Dental Care',
    [ClaimCategory.SKILL_ENHANCEMENT]: 'Skill Enhancement',
    [ClaimCategory.COMPANY_EVENT]: 'Company Event',
    [ClaimCategory.COMPANY_LUNCH]: 'Company Lunch',
    [ClaimCategory.COMPANY_DINNER]: 'Company Dinner',
    [ClaimCategory.OTHERS]: 'Others',
  };
  return categoryNames[category] || category;
};

/**
 * Formats amount in SGD currency
 */
const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
  }).format(amount);
};

/**
 * Formats month/year display
 */
const formatMonthYear = (month: number, year: number): string => {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

/**
 * DraftClaimsList component displays a list of draft claims with management actions
 * Following requirements 4.1 and 4.2 for claim list management
 */
export const DraftClaimsList: React.FC<DraftClaimsListProps> = ({
  onEditClaim,
  className,
}) => {
  const queryClient = useQueryClient();
  const [deletingClaim, setDeletingClaim] = useState<string | null>(null);

  // Query for draft claims using existing GET /claims?status=draft endpoint
  const {
    data: response,
    isLoading,
    error,
  } = useQuery<IClaimListResponse>({
    queryKey: ['claims', 'draft'],
    queryFn: () => apiClient.get<IClaimListResponse>('/claims?status=draft'),
  });

  const draftClaims = response?.claims || [];

  // Mutation for deleting claims
  const deleteMutation = useMutation({
    mutationFn: (claimId: string) =>
      apiClient.delete<IClaimResponse>(`/claims/${claimId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['claims', 'draft'] });
      void queryClient.invalidateQueries({ queryKey: ['claims', 'all'] });
      toast.success('Claim deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete claim');
    },
    onSettled: () => {
      setDeletingClaim(null);
    },
  });

  const handleEditClaim = useCallback(
    (claim: IClaimMetadata) => {
      if (onEditClaim) {
        onEditClaim(claim);
      }
    },
    [onEditClaim],
  );

  const handleDeleteClaim = useCallback(
    (claim: IClaimMetadata) => {
      const hasAttachments = claim.attachments && claim.attachments.length > 0;

      let confirmMessage = `Are you sure you want to delete the claim "${claim.claimName || `${getCategoryDisplayName(claim.category)} - ${formatMonthYear(claim.month, claim.year)}`}"?`;

      if (hasAttachments) {
        confirmMessage +=
          '\n\nWarning: This claim has attachments. Files will remain in your Google Drive and should be manually removed if no longer needed.';
      }

      if (window.confirm(confirmMessage)) {
        setDeletingClaim(claim.id);
        deleteMutation.mutate(claim.id);
      }
    },
    [deleteMutation],
  );

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
        <p className="text-sm text-red-600 dark:text-red-400">
          Failed to load draft claims. Please try again.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card
            key={i}
            className="animate-pulse"
          >
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="flex gap-2">
                  <div className="h-8 bg-muted rounded w-16"></div>
                  <div className="h-8 bg-muted rounded w-16"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (draftClaims.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold text-foreground mt-4">
          No draft claims
        </h3>
        <p className="text-sm text-muted-foreground mt-2">
          Create your first claim to get started with your expense submission.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Draft Claims ({draftClaims.length})
        </h2>
      </div>

      <div className="space-y-3">
        {draftClaims.map((claim) => (
          <Card
            key={claim.id}
            className="relative"
          >
            <CardHeader className="pb-3">
              {/* Mobile: Stack content vertically, Desktop: Side by side */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                <div className="space-y-1 min-w-0 flex-1">
                  <CardTitle className="text-base truncate">
                    {claim.claimName ||
                      `${getCategoryDisplayName(claim.category)} Claim`}
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
                    {claim.attachments && claim.attachments.length > 0 && (
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3 flex-shrink-0" />
                        {claim.attachments.length} file
                        {claim.attachments.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </CardDescription>
                </div>

                {/* Mobile: Full width buttons, Desktop: Compact buttons */}
                <div className="flex items-center gap-2 sm:gap-1 sm:flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditClaim(claim)}
                    disabled={deletingClaim === claim.id}
                    className="flex-1 sm:flex-none min-h-10 sm:min-h-8 touch-manipulation"
                  >
                    <Edit className="h-4 w-4 sm:mr-0 mr-1" />
                    <span className="sm:sr-only">Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClaim(claim)}
                    disabled={deletingClaim === claim.id}
                    className="flex-1 sm:flex-none min-h-10 sm:min-h-8 text-destructive hover:text-destructive touch-manipulation"
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
                  Category: {getCategoryDisplayName(claim.category)}
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

            {deletingClaim === claim.id && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-xl">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Deleting...
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
