'use client';

import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { IClaimListResponse, ClaimCategory, ClaimStatus } from '@project/types';
import { apiClient } from '@/lib/api-client';
import {
  FileText,
  Calendar,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import { ClaimStatusButtons } from './ClaimStatusButtons';

interface ClaimsListComponentProps {
  className?: string;
  /**
   * Override default retry configuration for testing
   * @internal This prop is used for testing purposes only
   */
  retryConfig?: {
    retry?: number | boolean;
    retryDelay?: (attemptIndex: number) => number;
  };
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
 * Gets status display properties optimized for dark mode
 */
const getStatusDisplay = (status: ClaimStatus) => {
  const statusConfig = {
    [ClaimStatus.DRAFT]: {
      label: 'Draft',
      className:
        'bg-gray-500/10 text-gray-600 border border-gray-500/20 dark:bg-gray-400/10 dark:text-gray-400 dark:border-gray-400/20',
    },
    [ClaimStatus.SENT]: {
      label: 'Sent',
      className:
        'bg-blue-500/10 text-blue-600 border border-blue-500/20 dark:bg-blue-400/10 dark:text-blue-400 dark:border-blue-400/20',
    },
    [ClaimStatus.PAID]: {
      label: 'Paid',
      className:
        'bg-green-500/10 text-green-600 border border-green-500/20 dark:bg-green-400/10 dark:text-green-400 dark:border-green-400/20',
    },
    [ClaimStatus.FAILED]: {
      label: 'Failed',
      className:
        'bg-red-500/10 text-red-600 border border-red-500/20 dark:bg-red-400/10 dark:text-red-400 dark:border-red-400/20',
    },
  };
  return statusConfig[status] || statusConfig[ClaimStatus.DRAFT];
};

/**
 * ClaimsListComponent displays all user claims with proper loading states
 * Following requirements 1.1 and 1.3 for authenticated claim viewing
 */
export const ClaimsListComponent: React.FC<ClaimsListComponentProps> = ({
  className,
  retryConfig,
}) => {
  const queryClient = useQueryClient();

  // Query for all claims using GET /claims endpoint
  const {
    data: response,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery<IClaimListResponse>({
    queryKey: ['claims', 'all'],
    queryFn: () => apiClient.get<IClaimListResponse>('/claims'),
    retry: retryConfig?.retry ?? 3,
    retryDelay:
      retryConfig?.retryDelay ??
      ((attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)),
  });

  const claims = response?.claims || [];

  // Sort claims by creation date (newest first) as per requirement 1.3
  const sortedClaims = claims.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const handleStatusChange = () => {
    // Invalidate claims query to refresh data
    void queryClient.invalidateQueries({ queryKey: ['claims', 'all'] });
  };

  if (error) {
    return (
      <Alert
        variant="destructive"
        className="max-w-2xl"
      >
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Failed to Load Claims</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-4">
            We&apos;re having trouble loading your claims right now. This could
            be due to a network issue or server problem.
          </p>
          <Button
            onClick={() => refetch()}
            disabled={isRefetching}
            variant="outline"
            size="sm"
            className="min-h-[44px] touch-manipulation"
          >
            {isRefetching ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </>
            )}
          </Button>
        </AlertDescription>
      </Alert>
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

  if (sortedClaims.length === 0) {
    return (
      <div className="text-center py-12 max-w-md mx-auto">
        <div className="relative">
          <FileText className="mx-auto h-16 w-16 text-muted-foreground/40" />
          <div className="absolute -top-1 -right-1 h-6 w-6 bg-primary rounded-full flex items-center justify-center">
            <Plus className="h-3 w-3 text-primary-foreground" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-foreground mt-6">
          Ready to submit your first claim?
        </h3>
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
          Start building your expense history by creating your first claim.
          Track telecommunications, fitness, dental, and other eligible expenses
          with ease.
        </p>
        <div className="mt-6">
          <Button
            asChild
            className="min-h-[44px] touch-manipulation"
          >
            <a href="/claim/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Claim
            </a>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Need help getting started? All claims are automatically saved as
          drafts until you&apos;re ready to submit.
        </p>
      </div>
    );
  }

  return (
    <section
      className={cn('space-y-4', className)}
      aria-labelledby="claims-heading"
    >
      <header className="flex items-center justify-between">
        <h2
          id="claims-heading"
          className="text-lg font-semibold text-foreground"
        >
          All Claims ({sortedClaims.length})
        </h2>
      </header>

      <div
        className="space-y-3"
        role="list"
        aria-label="Claims list"
      >
        {sortedClaims.map((claim) => {
          const statusDisplay = getStatusDisplay(claim.status);

          const claimTitle =
            claim.claimName ||
            `${getCategoryDisplayName(claim.category)} Claim`;
          const claimDate = formatMonthYear(claim.month, claim.year);

          return (
            <article
              key={claim.id}
              className="relative"
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
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium min-h-[32px] sm:min-h-[24px] touch-manipulation flex-shrink-0',
                            statusDisplay.className,
                          )}
                          aria-label={`Claim status: ${statusDisplay.label}`}
                        >
                          {statusDisplay.label}
                        </span>
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
                          {new Date(claim.createdAt).toLocaleDateString(
                            'en-GB',
                            {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            },
                          )}
                        </time>
                      </span>
                    </div>
                  </footer>

                  {/* Status Management Buttons */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <ClaimStatusButtons
                      claimId={claim.id}
                      currentStatus={claim.status}
                      onStatusChange={handleStatusChange}
                    />
                  </div>
                </CardContent>
              </Card>
            </article>
          );
        })}
      </div>
    </section>
  );
};
