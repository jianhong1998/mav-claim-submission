'use client';

import React, { useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAttachmentUpload } from '@/hooks/attachments/useAttachmentUpload';
import { useAttachmentList } from '@/hooks/attachments/useAttachmentList';
import { AttachmentStatus } from '@project/types';
import { toast } from 'sonner';
import {
  Upload,
  X,
  FileText,
  Image,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface FileUploadComponentProps {
  claimId: string;
  onUploadSuccess?: (fileName: string) => void;
  onUploadError?: (fileName: string, error: string) => void;
  className?: string;
  multiple?: boolean;
  disabled?: boolean;
}

interface FilePreview {
  file: File;
  id: string;
  preview?: string;
}

/**
 * Gets appropriate icon for file type
 */
const getFileIcon = (file: File) => {
  if (file.type.startsWith('image/')) {
    return (
      <Image
        className="w-8 h-8 text-blue-500"
        aria-label="Image file icon"
      />
    );
  }
  return (
    <FileText
      className="w-8 h-8 text-gray-500"
      aria-label="Document file icon"
    />
  );
};

/**
 * Formats file size for display
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Enhanced file upload component with drag-and-drop support and client-side Google Drive integration
 * Follows existing UI patterns and accessibility standards
 * Supports direct Drive uploads with comprehensive progress tracking
 */
export const FileUploadComponent: React.FC<FileUploadComponentProps> = ({
  claimId,
  onUploadSuccess,
  onUploadError,
  className,
  multiple = true,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);

  const {
    uploadFile,
    uploadFiles,
    validateFiles,
    isUploading,
    currentUploads,
    getFileProgress,
    maxFileSize,
    allowedTypes,
    error,
  } = useAttachmentUpload(claimId);

  const { attachments, deleteAttachment, isDeletingAttachment } =
    useAttachmentList(claimId);

  /**
   * Creates preview for uploaded files
   */
  const createFilePreview = useCallback((files: File[]): FilePreview[] => {
    return files.map((file) => ({
      file,
      id: `${file.name}-${file.size}-${Date.now()}`,
      preview: file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : undefined,
    }));
  }, []);

  /**
   * Handles file selection from input or drag-and-drop
   */
  const handleFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      // Validate files before processing
      const { valid, invalid } = validateFiles(files);

      // Show validation errors
      if (invalid.length > 0) {
        invalid.forEach(({ file, errors }) => {
          toast.error(`${file.name}: ${errors.join(', ')}`);
          onUploadError?.(file.name, errors.join(', '));
        });
      }

      if (valid.length === 0) return;

      // Create previews for valid files
      const previews = createFilePreview(valid);
      setFilePreviews((prev) => [...prev, ...previews]);

      try {
        if (multiple && valid.length > 1) {
          // Batch upload for multiple files
          const results = await uploadFiles(valid, {
            onProgress: (_fileName, _progress) => {
              // Progress is handled by the hook state
            },
          });

          // Handle results
          results.forEach((result, index) => {
            const fileName = valid[index].name;
            if (result.status === 'fulfilled') {
              onUploadSuccess?.(fileName);
            } else {
              const errorMessage =
                (result.reason as Error)?.message || 'Upload failed';
              onUploadError?.(fileName, errorMessage);
            }
          });
        } else {
          // Single file upload
          const file = valid[0];
          await uploadFile(file, {
            onProgress: (_progress) => {
              // Progress is handled by the hook state
            },
          });
          onUploadSuccess?.(file.name);
        }
      } catch (uploadError) {
        const errorMessage =
          uploadError instanceof Error ? uploadError.message : 'Upload failed';
        valid.forEach((file) => {
          onUploadError?.(file.name, errorMessage);
        });
      }
    },
    [
      validateFiles,
      createFilePreview,
      uploadFiles,
      uploadFile,
      multiple,
      onUploadSuccess,
      onUploadError,
    ],
  );

  /**
   * Handles drag and drop events
   */
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set drag over to false if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      void handleFiles(files);
    },
    [disabled, handleFiles],
  );

  /**
   * Handles file input change
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const files = Array.from(e.target.files);
        void handleFiles(files);
        // Reset input to allow re-uploading the same file
        e.target.value = '';
      }
    },
    [handleFiles],
  );

  /**
   * Opens file picker
   */
  const openFilePicker = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  /**
   * Removes file from preview list
   */
  const removeFilePreview = useCallback((id: string) => {
    setFilePreviews((prev) => {
      const updated = prev.filter((preview) => preview.id !== id);
      // Clean up object URLs to prevent memory leaks
      const removed = prev.find((p) => p.id === id);
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return updated;
    });
  }, []);

  /**
   * Handles uploaded file deletion
   */
  const handleDeleteUploadedFile = useCallback(
    async (attachmentId: string, fileName: string) => {
      try {
        await deleteAttachment(attachmentId);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Delete failed';
        toast.error(`Failed to delete ${fileName}: ${errorMessage}`);
      }
    },
    [deleteAttachment],
  );

  /**
   * Gets upload progress for a specific file
   */
  const getUploadStatus = useCallback(
    (fileName: string) => {
      const progress = getFileProgress(fileName);
      if (!progress) return null;

      return {
        ...progress,
        isActive: progress.status === AttachmentStatus.PENDING,
        isCompleted: progress.status === AttachmentStatus.UPLOADED,
        isFailed: progress.status === AttachmentStatus.FAILED,
      };
    },
    [getFileProgress],
  );

  // Clean up object URLs on unmount
  React.useEffect(() => {
    return () => {
      filePreviews.forEach((preview) => {
        if (preview.preview) {
          URL.revokeObjectURL(preview.preview);
        }
      });
    };
  }, [filePreviews]);

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Upload Zone */}
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
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => void openFilePicker()}
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
              {currentUploads.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {currentUploads.length} file
                  {currentUploads.length === 1 ? '' : 's'} in progress
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* File Previews */}
      {filePreviews.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">
            Files to upload:
          </h3>
          <div className="space-y-2">
            {filePreviews.map((preview) => {
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
                      getFileIcon(preview.file)
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
                          void removeFilePreview(preview.id);
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
      ) : null}

      {/* Uploaded Files */}
      {attachments.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">
            Uploaded files:
          </h3>
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-3 rounded-md border border-green-500/50 bg-green-500/5"
              >
                {/* File Icon */}
                <div className="flex-shrink-0">
                  {attachment.mimeType.startsWith('image/') ? (
                    <Image
                      className="w-8 h-8 text-blue-500"
                      aria-label="Image file icon"
                    />
                  ) : (
                    <FileText
                      className="w-8 h-8 text-gray-500"
                      aria-label="Document file icon"
                    />
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {attachment.originalFilename}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.fileSize)}
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
                      void handleDeleteUploadedFile(
                        attachment.id,
                        attachment.originalFilename,
                      );
                    }}
                    disabled={isDeletingAttachment}
                    className="h-6 w-6 p-0 hover:bg-destructive/10"
                    aria-label="Delete file"
                  >
                    {isDeletingAttachment ? (
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
      ) : null}

      {/* Current Uploads Progress */}
      {currentUploads.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">
            Uploading to Google Drive:
          </h3>
          <div className="space-y-2">
            {currentUploads.map((upload) => (
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
                    {upload.status === AttachmentStatus.PENDING &&
                      'Uploading...'}
                    {upload.status === AttachmentStatus.UPLOADED &&
                      'Uploaded successfully'}
                    {upload.status === AttachmentStatus.FAILED &&
                      'Upload failed'}
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
      ) : null}

      {/* Error Display */}
      {error ? (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : 'Upload failed'}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};
