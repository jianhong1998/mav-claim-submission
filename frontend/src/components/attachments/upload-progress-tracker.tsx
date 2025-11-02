/**
 * UploadProgressTracker Component
 * Displays progress for active file uploads
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { AttachmentStatus } from '@project/types';

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: string;
  estimatedTimeRemaining?: number;
}

export interface UploadProgressTrackerProps {
  /**
   * List of current uploads
   */
  uploads: UploadProgress[];

  /**
   * Additional CSS classes
   */
  className?: string;
}

const UploadProgressTracker = React.memo<UploadProgressTrackerProps>(
  ({ uploads, className }) => {
    if (uploads.length === 0) return null;

    return (
      <div className={cn('space-y-2', className)}>
        <h3 className="text-sm font-medium text-foreground">
          Uploading to Google Drive:
        </h3>
        <div className="space-y-2">
          {uploads.map((upload) => (
            <div
              key={upload.fileName}
              className="space-y-1"
            >
              <div className="flex justify-between text-sm">
                <span className="text-foreground truncate">
                  {upload.fileName}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {upload.progress}%
                  </span>
                  {upload.status === AttachmentStatus.PENDING && (
                    <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    upload.status === AttachmentStatus.FAILED
                      ? 'bg-destructive'
                      : upload.status === AttachmentStatus.UPLOADED
                        ? 'bg-green-500'
                        : 'bg-primary',
                  )}
                  style={{ width: `${upload.progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {upload.status === AttachmentStatus.PENDING && 'Uploading...'}
                  {upload.status === AttachmentStatus.UPLOADED &&
                    'Uploaded successfully'}
                  {upload.status === AttachmentStatus.FAILED && 'Upload failed'}
                </span>
                {upload.estimatedTimeRemaining &&
                  upload.estimatedTimeRemaining > 0 && (
                    <span>{upload.estimatedTimeRemaining}s remaining</span>
                  )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  },
);

UploadProgressTracker.displayName = 'UploadProgressTracker';

export default UploadProgressTracker;
