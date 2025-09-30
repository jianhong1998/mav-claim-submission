# Requirements Document: Email Attachments vs Google Drive Links Analysis

## Introduction

This document analyzes the request to change the current claim email system from Google Drive link sharing to actual email attachments. The current system generates emails with clickable Google Drive URLs for claim attachments. The requested change would download files from Google Drive and attach them directly to emails sent via Gmail API.

## Alignment with Product Vision

This change aims to improve email recipient accessibility by removing dependency on Google Drive access. However, it introduces significant technical complexity and operational risks that may conflict with system reliability goals.

## Requirements Analysis

### Current System Assessment

**Current Behavior:**
- Claims include attachments stored in user's personal Google Drive
- Email templates contain shareable Google Drive URLs
- Recipients click links to access files in their browser
- No file size limitations (Drive handles large files)
- Simple, reliable email delivery

**Technical Implementation:**
- `AttachmentEntity.googleDriveUrl` stores shareable links
- `EmailTemplateService.generateAttachmentsContent()` creates HTML links
- Gmail API sends lightweight HTML emails
- Zero file transfer overhead

### Requirement 1: Email Attachment Implementation

**User Story:** As an email recipient, I want claim attachments to be actual email attachments, so that I can access files without needing Google Drive access.

#### Acceptance Criteria

1. WHEN a claim is submitted via email THEN the system SHALL download all attachment files from Google Drive
2. WHEN files are downloaded THEN the system SHALL attach them directly to the email message
3. WHEN the total attachment size exceeds 25MB THEN the system SHALL split into multiple emails or fallback to Drive links
4. WHEN file download fails THEN the system SHALL fallback to sending Google Drive links
5. WHEN email sending fails due to attachment size THEN the system SHALL retry with Drive links

#### Risk Analysis

**Critical Limitations:**
- **Gmail API Limit**: 25MB total attachment size per email
- **Performance Impact**: File download adds 5-10 seconds per large file
- **Reliability Risk**: Multiple failure points (Drive download + email send)
- **Resource Usage**: Temporary storage for downloaded files
- **API Quotas**: Drive API quota consumption increases dramatically

### Requirement 2: Fallback Mechanism

**User Story:** As an employee, I want the system to gracefully handle attachment size limitations, so that email sending remains reliable.

#### Acceptance Criteria

1. WHEN total attachments exceed 20MB THEN the system SHALL use Drive links instead
2. WHEN individual file exceeds 10MB THEN the system SHALL use Drive link for that file
3. WHEN Drive download fails THEN the system SHALL continue with available attachments
4. WHEN no attachments can be downloaded THEN the system SHALL send Drive links only
5. WHEN email fails due to size THEN the system SHALL log error and retry with links

## Alternative Solutions Analysis

### Option 1: Improve Drive Link Access (Recommended)

**Approach:**
- Ensure proper Google Drive sharing permissions ("Anyone with link" access)
- Provide clear recipient instructions for accessing Drive links
- Add Drive link validation before email sending

**Benefits:**
- Maintains current reliability
- Handles unlimited file sizes
- Zero additional complexity
- Preserves existing user workflow

**Implementation Effort:** 1-2 days

### Option 2: Hybrid Approach

**Approach:**
- Small files (<5MB) as email attachments
- Large files as Google Drive links
- Clear indication in email template

**Benefits:**
- Best of both approaches
- Maintains reliability for large files
- Improves accessibility for small files

**Implementation Effort:** 1-2 weeks

### Option 3: Full Attachment Implementation (Not Recommended)

**Approach:**
- Download all files from Google Drive
- Attach to emails with size/count limits
- Complex fallback logic

**Risks:**
- High complexity with marginal benefit
- Gmail size limits will break functionality
- Performance degradation
- Multiple failure scenarios

**Implementation Effort:** 3-4 weeks

## Recommendation

**Primary Recommendation: Option 2 - Hybrid Approach**

Implement a hybrid solution that combines the best of both approaches:

1. **Small files (<5MB)** - Download from Google Drive and attach to emails for immediate accessibility
2. **Large files (≥5MB)** - Keep as Google Drive shareable links to avoid Gmail size limits
3. **Clear email template** - Indicate which files are attached vs linked
4. **Automatic fallback** - If download fails or size exceeds threshold, use Drive link
5. **Validation before sending** - Ensure proper Drive sharing permissions are set

**Benefits:**
- Improves accessibility for small, common files (receipts, invoices)
- Maintains reliability for large files (videos, high-res images)
- Preserves backward compatibility with existing Drive link approach
- Minimizes performance impact while improving user experience

**Implementation Strategy:**
- Phase 1: Implement size-based attachment logic with strict 5MB per-file limit
- Phase 2: Add robust fallback mechanisms for download failures
- Phase 3: Update email templates to clearly distinguish attachments from links

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility**: Separate services for file download, size validation, and email composition
- **Modular Design**: Email service should remain decoupled from file storage implementation
- **Dependency Management**: Minimize coupling between Drive API and Gmail API operations
- **Clear Interfaces**: Define contracts for attachment handling with clear size/format limits

### Performance
- File download operations MUST complete within 30 seconds per file
- Email sending latency MUST NOT exceed 60 seconds total
- Temporary file storage MUST be cleaned up within 5 minutes
- System MUST handle concurrent file downloads without quota exhaustion

### Security
- Downloaded files MUST be virus scanned before attachment
- Temporary files MUST be stored in secure, isolated directory
- File access MUST be validated against claim ownership
- No sensitive data MUST be logged during file operations

### Reliability
- System MUST fallback to Drive links when attachment fails
- Email delivery success rate MUST remain above 99%
- File download failures MUST NOT prevent email sending
- System MUST handle partial download scenarios gracefully

### Usability
- Email recipients MUST clearly understand file access method (attachment vs link)
- File size limitations MUST be communicated clearly
- Error messages MUST provide actionable guidance
- Mixed delivery methods (some files attached, some linked) MUST be clearly indicated