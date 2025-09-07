# Tasks Document

## Backend Implementation

- [x] 1. Create shared Drive DTOs (type-based) for frontend and backend
  - File: packages/types/src/dtos/drive-request.dto.ts
  - Define DriveUploadRequest and DriveOperationRequest as type interfaces (not classes)
  - Export types following existing patterns for shared API contracts
  - Purpose: Provide shared type definitions for frontend and backend
  - _Leverage: existing type patterns from packages/types/src/dtos/email.dto.ts_
  - _Requirements: Requirement 1, Requirement 2_

- [x] 2. Create Drive response DTOs and types
  - File: packages/types/src/dtos/drive-response.dto.ts
  - Implement DriveUploadResponse and DriveFileMetadata as type definitions
  - Export types following existing patterns for API responses
  - Purpose: Provide type safety for API responses
  - _Leverage: existing response patterns from packages/types/src/dtos/email.dto.ts_
  - _Requirements: Requirement 1, Requirement 4_

- [x] 3. Create frontend Drive interface types
  - File: packages/types/src/drive.type.ts
  - Define DriveConfig and client-specific interfaces for frontend use
  - Add Google Drive API specific types (file metadata, permissions, etc.)
  - Purpose: Provide type safety for frontend Drive operations
  - _Leverage: existing type patterns from packages/types/src/auth.dto.ts_
  - _Requirements: Requirement 2_

- [x] 4. Create backend Drive class-based DTOs
  - File: backend/src/modules/drive/dtos/drive-request.dto.ts
  - Implement DriveUploadRequestDto and DriveOperationRequestDto classes with validation decorators
  - Classes should implement the shared type interfaces from packages/types
  - Add proper imports for class-validator decorators (@IsNotEmpty, @IsOptional, @MaxLength, @IsIn)
  - Purpose: Provide validated request DTOs for backend endpoints only
  - _Leverage: backend/src/modules/email/controllers/email.controller.ts class DTO patterns_
  - _Requirements: Requirement 1, Requirement 2_

- [x] 5. Extend TokenService for Drive API scope handling
  - File: backend/src/modules/auth/services/token.service.ts (modify existing)
  - Add Drive API scope validation and storage methods
  - Update token refresh logic to handle multiple scopes (Gmail + Drive)
  - Purpose: Extend existing OAuth token management for Drive operations
  - _Leverage: existing TokenService implementation_
  - _Requirements: Requirement 1, Requirement 3_

- [x] 6. Create Drive service module structure
  - File: backend/src/modules/drive/drive.module.ts
  - Set up NestJS module with proper imports and providers
  - Configure dependency injection for DriveService
  - Purpose: Organize Drive functionality into feature-based module
  - _Leverage: existing module patterns from backend/src/modules/email/email.module.ts_
  - _Requirements: Requirement 1_

- [x] 7. Implement core Drive service class
  - File: backend/src/modules/drive/services/drive.service.ts
  - Create DriveService with OAuth2Client integration following EmailService patterns
  - Implement basic file operation methods (upload, create folder, get metadata)
  - Add comprehensive error handling with retry logic
  - Purpose: Provide core Google Drive API operations with authentication
  - _Leverage: backend/src/modules/email/services/email.service.ts OAuth patterns, backend/src/modules/auth/services/token.service.ts_
  - _Requirements: Requirement 1, Requirement 4_

- [x] 8. Add Drive utility functions
  - File: backend/src/modules/common/utils/drive-utils.ts
  - Create utility functions for file validation, MIME type handling, error code mapping
  - Add helper functions for Drive API response processing
  - Purpose: Provide reusable utilities for Drive operations
  - _Leverage: existing utility patterns from backend/src/modules/common/utils/_
  - _Requirements: Requirement 4_

- [x] 9. Create Drive controller (optional endpoints)
  - File: backend/src/modules/drive/controllers/drive.controller.ts
  - Implement endpoints for Drive status checking and metadata operations
  - Add request validation using class-based DTOs
  - Purpose: Provide HTTP endpoints for server-side Drive operations if needed
  - _Leverage: backend/src/modules/email/controllers/email.controller.ts patterns_
  - _Requirements: Requirement 1, Requirement 4_

## Frontend Implementation

- [x] 10. Create Drive configuration constants
  - File: frontend/src/constants/drive-config.ts
  - Define Google Drive API configuration (scopes, discovery docs, client settings)
  - Use Object.freeze pattern for constants following project conventions
  - Purpose: Centralize Drive API configuration
  - _Leverage: existing constant patterns from frontend/src/constants/_
  - _Requirements: Requirement 2, Requirement 3_

- [x] 11. Implement Drive client utility
  - File: frontend/src/lib/drive-client.ts
  - Create Google Drive JavaScript client initialization and management
  - Add authentication state handling and token management
  - Purpose: Provide low-level Drive client functionality
  - _Leverage: frontend/src/lib/api-client.ts patterns_
  - _Requirements: Requirement 2_

