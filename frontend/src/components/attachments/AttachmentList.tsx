'use client';

import React, { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAttachmentList } from '@/hooks/attachments/useAttachmentList';
import { IAttachmentMetadata, AttachmentStatus } from '@project/types';
import {
  FileText,
  Image,
  ExternalLink,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';

interface AttachmentListProps {
  claimId: string;
  className?: string;
  showActions?: boolean;
  onAttachmentDeleted?: (attachmentId: string) => void;
  onAttachmentViewed?: (attachment: IAttachmentMetadata) => void;
}

/**
 * Gets appropriate icon and color for file type
 */
const getFileTypeInfo = (mimeType: string) => {
  if (mimeType.startsWith('image/')) {
    return {
      icon: (
        <Image
          className="w-5 h-5"
          aria-label="Image file"
        />
      ),
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    };
  }

  if (mimeType === 'application/pdf') {
    return {
      icon: <FileText className="w-5 h-5" />,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    };
  }

  return {
    icon: <FileText className="w-5 h-5" />,
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
  };
};

/**
 * Gets status indicator for attachment
 */
const getStatusInfo = (status: AttachmentStatus) => {
  switch (status) {
    case AttachmentStatus.UPLOADED:
      return {
        icon: <CheckCircle2 className="w-4 h-4" />,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        label: 'Uploaded',
      };
    case AttachmentStatus.PENDING:
      return {
        icon: <Clock className="w-4 h-4" />,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
        label: 'Pending',
      };
    case AttachmentStatus.FAILED:
      return {
        icon: <AlertCircle className="w-4 h-4" />,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        label: 'Failed',
      };
    default:
      return {
        icon: <Clock className="w-4 h-4" />,
        color: 'text-gray-500',
        bgColor: 'bg-gray-500/10',
        label: 'Unknown',
      };
  }
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
 * Formats date for display
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Individual attachment item component
 */
interface AttachmentItemProps {
  attachment: IAttachmentMetadata;
  onDelete: (id: string) => void;
  onView: (attachment: IAttachmentMetadata) => void;
  isDeletingAttachment: boolean;
  showActions: boolean;
}

const AttachmentItem: React.FC<AttachmentItemProps> = ({
  attachment,
  onDelete,
  onView,
  isDeletingAttachment,
  showActions,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const fileTypeInfo = getFileTypeInfo(attachment.mimeType);
  const statusInfo = getStatusInfo(attachment.status);

  const handleDelete = useCallback(async () => {
    if (isDeleting) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${attachment.originalFilename}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await onDelete(attachment.id);
    } catch (_error) {
      // Error handling is done in the hook
    } finally {
      setIsDeleting(false);
    }
  }, [attachment.id, attachment.originalFilename, onDelete, isDeleting]);

  const handleView = useCallback(() => {
    onView(attachment);
  }, [attachment, onView]);

  const handleDownload = useCallback(() => {
    // Open the shareable URL in a new tab for download/view
    window.open(attachment.driveShareableUrl, '_blank');
  }, [attachment.driveShareableUrl]);

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4 rounded-lg border transition-all',
        'bg-background hover:bg-muted/25 dark:hover:bg-muted/10',
        attachment.status === AttachmentStatus.FAILED &&
          'border-destructive/30 bg-destructive/5',
        attachment.status === AttachmentStatus.UPLOADED &&
          'border-green-500/30 bg-green-500/5',
      )}
    >
      {/* File Type Icon */}
      <div
        className={cn(
          'flex items-center justify-center w-10 h-10 rounded-lg',
          fileTypeInfo.bgColor,
        )}
      >
        <div className={fileTypeInfo.color}>{fileTypeInfo.icon}</div>
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground truncate">
            {attachment.originalFilename}
          </h3>
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-xs',
              statusInfo.bgColor,
            )}
          >
            <div className={statusInfo.color}>{statusInfo.icon}</div>
            <span className={statusInfo.color}>{statusInfo.label}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
          <span>{formatFileSize(attachment.fileSize)}</span>
          <span>Uploaded {formatDate(attachment.uploadedAt)}</span>
          {attachment.storedFilename !== attachment.originalFilename && (
            <span title={`Stored as: ${attachment.storedFilename}`}>
              Renamed
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      {showActions && attachment.status === AttachmentStatus.UPLOADED && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleView}
            className="h-8 w-8 p-0"
            title="View attachment"
          >
            <Eye className="w-4 h-4" />
            <span className="sr-only">View attachment</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="h-8 w-8 p-0"
            title="Download attachment"
          >
            <Download className="w-4 h-4" />
            <span className="sr-only">Download attachment</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(attachment.driveShareableUrl, '_blank')}
            className="h-8 w-8 p-0"
            title="Open in Google Drive"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="sr-only">Open in Google Drive</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting || isDeletingAttachment}
            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
            title="Delete attachment"
          >
            {isDeleting ? (
              <div className="w-4 h-4 border border-destructive border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span className="sr-only">Delete attachment</span>
          </Button>
        </div>
      )}
    </div>
  );
};

/**
 * Enhanced attachment list component for displaying and managing attachments
 * Follows existing UI patterns and accessibility standards
 */
export const AttachmentList: React.FC<AttachmentListProps> = ({
  claimId,
  className,
  showActions = true,
  onAttachmentDeleted,
  onAttachmentViewed,
}) => {
  const {
    attachments,
    total,
    isLoading,
    isFetching,
    isError,
    error,
    isDeletingAttachment,
    refreshAttachments,
    deleteAttachment,
  } = useAttachmentList(claimId);

  const handleDeleteAttachment = useCallback(
    async (attachmentId: string) => {
      await deleteAttachment(attachmentId);
      onAttachmentDeleted?.(attachmentId);
    },
    [deleteAttachment, onAttachmentDeleted],
  );

  const handleViewAttachment = useCallback(
    (attachment: IAttachmentMetadata) => {
      // Default behavior: open in new tab
      window.open(attachment.driveShareableUrl, '_blank');
      onAttachmentViewed?.(attachment);
    },
    [onAttachmentViewed],
  );

  const handleRefresh = useCallback(() => {
    void refreshAttachments();
    toast.info('Refreshing attachments...');
  }, [refreshAttachments]);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Attachments</h2>
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-4 rounded-lg border bg-muted/10"
            >
              <div className="w-10 h-10 bg-muted/30 rounded-lg animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted/30 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-muted/30 rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Attachments</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
          >
            <RefreshCw className="w-4 h-4" />
            <span className="sr-only">Refresh attachments</span>
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-destructive/20 bg-destructive/5">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Failed to load attachments
          </h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            {error instanceof Error
              ? error.message
              : 'An unexpected error occurred'}
          </p>
          <Button
            variant="outline"
            onClick={handleRefresh}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Attachments</h2>
          {total > 0 && (
            <span className="px-2 py-1 text-xs bg-muted rounded-full text-muted-foreground">
              {total}
            </span>
          )}
          {isFetching && (
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isFetching}
        >
          <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
          <span className="sr-only">Refresh attachments</span>
        </Button>
      </div>

      {/* Content */}
      {attachments.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-dashed border-muted-foreground/25">
          <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            No attachments yet
          </h3>
          <p className="text-sm text-muted-foreground text-center">
            Upload files to attach them to this claim. Files will be stored
            securely in your Google Drive.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <AttachmentItem
              key={attachment.id}
              attachment={attachment}
              onDelete={handleDeleteAttachment}
              onView={handleViewAttachment}
              isDeletingAttachment={isDeletingAttachment}
              showActions={showActions}
            />
          ))}
        </div>
      )}
    </div>
  );
};
