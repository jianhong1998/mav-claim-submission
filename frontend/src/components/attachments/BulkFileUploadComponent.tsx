'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { IClaimMetadata } from '@project/types';
import { Upload, CheckCircle2 } from 'lucide-react';
import { BulkUploadStatsCard } from './bulk-upload-stats-card';
import { BulkUploadClaimCard } from './bulk-upload-claim-card';

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
      <BulkUploadStatsCard
        totalClaims={draftClaims.length}
        statistics={uploadStats}
        onExpandAll={expandAllClaims}
        onCollapseAll={collapseAllClaims}
      />

      {/* Individual Claim Upload Sections */}
      <div className="space-y-4">
        {draftClaims.map((claim) => {
          const state = claimStates.get(claim.id);

          return (
            <BulkUploadClaimCard
              key={claim.id}
              claim={claim}
              isExpanded={state?.isExpanded || false}
              onToggleExpansion={() => toggleClaimExpansion(claim.id)}
              onUploadSuccess={handleUploadSuccess(claim.id)}
              onUploadError={handleUploadError(claim.id)}
            />
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
