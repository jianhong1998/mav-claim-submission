'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Paperclip,
} from 'lucide-react';

export interface UploadStatistics {
  totalClaims: number;
  claimsWithFiles: number;
  claimsWithoutFiles: number;
  totalFiles: number;
  completionRate: number;
}

export interface BulkUploadStatsCardProps {
  totalClaims: number;
  statistics: UploadStatistics;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  className?: string;
}

/**
 * BulkUploadStatsCard displays upload statistics dashboard
 * Shows progress, statistics, and bulk actions
 */
export const BulkUploadStatsCard = React.memo<BulkUploadStatsCardProps>(
  ({ totalClaims, statistics, onExpandAll, onCollapseAll, className }) => {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Attach Files to Claims
              </CardTitle>
              <CardDescription className="mt-1">
                Upload supporting documents for your {totalClaims} draft claim
                {totalClaims !== 1 ? 's' : ''}. Files upload directly to your
                Google Drive.
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
                <p className="text-sm font-medium">{statistics.totalClaims}</p>
                <p className="text-xs text-muted-foreground">Total Claims</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  {statistics.claimsWithFiles}
                </p>
                <p className="text-xs text-muted-foreground">With Files</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-md bg-orange-500/10">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                  {statistics.claimsWithoutFiles}
                </p>
                <p className="text-xs text-muted-foreground">Without Files</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-md bg-blue-500/10">
              <Paperclip className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {statistics.totalFiles}
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
                {Math.round(statistics.completionRate)}% Complete
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="h-2 bg-green-500 rounded-full transition-all duration-300"
                style={{ width: `${statistics.completionRate}%` }}
              />
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onExpandAll}
            >
              Expand All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onCollapseAll}
            >
              Collapse All
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  },
);

BulkUploadStatsCard.displayName = 'BulkUploadStatsCard';
