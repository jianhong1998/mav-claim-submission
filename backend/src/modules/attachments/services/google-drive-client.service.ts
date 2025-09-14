import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { google, drive_v3 } from 'googleapis';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { TokenDBUtil } from 'src/modules/auth/utils/token-db.util';

export interface DriveUploadOptions {
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
  folderId?: string;
}

export interface DriveFileInfo {
  id: string;
  name: string;
  webViewLink: string;
  size: string;
}

export interface DriveUploadResult extends DriveFileInfo {
  uploadedAt: Date;
}

/**
 * GoogleDriveClient - Google Drive API Operations
 *
 * Responsibilities:
 * - File upload to Google Drive
 * - Folder creation and management
 * - File permission and sharing
 * - Drive API error handling with retries
 *
 * Requirements: 1.1 - Google Drive Integration, 3.1 - Token Management
 *
 * Design: Abstracts Google Drive API behind clean interface with automatic
 * token refresh and exponential backoff for reliability
 */
@Injectable()
export class GoogleDriveClient {
  private readonly logger = new Logger(GoogleDriveClient.name);
  private readonly maxRetries = 3;
  private readonly baseDelayMs = 1000;

  constructor(
    private readonly authService: AuthService,
    private readonly tokenDBUtil: TokenDBUtil,
  ) {}

  /**
   * Upload file to user's Google Drive
   * Requirements: 1.1 - File Upload Operations
   */
  async uploadFile(
    userId: string,
    options: DriveUploadOptions,
  ): Promise<DriveUploadResult> {
    const drive = await this.getDriveClient(userId);

    try {
      const uploadResult = await this.retryOperation(async () => {
        const response = await drive.files.create({
          requestBody: {
            name: options.fileName,
            parents: options.folderId ? [options.folderId] : undefined,
          },
          media: {
            mimeType: options.mimeType,
            body: options.fileBuffer,
          },
          fields: 'id,name,webViewLink,size',
        });

        return response.data as DriveFileInfo;
      });

      // Make file shareable
      await this.setFilePermissions(userId, uploadResult.id);

      this.logger.log(
        `File uploaded successfully: ${uploadResult.name} (${uploadResult.id})`,
      );

      return {
        ...uploadResult,
        uploadedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`File upload failed for user ${userId}:`, error);
      throw this.handleDriveError(error);
    }
  }

  /**
   * Create claim folder structure /Mavericks Claims/{claimUuid}/
   * Requirements: 3.1 - Folder Structure Management
   */
  async createClaimFolder(userId: string, claimId: string): Promise<string> {
    try {
      // First, find or create "Mavericks Claims" folder
      const mavericksClaimsFolderId = await this.findOrCreateFolder(
        userId,
        'Mavericks Claims',
      );

      // Then, find or create the specific claim folder
      const claimFolderId = await this.findOrCreateFolder(
        userId,
        claimId,
        mavericksClaimsFolderId,
      );

      this.logger.log(
        `Claim folder structure created: /Mavericks Claims/${claimId}/ (${claimFolderId})`,
      );
      return claimFolderId;
    } catch (error) {
      this.logger.error(
        `Claim folder creation failed for user ${userId}:`,
        error,
      );
      throw this.handleDriveError(error);
    }
  }

  /**
   * Find existing folder or create new one
   * Requirements: 3.1 - Folder Management
   */
  private async findOrCreateFolder(
    userId: string,
    folderName: string,
    parentFolderId?: string,
  ): Promise<string> {
    const drive = await this.getDriveClient(userId);

    try {
      // Search for existing folder
      const searchQuery = parentFolderId
        ? `name='${folderName}' and parents in '${parentFolderId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
        : `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

      const searchResult = await this.retryOperation(async () => {
        const response = await drive.files.list({
          q: searchQuery,
          fields: 'files(id,name)',
        });
        return response.data.files || [];
      });

      // Return existing folder ID if found
      if (searchResult.length > 0) {
        this.logger.debug(
          `Found existing folder: ${folderName} (${searchResult[0].id})`,
        );
        return searchResult[0].id!;
      }

      // Create new folder if not found
      return await this.createFolder(userId, folderName, parentFolderId);
    } catch (error) {
      this.logger.error(
        `Failed to find or create folder ${folderName}:`,
        error,
      );
      throw this.handleDriveError(error);
    }
  }

