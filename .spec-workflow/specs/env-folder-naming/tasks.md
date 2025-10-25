# Tasks Document

## Backend Implementation

- [ ] 1. Add environment variable field to EnvironmentVariableUtil
  - Files: `backend/src/modules/common/utils/environment-variable.util.ts`
  - Add `googleDriveClaimsFolderName: string` to `IEnvironmentVariableList` interface
  - Read from `BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME` in `getVariables()` using `configService.getOrThrow()`
  - _Leverage: Existing `getVariables()` method pattern (lines 80-136)_
  - _Requirements: 1.1 - Configurable Root Folder Name_
  - _Prompt: Implement the task for spec env-folder-naming, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer | Task: Add `googleDriveClaimsFolderName` field to EnvironmentVariableUtil following requirement 1.1. Add field to `IEnvironmentVariableList` interface (line 4-31) and read it in `getVariables()` method (lines 80-136) using `this.configService.getOrThrow('BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME')`. Follow existing pattern. | Restrictions: Do not add custom validation (Google Drive API validates names), do not modify existing fields, maintain existing caching behavior | _Leverage: Existing getVariables() method structure, existing field definitions | _Requirements: 1.1 | Success: Field added to interface, read in getVariables() with getOrThrow(), returns string value | Instructions: Mark this task as in-progress [-] in tasks.md before starting. Mark as complete [x] when done._

- [ ] 2. Update GoogleDriveClient to use environment variable
  - Files: `backend/src/modules/attachments/services/google-drive-client.service.ts`
  - Change line 60: Replace `'Mavericks Claims'` hardcoded string with `this.environmentVariableUtil.getVariables().googleDriveClaimsFolderName`
  - _Leverage: EnvironmentVariableUtil already injected via AttachmentModule DI_
  - _Requirements: 1.3 - Use Configured Folder Name in Folder Creation_
  - _Prompt: Implement the task for spec env-folder-naming, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer | Task: Update GoogleDriveClient.createClaimFolder() method following requirement 1.3. On line 60, replace hardcoded string `'Mavericks Claims'` with `this.environmentVariableUtil.getVariables().googleDriveClaimsFolderName`. EnvironmentVariableUtil is already injected via constructor. | Restrictions: Only change line 60, do not modify constructor or add new dependencies, do not change folder creation logic | _Leverage: Existing EnvironmentVariableUtil injection, existing findOrCreateFolder() method | _Requirements: 1.3 | Success: Line 60 uses env var instead of hardcoded string, folders created with configured name | Instructions: Mark this task as in-progress [-] in tasks.md before starting. Mark as complete [x] when done._

## Frontend Implementation

- [ ] 3. Remove fallback folder creation logic from useAttachmentUpload
  - Files: `frontend/src/hooks/attachments/useAttachmentUpload.ts`
  - Delete lines 261-283 (entire try-catch fallback block)
  - Replace with simple: call backend, throw error if fails (no fallback)
  - _Leverage: Existing error handling patterns in mutation (lines 372-374)_
  - _Requirements: 3.1 - No Frontend Fallback_
  - _Prompt: Implement the task for spec env-folder-naming, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer | Task: Remove fallback folder creation logic from useAttachmentUpload hook following requirement 3.1. Delete lines 261-283 (try-catch fallback block where frontend creates folders directly). Replace with simple backend call: `const folderResponse = await apiClient.post(\`/attachments/folder/\${claimId}\`); if (!folderResponse.success || !folderResponse.folderId) { throw new Error(folderResponse.error || 'Failed to create claim folder. Please try again.'); } parentFolderId = folderResponse.folderId;` | Restrictions: Delete ALL fallback logic (no direct Drive folder creation from frontend), maintain existing error handling patterns, do not change upload flow otherwise | _Leverage: Existing error handling in mutation.onError (lines 372-374), existing backend folder creation API | _Requirements: 3.1 | Success: Fallback code deleted (~30 lines), frontend calls backend only, throws error if backend fails, no direct Drive operations for folder creation | Instructions: Mark this task as in-progress [-] in tasks.md before starting. Mark as complete [x] when done._

