/**
 * FileTypeIcon Component
 * Reusable file type icon for consistent file display across the application
 */

import React from 'react';
import { getFileTypeInfo } from '@/lib/file-utils';
import { cn } from '@/lib/utils';

export interface FileTypeIconProps {
  /**
   * MIME type of the file
   */
  mimeType: string;

  /**
   * Icon size in pixels
   * @default 20
   */
  size?: number;

  /**
   * Whether to show colored background circle
   * @default false
   */
  showBackground?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

const FileTypeIcon = React.memo<FileTypeIconProps>(
  ({ mimeType, size = 20, showBackground = false, className }) => {
    const fileTypeInfo = getFileTypeInfo(mimeType);
    const Icon = fileTypeInfo.icon;

    if (showBackground) {
      return (
        <div
          className={cn(
            'flex items-center justify-center rounded-full',
            fileTypeInfo.bgColor,
            className,
          )}
          style={{
            width: size * 2,
            height: size * 2,
          }}
        >
          <Icon
            size={size}
            className={fileTypeInfo.color}
          />
        </div>
      );
    }

    return (
      <Icon
        size={size}
        className={cn(fileTypeInfo.color, className)}
      />
    );
  },
);

FileTypeIcon.displayName = 'FileTypeIcon';

export default FileTypeIcon;
