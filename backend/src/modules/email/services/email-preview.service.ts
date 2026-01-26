import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IPreviewEmailResponse } from '@project/types';
import { ClaimDBUtil } from 'src/modules/claims/utils/claim-db.util';
import { AttachmentDBUtil } from 'src/modules/claims/utils/attachment-db.util';
import { UserDBUtil } from 'src/modules/user/utils/user-db.util';
import { UserEmailPreferenceEntity } from 'src/modules/user/entities/user-email-preference.entity';
import { EmailTemplateService } from './email-template.service';
import { EnvironmentVariableUtil } from 'src/modules/common/utils/environment-variable.util';
import { ClaimStatus } from 'src/modules/claims/enums/claim-status.enum';

/**
 * EmailPreviewService - Email Preview Generation
 *
 * Responsibilities:
 * - Generate email preview without external API calls (Drive, Gmail)
 * - Validate claim exists, ownership, and status
 * - Query database for claim, user, attachments, and email preferences
 * - Reuse EmailTemplateService for HTML and subject generation
 * - Return preview response with all email fields
 *
 * Requirements:
 * - Requirement 1: Preview generation with validation
 * - Requirement 2: Attachment display without Drive API calls
 * - Requirement 3: CC/BCC email preferences integration
 * - Requirement 4: Ownership validation (userId matches)
 * - Requirement 5: Draft status only restriction
 * - Requirement 7: Performance under 500ms, no external APIs
 */
@Injectable()
export class EmailPreviewService {
  constructor(
    private readonly claimDBUtil: ClaimDBUtil,
    private readonly userDBUtil: UserDBUtil,
    private readonly attachmentDBUtil: AttachmentDBUtil,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly environmentUtil: EnvironmentVariableUtil,
    @InjectRepository(UserEmailPreferenceEntity)
    private readonly emailPreferenceRepository: Repository<UserEmailPreferenceEntity>,
  ) {}

  /**
   * Generate email preview for a claim
   *
   * @param userId - ID of the authenticated user
   * @param claimId - ID of the claim to preview
   * @returns Preview response with subject, htmlBody, recipients, cc, bcc
   * @throws NotFoundException if claim or user not found
   * @throws ForbiddenException if user doesn't own the claim
   * @throws BadRequestException if claim status is not DRAFT
   */
  async generatePreview(
    userId: string,
    claimId: string,
  ): Promise<IPreviewEmailResponse> {
    // Step 1: Get claim with validation
    const claim = await this.claimDBUtil.getOne({
      criteria: { id: claimId },
      relation: { categoryEntity: true },
    });

    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    // Step 2: Verify claim ownership
    if (claim.userId !== userId) {
      throw new ForbiddenException('Access denied: You do not own this claim');
    }

    // Step 3: Verify claim status - only DRAFT allowed for preview
    if (claim.status !== ClaimStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot preview email: Claim status is ${claim.status}, expected ${ClaimStatus.DRAFT}`,
      );
    }

    // Step 4: Get user data
    const user = await this.userDBUtil.getOne({
      criteria: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Step 5: Get attachments for the claim
    const attachments = await this.attachmentDBUtil.findByClaimId({
      claimId,
    });

    // Step 6: Query user email preferences
    const emailPreferences = await this.emailPreferenceRepository.find({
      where: { userId: user.id },
    });

    // Separate preferences by type
    const ccEmails = emailPreferences
      .filter((pref) => pref.type === 'cc')
      .map((pref) => pref.emailAddress);
    const bccEmails = emailPreferences
      .filter((pref) => pref.type === 'bcc')
      .map((pref) => pref.emailAddress);

    // Step 7: Generate email content using template service (without processedAttachments to avoid Drive API calls)
    const htmlBody = this.emailTemplateService.generateClaimEmail(
      claim,
      user,
      attachments || [],
    );

    // Step 8: Generate email subject
    const subject = `${user.name} - ${this.emailTemplateService.generateSubject(claim)}`;

    // Step 9: Get email recipients from environment
    const emailRecipients = this.environmentUtil.getVariables().emailRecipients;

    // Step 10: Parse recipients (comma-separated string to array)
    const recipients = emailRecipients
      .split(',')
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    // Step 11: Return preview response
    return {
      subject,
      htmlBody,
      recipients,
      cc: ccEmails,
      bcc: bccEmails,
    };
  }
}
