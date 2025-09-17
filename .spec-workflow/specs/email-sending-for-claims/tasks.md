# Tasks Document

- [ ] 1. Extend EnvironmentVariableUtil for email recipient configuration
  - File: backend/src/modules/common/utils/environment-variable.util.ts
  - Add BACKEND_EMAIL_RECIPIENT to IEnvironmentVariableList interface
  - Implement startup validation for comma-separated email format
  - Purpose: Configure email recipients via environment variables with validation
  - _Leverage: existing EnvironmentVariableUtil patterns, ConfigService getOrThrow()_
  - _Requirements: 5.1, 5.2, 5.3_
  - _Prompt: Implement the task for spec email-sending-for-claims, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer specializing in configuration management and environment variables | Task: Extend EnvironmentVariableUtil to add BACKEND_EMAIL_RECIPIENT configuration with comma-separated email parsing and validation, following requirements 5.1-5.3 from the email sending specification | Restrictions: Must use existing getOrThrow() pattern, validate email format at startup, maintain backward compatibility with existing configuration | _Leverage: existing ConfigService patterns, email validation utilities_ | _Requirements: 5.1 - environment variable reading, 5.2 - startup validation, 5.3 - email format validation_ | Success: Environment variable properly configured and validated, comma-separated emails parsed correctly, application fails to start with clear error if invalid | Instructions: Mark this task as in progress in tasks.md before starting, then mark as complete when finished_

- [ ] 2. Create EmailValidationUtil for email format validation
  - File: backend/src/modules/email/utils/email-validation.util.ts
  - Implement validateEmail(), parseRecipients(), validateRecipients() methods
  - Add proper email regex validation and error handling
  - Purpose: Provide email validation utilities for configuration and runtime use
  - _Leverage: existing util patterns from common/utils/_
  - _Requirements: 5.3, 5.6_
  - _Prompt: Implement the task for spec email-sending-for-claims, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Utility Developer with expertise in data validation and regular expressions | Task: Create EmailValidationUtil with comprehensive email validation methods following requirements 5.3 and 5.6, implementing email format validation and comma-separated parsing | Restrictions: Use robust email regex patterns, handle edge cases like spaces and empty strings, return detailed validation errors | _Leverage: existing utility patterns from backend/src/modules/common/utils/_ | _Requirements: 5.3 - email format validation, 5.6 - comma-separated email support_ | Success: All email validation methods work correctly, edge cases handled, validation errors are descriptive | Instructions: Mark this task as in progress in tasks.md before starting, then mark as complete when finished_

- [ ] 3. Create ClaimEmailRequest and ClaimEmailResponse DTOs
  - File: packages/types/src/dtos/email.dto.ts (extend existing)
  - Add IClaimEmailRequest and IClaimEmailResponse interfaces
  - Integrate with existing email DTO patterns
  - Purpose: Define type-safe contracts for claim email API endpoints
  - _Leverage: existing email DTOs in same file, shared type patterns_
  - _Requirements: 6.1, 6.3_
  - _Prompt: Implement the task for spec email-sending-for-claims, first run spec-workflow-guide to get the workflow guide then implement the task: Role: TypeScript Developer specializing in type systems and API contracts | Task: Extend existing email DTOs with claim-specific interfaces following requirements 6.1 and 6.3, maintaining consistency with existing DTO patterns | Restrictions: Must extend existing email DTO file, follow existing naming conventions, ensure type safety for frontend/backend sharing | _Leverage: existing IEmailSendRequest and IEmailSendResponse patterns_ | _Requirements: 6.1 - API endpoint validation, 6.3 - success response with messageId_ | Success: DTOs are properly typed and integrated, frontend/backend type safety maintained | Instructions: Mark this task as in progress in tasks.md before starting, then mark as complete when finished_

- [ ] 4. Implement EmailTemplate service for HTML email generation
  - File: backend/src/modules/email/services/email-template.service.ts
  - Create generateClaimEmail() and generateSubject() methods
  - Implement HTML template with XSS protection and professional styling
  - Purpose: Generate standardized HTML emails for claim submissions
  - _Leverage: ClaimEntity and AttachmentEntity for data binding_
  - _Requirements: 2.1, 2.2, 2.4, 2.5, 2.6, 2.7_
  - _Prompt: Implement the task for spec email-sending-for-claims, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Template Developer with expertise in HTML email generation and XSS prevention | Task: Create EmailTemplate service with HTML email generation following requirements 2.1-2.7, implementing structured templates with claim details and attachment links | Restrictions: Must escape all user input to prevent XSS, use responsive HTML design, handle missing optional fields gracefully | _Leverage: ClaimEntity and AttachmentEntity for data structure, existing entity patterns_ | _Requirements: 2.1 - standardized template, 2.2 - subject format, 2.4-2.7 - email content and XSS protection_ | Success: Professional HTML emails generated correctly, XSS protection verified, all claim data properly formatted | Instructions: Mark this task as in progress in tasks.md before starting, then mark as complete when finished_

