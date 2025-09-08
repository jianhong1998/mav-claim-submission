import { BadRequestException } from '@nestjs/common';
import type { IDriveFileMetadata } from '@project/types';

export const DriveConstants = Object.freeze({
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_FILE_NAME_LENGTH: 255,
  GOOGLE_FOLDER_MIME_TYPE: 'application/vnd.google-apps.folder',
  RETRY_DELAY_BASE: 1000,
  MAX_RETRIES: 3,
} as const);

export const DriveErrorCodes = Object.freeze({
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  QUOTA_EXCEEDED: 429,
  INTERNAL_ERROR: 500,
} as const);

export const DriveMimeTypes = Object.freeze({
  // Images
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  GIF: 'image/gif',
  WEBP: 'image/webp',
  SVG: 'image/svg+xml',

  // Documents
  PDF: 'application/pdf',
  DOC: 'application/msword',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  XLS: 'application/vnd.ms-excel',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  PPT: 'application/vnd.ms-powerpoint',
  PPTX: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // Text
  TXT: 'text/plain',
  CSV: 'text/csv',
  JSON: 'application/json',
  XML: 'application/xml',

  // Archives
  ZIP: 'application/zip',
  RAR: 'application/vnd.rar',

  // Google Workspace
  GOOGLE_DOCS: 'application/vnd.google-apps.document',
  GOOGLE_SHEETS: 'application/vnd.google-apps.spreadsheet',
  GOOGLE_SLIDES: 'application/vnd.google-apps.presentation',
  GOOGLE_FOLDER: 'application/vnd.google-apps.folder',
} as const);

export type DriveMimeType =
  (typeof DriveMimeTypes)[keyof typeof DriveMimeTypes];

export interface DriveFileValidationResult {
  isValid: boolean;
  error?: string;
}

export interface DriveErrorInfo {
  code: number;
  message: string;
  isRetryable: boolean;
}

export class DriveUtils {
  static validateFileName(fileName: string): DriveFileValidationResult {
    if (!fileName || fileName.trim().length === 0) {
      return {
        isValid: false,
        error: 'File name is required',
      };
    }

    const trimmedName = fileName.trim();

    if (trimmedName.length > DriveConstants.MAX_FILE_NAME_LENGTH) {
      return {
        isValid: false,
        error: `File name too long (max ${DriveConstants.MAX_FILE_NAME_LENGTH} characters)`,
      };
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(trimmedName)) {
      return {
        isValid: false,
        error: 'File name contains invalid characters',
      };
    }

    // Check for reserved names
    const reservedNames = [
      'CON',
      'PRN',
      'AUX',
      'NUL',
      'COM1',
      'COM2',
      'COM3',
      'COM4',
      'COM5',
      'COM6',
      'COM7',
      'COM8',
      'COM9',
      'LPT1',
      'LPT2',
      'LPT3',
      'LPT4',
      'LPT5',
      'LPT6',
      'LPT7',
      'LPT8',
      'LPT9',
    ];
    const nameWithoutExtension = trimmedName.split('.')[0].toUpperCase();
    if (reservedNames.includes(nameWithoutExtension)) {
      return {
        isValid: false,
        error: 'File name is reserved',
      };
    }

    return { isValid: true };
  }

