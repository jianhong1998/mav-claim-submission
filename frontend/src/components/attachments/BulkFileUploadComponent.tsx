'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FileUploadComponent } from './FileUploadComponent';
import { IClaimMetadata } from '@project/types';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Paperclip,
} from 'lucide-react';

interface BulkFileUploadComponentProps {
  draftClaims: IClaimMetadata[];
  onUploadComplete?: (claimId: string, fileCount: number) => void;
  onAllUploadsComplete?: () => void;
  className?: string;
}

interface ClaimUploadState {
  claimId: string;
  isExpanded: boolean;
  hasFiles: boolean;
  uploadCount: number;
  lastUploadSuccess: boolean;
}

/**
 * Gets category display name for UI
 */
const getCategoryDisplayName = (category: string): string => {
  const categoryNames: Record<string, string> = {
    telco: 'Telecommunications',
    fitness: 'Fitness & Wellness',
    dental: 'Dental Care',
    'skill-enhancement': 'Skill Enhancement',
    'company-event': 'Company Event',
    'company-lunch': 'Company Lunch',
    'company-dinner': 'Company Dinner',
    others: 'Others',
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
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

/**
 * BulkFileUploadComponent coordinates file uploads across multiple claims
 * Following requirements 3.1 and 3.2 for bulk file attachment workflow
 */
export const BulkFileUploadComponent: React.FC<
  BulkFileUploadComponentProps
> = ({ draftClaims, onUploadComplete, onAllUploadsComplete, className }) => {
  const [claimStates, setClaimStates] = useState<Map<string, ClaimUploadState>>(
    () => {
      const initialStates = new Map<string, ClaimUploadState>();
      draftClaims.forEach((claim) => {
        initialStates.set(claim.id, {
          claimId: claim.id,
          isExpanded: false,
          hasFiles: (claim.attachments?.length || 0) > 0,
          uploadCount: claim.attachments?.length || 0,
          lastUploadSuccess: true,
        });
      });
      return initialStates;
    },
  );

  // Calculate overall upload statistics
  const uploadStats = useMemo(() => {
    const totalClaims = draftClaims.length;
    let claimsWithFiles = 0;
    let totalFiles = 0;

    draftClaims.forEach((claim) => {
      const fileCount = claim.attachments?.length || 0;
      if (fileCount > 0) {
        claimsWithFiles++;
      }
      totalFiles += fileCount;
    });

    return {
      totalClaims,
      claimsWithFiles,
      claimsWithoutFiles: totalClaims - claimsWithFiles,
      totalFiles,
      completionRate:
        totalClaims > 0 ? (claimsWithFiles / totalClaims) * 100 : 0,
    };
  }, [draftClaims]);

  const toggleClaimExpansion = useCallback((claimId: string) => {
    setClaimStates((prev) => {
      const newStates = new Map(prev);
      const currentState = newStates.get(claimId);
      if (currentState) {
        newStates.set(claimId, {
          ...currentState,
          isExpanded: !currentState.isExpanded,
        });
      }
      return newStates;
    });
  }, []);

  const handleUploadSuccess = useCallback(
    (claimId: string) => (_fileName: string) => {
      setClaimStates((prev) => {
        const newStates = new Map(prev);
        const currentState = newStates.get(claimId);
        if (currentState) {
          const newUploadCount = currentState.uploadCount + 1;
          newStates.set(claimId, {
            ...currentState,
            hasFiles: true,
            uploadCount: newUploadCount,
            lastUploadSuccess: true,
          });

          // Notify parent component
          onUploadComplete?.(claimId, newUploadCount);

          // Check if all claims now have files
          const allClaims = Array.from(newStates.values());
          const claimsWithFiles = allClaims.filter(
            (state) => state.hasFiles,
          ).length;
          if (claimsWithFiles === draftClaims.length) {
            onAllUploadsComplete?.();
          }
        }
        return newStates;
      });
    },
    [draftClaims.length, onUploadComplete, onAllUploadsComplete],
  );

  const handleUploadError = useCallback(
    (claimId: string) => (_fileName: string, error: string) => {
      setClaimStates((prev) => {
        const newStates = new Map(prev);
        const currentState = newStates.get(claimId);
        if (currentState) {
          newStates.set(claimId, {
            ...currentState,
            lastUploadSuccess: false,
          });
        }
        return newStates;
      });

      // Log error for debugging - could be replaced with proper error logging service
      // eslint-disable-next-line no-console
      console.error(
        `Upload failed for ${_fileName} in claim ${claimId}:`,
        error,
      );
    },
    [],
  );

  const expandAllClaims = useCallback(() => {
    setClaimStates((prev) => {
      const newStates = new Map(prev);
      newStates.forEach((state, claimId) => {
        newStates.set(claimId, { ...state, isExpanded: true });
      });
      return newStates;
    });
  }, []);

  const collapseAllClaims = useCallback(() => {
    setClaimStates((prev) => {
      const newStates = new Map(prev);
      newStates.forEach((state, claimId) => {
        newStates.set(claimId, { ...state, isExpanded: false });
      });
      return newStates;
    });
  }, []);

  if (draftClaims.length === 0) {
    return (
      <Card className={cn('', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk File Upload
          </CardTitle>
          <CardDescription>
            No draft claims available. Create claims first to attach files.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Attach Files to Claims
              </CardTitle>
              <CardDescription className="mt-1">
                Upload supporting documents for your {draftClaims.length} draft
                claim
                {draftClaims.length !== 1 ? 's' : ''}. Files upload directly to
                your Google Drive.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Upload Statistics */}
          <div className="grid gap-4 md:grid-cols-4 mb-4">
            <div className="flex items-center gap-2 p-3 rounded-md bg-muted/25">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{uploadStats.totalClaims}</p>
                <p className="text-xs text-muted-foreground">Total Claims</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  {uploadStats.claimsWithFiles}
                </p>
                <p className="text-xs text-muted-foreground">With Files</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-md bg-orange-500/10">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                  {uploadStats.claimsWithoutFiles}
                </p>
                <p className="text-xs text-muted-foreground">Without Files</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-md bg-blue-500/10">
              <Paperclip className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {uploadStats.totalFiles}
                </p>
                <p className="text-xs text-muted-foreground">Total Files</p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Upload Progress</span>
              <span className="text-foreground">
                {Math.round(uploadStats.completionRate)}% Complete
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="h-2 bg-green-500 rounded-full transition-all duration-300"
                style={{ width: `${uploadStats.completionRate}%` }}
              />
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={expandAllClaims}
            >
              Expand All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={collapseAllClaims}
            >
              Collapse All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Individual Claim Upload Sections */}
      <div className="space-y-4">
        {draftClaims.map((claim) => {
          const state = claimStates.get(claim.id);
          const fileCount = claim.attachments?.length || 0;

          return (
            <Card
              key={claim.id}
              className={cn(
                'transition-all duration-200',
                state?.isExpanded && 'ring-1 ring-ring',
                fileCount > 0 && 'border-green-500/50',
              )}
            >
              <CardHeader
                className="cursor-pointer hover:bg-muted/25 transition-colors"
                onClick={() => toggleClaimExpansion(claim.id)}
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
                        state?.isExpanded && 'rotate-180',
                      )}
                    >
                      <RotateCcw className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </CardHeader>

              {state?.isExpanded && (
                <CardContent className="pt-0">
                  <div className="border-t border-muted/25 pt-4">
                    <FileUploadComponent
                      claimId={claim.id}
                      onUploadSuccess={handleUploadSuccess(claim.id)}
                      onUploadError={handleUploadError(claim.id)}
                      multiple={true}
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Summary Message */}
      {uploadStats.claimsWithFiles === draftClaims.length && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  All Claims Have Files Attached
                </p>
                <p className="text-xs text-muted-foreground">
                  You can proceed to review and finalize your claims for
                  submission.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