- [ ] 5. Implement GmailClient service for Gmail API integration
  - File: backend/src/modules/email/services/gmail-client.service.ts
  - Create sendEmail() and parseRecipients() methods with retry logic
  - Integrate with AuthService for OAuth token management
  - Purpose: Handle Gmail API communication with proper error handling and retries
  - _Leverage: GoogleDriveClient retry patterns, AuthService token management_
  - _Requirements: 1.1, 1.6, 1.7, 4.1, 4.2, 4.4_
  - _Prompt: Implement the task for spec email-sending-for-claims, first run spec-workflow-guide to get the workflow guide then implement the task: Role: API Integration Developer with expertise in Google APIs and OAuth authentication | Task: Implement GmailClient service following requirements 1.1-1.7 and 4.1-4.4, integrating Gmail API with existing OAuth patterns and retry mechanisms | Restrictions: Must reuse AuthService token management, implement exponential backoff retry, handle all Gmail API error scenarios | _Leverage: GoogleDriveClient retry patterns from backend/src/modules/attachments/services/google-drive-client.service.ts, AuthService.getUserTokens()_ | _Requirements: 1.1 - Gmail API sending, 1.6-1.7 - token management, 4.1-4.4 - error handling_ | Success: Gmail API integration works reliably, token refresh handled automatically, comprehensive error handling implemented | Instructions: Mark this task as in progress in tasks.md before starting, then mark as complete when finished_

- [ ] 6. Create EmailService for business logic coordination
  - File: backend/src/modules/email/services/email.service.ts
  - Implement sendClaimEmail() with transaction coordination
  - Integrate GmailClient, EmailTemplate, and ClaimDBUtil
  - Purpose: Coordinate email sending workflow with proper transaction boundaries
  - _Leverage: ClaimDBUtil for claim operations, existing service patterns_
  - _Requirements: 3.1, 3.2, 3.5, 3.6_
  - _Prompt: Implement the task for spec email-sending-for-claims, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Service Layer Developer with expertise in business logic coordination and transaction management | Task: Create EmailService to coordinate email sending workflow following requirements 3.1-3.6, integrating with ClaimDBUtil for claim operations and status updates | Restrictions: Must use ClaimDBUtil for claim operations, implement atomic database transactions, handle timeout scenarios properly | _Leverage: existing service patterns from Claims and Auth modules, ClaimDBUtil for claim management_ | _Requirements: 3.1-3.2 - claim validation, 3.5-3.6 - status updates and audit trail_ | Success: Email workflow properly coordinated, transactions atomic, claim status updates work correctly | Instructions: Mark this task as in progress in tasks.md before starting, then mark as complete when finished_

- [ ] 7. Extend EmailController with claim email endpoint
  - File: backend/src/modules/email/controllers/email.controller.ts (extend existing)
  - Add POST /email/send-claim endpoint with 30-second timeout
  - Implement authentication, validation, and error handling
  - Purpose: Provide REST API endpoint for sending claim emails
  - _Leverage: existing controller patterns, JwtAuthGuard, validation decorators_
  - _Requirements: 6.1, 6.2, 6.4, 6.5, 6.6_
  - _Prompt: Implement the task for spec email-sending-for-claims, first run spec-workflow-guide to get the workflow guide then implement the task: Role: API Controller Developer with expertise in NestJS and REST endpoint design | Task: Extend EmailController with claim email endpoint following requirements 6.1-6.6, implementing proper authentication, validation, and timeout handling | Restrictions: Must extend existing EmailController, use JwtAuthGuard for authentication, implement 30-second timeout, return structured responses | _Leverage: existing controller patterns from Claims module, JwtAuthGuard, DTO validation decorators_ | _Requirements: 6.1-6.2 - authentication and validation, 6.4-6.6 - error handling and responses_ | Success: API endpoint works correctly with authentication, timeout implemented, proper error responses | Instructions: Mark this task as in progress in tasks.md before starting, then mark as complete when finished_

