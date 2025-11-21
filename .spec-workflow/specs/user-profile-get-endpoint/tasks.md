# Tasks Document

## Backend Implementation

- [ ] 1. Add getUserProfile() method to UserService
  - File: backend/src/modules/user/services/user.service.ts
  - Add getUserProfile(userId: string) method that queries user with emailPreferences relation
  - Throws NotFoundException if user not found
  - Returns UserEntity with loaded emailPreferences
  - Purpose: Provide business logic for retrieving user profile data
  - _Leverage: backend/src/modules/user/utils/user-db.util.ts (getOne method with relation parameter), backend/src/modules/user/services/user.service.ts:56-64 (error handling pattern from updateUser)_
  - _Requirements: Requirement 1 (Retrieve User Profile Data), Requirement 2 (Email Preferences Data Structure)_
  - _Prompt: Implement the task for spec user-profile-get-endpoint, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: Backend Developer specializing in NestJS service layer and TypeORM | Task: Add getUserProfile(userId: string) method to UserService (backend/src/modules/user/services/user.service.ts) following Requirements 1 and 2. Method should query user with emailPreferences relation using UserDBUtil.getOne(), throw NotFoundException if user not found, and return UserEntity. Leverage existing pattern from updateUser method (lines 56-64) for error handling and database query structure. | Restrictions: Do not modify UserDBUtil, do not add new dependencies, do not change UserEntity structure, follow existing logging pattern (use this.logger), follow existing error handling pattern (throw NotFoundException with descriptive message) | _Leverage: UserDBUtil.getOne() with relation parameter from user-db.util.ts, error handling pattern from updateUser() method in same file | _Requirements: Requirements 1, 2 from requirements.md | Success: Method compiles without errors, correctly queries user with emailPreferences relation in single query, throws NotFoundException when user not found, returns UserEntity with loaded emailPreferences array, follows existing service patterns and logging conventions | Instructions: After implementation, mark this task as in-progress in tasks.md by changing [ ] to [-]. After completion and testing, use log-implementation tool to record implementation details with artifacts (functions, integrations), then mark as complete [x]._

- [ ] 2. Add GET endpoint to UserController
  - File: backend/src/modules/user/controllers/user.controller.ts
  - Add @Get(':userId') endpoint with getUser() method
  - Apply authorization check (currentUser.id !== userId → 403)
  - Call UserService.getUserProfile()
  - Return UserEntity with emailPreferences
  - Purpose: Expose HTTP GET endpoint for user profile retrieval
  - _Leverage: backend/src/modules/user/controllers/user.controller.ts:69-214 (PATCH endpoint pattern for authorization, Swagger decorators, logging, error responses), backend/src/modules/user/services/user.service.ts (getUserProfile method from task 1)_
  - _Requirements: Requirement 1 (Retrieve User Profile Data), Requirement 3 (Authorization and Security), Requirement 4 (API Response Format)_
  - _Prompt: Implement the task for spec user-profile-get-endpoint, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: NestJS Controller Developer with expertise in REST API design and Swagger documentation | Task: Add GET /:userId endpoint to UserController (backend/src/modules/user/controllers/user.controller.ts) following Requirements 1, 3, and 4. Endpoint should apply same authorization check as PATCH endpoint (lines 201-206), call UserService.getUserProfile(), and return UserEntity. Add comprehensive Swagger decorators matching PATCH endpoint pattern (lines 70-190) with GET-specific descriptions. JwtAuthGuard is inherited from class-level decorator (line 46) - do NOT add method-level guard. | Restrictions: Do not add @UseGuards decorator on method (inherited from class), do not modify authorization pattern, do not create new DTO (return UserEntity directly), follow exact Swagger annotation pattern from PATCH endpoint, do not modify UserService | _Leverage: Authorization pattern from PATCH endpoint (lines 201-206), Swagger decorator pattern from PATCH endpoint (lines 70-190), Logger pattern from PATCH endpoint, UserService.getUserProfile() method | _Requirements: Requirements 1, 3, 4 from requirements.md | Success: Endpoint compiles and responds correctly, authorization check prevents access to other users' profiles (403), returns 404 when user not found, returns 200 with user profile and emailPreferences on success, Swagger documentation complete and accurate, follows existing controller patterns | Instructions: After implementation, mark this task as in-progress in tasks.md by changing [ ] to [-]. After completion and testing, use log-implementation tool to record implementation details with artifacts (apiEndpoints, integrations), then mark as complete [x]._

