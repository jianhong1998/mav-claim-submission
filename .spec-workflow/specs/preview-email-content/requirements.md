# Requirements Document: Email Preview Feature

## Introduction

The **Email Preview Feature** addresses user uncertainty about claim email content before submission. Users currently cannot see what will be sent to finance administrators, leading to confusion and potential errors. This feature provides a real-time preview of the exact email content (subject, body, attachments, and recipients) that will be sent when a claim is submitted.

**Purpose**: Eliminate user uncertainty by showing exactly what finance administrators will receive.

**Value**: Increases user confidence, reduces submission errors, and improves transparency in the claim submission workflow.

## Alignment with Product Vision

This feature directly supports the **Mavericks Claim Submission System** mission of employee autonomy and administrative efficiency:

**From product.md - Core Product Vision**:
- **Employee Autonomy**: Empowers users to verify claim content before submission, reducing dependency on administrative staff for corrections
- **Administrative Efficiency**: Reduces back-and-forth communication about claim content errors
- **Compliance Tracking**: Allows users to confirm all required information is present before formal submission

**From product.md - Success Metrics**:
- **Efficiency**: Supports 50% faster claim processing by reducing resubmissions due to content errors
- **Adoption**: Improves user experience and confidence, supporting 100% adoption target

**From tech.md - Sequential 3-Phase Workflow**:
- Integrates seamlessly into **Phase 3: Email Processing** by allowing users to preview before triggering the Gmail API send operation

## Requirements

### Requirement 1: Preview Email Content for Draft Claims

**User Story:** As an employee creating a claim, I want to preview the exact email content that will be sent to finance administrators, so that I can verify all information is correct before submission.

#### Acceptance Criteria

1. WHEN user requests preview for a draft claim THEN system SHALL return complete email content including subject line, HTML body, and recipient details
2. WHEN user requests preview for a claim with valid mandatory fields THEN system SHALL render email template with actual claim data
3. WHEN user requests preview for a claim with optional fields populated THEN system SHALL include optional field data in preview
4. WHEN user requests preview for a claim with empty optional fields THEN system SHALL render email template with optional fields omitted
5. IF user requests preview for a claim with invalid mandatory field data THEN system SHALL return validation error and prevent preview
6. IF user requests preview for a claim with invalid optional field data THEN system SHALL return validation error and prevent preview
7. WHEN preview is generated THEN system SHALL use identical email template rendering logic as actual email sending (EmailTemplateService)

### Requirement 2: Attachment Display in Preview

**User Story:** As an employee, I want to see how my attachments will appear in the email, so that I know which files will be physically attached versus sent as Drive links.

#### Acceptance Criteria

1. WHEN claim has attachments smaller than 5MB THEN preview SHALL display them under "📎 Attached Files" section with filename and size
2. WHEN claim has attachments 5MB or larger THEN preview SHALL display them under "☁️ Files on Google Drive" section with filename and size
3. WHEN claim has both small and large attachments THEN preview SHALL display two separate sections matching actual email structure
4. WHEN claim has no attachments THEN preview SHALL display "No attachments included with this claim"
5. WHEN preview is rendered THEN system SHALL NOT download attachment content from Google Drive (metadata-only operation)
6. WHEN preview shows Drive link section THEN links SHALL NOT be clickable (display only)
7. WHEN preview is generated THEN system SHALL use AttachmentEntity fileSize from database to categorize attachments

### Requirement 3: Email Preferences Display

**User Story:** As an employee, I want to see which email addresses will receive copies of my claim submission, so that I can verify the correct people will be notified.

#### Acceptance Criteria

1. WHEN user has CC email preferences configured THEN preview SHALL include CC email addresses in response
2. WHEN user has BCC email preferences configured THEN preview SHALL include BCC email addresses in response
3. WHEN user has no email preferences configured THEN preview SHALL return empty arrays for CC and BCC
4. WHEN preview is generated THEN system SHALL query user_email_preferences table for current user
5. WHEN preview response is returned THEN system SHALL include primary recipient email from environment configuration

### Requirement 4: Preview Access Control