- [ ] 8. Update EmailModule with new services and dependencies
  - File: backend/src/modules/email/email.module.ts
  - Register EmailService, GmailClient, EmailTemplate as providers
  - Import ClaimsModule for ClaimDBUtil integration
  - Purpose: Configure dependency injection for email services
  - _Leverage: existing module patterns, NestJS DI container_
  - _Requirements: All email service requirements_
  - _Prompt: Implement the task for spec email-sending-for-claims, first run spec-workflow-guide to get the workflow guide then implement the task: Role: NestJS Module Developer with expertise in dependency injection and service registration | Task: Update EmailModule to register all new email services and configure proper dependencies, importing ClaimsModule to access ClaimDBUtil | Restrictions: Must follow existing module patterns, avoid circular dependencies, ensure proper service lifetime management | _Leverage: existing module patterns from Claims and Auth modules, NestJS dependency injection_ | _Requirements: All requirements that depend on service integration_ | Success: All services properly registered and injectable, module dependencies configured correctly | Instructions: Mark this task as in progress in tasks.md before starting, then mark as complete when finished_

- [ ] 9. Create unit tests for EmailValidationUtil
  - File: backend/src/modules/email/utils/__tests__/email-validation.util.spec.ts
  - Test email format validation, comma-separated parsing, and edge cases
  - Use existing test patterns and mocking utilities
  - Purpose: Ensure email validation utility reliability and edge case handling
  - _Leverage: existing test patterns from other util tests_
  - _Requirements: 5.3, 5.6_
  - _Prompt: Implement the task for spec email-sending-for-claims, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer with expertise in unit testing and edge case validation | Task: Create comprehensive unit tests for EmailValidationUtil covering requirements 5.3 and 5.6, testing email validation and comma-separated parsing with edge cases | Restrictions: Must test both valid and invalid inputs, cover edge cases like spaces and malformed emails, ensure test isolation | _Leverage: existing test patterns from backend/src/modules/common/utils/__tests/_ | _Requirements: 5.3 - email format validation, 5.6 - comma-separated support_ | Success: All validation methods thoroughly tested, edge cases covered, tests run reliably | Instructions: Mark this task as in progress in tasks.md before starting, then mark as complete when finished_

- [ ] 10. Create unit tests for EmailTemplate service
  - File: backend/src/modules/email/services/__tests__/email-template.service.spec.ts
  - Test HTML generation, XSS prevention, and template rendering
  - Mock ClaimEntity and AttachmentEntity data
  - Purpose: Ensure template generation reliability and security
  - _Leverage: existing service test patterns, entity mocking_
  - _Requirements: 2.1, 2.2, 2.7_
  - _Prompt: Implement the task for spec email-sending-for-claims, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer with expertise in template testing and XSS prevention validation | Task: Create unit tests for EmailTemplate service following requirements 2.1-2.2 and 2.7, testing HTML generation and XSS prevention with mocked entity data | Restrictions: Must test XSS prevention with malicious input, verify HTML structure, test with missing optional fields | _Leverage: existing service test patterns, ClaimEntity and AttachmentEntity mocking_ | _Requirements: 2.1-2.2 - template structure, 2.7 - XSS prevention_ | Success: Template generation tested thoroughly, XSS prevention verified, HTML output validated | Instructions: Mark this task as in progress in tasks.md before starting, then mark as complete when finished_

- [ ] 11. Create unit tests for GmailClient service
  - File: backend/src/modules/email/services/__tests__/gmail-client.service.spec.ts
  - Test Gmail API integration, token refresh, and error handling
  - Mock googleapis and AuthService dependencies
  - Purpose: Ensure Gmail API integration reliability and error handling
  - _Leverage: GoogleDriveClient test patterns, AuthService mocking_
  - _Requirements: 1.1, 1.6, 1.7, 4.1, 4.2_
  - _Prompt: Implement the task for spec email-sending-for-claims, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer with expertise in API integration testing and OAuth flow testing | Task: Create unit tests for GmailClient service following requirements 1.1-1.7 and 4.1-4.2, testing Gmail API integration and error scenarios with mocked dependencies | Restrictions: Must mock googleapis and AuthService, test retry mechanisms, verify error transformations | _Leverage: GoogleDriveClient test patterns from backend/src/modules/attachments/services/__tests/, AuthService mocking_ | _Requirements: 1.1 - Gmail API, 1.6-1.7 - token management, 4.1-4.2 - error handling_ | Success: Gmail API integration tested comprehensively, error scenarios covered, retry logic verified | Instructions: Mark this task as in progress in tasks.md before starting, then mark as complete when finished_

