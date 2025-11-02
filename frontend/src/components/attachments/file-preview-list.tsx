/**
 * FilePreviewList Component
 * Renders list of pending file uploads with previews
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import FileTypeIcon from '@/components/common/icons/file-type-icon';
import { formatFileSize } from '@/lib/file-utils';

export interface FilePreview {
  file: File;
  id: string;
  preview?: string;
}

export interface FilePreviewStatus {
  progress: number;
  status: string;
  estimatedTimeRemaining?: number;
  isActive: boolean;
  isCompleted: boolean;
  isFailed: boolean;
}

export interface FilePreviewListProps {
  /**
   * List of file previews
   */
  previews: FilePreview[];

  /**
   * Get upload status for a file
   */
  getUploadStatus: (fileName: string) => FilePreviewStatus | null;

  /**
   * Callback to remove file from preview list
   */
  onRemove: (id: string) => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

const FilePreviewList = React.memo<FilePreviewListProps>(
  ({ previews, getUploadStatus, onRemove, className }) => {
    if (previews.length === 0) return null;

    return (
      <div className={cn('space-y-2', className)}>
        <h3 className="text-sm font-medium text-foreground">
          Files to upload:
        </h3>
        <div className="space-y-2">
          {previews.map((preview) => {
            const uploadStatus = getUploadStatus(preview.file.name);
            return (
              <div
                key={preview.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-md border',
                  'bg-muted/25 dark:bg-muted/10',
                  uploadStatus?.isFailed &&
                    'border-destructive/50 bg-destructive/5',
                  uploadStatus?.isCompleted &&
                    'border-green-500/50 bg-green-500/5',
                )}
              >
                {/* File Icon/Preview */}
                <div className="flex-shrink-0">
                  {preview.preview ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preview.preview}
                        alt={`Preview of ${preview.file.name}`}
                        className="w-8 h-8 object-cover rounded"
                      />
                    </>
                  ) : (
                    <FileTypeIcon
                      mimeType={preview.file.type}
                      size={32}
                    />
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {preview.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(preview.file.size)}
                  </p>
                </div>

                {/* Status/Progress */}
                <div className="flex items-center gap-2">
                  {uploadStatus?.isActive && (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-muted-foreground">
                          {uploadStatus.progress}%
                        </span>
                        {uploadStatus.estimatedTimeRemaining &&
                          uploadStatus.estimatedTimeRemaining > 0 && (
                            <span className="text-xs text-muted-foreground/70">
                              {uploadStatus.estimatedTimeRemaining}s left
                            </span>
                          )}
                      </div>
                    </div>
                  )}

                  {uploadStatus?.isCompleted && (
                    <div className="flex items-center gap-1">
                      <CheckCircle2
                        className="w-4 h-4 text-green-500"
                        data-testid="CheckCircle2"
                      />
                      <span className="text-xs text-green-600 dark:text-green-400">
                        Uploaded to Drive
                      </span>
                    </div>
                  )}

                  {uploadStatus?.isFailed && (
                    <div className="flex items-center gap-1">
                      <AlertCircle
                        className="w-4 h-4 text-destructive"
                        data-testid="AlertCircle"
                      />
                      <span className="text-xs text-destructive">
                        Upload failed
                      </span>
                    </div>
                  )}

                  {!uploadStatus && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(preview.id);
                      }}
                      className="h-6 w-6 p-0 hover:bg-destructive/10"
                      aria-label="Remove file"
                    >
                      <X className="w-3 h-3" />
                      <span className="sr-only">Remove file</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);

FilePreviewList.displayName = 'FilePreviewList';

export default FilePreviewList;
