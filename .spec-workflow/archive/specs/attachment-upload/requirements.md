# Requirements Document

## Introduction

The attachment upload feature enables @mavericks-consulting.com employees to upload supporting documents for expense claims directly to their personal Google Drive through the browser, following the established folder structure and file naming conventions. This feature serves as the foundation for the claims submission workflow by implementing secure, client-side file management that integrates with existing Google Workspace infrastructure and database schema.

## Alignment with Product Vision

This feature directly supports the core product mission of transforming manual email workflows into a digital platform that leverages existing Google Workspace infrastructure. Key alignment points:

- **Employee File Ownership**: Maintains files in employee's personal Google Drive under `/Mavericks Claims/{claimUuid}/` structure
- **Google Workspace Integration**: Uses established OAuth scopes: `profile, email, gmail.send, drive.file`
- **Domain Security**: Enforces @mavericks-consulting.com domain restriction for all file operations
- **Existing Database Schema**: Aligns with current `AttachmentEntity` structure and status enums

## Requirements

### Requirement 1: Client-Side File Upload to Google Drive

**User Story:** As a @mavericks-consulting.com employee, I want to upload claim documents directly to my personal Google Drive following the established folder structure, so that I can submit expense claims with proper file organization and administrative access.

#### Acceptance Criteria

1. WHEN user selects files through file input THEN system SHALL upload files directly to `Google Drive/Mavericks Claims/{claimUuid}/` folder using OAuth tokens
2. WHEN upload completes THEN system SHALL store file metadata in `AttachmentEntity` with `googleDriveFileId`, `googleDriveUrl`, `storedFilename`, `originalFilename`
3. WHEN upload fails THEN system SHALL set attachment status to `FAILED` and display clear error message
4. WHEN user lacks required Drive scope THEN system SHALL redirect to OAuth reauthorization with `drive.file` scope

### Requirement 2: File Type and Size Validation

**User Story:** As a system enforcing business rules, I want file uploads restricted to approved document types and sizes, so that only valid expense documentation is accepted per established validation rules.

#### Acceptance Criteria

1. WHEN user selects file THEN system SHALL validate file type against whitelist: `PDF, PNG, JPEG, JPG, IMG`
2. WHEN file exceeds 5MB THEN system SHALL reject upload with clear error message per existing validation constraints
3. WHEN file type is invalid THEN system SHALL display specific error about supported formats (receipts and invoices only)
4. WHEN validation passes THEN system SHALL proceed with Google Drive upload to designated folder

### Requirement 3: File Naming Convention and Organization

**User Story:** As an administrator processing claims, I want uploaded files organized with consistent naming, so that I can efficiently locate and verify claim documentation.

#### Acceptance Criteria

1. WHEN file uploads to Google Drive THEN system SHALL rename file using pattern: `{employee_name}_{category}_{year}_{month}_{timestamp}.{extension}`
2. WHEN file is stored THEN system SHALL set Google Drive permissions to "anyone with the link" for payroll access
3. WHEN file upload completes THEN system SHALL generate shareable URL and store in `googleDriveUrl` field
4. WHEN claim folder doesn't exist THEN system SHALL create `/Mavericks Claims/{claimUuid}/` folder structure

### Requirement 4: Attachment Status Integration

**User Story:** As a system tracking claim lifecycle, I want attachment status synchronized with claim status, so that file operations align with the established claim workflow.

#### Acceptance Criteria

1. WHEN file upload begins THEN system SHALL set attachment status to `PENDING`
2. WHEN upload completes successfully THEN system SHALL set attachment status to `UPLOADED`
3. WHEN upload fails THEN system SHALL set attachment status to `FAILED` and retain metadata for retry
4. WHEN claim transitions from `draft` to `sent` THEN system SHALL prevent attachment modifications
5. WHEN claim reaches `failed` status THEN system SHALL allow attachment modifications for resubmission

### Requirement 5: Database Integration with Existing Schema

**User Story:** As a system maintaining data consistency, I want attachment records to integrate seamlessly with existing database entities, so that claim processing workflows continue to function correctly.

#### Acceptance Criteria

1. WHEN attachment is created THEN system SHALL associate with `ClaimEntity` using existing foreign key relationship
2. WHEN file metadata is stored THEN system SHALL populate all required `AttachmentEntity` fields: `googleDriveFileId`, `googleDriveUrl`, `storedFilename`, `originalFilename`, `fileSize`, `mimeType`
3. WHEN attachment is deleted THEN system SHALL mark as orphaned but preserve metadata for audit trail
4. WHEN claim is deleted THEN system SHALL update associated attachments accordingly

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: Separate components for Google Drive API client, file validation, and database operations
- **Modular Design**: Upload logic isolated in reusable hooks compatible with existing auth patterns
- **Dependency Management**: Integrate with existing OAuth token management in `auth` module
- **Clear Interfaces**: Use established API patterns from `/auth/drive-token` endpoint for token retrieval

### Performance
- **Upload Speed**: Direct browser-to-Drive uploads for 5MB files within 30 seconds
- **Response Time**: File metadata API endpoints must respond within 500ms per existing backend standards
- **Progressive Loading**: Display upload interface within 200ms using existing component patterns
- **Memory Efficiency**: Stream files to Drive API without server-side processing

### Security
- **Domain Restriction**: Enforce @mavericks-consulting.com OAuth validation per existing auth patterns
- **OAuth Scope Validation**: Verify `drive.file` scope before attempting uploads using existing token validation
- **File Type Enforcement**: Server-side MIME type validation aligned with existing claim validation rules
- **Access Control**: Restrict uploads to employee's personal Drive folder using established permission patterns

### Reliability
- **Error Recovery**: Implement retry logic for transient Google API failures with exponential backoff
- **Data Consistency**: Ensure database metadata matches actual Drive file state using established patterns
- **Audit Trail**: Log all upload attempts using existing logging infrastructure in backend modules
- **Status Synchronization**: Maintain attachment status consistency with claim lifecycle per existing status enums

### Usability
- **Mobile Responsive**: Upload interface compatible with existing dark mode mobile design
- **File Selection**: Support file input and drag-and-drop using established UI component patterns
- **Progress Feedback**: Display upload status using existing notification components
- **Error Messaging**: Use established error handling patterns from existing claim validation