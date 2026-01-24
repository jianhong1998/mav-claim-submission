import { Injectable } from '@nestjs/common';
import { ClaimEntity } from 'src/modules/claims/entities/claim.entity';
import { AttachmentEntity } from 'src/modules/claims/entities/attachment.entity';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { ProcessedAttachments } from './attachment-processor.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * EmailTemplate Service - HTML Email Template Generation
 *
 * Responsibilities:
 * - Generate standardized HTML email templates for claim submissions
 * - Create properly formatted subject lines following specification
 * - Escape all user input to prevent XSS vulnerabilities
 * - Handle missing optional fields gracefully
 * - Provide responsive HTML design for professional appearance
 *
 * Requirements: 2.1 - Standardized template, 2.2 - Subject format, 2.4-2.7 - Email content and XSS protection
 *
 * Design: Pure template generation service with HTML escaping and structured content
 */
@Injectable()
export class EmailTemplateService {
  private readonly templatePath = path.join(
    __dirname,
    '..',
    'templates',
    'claim-submission.html',
  );
  /**
   * Generate HTML email content for claim submission
   * Requirements: 2.1, 2.4, 2.5, 2.6, 2.7
   * Overload 1: Legacy support - renders Drive links only
   */
  generateClaimEmail(
    claim: ClaimEntity,
    user: UserEntity,
    attachments: AttachmentEntity[],
  ): string;
  /**
   * Overload 2: Hybrid attachments - renders both attached files and Drive links
   */
  generateClaimEmail(
    claim: ClaimEntity,
    user: UserEntity,
    attachments: AttachmentEntity[],
    processedAttachments: ProcessedAttachments,
  ): string;
  generateClaimEmail(
    claim: ClaimEntity,
    user: UserEntity,
    attachments: AttachmentEntity[],
    processedAttachments?: ProcessedAttachments,
  ): string {
    const template = fs.readFileSync(this.templatePath, 'utf8');

    const variables = {
      employeeName: this.escapeHtml(user.name),
      employeeEmail: this.escapeHtml(user.email),
      category: this.formatCategory(claim.categoryEntity.code),
      claimNameSection: claim.claimName
        ? `<span>${this.escapeHtml(claim.claimName)}</span>`
        : '',
      period: this.formatPeriod(claim.month, claim.year),
      totalAmount: this.formatCurrency(claim.totalAmount),
      submissionDate: this.formatDate(new Date()),
      attachmentCount: attachments.length.toString(),
      attachmentsContent: processedAttachments
        ? this.generateMixedAttachmentsContent(processedAttachments)
        : this.generateAttachmentsContent(attachments),
    };

    return this.replaceTemplateVariables(template, variables);
  }

  /**
   * Generate email subject line following specification format
   * Requirements: 2.2 - Subject format: "Claim for [Category] ([Month]/[Year]) ($[Total Amount])"
   */
  generateSubject(claim: ClaimEntity): string {
    const category = this.formatCategory(claim.categoryEntity.code);
    const period = `${claim.month.toString().padStart(2, '0')}/${claim.year}`;
    const totalAmount = this.formatCurrency(claim.totalAmount);

    return `Claim for ${category} (${period}) (${totalAmount})`;
  }

  /**
   * Escape HTML to prevent XSS vulnerabilities
   * Requirements: 2.7 - XSS protection
   */
  private escapeHtml(text: string): string {
    if (!text) return '';

    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Format claim category for display
   */
  private formatCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      telco: 'Telecommunications',
      fitness: 'Fitness & Wellness',
      dental: 'Dental',
      'skill-enhancement': 'Skill Enhancement',
      'company-event': 'Company Event',
      'company-lunch': 'Company Lunch',
      'company-dinner': 'Company Dinner',
      others: 'Others',
    };

    return categoryMap[category] || this.capitalizeWords(category);
  }

  /**
   * Format currency amount
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Format claim period (month/year)
   */
  private formatPeriod(month: number, year: number): string {
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    return `${monthNames[month - 1]} ${year}`;
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(date);
  }

  /**
   * Capitalize words for display
   */
  private capitalizeWords(text: string): string {
    return text
      .split(/[-_\s]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Generate mixed attachments content HTML (hybrid mode)
   * Renders separate sections for attached files and Drive links
   */
  private generateMixedAttachmentsContent(
    processed: ProcessedAttachments,
  ): string {
    const sections: string[] = [];

    // Section 1: Attached files
    if (processed.attachments.length > 0) {
      const attachmentItems = processed.attachments
        .map(
          (att) => `
                        <li class="attachment-item">
                            <span class="detail-value">${this.escapeHtml(att.filename)}</span>
                            <span style="color: #6c757d; font-size: 12px;"> (${this.formatFileSize(att.size)})</span>
                        </li>
                    `,
        )
        .join('');

      sections.push(`
                <div class="attachments-section">
                    <h3 style="color: #333; font-size: 16px; margin-bottom: 10px;">📎 Attached Files</h3>
                    <ul class="attachment-list">${attachmentItems}</ul>
                </div>
            `);
    }

    // Section 2: Drive links
    if (processed.links.length > 0) {
      const linkItems = processed.links
        .map(
          (link) => `
                        <li class="attachment-item">
                            <a href="${this.escapeHtml(link.driveUrl)}"
                               class="attachment-link"
                               target="_blank"
                               rel="noopener noreferrer">
                                ${this.escapeHtml(link.filename)}
                            </a>
                            <span style="color: #6c757d; font-size: 12px;"> (${this.formatFileSize(link.size)})</span>
                        </li>
                    `,
        )
        .join('');

      sections.push(`
                <div class="attachments-section">
                    <h3 style="color: #333; font-size: 16px; margin-bottom: 10px;">☁️ Files on Google Drive</h3>
                    <ul class="attachment-list">${linkItems}</ul>
                </div>
            `);
    }

    if (sections.length === 0) {
      return '<div class="no-attachments">No attachments included with this claim.</div>';
    }

    return sections.join('');
  }

  /**
   * Generate attachments content HTML (legacy mode - Drive links only)
   */
  private generateAttachmentsContent(attachments: AttachmentEntity[]): string {
    if (attachments.length === 0) {
      return '<div class="no-attachments">No attachments included with this claim.</div>';
    }

    const attachmentItems = attachments
      .map(
        (attachment) => `
                        <li class="attachment-item">
                            ${
                              attachment.googleDriveUrl
                                ? `
                                <a href="${this.escapeHtml(attachment.googleDriveUrl)}"
                                   class="attachment-link"
                                   target="_blank"
                                   rel="noopener noreferrer">
                                    ${this.escapeHtml(attachment.originalFilename)}
                                </a>
                            `
                                : `
                                <span class="detail-value">${this.escapeHtml(attachment.originalFilename)}</span>
                                <span style="color: #dc3545; font-size: 12px;"> (URL not available)</span>
                            `
                            }
                        </li>
                    `,
      )
      .join('');

    return `<ul class="attachment-list">${attachmentItems}</ul>`;
  }

  /**
   * Format file size for human-readable display
   * Converts bytes to B, KB, or MB with appropriate precision
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * Replace template variables in HTML template
   */
  private replaceTemplateVariables(
    template: string,
    variables: Record<string, string>,
  ): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    }

    return result;
  }
}
