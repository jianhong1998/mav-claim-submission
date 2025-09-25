# Tasks Document

## Backend Implementation

### Backend Core - Status Transition Logic

- [x] 1. Enhance status transition validation in ClaimsController
  - **File**: `backend/src/modules/claims/claims.controller.ts`
  - **Method**: Modify `validateStatusTransition()` method (lines 945-966)
  - **Change**: Add `ClaimStatus.PAID → ClaimStatus.SENT` transition to `validTransitions[ClaimStatus.PAID]` array
  - **Purpose**: Enable employees to revert paid claims back to sent status for workflow corrections
  - **_Leverage**: Existing validation logic in `validateStatusTransition()` method
  - **_Requirements**: Requirement 3 - Mark Claim as Sent
  - **_Prompt**: Implement the task for spec claim-status-management, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer specializing in NestJS and business logic validation | Task: Enhance the validateStatusTransition method in backend/src/modules/claims/claims.controller.ts to allow paid → sent status transitions, modifying the validTransitions array on line 957 to include ClaimStatus.SENT in the ClaimStatus.PAID array | Restrictions: Do not modify existing transition rules, maintain existing error handling patterns, preserve method signature and return types | Leverage: Existing validateStatusTransition method implementation and ClaimStatus enum | Requirements: Requirement 3 - employees can mark paid claims as sent | Success: validateStatusTransition allows paid → sent transitions, existing validations remain intact, no breaking changes to API behavior

- [x] 2. Add email resend endpoint in ClaimsController
  - **File**: `backend/src/modules/claims/claims.controller.ts`
  - **Method**: Create new `resendClaimEmail()` method after `updateClaimStatus()` method (around line 901)
  - **Endpoint**: `POST /claims/:id/resend`
  - **Purpose**: Allow employees to resend claim emails for failed or sent claims
  - **_Leverage**: Existing controller patterns, EmailService.sendClaimEmail(), error handling methods
  - **_Requirements**: Requirement 2 - Resend Claim Email
  - **_Prompt**: Implement the task for spec claim-status-management, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer with expertise in NestJS controllers and API design | Task: Add resendClaimEmail method to ClaimsController following existing patterns, implementing POST /claims/:id/resend endpoint with proper Swagger documentation, status validation (sent/failed only), and EmailService integration | Restrictions: Follow existing controller method patterns exactly, use existing error handling methods, maintain consistent API response format with ClaimResponseDto | Leverage: Existing updateClaimStatus method structure, EmailService, validateStatusTransition patterns, and Swagger documentation format | Requirements: Requirement 2 - employees can resend emails for sent/failed claims | Success: New endpoint accepts POST requests, validates claim ownership and status, calls EmailService.sendClaimEmail(), returns proper ClaimResponseDto, includes complete Swagger documentation

### Backend Testing - Controller Method Tests

