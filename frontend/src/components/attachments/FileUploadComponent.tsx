'use client';

import React, { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { useAttachmentUpload } from '@/hooks/attachments/useAttachmentUpload';
import { useAttachmentList } from '@/hooks/attachments/useAttachmentList';
import { AttachmentStatus } from '@project/types';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';
import UploadZone from './upload-zone';
import FilePreviewList, { type FilePreview } from './file-preview-list';
import UploadProgressTracker from './upload-progress-tracker';
import UploadedFilesList from './uploaded-files-list';

interface FileUploadComponentProps {
  claimId: string;
  onUploadSuccess?: (fileName: string) => void;
  onUploadError?: (fileName: string, error: string) => void;
  className?: string;
  multiple?: boolean;
  disabled?: boolean;
}

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
      <UploadZone
        isDragOver={isDragOver}
        disabled={disabled}
        multiple={multiple}
        allowedTypes={allowedTypes}
        maxFileSize={maxFileSize}
        isUploading={isUploading}
        uploadCount={currentUploads.length}
        onFilesSelected={handleFiles}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      />

      {/* File Previews */}
      <FilePreviewList
        previews={filePreviews}
        getUploadStatus={getUploadStatus}
        onRemove={removeFilePreview}
      />

      {/* Uploaded Files */}
      <UploadedFilesList
        files={attachments}
        isDeleting={isDeletingAttachment}
        onDelete={handleDeleteUploadedFile}
      />

      {/* Current Uploads Progress */}
      <UploadProgressTracker uploads={currentUploads} />

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
