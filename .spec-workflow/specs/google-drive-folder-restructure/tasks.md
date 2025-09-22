# Tasks Document

## Simplified Scope: Google Drive Folder Creation Only

Based on feedback, this implementation will **NOT modify any database entities or frontend forms**. Instead, it will generate descriptive folder names dynamically during Google Drive folder creation using existing claim data.

## Phase 1: Folder Naming Utilities

- [x] 1. Create FolderNamingUtil for dynamic name generation
  - File: backend/src/shared/utils/folder-naming.util.ts
  - Implement generateFolderName, sanitizeClaimName, and validateClaimName functions
  - Generate names from existing claim data without requiring new fields
  - Purpose: Provide core folder naming logic using existing claim properties
  - _Leverage: backend/src/shared/utils/existing-utility-patterns.ts_
  - _Requirements: 1.1-1.7, 2.1-2.5, 3.1-3.5_
  - _Prompt: Implement the task for spec google-drive-folder-restructure, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Utility Developer with expertise in string manipulation and validation | Task: Create folder naming utility that generates descriptive names from existing claim data following requirements 1.1-1.7, 2.1-2.5, and 3.1-3.5, without requiring database changes | Restrictions: Must work with existing claim entity fields only, no external dependencies, follow existing utility patterns, ensure performance <10ms | _Leverage: backend/src/shared/utils/ existing patterns, packages/types/src/enums/ for category mappings, backend/src/entities/claims.entity.ts for available fields_ | _Requirements: 1.1 (descriptive format), 2.1-2.5 (character limits and sanitization), 3.1-3.5 (category mapping using existing data)_ | Success: Generates folder names using only existing claim fields, validation works correctly, sanitization handles edge cases, performance meets <10ms requirement | Instructions: First change this task status to [-] in tasks.md, implement the utility using existing claim properties, then mark as [x] when complete_

- [ ] 2. Create unit tests for FolderNamingUtil
  - File: backend/src/shared/utils/__tests__/folder-naming.util.test.ts
  - Write comprehensive tests for naming scenarios using existing claim data
  - Test character limits, sanitization, category mapping with current claim structure
  - Purpose: Ensure naming utility reliability using existing data structure
  - _Leverage: backend/src/shared/utils/__tests__/existing-test-patterns.ts_
  - _Requirements: 1.1-1.7, 2.1-2.5, 3.1-3.5_
  - _Prompt: Implement the task for spec google-drive-folder-restructure, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer with expertise in unit testing and Jest framework | Task: Create comprehensive unit tests for FolderNamingUtil covering requirements 1.1-1.7, 2.1-2.5, and 3.1-3.5, using existing claim data structure for testing | Restrictions: Must test with realistic claim data, ensure test isolation, do not test external dependencies, follow existing test patterns | _Leverage: backend/src/shared/utils/__tests__/ existing patterns, backend/src/entities/claims.entity.ts for test data structure_ | _Requirements: All folder naming requirements using existing claim data_ | Success: 100% code coverage achieved, all edge cases tested with existing data structure, tests run independently, performance tests verify <10ms requirement | Instructions: First change this task status to [-] in tasks.md, write comprehensive tests with existing claim data, then mark as [x] when complete_

## Phase 2: Google Drive Integration

- [ ] 3. Enhance GoogleDriveClient with descriptive folder creation
  - File: backend/src/modules/attachments/services/google-drive-client.service.ts
  - Modify createClaimFolder to generate descriptive names using FolderNamingUtil
  - Add collision detection and retry logic with suffix generation
  - Purpose: Enable Google Drive folders with descriptive names using existing claim data
  - _Leverage: backend/src/modules/attachments/services/existing-drive-patterns.ts_
  - _Requirements: 9.1-9.6, 8.1-8.6, 4.3-4.4_
  - _Prompt: Implement the task for spec google-drive-folder-restructure, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Google Drive API Developer with expertise in Google APIs and folder management | Task: Enhance GoogleDriveClient to create folders with descriptive names following requirements 9.1-9.6, 8.1-8.6, and 4.3-4.4, using existing claim data without database changes | Restrictions: Must maintain existing method signatures, respect API rate limits, implement proper retry mechanisms, use existing OAuth token patterns | _Leverage: existing Google Drive OAuth and API patterns, backend/src/shared/utils/folder-naming.util.ts, existing claim data structure_ | _Requirements: 9.1-9.6 (collision handling), 8.1-8.6 (fallback strategy), 4.3-4.4 (folder creation integration)_ | Success: Creates descriptive folders using existing claim data, collision detection works correctly, retry logic handles failures gracefully, maintains backward compatibility | Instructions: First change this task status to [-] in tasks.md, enhance folder creation with descriptive naming, then mark as [x] when complete_

- [ ] 4. Update attachment service to use enhanced folder creation
  - File: backend/src/modules/attachments/services/attachments.service.ts
  - Modify service to pass claim data to GoogleDriveClient for descriptive folder creation
  - Ensure attachment metadata references the descriptive folder structure
  - Purpose: Complete integration of descriptive folder naming in attachment workflow
  - _Leverage: backend/src/modules/attachments/services/existing-attachment-patterns.ts_
  - _Requirements: 4.3-4.6_
  - _Prompt: Implement the task for spec google-drive-folder-restructure, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Service Developer with expertise in file management and service integration | Task: Update attachment service following requirements 4.3-4.6, integrating descriptive folder creation using existing claim data without database schema changes | Restrictions: Must maintain existing service interfaces, ensure transaction integrity, handle errors gracefully, follow existing service patterns | _Leverage: backend/src/modules/attachments/services/google-drive-client.service.ts enhanced methods, existing claim data access patterns_ | _Requirements: 4.3-4.6 (data flow integration using existing structure)_ | Success: Attachment service creates descriptive folders using existing claim data, metadata is properly stored, error handling works correctly, existing functionality preserved | Instructions: First change this task status to [-] in tasks.md, update service integration, then mark as [x] when complete_

