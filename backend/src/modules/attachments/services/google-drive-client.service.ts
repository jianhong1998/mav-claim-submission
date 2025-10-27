import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { google, drive_v3 } from 'googleapis';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { TokenDBUtil } from 'src/modules/auth/utils/token-db.util';
import {
  FolderNamingUtil,
  ClaimDataForFolderNaming,
} from 'src/shared/utils/folder-naming.util';
import { EnvironmentVariableUtil } from 'src/modules/common/utils/environment-variable.util';

export interface DriveFileInfo {
  id: string;
  name: string;
  webViewLink: string;
  size: string;
}

/**
 * GoogleDriveClient - Google Drive API Operations
 *
 * Responsibilities:
 * - Folder creation and management
 * - File permission and sharing
 * - File metadata operations
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
    private readonly environmentVariableUtil: EnvironmentVariableUtil,
  ) {}

  /**
   * Create claim folder structure /Mavericks Claims/{descriptiveName}/
   * Requirements: 3.1 - Folder Structure Management, 4.3 - Descriptive Naming
   */
  async createClaimFolder(
    userId: string,
    claimId: string,
    claimData?: ClaimDataForFolderNaming,
  ): Promise<string> {
    try {
      // Get environment-specific root folder name
      const rootFolderName =
        this.environmentVariableUtil.getVariables().googleDriveClaimsFolderName;

      // First, find or create root folder (e.g., "[test] Mavericks Claims")
      const mavericksClaimsFolderId = await this.findOrCreateFolder(
        userId,
        rootFolderName,
      );

      // Generate descriptive folder name if claim data is provided
      let folderName = claimId; // fallback to claimId for backward compatibility
      if (claimData) {
        const nameResult = FolderNamingUtil.generateFolderName(claimData);
        if (nameResult.isValid) {
          folderName = nameResult.folderName;
        } else {
          this.logger.warn(
            `Folder name generation failed for claim ${claimId}, using fallback:`,
            nameResult.errors,
          );
        }
      }

      // Create the specific claim folder with collision handling
      const claimFolderId = await this.findOrCreateFolderWithCollisionHandling(
        userId,
        folderName,
        mavericksClaimsFolderId,
      );

      this.logger.log(
        `Claim folder structure created: /${rootFolderName}/${folderName}/ (${claimFolderId})`,
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
   * Find existing folder or create new one with collision handling
   * Requirements: 9.1-9.6 - Collision Handling, 8.1-8.6 - Fallback Strategy
   */
  private async findOrCreateFolderWithCollisionHandling(
    userId: string,
    baseFolderName: string,
    parentFolderId?: string,
    maxAttempts = 5,
  ): Promise<string> {
    const drive = await this.getDriveClient(userId);

    try {
      let attempt = 0;
      let currentFolderName = baseFolderName;

      while (attempt < maxAttempts) {
        // Search for existing folder with current name
        const searchQuery = parentFolderId
          ? `name='${currentFolderName}' and parents in '${parentFolderId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
          : `name='${currentFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

        const searchResult = await this.retryOperation(async () => {
          const response = await drive.files.list({
            q: searchQuery,
            fields: 'files(id,name)',
          });
          return response.data.files || [];
        });

        // If no collision, create the folder
        if (searchResult.length === 0) {
          const folderId = await this.createFolder(
            userId,
            currentFolderName,
            parentFolderId,
          );

          if (attempt > 0) {
            this.logger.log(
              `Created folder with suffix after ${attempt} collision(s): ${currentFolderName}`,
            );
          }

          return folderId;
        }

        // Collision detected - check if it's the same claim by examining folder structure
        // For now, we'll use the existing folder if found (requirement 9.4)
        if (searchResult.length > 0) {
          this.logger.debug(
            `Found existing folder: ${currentFolderName} (${searchResult[0].id})`,
          );
          return searchResult[0].id!;
        }

        // Generate new name with suffix for next attempt
        attempt++;
        currentFolderName = this.generateFolderNameWithSuffix(
          baseFolderName,
          attempt,
        );
      }

      // Fallback: use UUID suffix if all attempts failed
      const fallbackName = `${baseFolderName}-${Date.now()}`;
      this.logger.warn(
        `Max collision attempts reached, using fallback name: ${fallbackName}`,
      );
      return await this.createFolder(userId, fallbackName, parentFolderId);
    } catch (error) {
      this.logger.error(
        `Failed to find or create folder with collision handling ${baseFolderName}:`,
        error,
      );
      throw this.handleDriveError(error);
    }
  }

  /**
   * Generate folder name with collision suffix
   * Requirements: 9.5-9.6 - Suffix Generation
   */
  private generateFolderNameWithSuffix(
    baseName: string,
    attempt: number,
  ): string {
    // Try different suffix strategies based on attempt
    switch (attempt) {
      case 1:
        return `${baseName}-v2`;
      case 2:
        return `${baseName}-v3`;
      case 3:
        return `${baseName}-copy`;
      case 4:
        return `${baseName}-${attempt + 1}`;
      default:
        return `${baseName}-${Date.now()}`;
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
   * Download file from Google Drive as in-memory Buffer
   * Requirements: email-attachments-analysis 1.1 - Download small files for email attachments
   */
  async downloadFile(userId: string, fileId: string): Promise<Buffer> {
    const drive = await this.getDriveClient(userId);

    try {
      const result = await this.retryOperation(async () => {
        const response = await drive.files.get(
          {
            fileId,
            alt: 'media',
          },
          {
            responseType: 'arraybuffer',
          },
        );

        return Buffer.from(response.data as ArrayBuffer);
      });

      this.logger.debug(`File downloaded successfully: ${fileId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to download file ${fileId}:`, error);
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

    try {
      // Decrypt tokens for API usage
      const { accessToken, refreshToken } =
        await this.tokenDBUtil.getDecryptedTokens(tokenEntity);

      // Create OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI,
      );

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      // Create Drive client
      return google.drive({ version: 'v3', auth: oauth2Client });
    } catch (_error) {
      throw new BadRequestException(
        'Failed to decrypt Google Drive tokens for user',
      );
    }
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
    // If it's already a NestJS exception, preserve it
    if (
      error instanceof BadRequestException ||
      error instanceof InternalServerErrorException
    ) {
      return error;
    }

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
