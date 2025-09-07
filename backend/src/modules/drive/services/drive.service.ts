import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { TokenService } from '../../auth/services/token.service';
import { EnvironmentVariableUtil } from '../../common/utils/environment-variable.util';
import { DriveUtils, DriveConstants } from '../../common/utils/drive-utils';
import { LoggerUtil } from '../../common/utils/logger.util';
import {
  IDriveFileMetadata,
  IDriveUploadResponse,
  IDriveFolderCreateResponse,
  IDrivePermissionResponse,
  IDriveAccessResponse,
} from '@project/types';
import { RequiredScope } from '../../auth/enums/required-scope.enum';
import { Readable } from 'stream';

@Injectable()
export class DriveService {
  private readonly oauth2Client: OAuth2Client;

  constructor(
    private readonly tokenService: TokenService,
    private readonly environmentVariableUtil: EnvironmentVariableUtil,
    private readonly loggerUtil: LoggerUtil,
  ) {
    const variables = this.environmentVariableUtil.getVariables();
    this.oauth2Client = new google.auth.OAuth2(
      variables.googleClientId,
      variables.googleClientSecret,
      variables.googleRedirectUri,
    );
  }

  async uploadFile(params: {
    userId: string;
    fileName: string;
    mimeType: string;
    fileBuffer: Buffer;
    parentFolderId?: string;
    description?: string;
  }): Promise<IDriveUploadResponse> {
    const logger = this.loggerUtil.createLogger(
      `${DriveService.name}.${DriveService.prototype.uploadFile.name}`,
    );
    try {
      this.validateUploadParams(params);

      const tokens = await this.tokenService.getValidTokenForUser(
        params.userId,
      );
      if (!tokens) {
        throw new UnauthorizedException(
          'User not authenticated or tokens expired',
        );
      }

      this.oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });

      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });

      const fileMetadata = DriveUtils.createFileMetadata({
        name: params.fileName,
        parents: params.parentFolderId ? [params.parentFolderId] : undefined,
        description: params.description,
      });

      const media = {
        mimeType: params.mimeType,
        body: Readable.from(params.fileBuffer),
      };

      const response = await this.executeWithRetry(async () => {
        return await drive.files.create({
          requestBody: fileMetadata,
          media: media,
          fields: 'id,name,webViewLink',
        });
      });

      logger.log(
        `File uploaded successfully: ${params.fileName}, fileId: ${response.data.id}`,
      );

      return {
        success: true,
        fileId: response.data.id || undefined,
        fileName: response.data.name || undefined,
        webViewLink: response.data.webViewLink || undefined,
      };
    } catch (error: unknown) {
      logger.error(
        `Failed to upload file ${params.fileName}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );

      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      const errorInfo = DriveUtils.mapDriveApiError(error);
      if (errorInfo.code === 403) {
        throw new UnauthorizedException(errorInfo.message);
      }
      if (errorInfo.code === 429) {
        throw new InternalServerErrorException(errorInfo.message);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload file',
      };
    }
  }

  async createFolder(params: {
    userId: string;
    folderName: string;
    parentFolderId?: string;
  }): Promise<IDriveFolderCreateResponse> {
    const logger = this.loggerUtil.createLogger('DriveService.createFolder');
    try {
      this.validateFolderParams(params);

      const tokens = await this.tokenService.getValidTokenForUser(
        params.userId,
      );
      if (!tokens) {
        throw new UnauthorizedException(
          'User not authenticated or tokens expired',
        );
      }

      this.oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });

      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });

      const folderMetadata = DriveUtils.createFolderMetadata({
        name: params.folderName,
        parents: params.parentFolderId ? [params.parentFolderId] : undefined,
      });

      const response = await this.executeWithRetry(async () => {
        return await drive.files.create({
          requestBody: folderMetadata,
          fields: 'id,name,webViewLink',
        });
      });

      logger.log(
        `Folder created successfully: ${params.folderName}, folderId: ${response.data.id}`,
      );

      return {
        success: true,
        folderId: response.data.id || undefined,
        folderName: response.data.name || undefined,
        webViewLink: response.data.webViewLink || undefined,
      };
    } catch (error: unknown) {
      logger.error(
        `Failed to create folder ${params.folderName}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );

      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      this.handleDriveApiError(error);

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create folder',
      };
    }
  }

  async getFileMetadata(params: {
    userId: string;
    fileId: string;
  }): Promise<IDriveFileMetadata> {
    const logger = this.loggerUtil.createLogger('DriveService.getFileMetadata');
    try {
      const tokens = await this.tokenService.getValidTokenForUser(
        params.userId,
      );
      if (!tokens) {
        throw new UnauthorizedException(
          'User not authenticated or tokens expired',
        );
      }

      this.oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });

      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });

      const response = await this.executeWithRetry(async () => {
        return await drive.files.get({
          fileId: params.fileId,
          fields:
            'id,name,mimeType,size,parents,createdTime,modifiedTime,webViewLink,webContentLink',
        });
      });

      if (!response.data) {
        throw new BadRequestException('File not found');
      }

      return {
        id: response.data.id!,
        name: response.data.name!,
        mimeType: response.data.mimeType!,
        size: response.data.size ? parseInt(response.data.size) : undefined,
        webViewLink: response.data.webViewLink || undefined,
        webContentLink: response.data.webContentLink || undefined,
        parents: response.data.parents || undefined,
        createdTime: response.data.createdTime!,
        modifiedTime: response.data.modifiedTime!,
      };
    } catch (error: unknown) {
      logger.error(
        `Failed to get file metadata for ${params.fileId}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );

      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      this.handleDriveApiError(error);
      throw new InternalServerErrorException('Failed to get file metadata');
    }
  }

  async updateFilePermissions(params: {
    userId: string;
    fileId: string;
    permissionType: 'anyone' | 'domain' | 'user';
    role: 'reader' | 'writer' | 'commenter';
    emailAddress?: string;
  }): Promise<IDrivePermissionResponse> {
    const logger = this.loggerUtil.createLogger(
      'DriveService.updateFilePermissions',
    );
    try {
      const tokens = await this.tokenService.getValidTokenForUser(
        params.userId,
      );
      if (!tokens) {
        throw new UnauthorizedException(
          'User not authenticated or tokens expired',
        );
      }

      this.oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });

      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });

      const permissionData = {
        type: params.permissionType,
        role: params.role,
        emailAddress: params.emailAddress,
      };

      const response = await this.executeWithRetry(async () => {
        return await drive.permissions.create({
          fileId: params.fileId,
          requestBody: permissionData,
          fields: 'id',
        });
      });

      logger.log(`Permissions updated successfully for file: ${params.fileId}`);

      return {
        success: true,
        fileId: params.fileId,
        permissionId: response.data.id || undefined,
      };
    } catch (error: unknown) {
      logger.error(
        `Failed to update permissions for ${params.fileId}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );

      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      this.handleDriveApiError(error);

      return {
        success: false,
        fileId: params.fileId,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update permissions',
      };
    }
  }

  async refreshUserToken(userId: string): Promise<boolean> {
    const logger = this.loggerUtil.createLogger(
      'DriveService.refreshUserToken',
    );
    try {
      const tokens = await this.tokenService.getValidTokenForUser(userId);
      if (!tokens) {
        return false;
      }

      this.oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();

      if (credentials.access_token && credentials.expiry_date) {
        await this.tokenService.updateToken({
          userId,
          provider: 'google',
          accessToken: credentials.access_token,
          refreshToken: credentials.refresh_token || tokens.refreshToken,
          expiresAt: new Date(credentials.expiry_date),
          scope: RequiredScope.DRIVE,
        });

        logger.log(`Token refreshed successfully for user ${userId}`);
        return true;
      }

      return false;
    } catch (error: unknown) {
      logger.error(
        `Failed to refresh token for user ${userId}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      return false;
    }
  }

  async checkDriveAccess(userId: string): Promise<IDriveAccessResponse> {
    const logger = this.loggerUtil.createLogger(
      'DriveService.checkDriveAccess',
    );
    try {
      const tokens = await this.tokenService.getValidTokenForUser(userId);
      if (!tokens) {
        return {
          hasAccess: false,
          error: 'No valid tokens found. Please re-authenticate.',
        };
      }

      this.oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });

      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });

      const about = await drive.about.get({ fields: 'user' });

      return {
        hasAccess: true,
        email: about.data.user?.emailAddress || undefined,
      };
    } catch (error: unknown) {
      logger.warn(
        `Drive access check failed for user ${userId}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );

      // Try to refresh token if access fails
      const errorInfo = DriveUtils.mapDriveApiError(error);
      if (errorInfo.code === 401) {
        const refreshed = await this.refreshUserToken(userId);
        if (refreshed) {
          return await this.checkDriveAccess(userId);
        }
        return {
          hasAccess: false,
          error: 'Token expired and refresh failed. Please re-authenticate.',
        };
      }

      return {
        hasAccess: false,
        error:
          error instanceof Error ? error.message : 'Drive access check failed',
      };
    }
  }

  private validateUploadParams(params: {
    fileName: string;
    mimeType: string;
    fileBuffer: Buffer;
  }): void {
    DriveUtils.validateUploadParams({
      fileName: params.fileName,
      mimeType: params.mimeType,
      fileSize: params.fileBuffer.length,
    });
  }

  private validateFolderParams(params: { folderName: string }): void {
    DriveUtils.validateFolderName(params.folderName);
  }

  private handleDriveApiError(error: unknown): void {
    const errorInfo = DriveUtils.mapDriveApiError(error);

    switch (errorInfo.code) {
      case 401:
        throw new UnauthorizedException(errorInfo.message);
      case 403:
        throw new UnauthorizedException(errorInfo.message);
      case 404:
        throw new BadRequestException(errorInfo.message);
      case 429:
        throw new InternalServerErrorException(errorInfo.message);
      default:
        if (errorInfo.code >= 500) {
          throw new InternalServerErrorException(errorInfo.message);
        }
        throw new BadRequestException(errorInfo.message);
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = DriveConstants.MAX_RETRIES,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: unknown) {
        lastError = error;

        // Don't retry on non-retryable errors
        if (!DriveUtils.shouldRetryError(error)) {
          throw error;
        }

        if (attempt === maxRetries) {
          break;
        }

        // Calculate retry delay using utility function
        const delay = DriveUtils.calculateRetryDelay(attempt);

        const logger = this.loggerUtil.createLogger(
          'DriveService.executeWithRetry',
        );
        logger.warn(
          `Drive API operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`,
          error instanceof Error ? error.message : 'Unknown error',
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}
