# Tasks Document

- [x] 1. Remove server-side file upload infrastructure
  - Files: backend/src/modules/attachments/services/google-drive-client.service.ts, backend/src/modules/attachments/controllers/attachment.controller.ts
  - Remove uploadFile method from GoogleDriveClient service (lines 58-96)
  - Remove FileInterceptor and file upload endpoints from AttachmentController
  - Remove multipart form data handling and file buffer processing
  - Purpose: Eliminate incorrect server-side upload architecture
  - _Leverage: Existing error handling and logging patterns_
  - _Requirements: 4.0 - Remove Server-Side Upload Code_
  - _Prompt: Implement the task for spec client-side-drive-upload, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Refactoring Specialist with expertise in NestJS and architectural cleanup | Task: Remove all server-side file upload logic from GoogleDriveClient.uploadFile method and AttachmentController file upload endpoints, eliminating multipart form data handling while preserving folder management and metadata operations | Restrictions: Do not remove folder creation/management methods, do not break existing authentication or token management, preserve error handling patterns, maintain backward compatibility for metadata operations | Success: Server no longer accepts file uploads, multipart interceptors removed, existing folder and token operations remain functional | Instructions: First mark this task as in progress in tasks.md, then implement the removal of server-side upload code, finally mark as complete when all file upload logic is eliminated_

- [x] 2. Create Google Drive token endpoint for client-side uploads
  - Files: backend/src/modules/auth/controllers/auth.controller.ts
  - Add GET /auth/drive-token endpoint that returns valid OAuth access tokens
  - Leverage existing AuthService.getUserTokens method and TokenDBUtil for token retrieval and decryption
  - Implement token validation and automatic refresh using existing token management infrastructure
  - Purpose: Provide secure Drive tokens for frontend direct uploads
  - _Leverage: Existing AuthService.getUserTokens, TokenDBUtil.getDecryptedTokens, JWT guards, rate limiting decorators_
  - _Requirements: 2.0 - Drive Token Management Endpoint_
  - _Prompt: Implement the task for spec client-side-drive-upload, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend API Developer specializing in OAuth token management and security | Task: Create Drive token endpoint in AuthController that leverages existing AuthService.getUserTokens and TokenDBUtil.getDecryptedTokens methods, implementing proper scope validation and automatic refresh using current token management patterns | Restrictions: Must use existing JWT authentication, leverage current TokenDBUtil implementation, maintain rate limiting, ensure tokens have minimal scope (drive.file only), do not expose refresh tokens to frontend | Success: Endpoint returns valid Drive access tokens using existing token infrastructure, automatic refresh works through current AuthService patterns, proper error handling for expired/invalid tokens | Instructions: First mark this task as in progress in tasks.md, then implement the Drive token endpoint leveraging existing TokenDBUtil, finally mark as complete when tokens can be successfully retrieved and used_

- [x] 3. Refactor attachment controller for metadata-only operations
  - Files: backend/src/modules/attachments/controllers/attachment.controller.ts, backend/src/modules/attachments/dtos/attachment-metadata.dto.ts
  - Replace file upload endpoint with metadata storage endpoint
  - Create AttachmentMetadataDto for Drive file references
  - Update existing endpoints to handle metadata without file buffers
  - Purpose: Convert attachment system to metadata-only backend storage
  - _Leverage: Existing AttachmentService, validation patterns, authentication guards_
  - _Requirements: 3.0 - Metadata-Only Backend Storage_
  - _Prompt: Implement the task for spec client-side-drive-upload, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer with expertise in NestJS controllers and DTO design | Task: Refactor AttachmentController to handle only Google Drive file metadata, replacing file upload endpoints with metadata storage endpoints using proper DTOs and validation | Restrictions: Must maintain existing authentication and validation patterns, do not modify database entity structure unnecessarily, ensure backward compatibility for existing API consumers | Success: Controller accepts Drive file metadata, validates all inputs, stores references properly without handling file content | Instructions: First mark this task as in progress in tasks.md, then refactor the controller for metadata operations, finally mark as complete when metadata endpoints are fully functional_