## Configuration & Documentation

- [ ] 4. Add environment variable to .env.example files
  - Files: `.env.example`, `backend/.env.example` (if exists)
  - Add `BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME="Mavericks Claims"` with comments for each environment
  - Provide examples: `"Mavericks Claims"` (prod), `"[staging] Mavericks Claims"` (staging), `"[local] Mavericks Claims"` (local)
  - _Leverage: Existing .env.example format and variable grouping_
  - _Requirements: 1.1 - Environment Variable Configuration_
  - _Prompt: Implement the task for spec env-folder-naming, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer | Task: Add BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME to .env.example files following requirement 1.1. Add under "Google Drive Related" section with comment explaining usage and examples for different environments. Format: `# Root folder name for Google Drive claims (environment-specific)\n# Production: "Mavericks Claims"\n# Staging: "[staging] Mavericks Claims"\n# Local: "[local] Mavericks Claims"\nBACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME="Mavericks Claims"` | Restrictions: Follow existing .env.example format, add to appropriate section (near other Google Drive vars), maintain alphabetical or logical grouping | _Leverage: Existing .env.example structure, existing Google Drive variable comments | _Requirements: 1.1 | Success: Variable added to .env.example with clear comments and examples for all environments | Instructions: Mark this task as in-progress [-] in tasks.md before starting. Mark as complete [x] when done._

## Testing

- [ ] 5. Add unit tests for EnvironmentVariableUtil changes
  - Files: `backend/src/modules/common/utils/__tests__/environment-variable.util.spec.ts` (or equivalent test file)
  - Test: Reading `BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME` returns correct value
  - Test: Missing env var throws error from `getOrThrow()`
  - _Leverage: Existing test structure for EnvironmentVariableUtil_
  - _Requirements: 1.1, 1.4 - Validation_
  - _Prompt: Implement the task for spec env-folder-naming, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer | Task: Add unit tests for EnvironmentVariableUtil.googleDriveClaimsFolderName field following requirements 1.1 and 1.4. Test 1: Set `process.env.BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME = '[test] Mavericks Claims'`, call `getVariables()`, verify `googleDriveClaimsFolderName === '[test] Mavericks Claims'`. Test 2: Delete `process.env.BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME`, call `getVariables()`, expect error thrown (ConfigService.getOrThrow behavior). | Restrictions: Follow existing test patterns, use same test setup as other env var tests, do not mock ConfigService | _Leverage: Existing EnvironmentVariableUtil test structure, existing test utilities | _Requirements: 1.1, 1.4 | Success: Tests verify env var is read correctly, tests verify missing env var throws error | Instructions: Mark this task as in-progress [-] in tasks.md before starting. Mark as complete [x] when done._

- [ ] 6. Add unit tests for GoogleDriveClient changes
  - Files: `backend/src/modules/attachments/services/__tests__/google-drive-client.service.spec.ts`
  - Test: Verify `createClaimFolder()` calls `findOrCreateFolder()` with env var value (not hardcoded string)
  - Mock EnvironmentVariableUtil to return test folder name
  - _Leverage: Existing GoogleDriveClient test structure (lines in existing spec file)_
  - _Requirements: 1.3 - Folder Creation with Configured Name_
  - _Prompt: Implement the task for spec env-folder-naming, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer | Task: Add unit test for GoogleDriveClient.createClaimFolder() following requirement 1.3. Mock EnvironmentVariableUtil.getVariables() to return `{ googleDriveClaimsFolderName: '[test] Mavericks Claims' }`. Call `createClaimFolder('user-1', 'claim-1')`. Spy on private `findOrCreateFolder()` method. Verify it was called with arguments `('user-1', '[test] Mavericks Claims')` instead of hardcoded `'Mavericks Claims'`. | Restrictions: Use existing test setup, mock EnvironmentVariableUtil (do not use real env vars in unit tests), follow existing spy patterns | _Leverage: Existing GoogleDriveClient test structure, existing mock patterns | _Requirements: 1.3 | Success: Test verifies env var value is used for folder name, not hardcoded string | Instructions: Mark this task as in-progress [-] in tasks.md before starting. Mark as complete [x] when done._

