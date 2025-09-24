import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ClaimDBUtil } from 'src/modules/claims/utils/claim-db.util';
import { AttachmentDBUtil } from 'src/modules/claims/utils/attachment-db.util';
import { UserDBUtil } from 'src/modules/user/utils/user-db.util';
import { ClaimEntity } from 'src/modules/claims/entities/claim.entity';
import { AttachmentEntity } from 'src/modules/claims/entities/attachment.entity';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { GmailClient } from './gmail-client.service';
import { EmailTemplateService } from './email-template.service';
import { EnvironmentVariableUtil } from 'src/modules/common/utils/environment-variable.util';
import { ClaimStatus } from 'src/modules/claims/enums/claim-status.enum';
import { IClaimEmailRequest, IClaimEmailResponse } from '@project/types';

/**
 * EmailService - Business Logic Coordination for Email Sending
 *
 * Responsibilities:
 * - Coordinate complete email sending workflow
 * - Manage database transactions for claim status updates
 * - Validate claim ownership and status before sending
 * - Handle rollback scenarios when email or database operations fail
 * - Maintain audit trail for status changes
 *
 * Requirements: 3.1-3.2 - claim validation, 3.5-3.6 - status updates and audit trail
 *
 * Design: Service layer that orchestrates GmailClient, EmailTemplate, and ClaimDBUtil
 * with atomic database transactions and proper error handling
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly claimDBUtil: ClaimDBUtil,
    private readonly attachmentDBUtil: AttachmentDBUtil,
    private readonly userDBUtil: UserDBUtil,
    private readonly gmailClient: GmailClient,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly environmentUtil: EnvironmentVariableUtil,
  ) {}

  /**
   * Send claim email with transaction coordination
   * Requirements: 3.1-3.2 - claim validation, 3.5-3.6 - status updates and transactions
   */
  async sendClaimEmail(
    userId: string,
    request: IClaimEmailRequest,
  ): Promise<IClaimEmailResponse> {
    const { claimId } = request;

    this.logger.log(
      `Starting email sending workflow for claim ${claimId} by user ${userId}`,
    );

    try {
      // Step 1: Validate claim ownership and status outside transaction
      const claimValidation = await this.validateClaimForSending(
        userId,
        claimId,
      );
      if (!claimValidation.isValid) {
        return {
          success: false,
          error: claimValidation.error,
        };
      }

      const { claim, user, attachments } = claimValidation;

      // Type assertions for safety - these should be defined after validation
      if (!claim || !user) {
        throw new InternalServerErrorException('Invalid validation result');
      }

      // Step 2: Generate email content
      const emailContent = this.emailTemplateService.generateClaimEmail(
        claim,
        user,
        attachments,
      );
      const emailSubject = this.emailTemplateService.generateSubject(
        claim,
        user,
      );

      // Step 3: Get email recipients from environment
      const emailRecipients =
        this.environmentUtil.getVariables().emailRecipients;

      // Step 4: Send email first (outside transaction to avoid holding locks during external API call)
      const emailResult = await this.gmailClient.sendEmail(userId, {
        to: emailRecipients,
        subject: emailSubject,
        body: emailContent,
        isHtml: true,
      });

      if (!emailResult.success) {
        // Email failed - update claim status to failed and return
        await this.updateClaimStatusWithTransaction(
          claimId,
          ClaimStatus.FAILED,
          null,
        );

        this.logger.error(
          `Email sending failed for claim ${claimId}: ${emailResult.error}`,
        );

        return {
          success: false,
          error: emailResult.error || 'Email sending failed',
        };
      }

      // Step 5: Email succeeded - update claim status to sent with transaction
      const updatedClaim = await this.updateClaimStatusWithTransaction(
        claimId,
        ClaimStatus.SENT,
        new Date(),
      );

      this.logger.log(
        `Email sent successfully for claim ${claimId} with messageId: ${emailResult.messageId}`,
      );

      return {
        success: true,
        messageId: emailResult.messageId,
        claim: {
          id: updatedClaim.id,
          userId: updatedClaim.userId,
          category: updatedClaim.category,
          claimName: updatedClaim.claimName,
          month: updatedClaim.month,
          year: updatedClaim.year,
          totalAmount: Number(updatedClaim.totalAmount),
          status: updatedClaim.status,
          submissionDate: updatedClaim.submissionDate?.toISOString() || null,
          createdAt: updatedClaim.createdAt.toISOString(),
          updatedAt: updatedClaim.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Email sending workflow failed for claim ${claimId}:`,
        error,
      );

      // Attempt to mark claim as failed if it's not already in a sent state
      try {
        const currentClaim = await this.claimDBUtil.getOne({
          criteria: { id: claimId },
        });
        if (currentClaim && currentClaim.status === ClaimStatus.DRAFT) {
          await this.updateClaimStatusWithTransaction(
            claimId,
            ClaimStatus.FAILED,
            null,
          );
        }
      } catch (statusUpdateError) {
        this.logger.error(
          `Failed to update claim status after error for claim ${claimId}:`,
          statusUpdateError,
        );
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Email sending failed';

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Validate claim for email sending
   * Requirements: 3.1-3.2 - claim validation
   */
  private async validateClaimForSending(
    userId: string,
    claimId: string,
  ): Promise<{
    isValid: boolean;
    error?: string;
    claim?: ClaimEntity;
    user?: UserEntity;
    attachments?: AttachmentEntity[];
  }> {
    try {
      // Get claim with user relation
      const claim = await this.claimDBUtil.getOne({
        criteria: { id: claimId },
        relation: { user: true },
      });

      if (!claim) {
        return {
          isValid: false,
          error: 'Claim not found',
        };
      }

      // Verify claim ownership
      if (claim.userId !== userId) {
        return {
          isValid: false,
          error: 'Access denied: You do not own this claim',
        };
      }

      // Verify claim status
      if (claim.status !== ClaimStatus.DRAFT) {
        return {
          isValid: false,
          error: `Cannot send email: Claim status is ${claim.status}, expected ${ClaimStatus.DRAFT}`,
        };
      }

      // Get user separately to ensure we have user data
      const user = await this.userDBUtil.getOne({
        criteria: { id: userId },
      });

      if (!user) {
        return {
          isValid: false,
          error: 'User not found',
        };
      }

      // Get attachments for the claim
      const attachments = await this.attachmentDBUtil.findByClaimId({
        claimId,
      });

      return {
        isValid: true,
        claim,
        user,
        attachments: attachments || [],
      };
    } catch (error) {
      this.logger.error(`Claim validation failed for claim ${claimId}:`, error);
      return {
        isValid: false,
        error: 'Claim validation failed',
      };
    }
  }

  /**
   * Update claim status with database transaction
   * Requirements: 3.5-3.6 - status updates and audit trail
   */
  private async updateClaimStatusWithTransaction(
    claimId: string,
    status: ClaimStatus,
    submissionDate: Date | null,
  ) {
    return await this.dataSource.transaction(async (entityManager) => {
      const claim = await this.claimDBUtil.getOne({
        criteria: { id: claimId },
        entityManager,
      });

      if (!claim) {
        throw new NotFoundException('Claim not found for status update');
      }

      // Update claim status and submission date
      claim.status = status;
      if (submissionDate) {
        claim.submissionDate = submissionDate;
      }

      // Save updated claim within transaction
      const updatedClaims = await this.claimDBUtil.updateWithSave({
        dataArray: [claim],
        entityManager,
      });

      if (!updatedClaims || updatedClaims.length === 0) {
        throw new InternalServerErrorException('Failed to update claim status');
      }

      this.logger.log(
        `Claim status updated: ${claimId} -> ${status}${submissionDate ? ` with submissionDate: ${submissionDate.toISOString()}` : ''}`,
      );

      return updatedClaims[0];
    });
  }
}