- [ ] 4. Create frontend Google Drive client for direct uploads
  - Files: frontend/src/lib/google-drive-client.ts, frontend/src/types/google-drive.types.ts
  - Implement DriveUploadClient class for direct Google Drive API integration
  - Add file upload with progress tracking using Google Drive REST API
  - Create folder management methods using Drive API
  - Purpose: Enable direct browser-to-Drive uploads without server intermediary
  - _Leverage: Existing apiClient patterns, error handling utilities, progress tracking concepts_
  - _Requirements: 5.0 - Frontend Google Drive Integration_
  - _Prompt: Implement the task for spec client-side-drive-upload, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer specializing in Google APIs and direct browser integrations | Task: Create DriveUploadClient for direct Google Drive API integration with file upload and folder management, implementing proper progress tracking and error handling | Restrictions: Must use Google Drive REST API directly, implement proper CORS handling, ensure progress tracking is accurate, do not expose access tokens in console logs | Success: Files upload directly to Google Drive, progress tracking works accurately, folder creation and management functions properly | Instructions: First mark this task as in progress in tasks.md, then implement the Drive client library, finally mark as complete when direct uploads work reliably_

- [ ] 5. Refactor useAttachmentUpload hook for client-side architecture
  - Files: frontend/src/hooks/attachments/useAttachmentUpload.ts
  - Replace FormData server upload with Drive token fetch + direct upload flow
  - Integrate DriveUploadClient for file operations
  - Implement metadata-only backend calls after successful Drive upload
  - Purpose: Orchestrate complete client-side upload workflow
  - _Leverage: Existing React Query patterns, validation logic, progress tracking, error handling_
  - _Requirements: 1.0 - Direct Client-Side Google Drive Upload, 3.0 - Metadata-Only Backend Storage_
  - _Prompt: Implement the task for spec client-side-drive-upload, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React Developer with expertise in custom hooks and API integration | Task: Refactor useAttachmentUpload hook to orchestrate client-side uploads using Drive tokens and direct Google Drive API calls, maintaining existing validation and progress tracking patterns | Restrictions: Must preserve existing hook interface for backward compatibility, maintain React Query patterns, ensure proper error handling and loading states | Success: Hook coordinates token fetch, Drive upload, and metadata storage seamlessly with proper progress tracking and error handling | Instructions: First mark this task as in progress in tasks.md, then refactor the hook for client-side uploads, finally mark as complete when the full upload workflow functions correctly_

- [ ] 6. Update FileUploadComponent for new upload flow
  - Files: frontend/src/components/attachments/FileUploadComponent.tsx
  - Remove FormData submission to backend
  - Integrate with refactored useAttachmentUpload hook
  - Update progress indicators for direct Drive uploads
  - Purpose: Adapt UI component to new client-side upload architecture
  - _Leverage: Existing component patterns, styling, accessibility features_
  - _Requirements: 5.0 - Frontend Google Drive Integration_
  - _Prompt: Implement the task for spec client-side-drive-upload, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React UI Developer with expertise in file upload components and user experience | Task: Update FileUploadComponent to work with client-side upload flow, maintaining existing UI/UX while adapting to new architecture with proper progress indication | Restrictions: Must maintain existing accessibility features, preserve dark mode styling, ensure mobile responsiveness, do not break existing component API | Success: Component works seamlessly with new upload flow, progress tracking is accurate, user experience is intuitive and responsive | Instructions: First mark this task as in progress in tasks.md, then update the component for client-side uploads, finally mark as complete when UI properly reflects the new upload process_

