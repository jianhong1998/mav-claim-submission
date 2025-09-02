import {
  Controller,
  Post,
  Body,
  Session,
  HttpStatus,
  Res,
  UsePipes,
  ValidationPipe,
  Headers,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { EmailService } from '../services/email.service';
import { IEmailSendRequest, IEmailSendResponse } from '@project/types';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';

interface SessionData {
  userId?: string;
  isAuthenticated?: boolean;
}

class EmailSendRequestDto implements IEmailSendRequest {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Recipient email is required' })
  to: string;

  @IsNotEmpty({ message: 'Email subject is required' })
  @MaxLength(998, { message: 'Subject too long (max 998 characters)' })
  subject: string;

  @IsNotEmpty({ message: 'Email body is required' })
  @MaxLength(1000000, { message: 'Email body too long (max 1MB)' })
  body: string;

  @IsOptional()
  @IsBoolean()
  isHtml?: boolean;
}

@Controller('email')
export class EmailController {
  private readonly logger = new Logger(EmailController.name);

  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async sendEmail(
    @Body() emailData: EmailSendRequestDto,
    @Session() session: SessionData,
    @Res() res: Response,
    @Headers('x-test-bypass') testBypass?: string,
  ): Promise<Response<IEmailSendResponse>> {
    // Temporary bypass for testing - remove in production
    if (testBypass === 'true') {
      return res.status(HttpStatus.OK).json({
        success: false,
        error: 'Test mode: Email sending is disabled during development',
      });
    }

    // Check authentication
    if (!session || !session.isAuthenticated || !session.userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        error: 'Authentication required to send emails',
      });
    }

    try {
      const result = await this.emailService.sendEmail(
        session.userId,
        emailData,
      );

      if (result.success) {
        return res.status(HttpStatus.OK).json(result);
      } else {
        return res.status(HttpStatus.BAD_REQUEST).json(result);
      }
    } catch (error: unknown) {
      this.logger.error('Email sending error:', error);

      // Handle specific error types
      const errorObj = error as { status?: number; message?: string };
      if (errorObj.status === HttpStatus.UNAUTHORIZED) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          error: 'Gmail authentication expired. Please re-authenticate.',
        });
      }

      if (errorObj.status === HttpStatus.BAD_REQUEST) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: errorObj.message || 'Invalid email data provided',
        });
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to send email. Please try again.',
      });
    }
  }

  @Post('check-access')
  async checkGmailAccess(
    @Session() session: SessionData,
    @Res() res: Response,
    @Headers('x-test-bypass') testBypass?: string,
  ): Promise<Response<{ hasAccess: boolean; message: string }>> {
    // Temporary bypass for testing - remove in production
    if (testBypass === 'true') {
      return res.status(HttpStatus.OK).json({
        hasAccess: true,
        message: 'Test mode: Gmail access simulated',
      });
    }

    if (!session?.isAuthenticated || !session?.userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        hasAccess: false,
        message: 'Authentication required',
      });
    }

    try {
      const hasAccess = await this.emailService.checkGmailAccess(
        session.userId,
      );

      return res.status(HttpStatus.OK).json({
        hasAccess,
        message: hasAccess
          ? 'Gmail access is available'
          : 'Gmail access not available. Please re-authenticate.',
      });
    } catch (error: unknown) {
      this.logger.error('Gmail access check error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        hasAccess: false,
        message: 'Failed to check Gmail access',
      });
    }
  }

  @Post('refresh-token')
  async refreshToken(
    @Session() session: SessionData,
    @Res() res: Response,
  ): Promise<Response<{ success: boolean; message: string }>> {
    if (!session?.isAuthenticated || !session?.userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Authentication required',
      });
    }

    try {
      const refreshed = await this.emailService.refreshUserToken(
        session.userId,
      );

      return res.status(HttpStatus.OK).json({
        success: refreshed,
        message: refreshed
          ? 'Token refreshed successfully'
          : 'Failed to refresh token. Please re-authenticate.',
      });
    } catch (error: unknown) {
      this.logger.error('Email token refresh error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to refresh token',
      });
    }
  }
}
