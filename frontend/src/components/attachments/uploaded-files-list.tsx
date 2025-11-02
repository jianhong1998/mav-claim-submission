/**
 * UploadedFilesList Component
 * Displays list of successfully uploaded files with delete action
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, CheckCircle2 } from 'lucide-react';
import FileTypeIcon from '@/components/common/icons/file-type-icon';
import { formatFileSize } from '@/lib/file-utils';

export interface UploadedFile {
  id: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
}

export interface UploadedFilesListProps {
  /**
   * List of uploaded files
   */
  files: UploadedFile[];

  /**
   * Whether delete operation is in progress
   */
  isDeleting: boolean;

  /**
   * Callback to delete a file
   */
  onDelete: (fileId: string, fileName: string) => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

const UploadedFilesList = React.memo<UploadedFilesListProps>(
  ({ files, isDeleting, onDelete, className }) => {
    if (files.length === 0) return null;

    return (
      <div className={cn('space-y-2', className)}>
        <h3 className="text-sm font-medium text-foreground">Uploaded files:</h3>
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 rounded-md border border-green-500/50 bg-green-500/5"
            >
              {/* File Icon */}
              <div className="flex-shrink-0">
                <FileTypeIcon
                  mimeType={file.mimeType}
                  size={32}
                />
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {file.originalFilename}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.fileSize)}
                </p>
              </div>

              {/* Status and Actions */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-green-600 dark:text-green-400">
                    Uploaded to Drive
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(file.id, file.originalFilename);
                  }}
                  disabled={isDeleting}
                  className="h-6 w-6 p-0 hover:bg-destructive/10"
                  aria-label="Delete file"
                >
                  {isDeleting ? (
                    <div className="w-3 h-3 border border-destructive border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <X className="w-3 h-3 text-destructive" />
                  )}
                  <span className="sr-only">Delete file</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  },
);

UploadedFilesList.displayName = 'UploadedFilesList';

export default UploadedFilesList;