- [ ] 12. Create integration tests for EmailService
  - File: backend/src/modules/email/services/__tests__/email.service.spec.ts
  - Test transaction coordination, claim validation, and service integration
  - Mock GmailClient and ClaimDBUtil dependencies
  - Purpose: Ensure business logic coordination and transaction handling
  - _Leverage: existing service integration test patterns_
  - _Requirements: 3.1, 3.2, 3.5, 3.6_
  - _Prompt: Implement the task for spec email-sending-for-claims, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer with expertise in service integration testing and transaction validation | Task: Create integration tests for EmailService following requirements 3.1-3.6, testing transaction coordination and service integration with mocked dependencies | Restrictions: Must test transaction boundaries, verify claim validation logic, test rollback scenarios | _Leverage: existing service integration test patterns from Claims and Auth modules_ | _Requirements: 3.1-3.2 - claim validation, 3.5-3.6 - status updates and transactions_ | Success: Service coordination tested thoroughly, transaction boundaries verified, error propagation tested | Instructions: Mark this task as in progress in tasks.md before starting, then mark as complete when finished_

- [ ] 13. Create API endpoint tests for EmailController
  - File: api-test/src/tests/email-endpoints.spec.ts
  - Test POST /email/send-claim endpoint with authentication and validation
  - Test timeout handling and error responses
  - Purpose: Ensure API endpoint reliability and proper HTTP behavior
  - _Leverage: existing API test patterns from auth-endpoints.spec.ts_
  - _Requirements: 6.1, 6.2, 6.4, 6.5_
  - _Prompt: Implement the task for spec email-sending-for-claims, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Automation Engineer with expertise in API endpoint testing and HTTP protocol validation | Task: Create API endpoint tests for EmailController following requirements 6.1-6.5, testing authentication, validation, and error scenarios | Restrictions: Must test real HTTP requests, verify authentication requirements, test timeout behavior | _Leverage: existing API test patterns from api-test/src/tests/auth-endpoints.spec.ts_ | _Requirements: 6.1-6.2 - authentication and validation, 6.4-6.5 - timeout and error handling_ | Success: API endpoint tested comprehensively, authentication verified, error responses validated | Instructions: Mark this task as in progress in tasks.md before starting, then mark as complete when finished_

- [ ] 14. Create end-to-end email workflow test
  - File: api-test/src/tests/email-workflow.spec.ts
  - Test complete workflow: create claim → upload files → send email
  - Verify claim status transitions and email sending
  - Purpose: Validate complete email sending workflow integration
  - _Leverage: existing workflow test patterns, test database setup_
  - _Requirements: All requirements integrated_
  - _Prompt: Implement the task for spec email-sending-for-claims, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Automation Engineer with expertise in end-to-end workflow testing and system integration | Task: Create comprehensive end-to-end test for email workflow covering all requirements, testing complete claim submission to email sending flow | Restrictions: Must test real workflow integration, verify database state changes, test with real service dependencies | _Leverage: existing workflow test patterns from Claims module integration tests_ | _Requirements: All requirements for complete workflow validation_ | Success: Complete workflow tested and validated, integration points verified, state transitions confirmed | Instructions: Mark this task as in progress in tasks.md before starting, then mark as complete when finished_

- [ ] 15. Add Gmail scope validation to GmailClient
  - File: backend/src/modules/email/services/gmail-client.service.ts (extend task 5)
  - Validate Gmail send scope in OAuth tokens before sending emails
  - Add scope checking method and proper error handling
  - Purpose: Ensure users have proper Gmail permissions before attempting to send
  - _Leverage: AuthService token scope validation patterns_
  - _Requirements: 1.6, 1.7_
  - _Prompt: Implement the task for spec email-sending-for-claims, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Security Developer with expertise in OAuth scope validation and API permissions | Task: Add Gmail scope validation to GmailClient following requirements 1.6-1.7, ensuring users have gmail.send permission before attempting email operations | Restrictions: Must validate scopes before any Gmail API calls, return clear permission errors, integrate with existing token management | _Leverage: AuthService token management and scope validation patterns_ | _Requirements: 1.6-1.7 - token management and scope validation_ | Success: Gmail scope validation implemented, clear permission errors, prevents unauthorized API calls | Instructions: Mark this task as in progress in tasks.md before starting, then mark as complete when finished_