- [ ] 12. Create useDriveClient hook
  - File: frontend/src/hooks/queries/drive/use-drive-client.ts
  - Implement React hook for Drive client initialization and authentication
  - Add error handling and loading states using TanStack Query patterns
  - Purpose: Provide React hook for Drive client management
  - _Leverage: frontend/src/hooks/queries/auth/useAuth.ts patterns, frontend/src/hooks/queries/helper/error-handler.ts_
  - _Requirements: Requirement 2_

- [ ] 13. Create useDriveUpload hook
  - File: frontend/src/hooks/queries/drive/use-drive-upload.ts
  - Implement file upload functionality with progress tracking
  - Add validation, error handling, and success callbacks
  - Use mutation patterns with TanStack Query
  - Purpose: Provide React hook for file upload operations
  - _Leverage: TanStack Query mutation patterns from existing hooks_
  - _Requirements: Requirement 2_

- [ ] 14. Create useDriveOperations hook
  - File: frontend/src/hooks/queries/drive/use-drive-operations.ts
  - Implement folder creation, file sharing, and permission management
  - Add query patterns for metadata fetching with 5-minute stale time
  - Purpose: Provide React hook for Drive folder and file management
  - _Leverage: TanStack Query patterns from frontend/src/hooks/queries/auth/useAuth.ts_
  - _Requirements: Requirement 2_

- [ ] 15. Update query keys for Drive operations
  - File: frontend/src/hooks/queries/keys/key.ts (modify existing)
  - Add Drive-specific query keys following existing patterns
  - Extend QueryGroup enum with DRIVE group
  - Purpose: Provide consistent query key management for Drive operations
  - _Leverage: existing query key patterns_
  - _Requirements: Requirement 2_

## Environment and Configuration

- [ ] 16. Update environment configuration
  - File: backend/src/configs/ (modify existing configuration)
  - Add Drive API scope configuration to existing Google OAuth setup
  - Validate Drive API environment variables in EnvironmentVariableUtil
  - Purpose: Ensure proper environment configuration for Drive API
  - _Leverage: existing EnvironmentVariableUtil patterns_
  - _Requirements: Requirement 3_

- [ ] 17. Update OAuth scope configuration
  - File: backend/src/modules/auth/strategies/ (modify existing Passport strategy)
  - Add drive.file scope to existing Google OAuth strategy
  - Update authentication flow to request Drive permissions
  - Purpose: Extend existing OAuth flow to include Drive access
  - _Leverage: existing Google OAuth strategy implementation_
  - _Requirements: Requirement 1, Requirement 3_

## Testing Implementation

- [ ] 18. Create Drive service unit tests
  - File: backend/src/modules/drive/services/drive.service.spec.ts
  - Write comprehensive tests for DriveService methods
  - Mock Google APIs client and test error scenarios
  - Test OAuth token handling and refresh logic
  - Purpose: Ensure Drive service reliability and error handling
  - _Leverage: existing test patterns from backend/src/modules/email/services/email.service.spec.ts_
  - _Requirements: Requirement 1, Requirement 4_

- [ ] 19. Create backend DTO validation tests
  - File: backend/src/modules/drive/dtos/drive-request.dto.spec.ts
  - Test class-validator decorators on backend class-based Drive DTOs
  - Verify validation error messages and edge cases
  - Purpose: Ensure proper request validation for backend classes
  - _Leverage: existing backend DTO test patterns_
  - _Requirements: Requirement 1_

- [ ] 20. Create frontend Drive hook tests
  - File: frontend/src/hooks/queries/drive/use-drive-client.test.ts
  - Test Drive client initialization and authentication flows
  - Mock Google Drive API responses and test error scenarios
  - Purpose: Ensure reliable frontend Drive integration
  - _Leverage: existing hook test patterns_
  - _Requirements: Requirement 2_

- [ ] 21. Create integration tests for Drive operations
  - File: api-test/src/tests/drive-integration.test.ts
  - Test end-to-end Drive operations (upload, folder creation, permissions)
  - Test OAuth flow integration with Drive scope
  - Test error handling and recovery scenarios
  - Purpose: Verify complete Drive integration workflow
  - _Leverage: existing integration test patterns from api-test/_
  - _Requirements: All requirements_

## Documentation and Cleanup

- [ ] 22. Update module exports and imports
  - File: backend/src/modules/drive/index.ts
  - Create proper module exports following project conventions
  - Update main module imports to include Drive functionality
  - Purpose: Integrate Drive module into application structure
  - _Leverage: existing module export patterns_
  - _Requirements: All requirements_

- [ ] 23. Add Drive API error handling documentation
  - File: backend/src/modules/drive/README.md
  - Document Drive-specific error codes and handling strategies
  - Add usage examples for DriveService methods
  - Purpose: Provide development guidance for Drive integration
  - _Leverage: existing module documentation patterns_
  - _Requirements: Requirement 4_

- [ ] 24. Final integration verification and cleanup
  - Files: All Drive-related files
  - Verify all imports and exports work correctly
  - Run linting and formatting (make format && make lint)
  - Test build process and resolve any TypeScript errors
  - Purpose: Ensure complete integration without breaking existing functionality
  - _Leverage: existing build and lint processes_
  - _Requirements: All requirements_