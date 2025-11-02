# Requirements Document

## Introduction

The **Environment-Based Folder Naming** feature enables environment-specific Google Drive folder organization to separate test data from production data. Currently, all environments (local, dev, staging, production) use the same `Mavericks Claims` folder, causing test attachments to mix with production files. This feature introduces a configurable root folder name via environment variable, allowing each environment to maintain its own isolated Google Drive folder structure.

**Value Proposition:**
- **Data Isolation**: Test data stays separate from production data
- **Operational Clarity**: Developers/testers can easily identify environment-specific folders
- **Risk Mitigation**: Prevents accidental deletion or modification of production files during testing
- **Scalability**: Supports future multi-tenant or multi-environment deployments

## Alignment with Product Vision

This feature aligns with the **Product Steering Guide** in the following ways:

**1. Google Workspace Integration (Product Vision Core Feature #2)**
- Maintains existing Google Drive folder structure pattern: `{rootFolder}/{claimUuid}/`
- Enhances folder organization without changing file ownership model
- Preserves employee autonomy over their personal Google Drive files

**2. Compliance & Audit Trail (Product Vision Core Feature #3)**
- Improves data integrity by preventing environment data contamination
- Supports clearer audit trails with environment-specific folder segregation
- Reduces risk of compliance issues from mixed test/production data

**3. Risk Mitigation (Product Vision Section)**
- Addresses "Google API Dependencies" risk by providing clear environment separation
- Supports better testing workflows without impacting production data

**4. Technical Constraints (Product Vision Must Haves)**
- Maintains sub-2-second response times (configuration loaded once at startup)
- No impact on existing security model or OAuth flows
- Zero disruption to mobile-responsive workflows

## Requirements

### Requirement 1: Configurable Root Folder Name

**User Story:** As a **DevOps engineer**, I want to configure the Google Drive root folder name via environment variable, so that each environment (local, dev, staging, production) maintains isolated folder structures without code changes.

#### Acceptance Criteria

1. WHEN the backend application starts THEN the system SHALL validate that the `BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME` environment variable is defined and non-empty
2. IF `BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME` is undefined or empty THEN the backend SHALL throw a startup error and prevent application initialization
3. WHEN the backend creates a claim folder THEN the system SHALL use the value from `BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME` as the root folder name instead of the hardcoded `"Mavericks Claims"` string
4. WHEN multiple environments are deployed THEN each environment SHALL create folders using its own configured root folder name (e.g., `[local] Mavericks Claims`, `[staging] Mavericks Claims`, `Mavericks Claims`)

**Technical Context:**
- Current hardcoded reference: `backend/src/modules/attachments/services/google-drive-client.service.ts:60`
- Folder structure pattern: `{rootFolderName}/{claimUuid}/` (e.g., `[staging] Mavericks Claims/claim-abc-123/`)
- Validation must occur during NestJS application bootstrap phase

### Requirement 2: Frontend Root Folder Name Discovery

**User Story:** As a **frontend developer**, I want the frontend to dynamically retrieve the configured root folder name from the backend, so that client-side Google Drive operations use the correct environment-specific folder without hardcoding.

#### Acceptance Criteria

1. WHEN the backend receives a GET request to `/attachments/folder-name` THEN the system SHALL return a JSON response containing the configured root folder name
2. WHEN the frontend DriveUploadClient initializes THEN the system SHALL call the `/attachments/folder-name` endpoint to retrieve the current environment's root folder name
3. IF the `/attachments/folder-name` endpoint fails THEN the frontend SHALL display a user-friendly error message and prevent file upload operations
4. WHEN the frontend creates folders via fallback logic THEN the system SHALL use the dynamically retrieved folder name instead of the hardcoded `"Mavericks Claims"` string

**Technical Context:**
- Current frontend hardcoded reference: `frontend/src/hooks/attachments/useAttachmentUpload.ts:263`
- Fallback scenario: Backend folder creation API fails, frontend directly creates folders using Google Drive SDK
- Single source of truth: Backend environment variable drives both backend and frontend folder naming

**API Contract:**
```typescript
// GET /attachments/folder-name
Response: {
  success: boolean;
  folderName: string;  // e.g., "[staging] Mavericks Claims"
}
```

### Requirement 3: Backward Compatibility (No Migration Required)

**User Story:** As a **system administrator**, I want the folder naming change to apply only to new folders, so that existing folders and file references remain untouched and functional.

#### Acceptance Criteria

1. WHEN the new environment variable is configured THEN the system SHALL NOT migrate, rename, or modify any existing Google Drive folders
2. WHEN a user accesses existing claims THEN the system SHALL continue to read files from their original folder locations using stored `driveFolderId` references
3. WHEN new claims are created THEN the system SHALL create folders using the new configured root folder name
4. IF users have mixed old and new folder structures THEN both SHALL function correctly without data loss or orphaned references

**Justification:**
- Current status: No production users (confirmed in requirement analysis)
- Database stores folder IDs, not folder names (safe from naming changes)
- Hard cutover strategy: Old folders remain accessible, new folders use new naming

### Requirement 4: Environment Variable Validation and Error Handling

**User Story:** As a **backend developer**, I want clear, fail-fast validation of the folder name configuration, so that deployment issues are caught immediately during startup rather than silently failing during runtime.

#### Acceptance Criteria

1. WHEN the backend starts THEN the system SHALL validate `BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME` is defined, non-empty, and contains only valid characters
2. IF the environment variable is invalid THEN the system SHALL log a descriptive error message and exit with a non-zero status code
3. WHEN validation fails THEN the error message SHALL include: the expected environment variable name, validation requirements, and an example valid value
4. WHEN the application successfully starts THEN the system SHALL log the configured root folder name for operational visibility

**Character Validation Rules:**
- Allowed: Alphanumeric characters, spaces, hyphens, brackets, parentheses
- Disallowed: Path traversal sequences (`..`), filesystem-invalid characters (`<>:"|?*\/`)
- Maximum length: 200 characters (consistent with existing folder name limits)

**Example Valid Values:**
- `Mavericks Claims` (production)
- `[local] Mavericks Claims` (local development)
- `[staging] Mavericks Claims` (staging environment)
- `[dev] Mavericks Claims` (development environment)

## Non-Functional Requirements

### Code Architecture and Modularity

- **Single Responsibility Principle**: Environment variable validation should be isolated in a dedicated utility function, reusable across modules
- **Modular Design**: Folder name retrieval logic should be abstracted into a service method, not duplicated across controllers
- **Dependency Management**: Frontend should NOT directly depend on environment variables; must call backend API for folder name
- **Clear Interfaces**: API endpoint response must use typed DTOs from `@project/types` for cross-workspace consistency

### Performance

- **Startup Validation**: Environment variable validation must complete in <100ms during application bootstrap
- **API Response Time**: `/attachments/folder-name` endpoint must respond in <50ms (simple configuration lookup)
- **Caching**: Backend should cache the environment variable value in memory; no repeated env var reads per request
- **Frontend Initialization**: Folder name API call should execute once during DriveUploadClient initialization, not per file upload

### Security

- **Environment Variable Exposure**: `/attachments/folder-name` endpoint must be accessible only to authenticated users
- **Input Validation**: Validate folder name characters to prevent path traversal attacks or filesystem injection
- **Audit Logging**: Log folder name configuration at startup for security audit trails
- **No Sensitive Data**: Folder name may contain environment identifiers (e.g., `[staging]`) but must not expose secrets or credentials

### Reliability

- **Fail-Fast Startup**: Invalid configuration must prevent application startup, not cause runtime failures
- **Graceful Degradation**: If frontend cannot retrieve folder name, prevent file uploads with clear error messaging (do not fall back to hardcoded values)
- **Idempotency**: Multiple calls to `/attachments/folder-name` must return consistent results for the same environment
- **Error Recovery**: Frontend should retry folder name API call on network failures (max 3 retries with exponential backoff)

### Usability

- **Developer Experience**: Environment variable name must be descriptive and self-documenting (`BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME`)
- **Error Messages**: Validation failures must provide actionable guidance (e.g., "Set BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME to '[staging] Mavericks Claims' in your .env file")
- **Documentation**: Update README and development setup guides with new environment variable requirement
- **Testing**: Provide clear examples in `.env.example` for all environments (local, dev, staging, prod)
