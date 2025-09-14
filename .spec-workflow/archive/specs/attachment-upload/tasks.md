# Tasks Document

<!-- AI Instructions: For each task, generate a _Prompt field with structured AI guidance following this format:
_Prompt: Role: [specialized developer role] | Task: [clear task description with context references] | Restrictions: [what not to do, constraints] | Success: [specific completion criteria]_
This helps provide better AI agent guidance beyond simple "work on this task" prompts. -->

- [x] 1. Create attachment DTOs in shared types package
  - File: packages/types/src/dtos/attachments/index.ts
  - Define request/response DTOs for attachment upload operations
  - Extend existing DTO patterns from auth and drive modules
  - Purpose: Establish type safety for attachment API operations
  - _Leverage: packages/types/src/dtos/auth/, packages/types/src/dtos/drive/_
  - _Requirements: 2.1, 5.1_
  - _Prompt: Role: TypeScript Developer specializing in API contract design | Task: Create comprehensive attachment DTOs following requirements 2.1 and 5.1, extending existing patterns from auth and drive DTOs, including upload request, response, and status types | Restrictions: Do not modify existing DTO structures, maintain backward compatibility, follow Object.freeze() enum pattern | Success: All DTOs compile without errors, proper inheritance from existing patterns, full type coverage for attachment operations_

- [x] 2. Extend AttachmentEntity with missing fields
  - File: backend/src/modules/claims/entities/attachment.entity.ts
  - Add storedFilename field for Google Drive naming convention
  - Verify all required fields match design specification
  - Purpose: Ensure database schema supports all attachment operations
  - _Leverage: existing AttachmentEntity structure_
  - _Requirements: 1.1, 2.2_
  - _Prompt: Role: Database Developer with expertise in TypeORM and entity design | Task: Extend AttachmentEntity following requirements 1.1 and 2.2, adding storedFilename field and verifying all design-specified fields are present | Restrictions: Must maintain existing relationships, do not break existing migrations, follow TypeORM patterns | Success: Entity has all required fields, relationships work correctly, database operations succeed_

- [x] 3. Create AttachmentDBUtil extending BaseDBUtil
  - File: backend/src/modules/claims/utils/attachment-db.util.ts
  - Implement database utility following existing BaseDBUtil patterns
  - Add attachment-specific query methods
  - Purpose: Provide standardized database operations for attachments
  - _Leverage: backend/src/modules/common/base-classes/base-db-util.ts_
  - _Requirements: 2.2, 5.2_
  - _Prompt: Role: Backend Developer with expertise in database utilities and TypeORM | Task: Create AttachmentDBUtil extending BaseDBUtil following requirements 2.2 and 5.2, implementing CRUD operations and attachment-specific queries | Restrictions: Must follow existing BaseDBUtil patterns, do not duplicate base functionality, maintain transaction safety | Success: All CRUD operations work correctly, follows established patterns, attachment queries are efficient and reliable_

- [x] 4. Create GoogleDriveClient service
  - File: backend/src/modules/attachments/services/google-drive-client.service.ts
  - Implement Google Drive API operations with proper error handling
  - Add file upload, folder creation, and permission management
  - Purpose: Abstract Google Drive API operations behind clean interface
  - _Leverage: backend/src/modules/auth/services/auth.service.ts for token management_
  - _Requirements: 1.1, 3.1_
  - _Prompt: Role: API Integration Developer with expertise in Google APIs and Node.js | Task: Create GoogleDriveClient service following requirements 1.1 and 3.1, implementing file upload, folder creation, and permission setting with proper error handling and token refresh | Restrictions: Must use existing OAuth token patterns, implement exponential backoff for retries, do not expose Google API internals | Success: All Google Drive operations work reliably, proper error handling implemented, integrates seamlessly with existing auth service_