**User Story:** As a system administrator, I want to ensure users can only preview their own claims, so that data privacy and security are maintained.

#### Acceptance Criteria

1. WHEN user requests preview for their own claim THEN system SHALL authorize and return preview
2. IF user requests preview for another user's claim THEN system SHALL return 403 Forbidden error
3. WHEN user requests preview for non-existent claim THEN system SHALL return 404 Not Found error
4. WHEN preview endpoint is called THEN system SHALL validate JWT authentication token
5. WHEN preview is authorized THEN system SHALL verify claim.userId matches authenticated user ID

### Requirement 5: Claim Status Restrictions

**User Story:** As a product owner, I want preview to only work for draft claims, so that users focus on verifying content before submission rather than reviewing historical emails.

#### Acceptance Criteria

1. WHEN user requests preview for draft status claim THEN system SHALL generate and return preview
2. IF user requests preview for sent status claim THEN system SHALL return 400 Bad Request with message indicating preview only available for drafts
3. IF user requests preview for paid status claim THEN system SHALL return 400 Bad Request with message indicating preview only available for drafts
4. IF user requests preview for failed status claim THEN system SHALL return 400 Bad Request with message indicating preview only available for drafts
5. WHEN claim status is validated THEN system SHALL check ClaimEntity.status field

**Rationale**: Users can view sent emails directly in their Gmail inbox. Preview is only needed before submission.

### Requirement 6: API Endpoint Design

**User Story:** As a frontend developer, I want a RESTful endpoint to fetch email previews, so that I can integrate preview functionality into the claim creation workflow.

#### Acceptance Criteria

1. WHEN preview endpoint is defined THEN it SHALL follow pattern GET /api/claims/:claimId/preview
2. WHEN endpoint receives valid request THEN it SHALL return JSON response with structure:
   - subject: string
   - htmlBody: string
   - recipients: string[]
   - cc: string[]
   - bcc: string[]
3. WHEN endpoint receives invalid claimId format THEN system SHALL return 400 Bad Request
4. WHEN endpoint authentication fails THEN system SHALL return 401 Unauthorized
5. WHEN endpoint authorization fails THEN system SHALL return 403 Forbidden
6. WHEN endpoint encounters server error THEN system SHALL return 500 Internal Server Error with sanitized error message

### Requirement 7: Performance and Caching

**User Story:** As a system architect, I want preview generation to be fast and not query external APIs, so that users get immediate feedback without impacting Google API quotas.

#### Acceptance Criteria

1. WHEN preview is generated THEN system SHALL NOT call Google Drive API
2. WHEN preview is generated THEN system SHALL NOT call Gmail API
3. WHEN preview requires attachment information THEN system SHALL query only AttachmentEntity table in database
4. WHEN preview is generated THEN system SHALL NOT implement caching (generate fresh on each request)
5. WHEN preview is generated THEN response time SHALL be under 500ms for typical claims (5 attachments, all fields populated)

**Rationale**: Preview uses only database metadata. No caching needed as rendering is fast string manipulation.

## Non-Functional Requirements

### Code Architecture and Modularity

**Single Responsibility Principle**:
- **Preview Controller**: Handle HTTP request/response for preview endpoint only
- **Preview Service**: Orchestrate preview generation logic (validation, template rendering, preference querying)
- **EmailTemplateService Reuse**: Leverage existing `generateClaimEmail()` and `generateSubject()` methods

**Modular Design**:
- Preview functionality SHALL integrate into existing `email` module (backend/src/modules/email/)
- Preview logic SHALL reuse existing validation from `EmailService.validateClaimForSending()`
- Preview SHALL NOT duplicate email template rendering logic

**Dependency Management**:
- Preview feature SHALL depend on: ClaimDBUtil, AttachmentDBUtil, UserDBUtil, EmailTemplateService
- Preview feature SHALL NOT depend on: GmailClient, AttachmentProcessorService, GoogleDriveClient

**Clear Interfaces**:
- Preview endpoint SHALL use DTOs from @project/types for request/response contracts
- Preview service SHALL accept ClaimEntity, UserEntity, AttachmentEntity[] as inputs
- Preview response SHALL match IPreviewEmailResponse interface

