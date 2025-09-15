# Requirements Document

## Introduction

The current attachment upload system violates the fundamental architecture requirement by implementing server-side uploads to Google Drive. This specification addresses the critical refactor needed to implement proper client-side uploads directly from the browser to Google Drive, aligning with the Google Workspace integration strategy and employee file ownership model.

**Problem**: Current flow is Browser → Backend (with file buffer) → Google Drive
**Solution**: Required flow is Browser → Google Drive (direct upload), Backend → Metadata only

## Alignment with Product Vision

This refactor directly supports the core product vision from product.md:

- **File Ownership**: "Employees retain ownership of their files in personal Google Drive" - current server-side upload violates this principle
- **Google Workspace Integration**: "Client-side uploads to employee's personal Google Drive (no S3)" - currently not implemented
- **Efficiency**: "Backend only handles metadata, never file content" - current implementation handles file buffers
- **Performance**: "Sub-2-second response times for claim submissions" - server-side uploads create bottlenecks

## Requirements

### Requirement 1: Direct Client-Side Google Drive Upload

**User Story:** As an employee, I want my files to upload directly from my browser to my personal Google Drive, so that I maintain complete ownership and control over my files without them passing through corporate servers.

#### Acceptance Criteria

1. WHEN employee uploads a file THEN the browser SHALL upload directly to their Google Drive using OAuth tokens
2. WHEN file upload completes THEN the system SHALL obtain Google Drive file ID and shareable URL
3. WHEN backend receives upload completion THEN backend SHALL store ONLY metadata (file ID, URL, name, size, MIME type)
4. WHEN upload fails THEN system SHALL show clear error message and allow retry without backend involvement

### Requirement 2: Drive Token Management Endpoint

**User Story:** As a frontend application, I want to obtain temporary Google Drive access tokens, so that I can perform direct uploads to the user's Drive without exposing permanent credentials.

#### Acceptance Criteria

1. WHEN frontend requests Drive token THEN backend SHALL return valid OAuth access token for authenticated user
2. IF token is expired THEN backend SHALL automatically refresh using stored refresh token
3. WHEN token refresh fails THEN system SHALL prompt user to re-authenticate with Google
4. WHEN token is returned THEN it SHALL have appropriate scope limitations (drive.file only)

### Requirement 3: Metadata-Only Backend Storage

**User Story:** As a system administrator, I want the backend to handle only file metadata, so that we minimize data liability and storage costs while maintaining audit trails.

#### Acceptance Criteria

1. WHEN file upload succeeds THEN backend SHALL store Google Drive file ID, shareable URL, original filename, size, and MIME type
2. WHEN metadata is stored THEN system SHALL link it to the appropriate claim record
3. WHEN file is deleted THEN system SHALL remove metadata but SHALL NOT delete the Google Drive file (user owns it)
4. WHEN audit trail is requested THEN system SHALL show complete metadata history without file content access

### Requirement 4: Remove Server-Side Upload Code

**User Story:** As a developer, I want all server-side file upload logic removed, so that the codebase reflects the correct architecture and eliminates security/performance risks.

#### Acceptance Criteria

1. WHEN refactor is complete THEN GoogleDriveClientService.uploadFile method SHALL be removed
2. WHEN refactor is complete THEN attachment upload endpoints SHALL NOT accept file buffers
3. WHEN refactor is complete THEN no multipart/form-data parsing SHALL exist in attachment routes
4. WHEN refactor is complete THEN FileUploadComponent SHALL use Google Drive API directly

### Requirement 5: Frontend Google Drive Integration

**User Story:** As a frontend developer, I want to integrate Google Drive API directly in the browser, so that file uploads happen without backend intermediaries.

#### Acceptance Criteria

1. WHEN user selects file THEN frontend SHALL obtain Drive token from backend
2. WHEN token is obtained THEN frontend SHALL upload file directly to Google Drive API
3. WHEN upload completes THEN frontend SHALL extract file ID and shareable URL
4. WHEN metadata is ready THEN frontend SHALL send ONLY metadata to backend for storage
5. WHEN upload progress changes THEN UI SHALL show real-time progress indicator

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: Separate client-side upload logic from backend metadata handling
- **Modular Design**: Google Drive client integration as standalone frontend module
- **Dependency Management**: Remove server-side Google Drive upload dependencies
- **Clear Interfaces**: Clean separation between OAuth token management and file operations

### Performance
- **Upload Speed**: Direct browser-to-Drive uploads eliminate server bottleneck
- **Response Time**: Metadata operations complete within 500ms
- **Progress Tracking**: Real-time upload progress without backend polling
- **Token Caching**: Frontend caches valid tokens to minimize backend requests

### Security
- **Token Scope Limitation**: Drive tokens limited to 'https://www.googleapis.com/auth/drive.file' scope only
- **No File Content Access**: Backend never has access to file binary data
- **Token Expiry**: Drive tokens expire within 1 hour for security
- **CORS Configuration**: Proper CORS setup for Google Drive API calls from browser

### Reliability
- **Upload Retry Logic**: Automatic retry with exponential backoff for failed uploads
- **Token Refresh**: Seamless token refresh when expired during upload
- **Error Handling**: Clear error messages for different failure scenarios (network, permissions, quota)
- **Fallback Mechanisms**: Graceful degradation when Google APIs are unavailable

### Usability
- **Progress Indication**: Visual upload progress with file name and percentage
- **Mobile Compatibility**: Touch-optimized file selection and upload on mobile devices
- **Error Recovery**: User-friendly error messages with actionable next steps
- **Performance Feedback**: Immediate feedback when upload starts and completes