- [x] 5. Create AttachmentService orchestrating upload workflow
  - File: backend/src/modules/attachments/services/attachment.service.ts
  - Implement main service coordinating Google Drive upload and database operations
  - Add file validation, naming convention, and status management
  - Purpose: Provide business logic layer for attachment operations
  - _Leverage: GoogleDriveClient, AttachmentDBUtil, AuthService_
  - _Requirements: 1.1, 1.2, 3.1_
  - _Prompt: Role: Backend Developer with expertise in service orchestration and business logic | Task: Create AttachmentService following requirements 1.1, 1.2, and 3.1, orchestrating Google Drive uploads with database persistence, file validation, and status management | Restrictions: Must use existing validation patterns, maintain transaction integrity, follow established service patterns | Success: Complete upload workflow implemented, proper validation and error handling, status tracking works correctly_

- [x] 6. Create AttachmentController with upload endpoints
  - File: backend/src/modules/attachments/controllers/attachment.controller.ts
  - Implement REST endpoints for file upload and attachment management
  - Add request validation and proper HTTP status codes
  - Purpose: Provide HTTP API for attachment operations
  - _Leverage: AttachmentService, existing controller patterns_
  - _Requirements: 1.1, 4.1_
  - _Prompt: Role: API Developer with expertise in NestJS controllers and REST design | Task: Create AttachmentController following requirements 1.1 and 4.1, implementing upload endpoints with proper validation, status codes, and error handling | Restrictions: Must follow existing controller patterns, validate all inputs, ensure proper HTTP semantics | Success: All endpoints work correctly, proper validation implemented, follows REST conventions and existing patterns_

- [x] 7. Create AttachmentModule with proper dependency injection
  - File: backend/src/modules/attachments/attachment.module.ts
  - Set up NestJS module with all services and controllers
  - Configure dependency injection and imports
  - Purpose: Package attachment functionality into cohesive module
  - _Leverage: existing module patterns from auth and claims modules_
  - _Requirements: All backend requirements_
  - _Prompt: Role: NestJS Developer with expertise in module architecture and dependency injection | Task: Create AttachmentModule following all backend requirements, configuring proper DI, imports, and exports using existing module patterns | Restrictions: Must follow NestJS module patterns, ensure proper service registration, maintain clean dependencies | Success: Module is properly configured, all dependencies resolved, integrates seamlessly with existing modules_

- [x] 8. Add attachment query keys to frontend query management
  - File: frontend/src/hooks/queries/keys/key.ts
  - Extend QueryGroup enum with ATTACHMENTS group
  - Add attachment-specific query key generators
  - Purpose: Enable React Query integration for attachment operations
  - _Leverage: existing query key patterns from auth and drive_
  - _Requirements: 4.1, 5.1_
  - _Prompt: Role: Frontend Developer with expertise in React Query and state management | Task: Extend query key management following requirements 4.1 and 5.1, adding ATTACHMENTS group and key generators using existing patterns | Restrictions: Must follow existing query key patterns, maintain type safety, ensure proper cache invalidation | Success: Query keys properly configured, follows existing patterns, supports all attachment operations_

- [x] 9. Create useAttachmentUpload hook with progress tracking
  - File: frontend/src/hooks/attachments/useAttachmentUpload.ts
  - Implement upload hook with file validation, progress, and error handling
  - Follow existing React Query and performance patterns
  - Purpose: Provide reusable upload functionality for components
  - _Leverage: frontend/src/hooks/auth/useAuthStatus.ts patterns, ErrorHandler_
  - _Requirements: 4.1, 4.2, 4.3_
  - _Prompt: Role: React Developer with expertise in custom hooks and file upload | Task: Create useAttachmentUpload hook following requirements 4.1, 4.2, and 4.3, implementing file validation, progress tracking, and error handling using existing hook patterns | Restrictions: Must follow existing hook patterns, handle all error scenarios, ensure proper cleanup | Success: Hook provides complete upload functionality, proper error handling, follows performance patterns from existing hooks_

