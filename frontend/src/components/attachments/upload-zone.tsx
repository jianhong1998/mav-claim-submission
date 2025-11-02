/**
 * UploadZone Component
 * Handles drag-drop events and file input for uploads
 */

import React, { useRef } from 'react';
import { cn } from '@/lib/utils';
import { Upload } from 'lucide-react';
import { formatFileSize } from '@/lib/file-utils';

export interface UploadZoneProps {
  /**
   * Whether drag is currently over the zone
   */
  isDragOver: boolean;

  /**
   * Whether the upload zone is disabled
   */
  disabled: boolean;

  /**
   * Whether multiple file selection is allowed
   */
  multiple: boolean;

  /**
   * Allowed file types
   */
  allowedTypes: readonly string[];

  /**
   * Maximum file size in bytes
   */
  maxFileSize: number;

  /**
   * Whether currently uploading
   */
  isUploading: boolean;

  /**
   * Number of current uploads
   */
  uploadCount: number;

  /**
   * Callback when files are selected
   */
  onFilesSelected: (files: File[]) => void;

  /**
   * Callback for drag over event
   */
  onDragOver: (e: React.DragEvent) => void;

  /**
   * Callback for drag leave event
   */
  onDragLeave: (e: React.DragEvent) => void;

  /**
   * Callback for drop event
   */
  onDrop: (e: React.DragEvent) => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

const UploadZone = React.memo<UploadZoneProps>(
  ({
    isDragOver,
    disabled,
    multiple,
    allowedTypes,
    maxFileSize,
    isUploading,
    uploadCount,
    onFilesSelected,
    onDragOver,
    onDragLeave,
    onDrop,
    className,
  }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleClick = () => {
      if (!disabled && fileInputRef.current) {
        fileInputRef.current.click();
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const files = Array.from(e.target.files);
        onFilesSelected(files);
        // Reset input to allow re-uploading the same file
        e.target.value = '';
      }
    };

    return (
      <div
        className={cn(
          'relative rounded-lg border-2 border-dashed transition-all duration-200',
          'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
          isDragOver && !disabled
            ? 'border-primary bg-primary/5 dark:bg-primary/10'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled &&
            'cursor-pointer hover:bg-muted/25 dark:hover:bg-muted/10',
          className,
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={handleClick}
      >
        <div className="flex flex-col items-center justify-center px-6 py-8 text-center">
          <Upload
            className={cn(
              'w-12 h-12 mb-4 transition-colors',
              isDragOver ? 'text-primary' : 'text-muted-foreground',
            )}
          />

          <div className="space-y-2">
            <p
              className={cn(
                'text-sm font-medium',
                isDragOver ? 'text-primary' : 'text-foreground',
              )}
            >
              {isDragOver
                ? 'Drop files here'
                : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-muted-foreground">
              {allowedTypes.join(', ')} up to {formatFileSize(maxFileSize)}
            </p>
            <p className="text-xs text-muted-foreground/80">
              Files upload directly to your Google Drive
            </p>
            {multiple && (
              <p className="text-xs text-muted-foreground">
                You can select multiple files
              </p>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={allowedTypes.join(',')}
            multiple={multiple}
            onChange={handleInputChange}
            disabled={disabled}
            aria-label="Upload files"
          />
        </div>

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Uploading to Google Drive...
              </p>
              {uploadCount > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {uploadCount} file{uploadCount === 1 ? '' : 's'} in progress
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  },
);

UploadZone.displayName = 'UploadZone';

export default UploadZone;