- [ ] 3. Add unit tests for enhanced status transition validation
  - **File**: `backend/src/modules/claims/claims.controller.spec.ts` (create if doesn't exist)
  - **Test Cases**: Add tests for `paid → sent` transition validation in existing validateStatusTransition test suite
  - **Purpose**: Ensure new status transition validation works correctly and doesn't break existing logic
  - **_Leverage**: Existing testing patterns from `claim-db.util.spec.ts`, Vitest framework, mocking patterns
  - **_Requirements**: Requirement 3 - Mark Claim as Sent
  - **_Prompt**: Implement the task for spec claim-status-management, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer with expertise in backend unit testing and Vitest framework | Task: Create or enhance ClaimsController unit tests to cover the new paid → sent status transition validation, following existing test patterns from claim-db.util.spec.ts using Vitest describe/it/expect structure | Restrictions: Use Vitest testing framework only, follow existing mock patterns with vi.fn(), test both success and failure scenarios, maintain test isolation | Leverage: Existing test structure from claim-db.util.spec.ts, Vitest mocking with vi.fn(), existing test data patterns | Requirements: Requirement 3 - validateStatusTransition must allow paid → sent transitions | Success: Tests verify paid → sent transition is allowed, existing transition rules still work, invalid transitions properly rejected, tests run independently and pass consistently

- [ ] 4. Add unit tests for resend email endpoint
  - **File**: `backend/src/modules/claims/claims.controller.spec.ts`
  - **Test Cases**: Test successful resend, ownership validation, status validation (sent/failed only), email service failures
  - **Purpose**: Comprehensive testing of email resend functionality with proper mocking
  - **_Leverage**: Existing controller testing patterns, Vitest mocking, EmailService mocking
  - **_Requirements**: Requirement 2 - Resend Claim Email
  - **_Prompt**: Implement the task for spec claim-status-management, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer specializing in API testing and service mocking | Task: Create comprehensive unit tests for the resendClaimEmail controller method, covering successful resend, ownership validation, status restrictions, and EmailService failure scenarios using Vitest framework and proper mocking | Restrictions: Mock all external dependencies including EmailService, test only controller logic not service implementation, use vi.fn() for mocking, maintain test isolation | Leverage: Existing controller test patterns, Vitest testing framework, EmailService interface for mocking | Requirements: Requirement 2 - resend functionality must validate ownership, status, and handle failures | Success: All resend scenarios tested with proper mocking, error conditions covered, success paths verified, tests are reliable and maintainable

## Frontend Implementation

### Frontend UI - Status Management Buttons

- [ ] 5. Create ClaimStatusButtons component
  - **File**: `frontend/src/components/claims/ClaimStatusButtons.tsx`
  - **Component**: Create reusable component with three buttons: "Mark as Paid", "Resend Email", "Mark as Sent"
  - **Props**: `{ claimId: string, currentStatus: ClaimStatus, onStatusChange: () => void }`
  - **Purpose**: Provide button-based interface for claim status management operations
  - **_Leverage**: Existing Button component from `@/components/ui/button`, React Query for API calls
  - **_Requirements**: All three requirements - button interfaces for status management operations
  - **_Prompt**: Implement the task for spec claim-status-management, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer specializing in React components and UI interactions | Task: Create ClaimStatusButtons component using existing Button component patterns, implementing conditional button visibility based on claim status with proper loading states and error handling | Restrictions: Use existing Button component and variants only, follow existing component patterns from ClaimsListComponent, implement proper TypeScript typing with @project/types | Leverage: Button component from @/components/ui/button, ClaimStatus from @project/types, existing component patterns | Requirements: All requirements - buttons for mark paid, resend email, mark sent with proper visibility logic | Success: Component renders appropriate buttons based on status, handles loading and error states, integrates with existing design system, fully typed with TypeScript

- [ ] 6. Add API client methods for status management
  - **File**: `frontend/src/lib/api-client.ts`
  - **Methods**: Add `resendClaimEmail(claimId: string)` and enhance existing status update method
  - **Purpose**: Provide typed API client functions for new status management operations
  - **_Leverage**: Existing apiClient patterns and structure, @project/types for response types
  - **_Requirements**: Requirement 2 - Resend Email, Requirements 1&3 - Status Updates
  - **_Prompt**: Implement the task for spec claim-status-management, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with expertise in API client integration and TypeScript | Task: Add resendClaimEmail method to api-client.ts following existing patterns, ensuring proper type safety with @project/types and consistent error handling with existing API methods | Restrictions: Follow exact patterns from existing apiClient methods, use proper TypeScript types from @project/types, maintain consistent error handling approach | Leverage: Existing apiClient structure and methods, IClaimEmailResponse type, fetch patterns | Requirements: Requirement 2 - API method for email resend, proper integration with status update methods | Success: New API methods follow existing patterns, proper TypeScript typing, consistent error handling, integrates seamlessly with existing API client

### Frontend Integration - Claims List Enhancement

- [ ] 7. Integrate ClaimStatusButtons into ClaimsListComponent
  - **File**: `frontend/src/components/claims/ClaimsListComponent.tsx`
  - **Integration**: Add ClaimStatusButtons to each claim card, handle status change callbacks to refresh data
  - **Purpose**: Provide status management functionality within existing claims list interface
  - **_Leverage**: Existing React Query invalidation patterns, Card component structure
  - **_Requirements**: All requirements - integrate status management into claim list UI
  - **_Prompt**: Implement the task for spec claim-status-management, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer specializing in React integration and state management | Task: Integrate ClaimStatusButtons into ClaimsListComponent following existing patterns, adding proper React Query cache invalidation on status changes and maintaining existing card layout structure | Restrictions: Maintain existing ClaimsListComponent structure and styling, use existing React Query patterns for data refresh, do not break existing functionality | Leverage: Existing React Query useQuery setup, Card component layout, existing claim data structure | Requirements: All requirements - status management buttons integrated into claims list with proper data refresh | Success: Status buttons appear in claim cards, status changes trigger data refresh, existing list functionality unchanged, UI remains consistent with design system

### Frontend Testing - Component Tests

- [ ] 8. Create unit tests for ClaimStatusButtons component
  - **File**: `frontend/src/components/claims/__tests__/ClaimStatusButtons.test.tsx`
  - **Test Cases**: Button visibility based on status, loading states, error handling, API call integration
  - **Purpose**: Ensure component behaves correctly with different claim statuses and API states
  - **_Leverage**: Existing component test patterns from other `__tests__/` files, React Testing Library
  - **_Requirements**: All requirements - comprehensive testing of status button component
  - **_Prompt**: Implement the task for spec claim-status-management, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend QA Engineer with expertise in React component testing and React Testing Library | Task: Create comprehensive unit tests for ClaimStatusButtons component covering button visibility logic, loading states, error handling, and API integration using patterns from existing component tests | Restrictions: Use React Testing Library and Jest, follow existing test file patterns, mock API calls properly, test component behavior not implementation details | Leverage: Existing test patterns from ClaimsListComponent.test.tsx and other component tests, React Testing Library utilities | Requirements: All requirements - test button visibility, interactions, and state management | Success: All button visibility scenarios tested, loading and error states covered, API interactions mocked and verified, tests are maintainable and reliable

## Integration & API Documentation

### API Documentation Updates

- [x] 9. Update Swagger documentation for enhanced status endpoint
  - **File**: `backend/src/modules/claims/claims.controller.ts`
  - **Update**: Enhance existing `updateClaimStatus()` Swagger documentation to include new paid ↔ sent transitions
  - **Purpose**: Document the expanded status transition capabilities for API consumers
  - **_Leverage**: Existing Swagger decorator patterns, ApiBody examples
  - **_Requirements**: Requirements 1&3 - Mark as Paid/Sent operations
  - **_Prompt**: Implement the task for spec claim-status-management, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical Writer with expertise in API documentation and Swagger/OpenAPI | Task: Update Swagger documentation for updateClaimStatus method to include new paid ↔ sent transition examples, following existing documentation patterns and adding relevant ApiBody examples | Restrictions: Follow existing Swagger documentation style exactly, do not modify existing examples, only add new transition examples | Leverage: Existing ApiBody examples and Swagger decorator patterns in claims.controller.ts | Requirements: Requirements 1&3 - document new status transitions for mark paid/sent operations | Success: Swagger docs include new transition examples, documentation is clear and consistent, existing documentation unchanged, API examples are accurate and helpful

### End-to-End Testing

- [ ] 10. Create E2E tests for complete status management workflow
  - **File**: `api-test/src/tests/claim-status-management.test.ts`
  - **Workflow Tests**: Complete user journeys: create claim → mark paid → mark sent → resend email
  - **Purpose**: Validate entire status management feature works end-to-end with real API calls
  - **_Leverage**: Existing API test patterns from `api-test/src/tests/`, test fixtures and utilities
  - **_Requirements**: All requirements - comprehensive E2E validation of status management feature
  - **_Prompt**: Implement the task for spec claim-status-management, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Automation Engineer with expertise in API integration testing and end-to-end workflows | Task: Create comprehensive E2E tests covering complete claim status management workflows using existing API test patterns, validating real API interactions and database state changes | Restrictions: Use existing API test framework and patterns, test against real backend services, ensure tests clean up after themselves, maintain test isolation | Leverage: Existing API test structure and utilities, test fixtures, authentication patterns | Requirements: All requirements - test complete workflows including status changes and email resend | Success: E2E tests validate complete user workflows, API integrations work correctly, tests are reliable and maintainable, proper cleanup and isolation maintained