- [x] 10. Create FileUploadComponent with drag-and-drop support
  - File: frontend/src/components/attachments/FileUploadComponent.tsx
  - Implement file selection UI with validation feedback and progress display
  - Add drag-and-drop functionality for desktop users
  - Purpose: Provide user interface for file upload operations
  - _Leverage: existing form components, useAttachmentUpload hook_
  - _Requirements: 4.2, 4.3, 5.3_
  - _Prompt: Role: Frontend Developer with expertise in React components and file handling | Task: Create FileUploadComponent following requirements 4.2, 4.3, and 5.3, implementing drag-and-drop, validation feedback, and progress display using existing form patterns | Restrictions: Must use existing UI components, ensure mobile responsiveness, maintain accessibility standards | Success: Component provides excellent user experience, proper validation feedback, mobile-responsive design_

- [x] 11. Create AttachmentList component for display and management
  - File: frontend/src/components/attachments/AttachmentList.tsx
  - Implement component to display uploaded attachments with status
  - Add delete functionality and error state handling
  - Purpose: Allow users to view and manage uploaded attachments
  - _Leverage: existing list components and status display patterns_
  - _Requirements: 5.1, 5.2_
  - _Prompt: Role: React Developer with expertise in list components and state management | Task: Create AttachmentList component following requirements 5.1 and 5.2, displaying attachments with status, delete functionality, and error handling | Restrictions: Must use existing component patterns, handle loading states properly, ensure proper user feedback | Success: Component displays attachments correctly, proper status indication, delete functionality works reliably_

- [x] 12. Integrate attachment components with claims forms
  - File: frontend/src/components/claims/ (modify existing claim forms)
  - Add FileUploadComponent and AttachmentList to claim creation/editing
  - Ensure proper state synchronization with claim workflow
  - Purpose: Complete integration with existing claims functionality
  - _Leverage: existing claim form components_
  - _Requirements: 1.2, 5.1_
  - _Prompt: Role: React Developer with expertise in form integration and state management | Task: Integrate attachment components into existing claim forms following requirements 1.2 and 5.1, ensuring proper state synchronization and workflow integration | Restrictions: Must not break existing claim functionality, maintain form validation patterns, ensure proper state management | Success: Attachments integrated seamlessly with claims, proper state synchronization, existing functionality preserved_

- [x] 13. Add Drive token endpoint for client-side uploads (if needed)
  - File: backend/src/modules/auth/controllers/auth.controller.ts
  - ~~Implement endpoint to provide Google Drive tokens for frontend uploads~~
  - **COMPLETED: Not needed - server-side uploads are more secure**
  - Current architecture properly handles tokens via GoogleDriveClient service
  - Purpose: ~~Enable secure client-side uploads to Google Drive~~
  - _Leverage: existing OAuth token management in AuthService_
  - _Requirements: 1.1, 3.1_
  - _Analysis: The existing GoogleDriveClient properly handles OAuth tokens server-side with encryption and automatic refresh. Creating a separate token endpoint would expose sensitive tokens to client-side code unnecessarily. Server-side uploads maintain better security while providing the same functionality._

