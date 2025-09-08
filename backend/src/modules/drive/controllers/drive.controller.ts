import {
  Controller,
  Post,
  Get,
  Body,
  Session,
  HttpStatus,
  Res,
  UsePipes,
  ValidationPipe,
  Headers,
  Logger,
  Param,
} from '@nestjs/common';
import type { Response } from 'express';
import { DriveService } from '../services/drive.service';
import {
  IDriveAccessResponse,
  IDriveFolderCreateResponse,
  IDrivePermissionResponse,
  IDriveOperationResponse,
} from '@project/types';
import {
  DriveFolderCreateRequestDto,
  DrivePermissionUpdateRequestDto,
} from '../dtos/drive-request.dto';

interface SessionData {
  userId?: string;
  isAuthenticated?: boolean;
}

@Controller('drive')
export class DriveController {
  private readonly logger = new Logger(DriveController.name);

  constructor(private readonly driveService: DriveService) {}

  @Post('check-access')
  async checkDriveAccess(
    @Session() session: SessionData,
    @Res() res: Response,
  ): Promise<Response<IDriveAccessResponse>> {
    if (!session?.isAuthenticated || !session?.userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        hasAccess: false,
        error: 'Authentication required',
      });
    }

    try {
      const accessInfo = await this.driveService.checkDriveAccess(
        session.userId,
      );

      return res.status(HttpStatus.OK).json(accessInfo);
    } catch (error: unknown) {
      this.logger.error('Drive access check error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        hasAccess: false,
        error: 'Failed to check Drive access',
      });
    }
  }

  @Post('refresh-token')
  async refreshToken(
    @Session() session: SessionData,
    @Res() res: Response,
  ): Promise<Response<IDriveAccessResponse>> {
    if (!session?.isAuthenticated || !session?.userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        hasAccess: false,
        error: 'Authentication required',
      });
    }

    try {
      const refreshed = await this.driveService.refreshUserToken(
        session.userId,
      );

      if (refreshed) {
        // After successful refresh, check access to get updated info
        const accessInfo = await this.driveService.checkDriveAccess(
          session.userId,
        );
        return res.status(HttpStatus.OK).json(accessInfo);
      } else {
        return res.status(HttpStatus.BAD_REQUEST).json({
          hasAccess: false,
          error: 'Failed to refresh token. Please re-authenticate.',
        });
      }
    } catch (error: unknown) {
      this.logger.error('Drive token refresh error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        hasAccess: false,
        error: 'Failed to refresh token',
      });
    }
  }

  @Post('create-folder')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createFolder(
    @Body() folderData: DriveFolderCreateRequestDto,
    @Session() session: SessionData,
    @Res() res: Response,
  ): Promise<Response<IDriveFolderCreateResponse>> {
    // Check authentication
    if (!session || !session.isAuthenticated || !session.userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        error: 'Authentication required to create folders',
      });
    }

    try {
      const result = await this.driveService.createFolder({
        userId: session.userId,
        folderName: folderData.folderName,
        parentFolderId: folderData.parentFolderId,
      });

      if (result.success) {
        return res.status(HttpStatus.CREATED).json(result);
      } else {
        return res.status(HttpStatus.BAD_REQUEST).json(result);
      }
    } catch (error: unknown) {
      this.logger.error('Folder creation error:', error);

      // Handle specific error types
      const errorObj = error as { status?: number; message?: string };
      if (errorObj.status === HttpStatus.UNAUTHORIZED) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          error: 'Drive authentication expired. Please re-authenticate.',
        });
      }

      if (errorObj.status === HttpStatus.BAD_REQUEST) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: errorObj.message || 'Invalid folder data provided',
        });
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to create folder. Please try again.',
      });
    }
  }

  @Get('file/:fileId/metadata')
  async getFileMetadata(
    @Param('fileId') fileId: string,
    @Session() session: SessionData,
    @Res() res: Response,
  ): Promise<Response<IDriveOperationResponse>> {
    if (!session?.isAuthenticated || !session?.userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!fileId || fileId.trim().length === 0) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: 'File ID is required',
      });
    }

    try {
      const metadata = await this.driveService.getFileMetadata({
        userId: session.userId,
        fileId: fileId.trim(),
      });

      return res.status(HttpStatus.OK).json({
        success: true,
        data: metadata,
      });
    } catch (error: unknown) {
      this.logger.error('File metadata retrieval error:', error);

      const errorObj = error as { status?: number; message?: string };
      if (errorObj.status === HttpStatus.UNAUTHORIZED) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          error: 'Drive authentication expired. Please re-authenticate.',
        });
      }

      if (errorObj.status === HttpStatus.NOT_FOUND) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          error: 'File not found',
        });
      }

      if (errorObj.status === HttpStatus.BAD_REQUEST) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: errorObj.message || 'Invalid file ID provided',
        });
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to retrieve file metadata. Please try again.',
      });
    }
  }

  @Post('file/permissions')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateFilePermissions(
    @Body() permissionData: DrivePermissionUpdateRequestDto,
    @Session() session: SessionData,
    @Res() res: Response,
  ): Promise<Response<IDrivePermissionResponse>> {
    if (!session?.isAuthenticated || !session?.userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        fileId: permissionData.fileId,
        error: 'Authentication required',
      });
    }

    try {
      const result = await this.driveService.updateFilePermissions({
        userId: session.userId,
        fileId: permissionData.fileId,
        permissionType: permissionData.permissionType,
        role: permissionData.role,
      });

      if (result.success) {
        return res.status(HttpStatus.OK).json(result);
      } else {
        return res.status(HttpStatus.BAD_REQUEST).json(result);
      }
    } catch (error: unknown) {
      this.logger.error('Permission update error:', error);

      const errorObj = error as { status?: number; message?: string };
      if (errorObj.status === HttpStatus.UNAUTHORIZED) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          fileId: permissionData.fileId,
          error: 'Drive authentication expired. Please re-authenticate.',
        });
      }

      if (errorObj.status === HttpStatus.NOT_FOUND) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          fileId: permissionData.fileId,
          error: 'File not found',
        });
      }

      if (errorObj.status === HttpStatus.BAD_REQUEST) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          fileId: permissionData.fileId,
          error: errorObj.message || 'Invalid permission data provided',
        });
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        fileId: permissionData.fileId,
        error: 'Failed to update permissions. Please try again.',
      });
    }
  }
}