- [ ] 16. Create useEmailSending hook for frontend integration
  - File: frontend/src/hooks/email/useEmailSending.ts
  - Implement email sending hook with loading states and error handling
  - Integrate with existing API client patterns and error handling
  - Purpose: Provide React hook for triggering claim email sending from UI
  - _Leverage: existing API hooks patterns, error handling utilities_
  - _Requirements: 6.1, 6.2, 6.7_
  - _Prompt: Implement the task for spec email-sending-for-claims, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with expertise in React hooks and API integration | Task: Create useEmailSending hook following requirements 6.1-6.2 and 6.7, integrating with claim email endpoint and providing proper loading/error states | Restrictions: Must follow existing API hook patterns, handle authentication errors, provide proper TypeScript types | _Leverage: existing API hooks from frontend/src/hooks/, error handling patterns_ | _Requirements: 6.1-6.2 - API integration, 6.7 - structured error responses_ | Success: Hook provides clean email sending interface, proper error handling, loading states work correctly | Instructions: Mark this task as in progress in tasks.md before starting, then mark as complete when finished_

- [ ] 17. Integrate email sending into Review & Submit workflow
  - File: frontend/src/components/claims/review/ClaimReviewComponent.tsx (or similar)
  - Add email sending trigger to existing "Review & Submit" button
  - Implement success/error notifications and status updates
  - Purpose: Complete the UI workflow by adding email sending to claim submission
  - _Leverage: existing Review & Submit component, notification system_
  - _Requirements: 3.1, 3.2, 6.6_
  - _Prompt: Implement the task for spec email-sending-for-claims, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with expertise in React components and user workflow integration | Task: Integrate email sending into existing Review & Submit workflow following requirements 3.1-3.2 and 6.6, adding email trigger and status updates | Restrictions: Must extend existing Review & Submit component, maintain current UI/UX patterns, handle email success/failure states | _Leverage: existing claim submission workflow, useEmailSending hook, notification components_ | _Requirements: 3.1-3.2 - claim validation and status updates, 6.6 - success response with claim object_ | Success: Email sending integrated seamlessly into existing workflow, proper user feedback provided | Instructions: Mark this task as in progress in tasks.md before starting, then mark as complete when finished_

- [ ] 18. Create email sending notification components
  - File: frontend/src/components/email/EmailStatusNotification.tsx
  - Implement success and error notification components for email sending
  - Add proper accessibility and responsive design
  - Purpose: Provide clear user feedback for email sending operations
  - _Leverage: existing notification component patterns, design system_
  - _Requirements: 4.1, 4.2, 4.3_
  - _Prompt: Implement the task for spec email-sending-for-claims, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with expertise in notification systems and accessibility | Task: Create email status notification components following requirements 4.1-4.3, providing clear user feedback for email operations | Restrictions: Must follow existing notification patterns, ensure accessibility compliance, handle all error scenarios | _Leverage: existing notification components, design system patterns_ | _Requirements: 4.1-4.3 - error handling and user feedback_ | Success: Notifications are accessible and responsive, clear feedback for all scenarios, consistent with design system | Instructions: Mark this task as in progress in tasks.md before starting, then mark as complete when finished_

- [ ] 19. Update environment variable documentation and examples
  - File: .env.template and docs/project-info/development-commands.md
  - Add BACKEND_EMAIL_RECIPIENT configuration documentation
  - Provide examples for single and multiple recipients
  - Purpose: Document new environment variable for deployment and development
  - _Leverage: existing environment documentation patterns_
  - _Requirements: 5.1, 5.6_
  - _Prompt: Implement the task for spec email-sending-for-claims, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical Writer with expertise in configuration documentation and deployment guides | Task: Update environment variable documentation following requirements 5.1 and 5.6, documenting BACKEND_EMAIL_RECIPIENT configuration with examples | Restrictions: Must follow existing documentation patterns, provide clear examples, include validation requirements | _Leverage: existing environment documentation in .env.template and docs/_ | _Requirements: 5.1 - environment variable configuration, 5.6 - multiple recipient support_ | Success: Configuration properly documented, examples provided, deployment instructions clear | Instructions: Mark this task as in progress in tasks.md before starting, then mark as complete when finished_