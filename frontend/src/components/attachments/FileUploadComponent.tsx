'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';
import UploadZone from './upload-zone';
import FilePreviewList from './file-preview-list';
import UploadProgressTracker from './upload-progress-tracker';
import UploadedFilesList from './uploaded-files-list';
import { useFileUpload } from '@/hooks/attachments/useFileUpload';

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
  const {
    isDragOver,
    filePreviews,
    attachments,
    currentUploads,
    isUploading,
    isDeletingAttachment,
    error,
    maxFileSize,
    allowedTypes,
    handleFiles,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeFilePreview,
    handleDeleteUploadedFile,
    getUploadStatus,
  } = useFileUpload({
    claimId,
    onUploadSuccess,
    onUploadError,
    multiple,
    disabled,
  });

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
