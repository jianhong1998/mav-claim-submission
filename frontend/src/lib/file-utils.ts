/**
 * File utility functions for file operations, validation, and display
 * Centralizes file-related logic to replace duplicate implementations
 */

import { FileText, Image, File, type LucideIcon } from 'lucide-react';

/**
 * File type information including icon, colors, and category
 */
export interface FileTypeInfo {
  icon: LucideIcon;
  color: string;
  bgColor: string;
  category: 'image' | 'document' | 'other';
}

/**
 * Formats file size from bytes to human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB", "500 KB", "1.2 GB")
 *
 * @example
 * formatFileSize(0) // "0 Bytes"
 * formatFileSize(1024) // "1 KB"
 * formatFileSize(1048576) // "1 MB"
 * formatFileSize(1073741824) // "1 GB"
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Gets file type information including icon, colors, and category
 * @param mimeType - MIME type of the file
 * @returns FileTypeInfo object with icon component, color classes, and category
 *
 * @example
 * getFileTypeInfo('image/png') // { icon: Image, color: 'text-blue-500', bgColor: 'bg-blue-500/10', category: 'image' }
 * getFileTypeInfo('application/pdf') // { icon: FileText, color: 'text-red-500', bgColor: 'bg-red-500/10', category: 'document' }
 * getFileTypeInfo('text/plain') // { icon: File, color: 'text-gray-500', bgColor: 'bg-gray-500/10', category: 'other' }
 */
export const getFileTypeInfo = (mimeType: string): FileTypeInfo => {
  // Image files
  if (mimeType.startsWith('image/')) {
    return {
      icon: Image,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      category: 'image',
    };
  }

  // PDF documents
  if (mimeType === 'application/pdf') {
    return {
      icon: FileText,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      category: 'document',
    };
  }

  // Document files (Word, Excel, PowerPoint, etc.)
  if (
    mimeType.startsWith('application/vnd.openxmlformats-officedocument') ||
    mimeType.startsWith('application/vnd.ms-') ||
    mimeType.startsWith('application/msword') ||
    mimeType === 'text/plain' ||
    mimeType === 'text/csv'
  ) {
    return {
      icon: FileText,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      category: 'document',
    };
  }

  // Default for other file types
  return {
    icon: File,
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    category: 'other',
  };
};

/**
 * Validates if a file's MIME type is in the allowed types list
 * @param file - File object to validate
 * @param allowedTypes - Array of allowed MIME types (optional, defaults to common types)
 * @returns true if file type is allowed, false otherwise
 *
 * @example
 * validateFileType(file) // validates against default allowed types
 * validateFileType(file, ['image/png', 'image/jpeg']) // validates against custom types
 */
export const validateFileType = (
  file: File,
  allowedTypes?: string[],
): boolean => {
  // Default allowed types if not specified
  const defaultAllowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'application/msword', // .doc
    'application/vnd.ms-excel', // .xls
    'application/vnd.ms-powerpoint', // .ppt
    'text/plain',
    'text/csv',
  ];

  const typesToCheck = allowedTypes ?? defaultAllowedTypes;
  return typesToCheck.includes(file.type);
};

/**
 * Validates if a file's size is within the maximum allowed size
 * @param file - File object to validate
 * @param maxSizeInBytes - Maximum allowed file size in bytes (optional, defaults to 10MB)
 * @returns true if file size is within limit, false otherwise
 *
 * @example
 * validateFileSize(file) // validates against default 10MB limit
 * validateFileSize(file, 5 * 1024 * 1024) // validates against 5MB limit
 */
export const validateFileSize = (
  file: File,
  maxSizeInBytes: number = 10 * 1024 * 1024, // Default 10MB
): boolean => {
  return file.size <= maxSizeInBytes;
};

/**
 * Creates a preview URL for a file using the browser's File API
 * Returns undefined for non-previewable files
 * @param file - File object to create preview for
 * @returns Promise resolving to preview URL string or undefined
 *
 * @example
 * const preview = await createFilePreview(imageFile);
 * if (preview) {
 *   // Use preview URL for <img src={preview} />
 *   // Remember to call URL.revokeObjectURL(preview) when done
 * }
 */
export const createFilePreview = async (
  file: File,
): Promise<string | undefined> => {
  // Only create previews for image files
  if (!file.type.startsWith('image/')) {
    return undefined;
  }

  try {
    // Create object URL for the file
    const previewUrl = URL.createObjectURL(file);
    return previewUrl;
  } catch (error) {
    console.error('Failed to create file preview:', error);
    return undefined;
  }
};