## Phase 3: Testing and Validation

- [ ] 5. Create integration tests for descriptive folder creation
  - File: backend/src/modules/attachments/__tests__/descriptive-folder-integration.test.ts
  - Write end-to-end tests for folder creation using existing claim data
  - Test collision handling, error scenarios, and backward compatibility
  - Purpose: Ensure complete folder naming integration works with existing data structure
  - _Leverage: backend/src/modules/attachments/__tests__/existing-integration-patterns.ts_
  - _Requirements: All requirements integration testing with existing data_
  - _Prompt: Implement the task for spec google-drive-folder-restructure, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Integration Test Engineer with expertise in end-to-end testing and Google Drive API testing | Task: Create comprehensive integration tests covering descriptive folder creation using existing claim data, testing all requirements without database changes | Restrictions: Must test real folder creation scenarios, use proper test data setup, ensure test isolation, test with existing claim structure | _Leverage: backend/src/modules/attachments/__tests__/ existing patterns, Google Drive test utilities, existing claim test data_ | _Requirements: All requirements for integration testing using existing claim data structure_ | Success: All folder creation scenarios tested with existing data, error cases covered, backward compatibility verified, tests run reliably | Instructions: First change this task status to [-] in tasks.md, implement comprehensive integration tests, then mark as [x] when complete_

- [ ] 6. Create API tests for enhanced folder creation
  - File: api-test/src/tests/attachments/descriptive-folders.test.ts
  - Test API endpoints that trigger folder creation with descriptive names
  - Verify folder names are generated correctly using existing claim data
  - Purpose: Ensure API integration works correctly with descriptive folder creation
  - _Leverage: api-test/src/tests/existing-api-test-patterns.ts_
  - _Requirements: 4.3-4.6, 8.1-8.6_
  - _Prompt: Implement the task for spec google-drive-folder-restructure, first run spec-workflow-guide to get the workflow guide then implement the task: Role: API Test Engineer with expertise in API testing and file upload testing | Task: Create comprehensive API tests for descriptive folder creation following requirements 4.3-4.6 and 8.1-8.6, using existing claim data structure | Restrictions: Must test real API responses, ensure proper test data setup, test both success and error scenarios, maintain test isolation | _Leverage: api-test/src/tests/ existing patterns, API testing utilities, existing claim test data fixtures_ | _Requirements: 4.3-4.6 (folder creation integration), 8.1-8.6 (error handling and fallback)_ | Success: All API endpoints tested with descriptive folder creation, error scenarios covered, folder names verified, integration with existing tests maintained | Instructions: First change this task status to [-] in tasks.md, implement API tests and verify they pass, then mark as [x] when complete_

## Phase 4: Documentation and Cleanup

- [ ] 7. Update internal documentation for folder naming
  - File: backend/src/modules/attachments/README.md
  - Document the new descriptive folder naming behavior using existing claim data
  - Add examples of folder name generation without database dependencies
  - Purpose: Provide clear documentation for the enhanced folder creation
  - _Leverage: existing documentation patterns_
  - _Requirements: Documentation of new behavior_
  - _Prompt: Implement the task for spec google-drive-folder-restructure, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical Documentation Specialist with expertise in API and service documentation | Task: Update internal documentation to describe descriptive folder naming using existing claim data, providing clear examples and usage patterns | Restrictions: Must be accurate to implementation, provide clear examples, follow existing documentation patterns | _Leverage: existing documentation structure, implemented folder naming utilities_ | _Requirements: Clear documentation of folder naming behavior using existing data_ | Success: Documentation is comprehensive and accurate, examples are clear, follows existing documentation patterns | Instructions: First change this task status to [-] in tasks.md, update documentation with examples, then mark as [x] when complete_

- [ ] 8. Final integration testing and validation
  - Files: Various files as needed for validation
  - Perform comprehensive testing of descriptive folder creation using existing claim data
  - Validate that no database changes are required and existing functionality is preserved
  - Purpose: Ensure complete feature works correctly without modifying entities
  - _Leverage: All implemented components and existing testing utilities_
  - _Requirements: All requirements validation without database changes_
  - _Prompt: Implement the task for spec google-drive-folder-restructure, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Senior QA Engineer with expertise in end-to-end validation and system integration | Task: Perform comprehensive final testing of descriptive folder creation using existing claim data, ensuring no database changes are required and all requirements are met | Restrictions: Must not modify database schema, verify existing functionality is preserved, ensure performance requirements are met | _Leverage: All implemented components, existing testing frameworks, existing claim data structure_ | _Requirements: All requirements validation using existing data structure only_ | Success: Descriptive folder creation works correctly using existing data, no database changes required, existing functionality preserved, performance meets requirements | Instructions: First change this task status to [-] in tasks.md, perform comprehensive validation, then mark as [x] when feature is complete_