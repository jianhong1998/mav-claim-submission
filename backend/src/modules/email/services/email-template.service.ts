import { Injectable } from '@nestjs/common';
import { ClaimEntity } from 'src/modules/claims/entities/claim.entity';
import { AttachmentEntity } from 'src/modules/claims/entities/attachment.entity';
import { UserEntity } from 'src/modules/user/entities/user.entity';

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
  /**
   * Generate HTML email content for claim submission
   * Requirements: 2.1, 2.4, 2.5, 2.6, 2.7
   */
  generateClaimEmail(
    claim: ClaimEntity,
    user: UserEntity,
    attachments: AttachmentEntity[] = [],
  ): string {
    const escapedUserName = this.escapeHtml(user.name);
    const escapedClaimName = claim.claimName
      ? this.escapeHtml(claim.claimName)
      : null;
    const escapedCategory = this.formatCategory(claim.category);
    const formattedAmount = this.formatCurrency(claim.totalAmount);
    const formattedPeriod = this.formatPeriod(claim.month, claim.year);

    // TODO: Put this into a separate HTML file then here just reading the text and replace the variables (eg. {{name}}) with the actual value.
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claim Submission</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .email-container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e9ecef;
        }
        .header h1 {
            color: #2563eb;
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .claim-details {
            margin-bottom: 25px;
        }
        .detail-row {
            display: flex;
            margin-bottom: 12px;
            padding: 8px 0;
            border-bottom: 1px solid #f1f3f4;
        }
        .detail-label {
            font-weight: 600;
            color: #495057;
            min-width: 140px;
            flex-shrink: 0;
        }
        .detail-value {
            color: #212529;
            flex: 1;
        }
        .amount {
            font-weight: 700;
            color: #198754;
            font-size: 18px;
        }
        .attachments-section {
            margin-top: 25px;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 6px;
            border-left: 4px solid #2563eb;
        }
        .attachments-title {
            font-weight: 600;
            color: #495057;
            margin-bottom: 15px;
            font-size: 16px;
        }
        .attachment-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .attachment-item {
            margin-bottom: 10px;
            padding: 10px 15px;
            background-color: #ffffff;
            border-radius: 4px;
            border: 1px solid #dee2e6;
        }
        .attachment-link {
            color: #2563eb;
            text-decoration: none;
            font-weight: 500;
        }
        .attachment-link:hover {
            text-decoration: underline;
        }
        .no-attachments {
            color: #6c757d;
            font-style: italic;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            color: #6c757d;
            font-size: 14px;
            text-align: center;
        }

        /* Responsive design */
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            .email-container {
                padding: 20px;
            }
            .detail-row {
                flex-direction: column;
            }
            .detail-label {
                min-width: auto;
                margin-bottom: 4px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>New Claim Submission</h1>
        </div>

        <div class="claim-details">
            <div class="detail-row">
                <span class="detail-label">Employee:</span>
                <span class="detail-value">${escapedUserName}</span>
            </div>

            <div class="detail-row">
                <span class="detail-label">Email:</span>
                <span class="detail-value">${this.escapeHtml(user.email)}</span>
            </div>

            <div class="detail-row">
                <span class="detail-label">Category:</span>
                <span class="detail-value">${escapedCategory}</span>
            </div>

            ${
              escapedClaimName
                ? `
            <div class="detail-row">
                <span class="detail-label">Claim Name:</span>
                <span class="detail-value">${escapedClaimName}</span>
            </div>
            `
                : ''
            }

            <div class="detail-row">
                <span class="detail-label">Period:</span>
                <span class="detail-value">${formattedPeriod}</span>
            </div>

            <div class="detail-row">
                <span class="detail-label">Total Amount:</span>
                <span class="detail-value amount">${formattedAmount}</span>
            </div>

            <div class="detail-row">
                <span class="detail-label">Submission Date:</span>
                <span class="detail-value">${this.formatDate(new Date())}</span>
            </div>
        </div>

        <div class="attachments-section">
            <div class="attachments-title">
                📎 Attachments (${attachments.length})
            </div>

            ${
              attachments.length > 0
                ? `
                <ul class="attachment-list">
                    ${attachments
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
                      .join('')}
                </ul>
            `
                : `
                <div class="no-attachments">No attachments included with this claim.</div>
            `
            }
        </div>

        <div class="footer">
            <p>This claim submission was automatically generated by the Mavericks Claim Submission System.</p>
            <p>Please review and process this claim according to company policies.</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate email subject line following specification format
   * Requirements: 2.2 - Subject format: "Claim Submission - [Category] - [Employee Name] - [Month]/[Year]"
   */
  generateSubject(claim: ClaimEntity, user: UserEntity): string {
    const category = this.formatCategory(claim.category);
    const employeeName = this.escapeHtml(user.name);
    const period = `${claim.month.toString().padStart(2, '0')}/${claim.year}`;

    return `Claim Submission - ${category} - ${employeeName} - ${period}`;
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
}