  static validateFileSize(fileSize: number): DriveFileValidationResult {
    if (fileSize <= 0) {
      return {
        isValid: false,
        error: 'File content is required',
      };
    }

    if (fileSize > DriveConstants.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File too large (max ${DriveConstants.MAX_FILE_SIZE / (1024 * 1024)}MB)`,
      };
    }

    return { isValid: true };
  }

  static validateMimeType(mimeType: string): DriveFileValidationResult {
    if (!mimeType || mimeType.trim().length === 0) {
      return {
        isValid: false,
        error: 'MIME type is required',
      };
    }

    // Basic MIME type format validation
    const mimeTypeRegex =
      /^[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_.]*$/;
    if (!mimeTypeRegex.test(mimeType.trim())) {
      return {
        isValid: false,
        error: 'Invalid MIME type format',
      };
    }

    return { isValid: true };
  }

  static validateUploadParams(params: {
    fileName: string;
    mimeType: string;
    fileSize: number;
  }): void {
    const fileNameValidation = this.validateFileName(params.fileName);
    if (!fileNameValidation.isValid) {
      throw new BadRequestException(fileNameValidation.error);
    }

    const fileSizeValidation = this.validateFileSize(params.fileSize);
    if (!fileSizeValidation.isValid) {
      throw new BadRequestException(fileSizeValidation.error);
    }

    const mimeTypeValidation = this.validateMimeType(params.mimeType);
    if (!mimeTypeValidation.isValid) {
      throw new BadRequestException(mimeTypeValidation.error);
    }
  }

  static validateFolderName(folderName: string): void {
    if (!folderName || folderName.trim().length === 0) {
      throw new BadRequestException('Folder name is required');
    }

    if (folderName.length > DriveConstants.MAX_FILE_NAME_LENGTH) {
      throw new BadRequestException(
        `Folder name too long (max ${DriveConstants.MAX_FILE_NAME_LENGTH} characters)`,
      );
    }

    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(folderName)) {
      throw new BadRequestException('Folder name contains invalid characters');
    }
  }

  static getMimeTypeFromExtension(fileName: string): string | null {
    const extension = fileName.split('.').pop()?.toLowerCase();

    const extensionToMimeType: Record<string, string> = {
      // Images
      jpg: DriveMimeTypes.JPEG,
      jpeg: DriveMimeTypes.JPEG,
      png: DriveMimeTypes.PNG,
      gif: DriveMimeTypes.GIF,
      webp: DriveMimeTypes.WEBP,
      svg: DriveMimeTypes.SVG,

      // Documents
      pdf: DriveMimeTypes.PDF,
      doc: DriveMimeTypes.DOC,
      docx: DriveMimeTypes.DOCX,
      xls: DriveMimeTypes.XLS,
      xlsx: DriveMimeTypes.XLSX,
      ppt: DriveMimeTypes.PPT,
      pptx: DriveMimeTypes.PPTX,

      // Text
      txt: DriveMimeTypes.TXT,
      csv: DriveMimeTypes.CSV,
      json: DriveMimeTypes.JSON,
      xml: DriveMimeTypes.XML,

      // Archives
      zip: DriveMimeTypes.ZIP,
      rar: DriveMimeTypes.RAR,
    };

    return extension ? extensionToMimeType[extension] || null : null;
  }

  static isImageMimeType(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  static isDocumentMimeType(mimeType: string): boolean {
    const documentTypes = new Set<string>([
      DriveMimeTypes.PDF,
      DriveMimeTypes.DOC,
      DriveMimeTypes.DOCX,
      DriveMimeTypes.XLS,
      DriveMimeTypes.XLSX,
      DriveMimeTypes.PPT,
      DriveMimeTypes.PPTX,
      DriveMimeTypes.GOOGLE_DOCS,
      DriveMimeTypes.GOOGLE_SHEETS,
      DriveMimeTypes.GOOGLE_SLIDES,
    ]);

    return documentTypes.has(mimeType);
  }

  static mapDriveApiError(error: unknown): DriveErrorInfo {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const errorWithCode = error as { code: number; message?: string };

      switch (errorWithCode.code) {
        case DriveErrorCodes.UNAUTHORIZED:
          return {
            code: DriveErrorCodes.UNAUTHORIZED,
            message: 'Authentication required. Please re-authenticate.',
            isRetryable: false,
          };

        case DriveErrorCodes.FORBIDDEN:
          return {
            code: DriveErrorCodes.FORBIDDEN,
            message: 'Drive API access forbidden. Check permissions.',
            isRetryable: false,
          };

        case DriveErrorCodes.NOT_FOUND:
          return {
            code: DriveErrorCodes.NOT_FOUND,
            message: 'File or folder not found.',
            isRetryable: false,
          };

        case DriveErrorCodes.CONFLICT:
          return {
            code: DriveErrorCodes.CONFLICT,
            message: 'A file with this name already exists.',
            isRetryable: false,
          };

        case DriveErrorCodes.QUOTA_EXCEEDED:
          return {
            code: DriveErrorCodes.QUOTA_EXCEEDED,
            message: 'API quota exceeded. Please try again later.',
            isRetryable: true,
          };

        default:
          return {
            code: errorWithCode.code,
            message: errorWithCode.message || 'Unknown Drive API error',
            isRetryable: errorWithCode.code >= 500,
          };
      }
    }

    return {
      code: DriveErrorCodes.INTERNAL_ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
      isRetryable: true,
    };
  }

  static calculateRetryDelay(
    attempt: number,
    baseDelay: number = DriveConstants.RETRY_DELAY_BASE,
  ): number {
    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000;
    return exponentialDelay + jitter;
  }

  static shouldRetryError(error: unknown): boolean {
    const errorInfo = this.mapDriveApiError(error);
    return errorInfo.isRetryable;
  }

  static sanitizeFileName(fileName: string): string {
    // Remove or replace invalid characters
    return fileName
      .trim()
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, ' ')
      .substring(0, DriveConstants.MAX_FILE_NAME_LENGTH);
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static extractFileIdFromUrl(url: string): string | null {
    // Extract file ID from various Google Drive URL formats
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9-_]+)/,
      /id=([a-zA-Z0-9-_]+)/,
      /folders\/([a-zA-Z0-9-_]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  static createShareableUrl(fileId: string): string {
    return `https://drive.google.com/file/d/${fileId}/view`;
  }

  static processApiResponse<T>(response: { data: T }): T {
    if (!response || !response.data) {
      throw new Error('Invalid API response');
    }

    return response.data;
  }

  static createFileMetadata(params: {
    name: string;
    mimeType?: string;
    parents?: string[];
    description?: string;
  }) {
    return {
      name: params.name,
      mimeType: params.mimeType,
      parents: params.parents,
      description: params.description,
    };
  }

  static createFolderMetadata(params: {
    name: string;
    parents?: string[];
    description?: string;
  }) {
    return {
      name: params.name,
      mimeType: DriveConstants.GOOGLE_FOLDER_MIME_TYPE,
      parents: params.parents,
      description: params.description,
    };
  }

  static mapFileMetadataResponse(responseData: {
    id?: string | null;
    name?: string | null;
    mimeType?: string | null;
    size?: string | null;
    webViewLink?: string | null;
    webContentLink?: string | null;
    parents?: string[] | null;
    createdTime?: string | null;
    modifiedTime?: string | null;
  }): IDriveFileMetadata {
    if (!responseData) {
      throw new BadRequestException('Invalid file metadata response');
    }

    if (
      !responseData.id ||
      !responseData.name ||
      !responseData.mimeType ||
      !responseData.createdTime ||
      !responseData.modifiedTime
    ) {
      throw new BadRequestException(
        'Required file metadata fields are missing',
      );
    }

    return {
      id: responseData.id,
      name: responseData.name,
      mimeType: responseData.mimeType,
      size: responseData.size ? parseInt(responseData.size, 10) : undefined,
      webViewLink: responseData.webViewLink || undefined,
      webContentLink: responseData.webContentLink || undefined,
      parents: responseData.parents || undefined,
      createdTime: responseData.createdTime,
      modifiedTime: responseData.modifiedTime,
    };
  }
}