- [x] 14. Create backend unit tests for attachment services
  - File: backend/src/modules/attachments/services/*.test.ts
  - Write comprehensive tests for AttachmentService and GoogleDriveClient
  - Mock external dependencies and test error scenarios
  - Purpose: Ensure backend attachment functionality reliability
  - _Leverage: existing test patterns from auth and claims modules_
  - _Requirements: All backend requirements_
  - _Prompt: Role: Backend QA Engineer with expertise in Node.js testing and mocking | Task: Create comprehensive unit tests for attachment services covering all backend requirements, mocking external dependencies and testing error scenarios | Restrictions: Must mock all external services, test both success and failure paths, maintain test isolation | Success: High test coverage achieved, all error scenarios tested, tests run reliably and independently_

- [x] 15. Create frontend unit tests for attachment hooks and components
  - File: frontend/src/hooks/attachments/*.test.ts, frontend/src/components/attachments/*.test.tsx
  - Write tests for useAttachmentUpload hook and upload components
  - Test file validation, progress tracking, and error handling
  - Purpose: Ensure frontend attachment functionality reliability
  - _Leverage: existing test patterns from auth components and hooks_
  - _Requirements: All frontend requirements_
  - _Prompt: Role: Frontend QA Engineer with expertise in React Testing Library and Jest | Task: Create comprehensive tests for attachment hooks and components covering all frontend requirements, testing validation, progress tracking, and error handling | Restrictions: Must test user interactions properly, mock API calls, ensure component isolation | Success: Components and hooks thoroughly tested, user interactions validated, proper error handling verified_

- [x] 16. Create integration tests for complete upload workflow
  - File: api-test/src/tests/attachments.test.ts
  - Test end-to-end upload flow from API request to Google Drive storage
  - Include authentication, validation, and error scenarios
  - Purpose: Verify complete attachment upload system integration
  - _Leverage: existing API test patterns and fixtures_
  - _Requirements: All requirements_
  - _Prompt: Role: Integration Test Engineer with expertise in API testing and system integration | Task: Create comprehensive integration tests covering complete upload workflow for all requirements, testing authentication, validation, and error scenarios | Restrictions: Must test real API endpoints, use proper test data isolation, ensure test cleanup | Success: Complete upload workflow tested end-to-end, all integration points verified, error scenarios properly handled_

- [ ] 17. Add Swagger documentation for attachment endpoints
  - File: backend/src/modules/attachments/controllers/attachment.controller.ts (add decorators)
  - Document all attachment API endpoints with proper schemas
  - Include request/response examples and error codes
  - Purpose: Provide clear API documentation for developers
  - _Leverage: existing Swagger patterns from other controllers_
  - _Requirements: 4.1_
  - _Prompt: Role: API Documentation Specialist with expertise in OpenAPI/Swagger | Task: Add comprehensive Swagger documentation for attachment endpoints following requirement 4.1, including schemas, examples, and error codes | Restrictions: Must follow existing documentation patterns, ensure accuracy with implementation, maintain consistency | Success: All endpoints properly documented, examples are accurate, documentation is complete and helpful_

- [x] 18. Update database migrations for any schema changes
  - File: backend/src/database/migrations/ (create new migration if needed)
  - Create migration for any AttachmentEntity changes
  - Ensure proper rollback procedures
  - Purpose: Apply database schema changes safely
  - _Leverage: existing migration patterns_
  - _Requirements: 2.2_
  - _Prompt: Role: Database Administrator with expertise in TypeORM migrations | Task: Create database migration for AttachmentEntity changes following requirement 2.2, ensuring proper rollback procedures and data safety | Restrictions: Must be reversible, ensure data integrity, follow existing migration patterns | Success: Migration runs successfully, rollback works correctly, no data loss occurs_

- [ ] 19. Add error tracking and logging for attachment operations
  - File: backend/src/modules/attachments/ (add to existing services)
  - Implement comprehensive logging for upload operations and failures
  - Add monitoring for Google Drive API errors and quotas
  - Purpose: Enable proper debugging and monitoring in production
  - _Leverage: existing logging infrastructure_
  - _Requirements: 3.2, 3.3_
  - _Prompt: Role: DevOps Engineer with expertise in application monitoring and logging | Task: Add comprehensive logging and error tracking for attachment operations following requirements 3.2 and 3.3, monitoring API errors and performance | Restrictions: Must use existing logging infrastructure, avoid logging sensitive data, ensure performance impact is minimal | Success: Comprehensive logging implemented, proper error tracking, monitoring supports debugging and alerts_

- [ ] 20. Final integration testing and cleanup
  - File: Multiple files (cleanup and final verification)
  - Test complete attachment workflow with claims integration
  - Verify all requirements are met and functionality works end-to-end
  - Purpose: Ensure complete system works correctly
  - _Leverage: All implemented components_
  - _Requirements: All_
  - _Prompt: Role: Senior Developer with expertise in system integration and quality assurance | Task: Perform final integration testing and cleanup covering all requirements, verifying complete attachment workflow and claims integration | Restrictions: Must not break existing functionality, ensure all requirements met, maintain code quality standards | Success: Complete system works end-to-end, all requirements verified, code is clean and production-ready_