### Performance

- **Response Time**: Preview generation SHALL complete in under 500ms for typical claims
- **Database Queries**: Preview SHALL execute maximum 4 database queries (claim, user, attachments, email preferences)
- **Memory Usage**: Preview SHALL NOT load attachment file content into memory
- **Scalability**: Preview endpoint SHALL support 100 concurrent requests without degradation

### Security

- **Authentication**: Preview endpoint SHALL require valid JWT token in HttpOnly cookie
- **Authorization**: Preview endpoint SHALL verify claim ownership before returning content
- **XSS Protection**: Preview SHALL use EmailTemplateService.escapeHtml() for all user input
- **Data Exposure**: Preview SHALL only return data accessible to authenticated user
- **Rate Limiting**: Preview endpoint SHALL apply standard API rate limiting (100 requests/minute per user)

### Reliability

- **Error Handling**: Preview SHALL handle database connection failures gracefully
- **Validation**: Preview SHALL validate claim status and ownership before processing
- **Consistency**: Preview SHALL generate identical email content to actual send operation
- **Idempotency**: Preview SHALL be safe to call multiple times without side effects

### Usability

- **Frontend Integration**: Preview SHALL be triggered by manual "Preview Email" button in claim form
- **Error Messages**: Preview errors SHALL provide clear, actionable feedback to users
- **Response Format**: Preview SHALL return structured JSON for easy frontend rendering
- **Visual Accuracy**: Preview HTML SHALL match actual email appearance when rendered
- **No Template Drift**: Preview SHALL use same code path as email sending to guarantee accuracy

## Technical Constraints

### Must Reuse Existing Components

From tech.md and codebase analysis:
- **EmailTemplateService.generateClaimEmail()** (backend/src/modules/email/services/email-template.service.ts:36)
- **EmailTemplateService.generateSubject()** (backend/src/modules/email/services/email-template.service.ts:81)
- **EmailService.validateClaimForSending()** (backend/src/modules/email/services/email.service.ts:226)
- **User Email Preferences Query** (backend/src/modules/email/services/email.service.ts:91-101)

### Must Follow Project Conventions

From tech.md:
- **TypeScript Strict Mode**: No `any` types
- **Object.freeze Pattern**: For any new enums (if needed)
- **@project/types**: Share preview DTOs between backend and frontend
- **NestJS Module Pattern**: controllers/, services/, dtos/ organization

### Must NOT Implement

- **Drive API Calls**: No `AttachmentProcessorService.processAttachments()`
- **Gmail API Calls**: No `GmailClient.sendEmail()`
- **Caching Layer**: Generate fresh preview on each request
- **Real-time Updates**: Manual preview button only (no WebSocket or polling)

## Success Criteria

**Feature is complete when**:
1. User can click "Preview Email" button in claim creation form
2. System displays modal/panel showing exact email content that will be sent
3. Preview accurately reflects all claim data, attachments, and email preferences
4. Preview matches actual sent email content 100% (subject, body, attachments section)
5. Preview loads in under 500ms without external API calls
6. User can verify content and confidently submit claim

**Acceptance test scenario**:
```gherkin
Given an employee has created a draft claim with:
  - Category: Fitness & Wellness
  - Month: December 2024
  - Total Amount: $150.00
  - Claim Name: "Gym Membership"
  - 2 attachments: receipt.pdf (1.2MB), invoice.pdf (8.5MB)
  - CC preference: manager@mavericks-consulting.com
When the employee clicks "Preview Email"
Then the system displays:
  - Subject: "John Doe - Claim for Fitness & Wellness (12/2024) ($150.00)"
  - Email body with all claim details
  - "📎 Attached Files" section showing receipt.pdf (1.2 MB)
  - "☁️ Files on Google Drive" section showing invoice.pdf (8.5 MB)
  - Recipients: finance@mavericks-consulting.com
  - CC: manager@mavericks-consulting.com
  - BCC: (empty)
And the preview loads in under 500ms
```