## Backend Unit Tests

- [ ] 3. Write unit tests for UserService.getUserProfile()
  - File: backend/src/modules/user/services/user.service.test.ts (modify existing or create new)
  - Test getUserProfile() returns user with emailPreferences when user exists
  - Test getUserProfile() throws NotFoundException when user not found
  - Mock UserDBUtil.getOne() to return test data or null
  - Purpose: Ensure service method reliability and error handling
  - _Leverage: Existing test patterns in backend/src/modules/**/*.test.ts files, Vitest mocking utilities, UserEntity fixture data_
  - _Requirements: Requirement 1 (Retrieve User Profile Data), Requirement 2 (Email Preferences Data Structure)_
  - _Prompt: Implement the task for spec user-profile-get-endpoint, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: QA Engineer with expertise in NestJS testing and Vitest | Task: Write comprehensive unit tests for UserService.getUserProfile() method in backend/src/modules/user/services/user.service.test.ts covering Requirements 1 and 2. Test success case (returns user with emailPreferences) and error case (throws NotFoundException when user not found). Mock UserDBUtil.getOne() to control test scenarios. Follow existing test patterns in backend test files. | Restrictions: Must mock all dependencies (UserDBUtil, Logger), do not call real database, test business logic in isolation, follow existing test file structure and naming conventions, use Vitest mocking utilities | _Leverage: Existing test patterns from backend test files, Vitest mocking for UserDBUtil and Logger | _Requirements: Requirements 1, 2 from requirements.md | Success: All test cases pass, success scenario returns user with emailPreferences, error scenario throws NotFoundException with correct message, mocks are properly configured, tests run independently and consistently | Instructions: After implementation, mark this task as in-progress in tasks.md by changing [ ] to [-]. After completion, use log-implementation tool to record implementation details with artifacts, then mark as complete [x]._

