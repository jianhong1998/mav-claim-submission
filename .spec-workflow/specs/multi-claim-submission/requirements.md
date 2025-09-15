# Requirements Document

## Introduction

The Multi-Claim Submission feature enables employees to create and manage multiple expense claims simultaneously in a single session at `/claim/new`. This feature implements the critical 2-phase workflow where claims are created first in draft status to provide UUIDs for file organization, followed by bulk file attachment. Email submission functionality will be integrated in a separate feature implementation. This addresses the architectural requirement that claims must exist before files can be uploaded to the proper Google Drive folder structure.

## Alignment with Product Vision

This feature directly supports the core product vision from product.md:

- **Sequential Workflow**: Implements the critical "Claims created FIRST (draft state) → Files uploaded to claim-specific folders" requirement (Phase 1 & 2)
- **Google Workspace Integration**: Leverages Drive folder structure `Mavericks Claims/{claimUuid}/` for organized file management
- **Efficiency**: Allows bulk claim creation to reduce processing time and improve employee productivity
- **Mobile Responsive**: Supports mobile-friendly claim submission with dark mode UI exclusively
- **Audit Trail**: Maintains immutable claim records with timestamps from creation to submission

## Requirements

### Requirement 1: Multi-Claim Creation Interface

**User Story:** As a Mavericks employee, I want to create multiple expense claims in a single session, so that I can efficiently submit all my monthly expenses at once without repetitive navigation.

#### Acceptance Criteria

1. WHEN user navigates to `/claim/new` THEN system SHALL display an empty claim creation interface
2. WHEN user fills out claim details (category, month, year, amount, claim name if Others) THEN system SHALL validate the data client-side
3. WHEN user clicks "Add Another Claim" THEN system SHALL immediately create a claim record in database with status 'draft' and display a new empty form
4. WHEN claim is created in draft status THEN system SHALL return the claim UUID and display it in the claims list
5. WHEN user has multiple draft claims THEN system SHALL display all claims in a list with basic details and edit capabilities

### Requirement 2: Draft Claim Database Storage

**User Story:** As the system, I want to create claim records immediately when users add claims to their list, so that I can provide valid claim UUIDs for subsequent file upload organization.

#### Acceptance Criteria

1. WHEN user adds a claim to their submission list THEN system SHALL immediately create a claim record with status 'draft'
2. WHEN claim is created THEN system SHALL generate and return a UUID for the claim
3. WHEN claim is in draft status THEN system SHALL allow editing of all claim fields except UUID
4. WHEN claim is created THEN system SHALL store employee email, category, month, year, total amount, claim name (if Others), status='draft', and creation timestamp
5. WHEN system creates draft claims THEN system SHALL validate business rules (monthly limits for telco/fitness, submission deadlines)

### Requirement 3: Bulk File Attachment Workflow

**User Story:** As a Mavericks employee, I want to attach documents to multiple claims efficiently, so that I can upload all my receipts and supporting documents in an organized manner.

#### Acceptance Criteria

1. WHEN user has created one or more draft claims THEN system SHALL display a file attachment interface for all claims
2. WHEN user selects files for a specific claim THEN system SHALL upload files directly to `Mavericks Claims/{claimUuid}/` in their Google Drive
3. WHEN files are uploaded successfully THEN system SHALL store file metadata (Drive file ID, shareable URL, filename, size, MIME type) linked to the claim UUID
4. WHEN user uploads files THEN system SHALL display upload progress and success/error status for each file
5. WHEN all files are attached THEN system SHALL enable the final submission button

### Requirement 4: Claim List Management

**User Story:** As a Mavericks employee, I want to view and manage my draft claims before final submission, so that I can review, edit, or remove claims as needed.

#### Acceptance Criteria

1. WHEN user has created draft claims THEN system SHALL display a list showing claim category, month/year, amount, and attachment count
2. WHEN user clicks on a draft claim THEN system SHALL allow editing of claim details (category, month, year, amount, claim name)
3. WHEN user modifies a draft claim THEN system SHALL update the database record immediately
4. WHEN user wants to remove a draft claim THEN system SHALL delete the claim record and any associated file metadata
5. WHEN user removes a claim with attachments THEN system SHALL display a warning about files remaining in Google Drive

### Requirement 5: Draft Claims Review and Management

**User Story:** As a Mavericks employee, I want to review all my draft claims with attachments before finalizing them, so that I can ensure all information is correct and complete.

#### Acceptance Criteria

1. WHEN user has created claims with attachments THEN system SHALL display a comprehensive review page showing all claim details and attached files
2. WHEN user reviews claims THEN system SHALL show claim status, file count, and total amount for each claim
3. WHEN user wants to modify a claim THEN system SHALL allow editing claim details and re-uploading files
4. WHEN user is satisfied with all claims THEN system SHALL provide a "Mark as Ready" action that updates claim status from 'draft' to 'ready'
5. WHEN claims are marked as ready THEN system SHALL redirect to claims list page showing the updated status

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: Separate components for claim creation, file upload, and submission processing
- **Modular Design**: Reusable claim form components, file upload utilities, and submission orchestration services
- **Dependency Management**: Claims module independent of attachments module, with clear interfaces
- **Clear Interfaces**: Well-defined DTOs for 2-phase workflow (create claim, attach files)

### Performance
- **Claim Creation**: Draft claim creation within 500ms per claim
- **File Upload**: Progress indicators for uploads with real-time status updates
- **Bulk Operations**: Handle up to 10 draft claims efficiently with responsive UI
- **Page Load**: Initial page load under 2 seconds with existing authentication

### Security
- **Authentication**: Requires valid Google OAuth session with @mavericks-consulting.com domain
- **Data Validation**: Client and server-side validation for all claim data and file types
- **File Access**: Files uploaded to employee's personal Google Drive with proper sharing permissions
- **Audit Trail**: All claim creation, modification, and submission actions logged with timestamps

### Reliability
- **Error Handling**: Graceful handling of Google API failures with user-friendly error messages
- **Data Persistence**: Draft claims persist across browser sessions until deleted or processed
- **Upload Retry**: Automatic retry logic for failed file uploads with exponential backoff
- **State Management**: Consistent state management for draft claims and file attachments

### Usability
- **Mobile Responsive**: Touch-optimized interface for mobile claim creation and file selection
- **Dark Mode**: Consistent dark theme throughout the multi-claim submission workflow
- **Progress Indicators**: Clear visual feedback for claim creation and file upload status
- **Validation Feedback**: Real-time validation messages for claim limits, deadlines, and required fields
- **Bulk Operations**: Intuitive interface for managing multiple claims with batch operations where appropriate