- [ ] 7. Add comprehensive error handling for Google Drive operations
  - Files: frontend/src/lib/google-drive-client.ts, backend/src/modules/auth/services/google-drive-token.service.ts
  - Implement exponential backoff retry logic for Drive API calls
  - Add specific error handling for quota limits, permissions, network failures
  - Create user-friendly error messages for different failure scenarios
  - Purpose: Ensure robust error handling across the client-side upload system
  - _Leverage: Existing ErrorHandler utility, toast notification system, retry patterns_
  - _Requirements: All reliability requirements from requirements.md_
  - _Prompt: Implement the task for spec client-side-drive-upload, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer with expertise in resilient API integrations and error handling | Task: Implement comprehensive error handling for Google Drive operations including exponential backoff, quota handling, and user-friendly error messages across frontend and backend | Restrictions: Must not overwhelm users with technical errors, implement proper retry limits to avoid infinite loops, maintain system stability during API failures | Success: System handles all Drive API error scenarios gracefully, users receive clear actionable error messages, automatic retry works reliably | Instructions: First mark this task as in progress in tasks.md, then implement comprehensive error handling, finally mark as complete when all error scenarios are properly handled_

- [ ] 8. Create unit tests for new Google Drive integration components
  - Files: frontend/src/lib/__tests__/google-drive-client.test.ts, backend/src/modules/auth/services/__tests__/google-drive-token.service.spec.ts
  - Write unit tests for DriveUploadClient with mocked Drive API responses
  - Test GoogleDriveTokenService token validation and refresh logic
  - Cover error handling scenarios and edge cases
  - Purpose: Ensure reliability of new Google Drive integration components
  - _Leverage: Existing test utilities, mocking patterns, Jest/Vitest configuration_
  - _Requirements: All requirements need test coverage_
  - _Prompt: Implement the task for spec client-side-drive-upload, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer specializing in unit testing and Google API mocking | Task: Create comprehensive unit tests for DriveUploadClient and GoogleDriveTokenService covering success scenarios, error handling, and edge cases with proper mocking | Restrictions: Must mock all Google API calls, test business logic in isolation, ensure tests run reliably without external dependencies | Success: All new components have good test coverage, edge cases are tested, mocked API responses cover various scenarios | Instructions: First mark this task as in progress in tasks.md, then create comprehensive unit tests, finally mark as complete when test coverage is satisfactory_

- [ ] 9. Update integration tests for new attachment upload flow
  - Files: api-test/src/tests/attachments.test.ts
  - Replace file upload tests with Drive token and metadata endpoint tests
  - Add tests for error scenarios (expired tokens, invalid metadata)
  - Test complete flow: token fetch → mock Drive upload → metadata storage
  - Purpose: Ensure end-to-end functionality of new attachment system
  - _Leverage: Existing API test framework, authentication helpers, database utilities_
  - _Requirements: All functional requirements need integration test coverage_
  - _Prompt: Implement the task for spec client-side-drive-upload, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Integration Test Engineer with expertise in API testing and end-to-end workflows | Task: Update integration tests to cover new attachment upload flow including Drive token endpoints, metadata operations, and error scenarios with proper test data setup | Restrictions: Must use existing test framework patterns, ensure tests clean up properly, mock Google Drive API calls to avoid external dependencies | Success: Integration tests cover complete upload workflow, error scenarios are tested, tests run reliably in CI/CD pipeline | Instructions: First mark this task as in progress in tasks.md, then update integration tests, finally mark as complete when all upload flow scenarios are covered_

- [ ] 10. Clean up deprecated code and update documentation
  - Files: Multiple files across backend and frontend, CLAUDE.md status section
  - Remove unused imports and dependencies related to server-side file handling
  - Update CLAUDE.md status to reflect completed client-side upload implementation
  - Clean up any remaining references to old upload architecture
  - Purpose: Complete the refactor and update project documentation
  - _Leverage: Existing documentation patterns, code cleanup utilities_
  - _Requirements: All requirements should be marked as implemented_
  - _Prompt: Implement the task for spec client-side-drive-upload, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Senior Developer with expertise in code cleanup and technical documentation | Task: Complete final cleanup of deprecated server-side upload code, update project documentation to reflect new client-side architecture, ensure no orphaned code remains | Restrictions: Must not break any existing functionality, ensure all imports are valid, maintain documentation consistency with project standards | Success: No deprecated upload code remains, documentation accurately reflects new architecture, codebase is clean and maintainable | Instructions: First mark this task as in progress in tasks.md, then perform comprehensive cleanup and documentation updates, finally mark as complete when refactor is fully implemented and documented_