- [ ] 4. Write unit tests for UserController.getUser()
  - File: backend/src/modules/user/controllers/user.controller.test.ts (modify existing or create new)
  - Test getUser() returns 200 when user requests own profile
  - Test getUser() throws 403 when user requests other user's profile
  - Test getUser() throws 404 when UserService throws NotFoundException
  - Mock UserService.getUserProfile()
  - Purpose: Ensure controller authorization and error handling
  - _Leverage: Existing controller test patterns in backend/src/modules/**/*.controller.test.ts, Vitest mocking utilities_
  - _Requirements: Requirement 1 (Retrieve User Profile Data), Requirement 3 (Authorization and Security)_
  - _Prompt: Implement the task for spec user-profile-get-endpoint, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: QA Engineer with expertise in NestJS controller testing and authorization | Task: Write comprehensive unit tests for UserController.getUser() endpoint in backend/src/modules/user/controllers/user.controller.test.ts covering Requirements 1 and 3. Test authorization (own profile returns 200, other user's profile throws 403), error handling (user not found throws 404). Mock UserService.getUserProfile() to control test scenarios. Follow existing controller test patterns. | Restrictions: Must mock UserService, do not call real service layer, test HTTP layer concerns only (authorization, response mapping, error handling), follow existing test patterns and naming conventions | _Leverage: Existing controller test patterns from backend test files, Vitest mocking for UserService and Logger | _Requirements: Requirements 1, 3 from requirements.md | Success: All test cases pass, authorization tests verify userId comparison logic, error handling tests verify proper exception propagation, mocks are properly configured, follows existing test patterns | Instructions: After implementation, mark this task as in-progress in tasks.md by changing [ ] to [-]. After completion, use log-implementation tool to record implementation details with artifacts, then mark as complete [x]._

## API Integration Tests

- [ ] 5. Write API integration tests for GET /api/users/:userId
  - File: api-test/src/tests/user.test.ts (create new file)
  - Test GET request with valid JWT returns 200 with user profile
  - Test GET request for other user returns 403 Forbidden
  - Test GET request for non-existent user returns 404 Not Found
  - Test GET request without authentication returns 401 Unauthorized
  - Use internal test data endpoints for setup/cleanup
  - Purpose: Verify end-to-end GET endpoint functionality with real HTTP requests
  - _Leverage: api-test/src/tests/auth.test.ts (existing API test patterns, test data setup/cleanup), internal test data endpoints (POST /internal/test-data, DELETE /internal/test-data), @project/types TEST_USER_DATA constant_
  - _Requirements: All requirements (end-to-end validation of Requirements 1, 2, 3, 4)_
  - _Prompt: Implement the task for spec user-profile-get-endpoint, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: QA Engineer with expertise in API integration testing and HTTP testing frameworks | Task: Create comprehensive API integration tests for GET /api/users/:userId endpoint in new file api-test/src/tests/user.test.ts covering all requirements. Write 4 test cases: (1) success case with valid JWT returns 200 with user profile and emailPreferences, (2) forbidden case accessing other user returns 403, (3) not found case with invalid userId returns 404, (4) unauthorized case without JWT returns 401. Use internal test data endpoints (POST /internal/test-data for setup, DELETE /internal/test-data for cleanup). Follow existing patterns from api-test/src/tests/auth.test.ts for test structure, HTTP client usage, and assertion style. | Restrictions: Must use internal test data endpoints (no direct database access), must cleanup test data after each test, do not mock HTTP layer (real requests), follow existing API test patterns and naming conventions, use Vitest test framework | _Leverage: Existing API test patterns from api-test/src/tests/auth.test.ts, internal test data endpoints for setup/cleanup, @project/types TEST_USER_DATA constant | _Requirements: All requirements from requirements.md (end-to-end validation) | Success: All 4 test cases pass, tests use real HTTP requests to backend server, proper test data setup and cleanup, response assertions verify status codes and response structure (user profile with emailPreferences array), follows existing API test patterns, tests run independently and reliably | Instructions: After implementation, mark this task as in-progress in tasks.md by changing [ ] to [-]. After completion, use log-implementation tool to record implementation details with artifacts (integrations: test setup → API endpoint → assertions), then mark as complete [x]._

## Frontend Integration

- [ ] 6. Update profile page to fetch and display user data
  - File: frontend/src/app/profile/page.tsx
  - Add API call to GET /api/users/:userId on page load
  - Display username in form (pre-populate input field)
  - Display existing email preferences (pre-populate CC/BCC fields)
  - Show loading state while fetching data
  - Handle error states (404, 403, 401, 500)
  - Purpose: Complete user profile viewing functionality on frontend
  - _Leverage: Existing API client patterns in frontend/src/lib/api/, React hooks for data fetching, existing profile form components_
  - _Requirements: Requirement 1 (Retrieve User Profile Data), Requirement 2 (Email Preferences Data Structure), Requirement 4 (API Response Format)_
  - _Prompt: Implement the task for spec user-profile-get-endpoint, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: Frontend Developer with expertise in Next.js, React hooks, and API integration | Task: Update profile page (frontend/src/app/profile/page.tsx) to fetch user data via GET /api/users/:userId and display in form following Requirements 1, 2, and 4. Add data fetching on component mount, pre-populate username input and email preferences (CC/BCC) with fetched data, implement loading state, handle error states with appropriate user messages. Follow existing API client patterns from frontend/src/lib/api/ and React hooks best practices. | Restrictions: Do not modify API endpoint, do not create new components (update existing profile page), follow existing form structure and styling, use existing API client utilities, handle all error states gracefully (401 → redirect to login, 403 → show error, 404 → show error, 500 → show retry option) | _Leverage: Existing API client patterns from frontend/src/lib/api/, existing profile form components and structure, React hooks (useState, useEffect) for data fetching and state management | _Requirements: Requirements 1, 2, 4 from requirements.md | Success: Profile page loads user data on mount, username and email preferences are pre-populated in form, loading spinner shows during fetch, error states display appropriate messages, user can see current settings before making changes, follows existing frontend patterns and styling | Instructions: After implementation, mark this task as in-progress in tasks.md by changing [ ] to [-]. After completion, use log-implementation tool to record implementation details with artifacts (components: profile page, integrations: component mount → API call → state update → form render), then mark as complete [x]._