- [ ] 7. Add unit tests for useAttachmentUpload fallback removal
  - Files: `frontend/src/hooks/attachments/__tests__/useAttachmentUpload.test.ts`
  - Test: Verify backend folder creation failure throws error (NO fallback attempted)
  - Mock `apiClient.post('/attachments/folder/:claimId')` to fail, verify `driveClient.getOrCreateFolder` is NOT called
  - _Leverage: Existing useAttachmentUpload test structure_
  - _Requirements: 3.1 - No Fallback_
  - _Prompt: Implement the task for spec env-folder-naming, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer | Task: Add unit test verifying fallback removal from useAttachmentUpload following requirement 3.1. Mock `apiClient.post` to reject with error. Attempt file upload. Verify upload fails with error message. Critically: verify `driveClient.getOrCreateFolder` was NEVER called (no fallback). This proves frontend no longer creates folders directly when backend fails. | Restrictions: Use existing test setup, mock apiClient and driveClient, verify NO fallback folder creation occurs | _Leverage: Existing useAttachmentUpload test structure, existing mock patterns | _Requirements: 3.1 | Success: Test verifies backend failure throws error, test verifies NO fallback folder creation attempted | Instructions: Mark this task as in-progress [-] in tasks.md before starting. Mark as complete [x] when done._

- [ ] 8. Add integration test for environment-based folder creation
  - Files: `api-test/` (integration test suite)
  - Test end-to-end: Set `BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME` env var, create claim folder via API, verify folder created in Google Drive with configured name
  - _Leverage: Existing API integration test patterns, existing Google Drive test utilities_
  - _Requirements: 1.1, 1.3 - End-to-End Folder Creation_
  - _Prompt: Implement the task for spec env-folder-naming, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer | Task: Create integration test for environment-based folder creation following requirements 1.1 and 1.3. Set `process.env.BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME = '[test] Mavericks Claims'`. Authenticate test user. Call `POST /attachments/folder/{claimId}`. Verify response success and folderId returned. Use Google Drive API to verify folder exists with name matching env var (not hardcoded 'Mavericks Claims'). Verify claim folder created inside environment-specific root folder. | Restrictions: Use existing integration test setup, authenticate before API calls, clean up test folders after test, use real Google Drive API (not mocked) | _Leverage: Existing API integration test structure, existing Google Drive API client, existing test user setup | _Requirements: 1.1, 1.3 | Success: Integration test verifies end-to-end folder creation with environment-specific name | Instructions: Mark this task as in-progress [-] in tasks.md before starting. Mark as complete [x] when done._

## Documentation

- [ ] 9. Update development documentation
  - Files: `README.md`, `docs/project-info/development-commands.md` (or equivalent)
  - Document new `BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME` environment variable requirement
  - Add setup instructions for different environments (local, dev, staging, prod)
  - _Leverage: Existing environment variable documentation sections_
  - _Requirements: 1.1 - Developer Guidance_
  - _Prompt: Implement the task for spec env-folder-naming, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical Writer | Task: Update development documentation for new BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME environment variable following requirement 1.1. Add to "Environment Variables" section in README.md and docs/project-info/development-commands.md. Include: variable name, purpose (environment-specific Google Drive folder naming), required/optional status (REQUIRED), examples for each environment, and what happens if missing (app crashes at startup). | Restrictions: Follow existing documentation format, add to appropriate sections, maintain consistency with other env var docs | _Leverage: Existing environment variable documentation format, existing setup guides | _Requirements: 1.1 | Success: Documentation clearly explains new env var, provides examples for all environments, warns about startup failure if missing | Instructions: Mark this task as in-progress [-] in tasks.md before starting. Mark as complete [x] when done._