  /**
   * Create folder in user's Google Drive
   * Requirements: 1.1 - Folder Management
   */
  async createFolder(
    userId: string,
    folderName: string,
    parentFolderId?: string,
  ): Promise<string> {
    const drive = await this.getDriveClient(userId);

    try {
      const result = await this.retryOperation(async () => {
        const response = await drive.files.create({
          requestBody: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: parentFolderId ? [parentFolderId] : undefined,
          },
          fields: 'id,name',
        });

        return response.data.id;
      });

      if (!result) {
        throw new InternalServerErrorException('Failed to create folder');
      }

      this.logger.log(`Folder created successfully: ${folderName} (${result})`);
      return result;
    } catch (error) {
      this.logger.error(`Folder creation failed for user ${userId}:`, error);
      throw this.handleDriveError(error);
    }
  }

  /**
   * Set file permissions to make it shareable
   * Requirements: 1.1 - File Sharing
   */
  async setFilePermissions(userId: string, fileId: string): Promise<void> {
    const drive = await this.getDriveClient(userId);

    try {
      await this.retryOperation(async () => {
        // Make file viewable by anyone with the link
        await drive.permissions.create({
          fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        });
      });

      this.logger.debug(`Permissions set for file: ${fileId}`);
    } catch (error) {
      this.logger.error(`Failed to set permissions for file ${fileId}:`, error);
      throw this.handleDriveError(error);
    }
  }

  /**
   * Get file information from Google Drive
   * Requirements: 1.1 - File Operations
   */
  async getFileInfo(
    userId: string,
    fileId: string,
  ): Promise<DriveFileInfo | null> {
    const drive = await this.getDriveClient(userId);

    try {
      const result = await this.retryOperation(async () => {
        const response = await drive.files.get({
          fileId,
          fields: 'id,name,webViewLink,size',
        });

        return response.data as DriveFileInfo;
      });

      return result;
    } catch (error) {
      if (this.hasErrorCode(error, 404)) {
        return null;
      }
      this.logger.error(`Failed to get file info for ${fileId}:`, error);
      throw this.handleDriveError(error);
    }
  }

  /**
   * Delete file from Google Drive
   * Requirements: 1.1 - File Management
   */
  async deleteFile(userId: string, fileId: string): Promise<void> {
    const drive = await this.getDriveClient(userId);

    try {
      await this.retryOperation(async () => {
        await drive.files.delete({
          fileId,
        });
      });

      this.logger.log(`File deleted successfully: ${fileId}`);
    } catch (error) {
      if (this.hasErrorCode(error, 404)) {
        this.logger.warn(`File not found for deletion: ${fileId}`);
        return;
      }
      this.logger.error(`Failed to delete file ${fileId}:`, error);
      throw this.handleDriveError(error);
    }
  }

  /**
   * Create authenticated Google Drive client
   * Requirements: 3.1 - Token Management
   */
  private async getDriveClient(userId: string): Promise<drive_v3.Drive> {
    const tokenEntity = await this.authService.getUserTokens(userId);

    if (!tokenEntity) {
      throw new BadRequestException(
        'No valid Google Drive tokens found for user',
      );
    }

    // Decrypt tokens for API usage
    const { accessToken, refreshToken } =
      await this.tokenDBUtil.getDecryptedTokens(tokenEntity);

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    // Create Drive client
    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  /**
   * Retry operation with exponential backoff
   * Requirements: 3.1 - Reliability and Error Handling
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    attempt = 1,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= this.maxRetries) {
        throw error;
      }

      // Only retry on rate limiting or temporary errors
      if (this.isRetryableError(error)) {
        const delay = this.baseDelayMs * Math.pow(2, attempt - 1);
        this.logger.warn(
          `Operation failed, retrying in ${delay}ms (attempt ${attempt}/${this.maxRetries})`,
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.retryOperation(operation, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Check if error is retryable
   * Requirements: 3.1 - Error Handling
   */
  private isRetryableError(error: unknown): boolean {
    const retryableCodes = [429, 500, 502, 503, 504];
    return this.hasErrorCode(error, retryableCodes);
  }

  /**
   * Type-safe error code checker
   */
  private hasErrorCode(error: unknown, codes: number | number[]): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const errorObj = error as { code?: unknown };
    if (typeof errorObj.code !== 'number') {
      return false;
    }

    const codeArray = Array.isArray(codes) ? codes : [codes];
    return codeArray.includes(errorObj.code);
  }

  /**
   * Handle and transform Drive API errors
   * Requirements: 3.1 - Error Handling
   */
  private handleDriveError(error: unknown): Error {
    if (this.hasErrorCode(error, 401)) {
      return new BadRequestException('Google Drive authentication failed');
    }

    if (this.hasErrorCode(error, 403)) {
      const errorMessage = this.getErrorMessage(error);
      if (errorMessage?.includes('quotaExceeded')) {
        return new BadRequestException('Google Drive quota exceeded');
      }
      if (errorMessage?.includes('insufficientPermissions')) {
        return new BadRequestException('Insufficient Google Drive permissions');
      }
      return new BadRequestException('Google Drive access forbidden');
    }

    if (this.hasErrorCode(error, 404)) {
      return new BadRequestException('Google Drive file or folder not found');
    }

    if (this.hasErrorCode(error, 429)) {
      return new BadRequestException(
        'Google Drive rate limit exceeded, please try again later',
      );
    }

    // Generic server errors
    if (this.hasErrorCodeRange(error, 500, 599)) {
      return new InternalServerErrorException(
        'Google Drive service temporarily unavailable',
      );
    }

    // Default error handling
    this.logger.error('Unexpected Google Drive error:', error);
    return new InternalServerErrorException('Google Drive operation failed');
  }

  /**
   * Get error message from error object safely
   */
  private getErrorMessage(error: unknown): string | null {
    if (typeof error !== 'object' || error === null) {
      return null;
    }

    const errorObj = error as { message?: unknown };
    return typeof errorObj.message === 'string' ? errorObj.message : null;
  }

  /**
   * Check if error code is within range
   */
  private hasErrorCodeRange(error: unknown, min: number, max: number): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const errorObj = error as { code?: unknown };
    if (typeof errorObj.code !== 'number') {
      return false;
    }

    return errorObj.code >= min && errorObj.code <= max;
  }
}
