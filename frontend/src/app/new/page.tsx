'use client';

import React, { useCallback, useEffect } from 'react';
import { NextPage } from 'next';
import './mobile-responsive.css';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DraftClaimsList } from '@/components/claims/DraftClaimsList';
import { MultiClaimForm } from '@/components/claims/MultiClaimForm';
import { BulkFileUploadComponent } from '@/components/attachments/BulkFileUploadComponent';
import { ClaimReviewComponent } from '@/components/claims/ClaimReviewComponent';
import { useMultiClaim, MultiClaimPhase } from '@/hooks/useMultiClaim';
import { IClaimMetadata } from '@project/types';
import { toast } from 'sonner';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Plus,
  Upload,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { useAuthStatus } from '@/hooks/auth/useAuthStatus';
import { useRouter } from 'next/navigation';
import { SkeletonPage } from '@/components/pages/skeleton-page';

/**
 * Multi-claim submission page - Main entry point for creating multiple expense claims
 * Implements integrated workflow following all requirements
 * URL: /claim/new
 */
const MultiClaimSubmissionPage: NextPage = () => {
  const {
    state,
    summary,
    errors,
    loading,
    moveToUploadPhase,
    moveToReviewPhase,
    resetToCreationPhase,
    refetchDraftClaims,
  } = useMultiClaim();
  const { data: authStatusData, isFetched: isAuthStatusFetched } =
    useAuthStatus();
  const router = useRouter();

  const { currentPhase, draftClaims } = state;

  // Handle phase transitions with validation
  const handleMoveToUpload = useCallback(() => {
    if (summary.claimsCount === 0) {
      toast.error(
        'Please create at least one claim before proceeding to file upload.',
      );
      return;
    }
    moveToUploadPhase();
  }, [moveToUploadPhase, summary.claimsCount]);

  const handleMoveToReview = useCallback(() => {
    if (summary.claimsCount === 0) {
      toast.error('No claims available for review.');
      return;
    }
    moveToReviewPhase();
  }, [moveToReviewPhase, summary.claimsCount]);

  // Handle claim creation success
  const handleClaimCreated = useCallback(
    (claim: IClaimMetadata) => {
      toast.success(`${claim.claimName || 'Claim'} added to draft list`);
      // Auto-refresh to get updated data
      void refetchDraftClaims();
    },
    [refetchDraftClaims],
  );

  // Handle claim editing (placeholder for now)
  const handleEditClaim = useCallback((claim: IClaimMetadata) => {
    toast.info(
      `Editing ${claim.claimName || 'claim'} - Edit modal not implemented yet`,
    );
    // TODO: Implement edit modal in future tasks
  }, []);

  // Handle upload completion
  const handleUploadComplete = useCallback(
    (claimId: string, fileCount: number) => {
      const claim = draftClaims.find((c) => c.id === claimId);
      const claimName = claim?.claimName || `Claim ${claim?.category}`;
      toast.success(
        `${fileCount} file${fileCount !== 1 ? 's' : ''} uploaded for ${claimName}`,
      );
      void refetchDraftClaims();
    },
    [draftClaims, refetchDraftClaims],
  );

  // Handle all uploads complete
  const handleAllUploadsComplete = useCallback(() => {
    toast.success(
      'All claims have files attached! Ready to proceed to review.',
    );
  }, []);

  // Auto-refresh data when phase changes
  useEffect(() => {
    if (currentPhase !== MultiClaimPhase.CREATION) {
      void refetchDraftClaims();
    }
  }, [currentPhase, refetchDraftClaims]);

  // Phase indicator component - Mobile optimized
  const PhaseIndicator = () => (
    <div className="flex items-center justify-center mb-6 px-2">
      {/* Desktop: Horizontal layout */}
      <div className="hidden sm:flex items-center gap-2 p-1 bg-muted rounded-lg">
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all',
            currentPhase === MultiClaimPhase.CREATION &&
              'bg-primary text-primary-foreground shadow-sm',
            currentPhase !== MultiClaimPhase.CREATION &&
              'text-muted-foreground hover:text-foreground',
          )}
        >
          <Plus className="h-4 w-4" />
          Create Claims
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all',
            currentPhase === MultiClaimPhase.UPLOAD &&
              'bg-primary text-primary-foreground shadow-sm',
            currentPhase !== MultiClaimPhase.UPLOAD &&
              'text-muted-foreground hover:text-foreground',
          )}
        >
          <Upload className="h-4 w-4" />
          Upload Files
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all',
            currentPhase === MultiClaimPhase.REVIEW &&
              'bg-primary text-primary-foreground shadow-sm',
            currentPhase !== MultiClaimPhase.REVIEW &&
              'text-muted-foreground hover:text-foreground',
          )}
        >
          <Eye className="h-4 w-4" />
          Review & Submit
        </div>
      </div>

      {/* Mobile: Compact dots with current phase label */}
      <div className="sm:hidden w-full max-w-sm">
        <div className="text-center mb-3">
          <div
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm',
              currentPhase === MultiClaimPhase.CREATION &&
                'bg-blue-500/20 text-blue-400',
              currentPhase === MultiClaimPhase.UPLOAD &&
                'bg-orange-500/20 text-orange-400',
              currentPhase === MultiClaimPhase.REVIEW &&
                'bg-green-500/20 text-green-400',
            )}
          >
            {currentPhase === MultiClaimPhase.CREATION && (
              <Plus className="h-4 w-4" />
            )}
            {currentPhase === MultiClaimPhase.UPLOAD && (
              <Upload className="h-4 w-4" />
            )}
            {currentPhase === MultiClaimPhase.REVIEW && (
              <Eye className="h-4 w-4" />
            )}
            {currentPhase === MultiClaimPhase.CREATION && 'Create Claims'}
            {currentPhase === MultiClaimPhase.UPLOAD && 'Upload Files'}
            {currentPhase === MultiClaimPhase.REVIEW && 'Review & Submit'}
          </div>
        </div>
        <div className="flex justify-center items-center gap-3">
          <div
            className={cn(
              'w-3 h-3 rounded-full transition-all',
              currentPhase === MultiClaimPhase.CREATION
                ? 'bg-blue-500 scale-110'
                : 'bg-muted-foreground/30',
            )}
          />
          <div className="w-8 h-px bg-muted-foreground/30" />
          <div
            className={cn(
              'w-3 h-3 rounded-full transition-all',
              currentPhase === MultiClaimPhase.UPLOAD
                ? 'bg-orange-500 scale-110'
                : 'bg-muted-foreground/30',
            )}
          />
          <div className="w-8 h-px bg-muted-foreground/30" />
          <div
            className={cn(
              'w-3 h-3 rounded-full transition-all',
              currentPhase === MultiClaimPhase.REVIEW
                ? 'bg-green-500 scale-110'
                : 'bg-muted-foreground/30',
            )}
          />
        </div>
      </div>
    </div>
  );

  // Navigation buttons component - Mobile optimized
  const NavigationButtons = () => {
    if (currentPhase === MultiClaimPhase.REVIEW) {
      return (
        <div className="pt-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <Button
              variant="outline"
              onClick={() => moveToUploadPhase()}
              disabled={loading.isDraftClaimsLoading}
              className="w-full sm:w-auto min-h-11 touch-manipulation" // 44px min height for touch
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Upload
            </Button>
            <div className="text-sm text-muted-foreground text-center sm:text-right">
              Click on the button above to finalise and submit your claim.
            </div>
          </div>
        </div>
      );
    }

    if (currentPhase === MultiClaimPhase.UPLOAD) {
      return (
        <div className="pt-6 border-t">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
            <Button
              variant="outline"
              onClick={resetToCreationPhase}
              disabled={loading.isDraftClaimsLoading}
              className="w-full sm:w-auto min-h-11 touch-manipulation order-2 sm:order-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Create Claims
            </Button>
            <Button
              onClick={handleMoveToReview}
              disabled={summary.claimsCount === 0}
              className="w-full sm:w-auto min-w-32 min-h-11 touch-manipulation order-1 sm:order-2"
            >
              <Eye className="h-4 w-4 mr-2" />
              Review & Submit
            </Button>
          </div>
        </div>
      );
    }

    if (currentPhase === MultiClaimPhase.CREATION) {
      return (
        <div className="pt-6 border-t">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="text-sm text-muted-foreground text-center sm:text-left order-2 sm:order-1">
              {summary.claimsCount === 0
                ? 'Create your first claim to get started'
                : `${summary.claimsCount} draft claim${summary.claimsCount !== 1 ? 's' : ''} created`}
            </div>
            <Button
              onClick={handleMoveToUpload}
              disabled={summary.claimsCount === 0}
              className="w-full sm:w-auto min-w-32 min-h-11 touch-manipulation order-1 sm:order-2"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
              {summary.claimsCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-primary-foreground text-primary rounded-full text-xs">
                  {summary.claimsCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  // Redirect to login page if not logged in
  useEffect(() => {
    if (!isAuthStatusFetched || authStatusData?.isAuthenticated) return;

    router.push('/login');
  }, [router, isAuthStatusFetched, authStatusData]);

  if (isAuthStatusFetched && !authStatusData?.isAuthenticated) {
    return <SkeletonPage />;
  }

  // Error handling display
  if (errors.draftClaimsError) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Submit Multiple Claims
            </h1>
            <p className="text-muted-foreground">
              Create and manage multiple expense claims in a single session
            </p>
          </div>

          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-foreground">
                    Failed to Load Claims
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Unable to retrieve your draft claims. Please check your
                    connection and try again.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => void refetchDraftClaims()}
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 sm:py-6 px-4">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header - Mobile optimized */}
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Submit Multiple Claims
          </h1>
          <p className="text-muted-foreground mt-1 sm:mt-0">
            Create and manage multiple expense claims in a single session
          </p>
        </div>

        {/* Phase Indicator */}
        <PhaseIndicator />

        {/* Main Content - Mobile optimized */}
        <div className="space-y-4 sm:space-y-6">
          {currentPhase === MultiClaimPhase.CREATION && (
            <>
              {/* Mobile: Summary first, then form */}
              <div className="flex flex-col lg:grid lg:gap-6 lg:grid-cols-3 space-y-4 lg:space-y-0">
                {/* Summary Panel - Mobile first approach */}
                <div className="order-1 lg:order-2 lg:col-span-1">
                  <Card>
                    <CardHeader className="pb-3 sm:pb-6">
                      <CardTitle className="text-base sm:text-lg">
                        Session Summary
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Current draft claims in this session
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 sm:space-y-4">
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="text-center p-3 sm:p-4 bg-blue-500/10 rounded-lg touch-manipulation">
                          <div className="text-xl sm:text-2xl font-bold text-blue-600">
                            {summary.claimsCount}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Draft Claims
                          </div>
                        </div>
                        <div className="text-center p-3 sm:p-4 bg-green-500/10 rounded-lg touch-manipulation">
                          <div className="text-base sm:text-lg font-bold text-green-600">
                            {summary.totalAmount.toLocaleString('en-SG', {
                              style: 'currency',
                              currency: 'SGD',
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Total Amount
                          </div>
                        </div>
                      </div>

                      {summary.claimsCount > 0 && (
                        <div className="pt-2 border-t">
                          <div className="text-xs text-muted-foreground text-center">
                            Ready to upload files for {summary.claimsCount}{' '}
                            claim{summary.claimsCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Claim Creation Form */}
                <div className="order-2 lg:order-1 lg:col-span-2">
                  <MultiClaimForm
                    onClaimCreated={handleClaimCreated}
                    existingDraftClaims={draftClaims}
                  />
                </div>
              </div>

              {/* Draft Claims List */}
              {summary.claimsCount > 0 && (
                <DraftClaimsList onEditClaim={handleEditClaim} />
              )}
            </>
          )}

          {currentPhase === MultiClaimPhase.UPLOAD && (
            <div className="space-y-4 sm:space-y-6">
              {/* Upload Instructions - Mobile optimized */}
              <Card className="border-blue-500/20 bg-blue-500/5">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-start gap-3">
                    <Upload className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h3 className="font-medium text-foreground text-sm sm:text-base">
                        File Upload Phase
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Attach supporting documents to each of your{' '}
                        {summary.claimsCount} draft claim
                        {summary.claimsCount !== 1 ? 's' : ''}. Files will be
                        uploaded directly to your Google Drive and organized by
                        claim.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bulk Upload Component */}
              <BulkFileUploadComponent
                draftClaims={draftClaims}
                onUploadComplete={handleUploadComplete}
                onAllUploadsComplete={handleAllUploadsComplete}
              />
            </div>
          )}

          {currentPhase === MultiClaimPhase.REVIEW && (
            <div className="space-y-4 sm:space-y-6">
              {/* Review Instructions - Mobile optimized */}
              <Card className="border-green-500/20 bg-green-500/5">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h3 className="font-medium text-foreground text-sm sm:text-base">
                        Review & Finalize
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Review your {summary.claimsCount} draft claim
                        {summary.claimsCount !== 1 ? 's' : ''} below. Once you
                        mark them as ready, they will be processed for
                        submission.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Comprehensive Review */}
              <ClaimReviewComponent
                onBack={() => moveToUploadPhase()}
                onEditClaim={handleEditClaim}
              />
            </div>
          )}

          {/* Navigation */}
          <NavigationButtons />

          {/* Development Info */}
          {process.env.NODE_ENV === 'development' && (
            <Card className="border-dashed opacity-60">
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    <strong>Debug Info:</strong> Current Phase: {currentPhase}
                  </p>
                  <p>
                    Draft Claims: {summary.claimsCount} | Total Amount:{' '}
                    {summary.totalAmount}
                  </p>
                  <p>
                    With Files: {summary.claimsWithAttachments} | Without Files:{' '}
                    {summary.claimsWithoutAttachments}
                  </p>
                  {errors.createError && (
                    <p className="text-destructive">
                      Create Error: {errors.createError.message}
                    </p>
                  )}
                  {errors.updateError && (
                    <p className="text-destructive">
                      Update Error: {errors.updateError.message}
                    </p>
                  )}
                  {errors.deleteError && (
                    <p className="text-destructive">
                      Delete Error: {errors.deleteError.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiClaimSubmissionPage;
