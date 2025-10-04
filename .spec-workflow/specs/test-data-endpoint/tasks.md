# Tasks Document

## Phase 1: Shared Types

- [x] 1.1 Create shared test user constant
  - Files:
    - `packages/types/src/test-data/test-user.ts` (create)
    - `packages/types/src/index.ts` (modify - add barrel export)
  - Define `TEST_USER_DATA` constant with freeze pattern
  - Export type from constant
  - Purpose: Single source of truth for test user data shared between backend and api-test
  - _Leverage: None (new constant)_
  - _Requirements: Requirement 5 (Request/Response Contract)_
  - _Prompt: Implement the task for spec test-data-endpoint, first run spec-workflow-guide to get the workflow guide then implement the task: Role: TypeScript Developer | Task: Create TEST_USER_DATA constant in packages/types/src/test-data/test-user.ts using Object.freeze() pattern with test user data (id: '00000000-0000-0000-0000-000000000001', email: 'test@mavericks-consulting.com', name: 'Test User', googleId: 'test-google-id-12345'), export type from constant, add barrel export to packages/types/src/index.ts | Restrictions: Use Object.freeze() with 'as const' (not TypeScript enum), follow existing enum pattern from ClaimCategory/ClaimStatus, do not modify existing exports | Success: Constant is properly typed and frozen, type can be imported from @project/types, follows project TypeScript standards | Instructions: After completing implementation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [x] 1.2 Update API test to use shared constant
  - Files:
    - `api-test/src/utils/test-auth.util.ts` (modify)
  - Replace local TEST_USER with import from @project/types
  - Update usages to reference TEST_USER_DATA
  - Purpose: Ensure api-test uses same constant as backend
  - _Leverage: packages/types/src/test-data/test-user.ts (from task 1.1)_
  - _Requirements: Requirement 4 (Remove Direct Database Access from Tests)_
  - _Prompt: Implement the task for spec test-data-endpoint, first run spec-workflow-guide to get the workflow guide then implement the task: Role: TypeScript Developer | Task: Update api-test/src/utils/test-auth.util.ts to import TEST_USER_DATA from @project/types instead of local constant definition, update all references to use imported constant | Restrictions: Do not change generateTestJWT() or getAuthHeaders() functions, only replace constant definition with import, maintain backward compatibility | Success: TEST_USER constant is imported from @project/types, all usages work correctly, no breaking changes to test utilities | Instructions: After completing implementation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

## Phase 2: Backend Implementation

- [x] 2.1 Create ApiTestModeGuard
  - Files:
    - `backend/src/modules/internal/guards/api-test-mode.guard.ts` (create)
  - Implement CanActivate interface
  - Check ENABLE_API_TEST_MODE environment variable
  - Throw NotFoundException if disabled
  - Purpose: Gate access to internal test endpoints via feature flag
  - _Leverage: @nestjs/common CanActivate, NotFoundException_
  - _Requirements: Requirement 1 (Feature Flag Control)_
  - _Prompt: Implement the task for spec test-data-endpoint, first run spec-workflow-guide to get the workflow guide then implement the task: Role: NestJS Backend Developer | Task: Create ApiTestModeGuard in backend/src/modules/internal/guards/api-test-mode.guard.ts implementing CanActivate interface, check process.env.ENABLE_API_TEST_MODE === 'true', throw NotFoundException if false/undefined | Restrictions: Do not use ConfigService (read env directly), throw NotFoundException (not ForbiddenException), keep implementation under 10 lines, no logging in guard | Success: Guard blocks requests when ENABLE_API_TEST_MODE is not 'true', throws 404 (not 403), compiles without errors | Instructions: After completing implementation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 2.2 Create response DTOs
  - Files:
    - `backend/src/modules/internal/dtos/test-data-response.dto.ts` (create)
    - `backend/src/modules/internal/dtos/test-data-delete-response.dto.ts` (create)
    - `backend/src/modules/internal/dtos/index.ts` (create - barrel export)
  - Implement TestDataResponseDTO with nested user object
  - Implement TestDataDeleteResponseDTO with deleted flag and message
  - Purpose: Type-safe response contracts for both endpoints
  - _Leverage: UserEntity type from backend/src/modules/user/entities/user.entity.ts_
  - _Requirements: Requirement 5 (Request/Response Contract), Requirement 3 (Test Data Cleanup Endpoint)_
  - _Prompt: Implement the task for spec test-data-endpoint, first run spec-workflow-guide to get the workflow guide then implement the task: Role: NestJS Backend Developer | Task: Create TestDataResponseDTO with structure { user: { id, email, name, googleId } } accepting UserEntity in constructor, create TestDataDeleteResponseDTO with structure { deleted: boolean, message: string }, add barrel export index.ts | Restrictions: DTOs should only extract required fields from UserEntity (id, email, name, googleId), no validation decorators needed (internal endpoints), follow existing DTO constructor pattern from health-check.dto.ts | Success: Both DTOs compile correctly, TestDataResponseDTO properly maps UserEntity fields, responses match requirement specification | Instructions: After completing implementation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 2.3 Implement InternalController with both endpoints
  - Files:
    - `backend/src/modules/internal/controllers/internal.controller.ts` (create)
  - Implement POST /internal/test-data with idempotent create logic
  - Implement DELETE /internal/test-data with CASCADE delete
  - Add error handling for duplicate user (catch code 23505)
  - Purpose: HTTP layer for test data lifecycle management
  - _Leverage: UserDBUtil from backend/src/modules/user/utils/user-db.util.ts, TEST_USER_DATA from @project/types, ApiTestModeGuard from task 2.1, DTOs from task 2.2_
  - _Requirements: Requirement 2 (Test User Creation Endpoint), Requirement 3 (Test Data Cleanup Endpoint)_
  - _Prompt: Implement the task for spec test-data-endpoint, first run spec-workflow-guide to get the workflow guide then implement the task: Role: NestJS Backend Developer | Task: Create InternalController with POST /internal/test-data endpoint that tries userDBUtil.create(TEST_USER_DATA), catches duplicate error (code 23505) and queries existing user, returns TestDataResponseDTO; implement DELETE /internal/test-data that finds user by TEST_USER_DATA.id, calls userDBUtil.remove() if found, returns TestDataDeleteResponseDTO; apply ApiTestModeGuard to both endpoints | Restrictions: Controller only, no service layer, use existing UserDBUtil methods (create, findOne, remove), let database CASCADE handle related data deletion, follow design.md error handling strategy, keep controller under 60 lines total | Success: POST endpoint creates or returns existing user idempotently, DELETE endpoint removes user with CASCADE (tokens, claims, attachments auto-deleted), proper error handling for duplicate constraint violation, both endpoints return correct DTO format | Instructions: After completing implementation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 2.4 Create and register InternalModule
  - Files:
    - `backend/src/modules/internal/internal.module.ts` (create)
    - `backend/src/modules/app/app.module.ts` (modify - add import)
  - Create InternalModule importing UserModule
  - Register InternalController
  - Add InternalModule to AppModule imports
  - Purpose: Wire internal module into NestJS dependency injection
  - _Leverage: UserModule from backend/src/modules/user/user.module.ts, InternalController from task 2.3_
  - _Requirements: All (module registration)_
  - _Prompt: Implement the task for spec test-data-endpoint, first run spec-workflow-guide to get the workflow guide then implement the task: Role: NestJS Backend Developer | Task: Create InternalModule in backend/src/modules/internal/internal.module.ts importing UserModule and registering InternalController, add InternalModule to AppModule imports array in backend/src/modules/app/app.module.ts | Restrictions: Module should not export anything (internal only), import UserModule to access UserDBUtil, follow existing module pattern from other modules, add to AppModule imports after AttachmentModule | Success: InternalModule is properly configured with correct imports, InternalController is registered, AppModule successfully imports InternalModule, application compiles and starts without errors | Instructions: After completing implementation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [x] 2.5 Add environment variable to .env
  - Files:
    - `.env` (modify - add ENABLE_API_TEST_MODE)
    - `.env.template` (modify - add comment)
  - Add ENABLE_API_TEST_MODE=true for test environment
  - Add comment explaining feature flag purpose
  - Purpose: Enable test endpoints in development/test environments
  - _Leverage: None (environment configuration)_
  - _Requirements: Requirement 1 (Feature Flag Control)_
  - _Prompt: Implement the task for spec test-data-endpoint, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer | Task: Add ENABLE_API_TEST_MODE=true to root .env file with comment explaining it enables internal test endpoints, update .env.template with ENABLE_API_TEST_MODE=false and security warning | Restrictions: Set to 'true' in .env (for development), set to 'false' in .env.template (safe default for production), include clear comment about purpose and security implications | Success: Environment variable is added to both files with appropriate values and comments, developers understand when to enable/disable flag | Instructions: After completing implementation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

## Phase 3: API Test Migration

- [ ] 3.1 Update API test setup to use HTTP endpoints
  - Files:
    - `api-test/src/setup/test-setup.ts` (modify)
    - `api-test/src/setup/vitest-setup.ts` (review - may need update if setup() is called from there)
  - Replace PostgreSQL connection logic with HTTP calls
  - Call DELETE /internal/test-data then POST /internal/test-data
  - Store response.data.user for test usage
  - Purpose: Eliminate direct database access from tests
  - _Leverage: Existing axios instance from api-test/src/config/axios/index.ts, TEST_USER_DATA from @project/types (task 1.2)_
  - _Requirements: Requirement 4 (Remove Direct Database Access from Tests)_
  - _Prompt: Implement the task for spec test-data-endpoint, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Test Infrastructure Engineer | Task: Replace PostgreSQL Pool connection in api-test/src/setup/test-setup.ts with HTTP calls using axios: first DELETE /internal/test-data for cleanup, then POST /internal/test-data to create test user, store response.data.user, remove all pg-related imports and code | Restrictions: Use existing axios configuration from api-test/src/config/axios, remove pg Pool creation entirely, maintain setup() function signature, ensure cleanup runs before creation for test isolation | Success: setup() function uses HTTP instead of direct database access, test user is created via endpoint, no pg package imports remain, tests can still authenticate with created user | Instructions: After completing implementation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 3.2 Remove pg package dependency
  - Files:
    - `api-test/package.json` (modify)
  - Remove pg and @types/pg from dependencies
  - Run pnpm install to update lockfile
  - Purpose: Clean up unnecessary database driver dependency
  - _Leverage: None (dependency cleanup)_
  - _Requirements: Requirement 4 (Remove Direct Database Access from Tests)_
  - _Prompt: Implement the task for spec test-data-endpoint, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer | Task: Remove 'pg' and '@types/pg' packages from api-test/package.json dependencies section, run 'pnpm install' in api-test directory to update lockfile | Restrictions: Only remove pg-related packages, do not remove other dependencies, ensure pnpm install succeeds without errors | Success: pg package is removed from package.json, pnpm install completes successfully, api-test no longer has database driver dependency | Instructions: After completing implementation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 3.3 Verify API tests pass with new setup
  - Command: `make test/api` (from project root)
  - Verify all existing API tests pass
  - Confirm test user authentication works
  - Purpose: Ensure migration doesn't break existing tests
  - _Leverage: Existing test suite in api-test/src/tests/_
  - _Requirements: Requirement 4 (Remove Direct Database Access from Tests)_
  - _Prompt: Implement the task for spec test-data-endpoint, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer | Task: From project root directory, run 'make test/api' to execute API test suite, verify all tests pass, check that test user authentication still works correctly with HTTP-based setup, investigate and fix any failures | Restrictions: Do not modify test assertions unless they are incorrect, focus on setup issues if tests fail, ensure ENABLE_API_TEST_MODE=true is set in .env before running tests | Success: All API tests pass, test user creation via HTTP works correctly, authentication with test user succeeds, no regressions in test suite | Instructions: After verifying tests pass, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

## Phase 4: Unit Tests

- [ ] 4.1 Create ApiTestModeGuard unit tests
  - Files:
    - `backend/src/modules/internal/guards/api-test-mode.guard.spec.ts` (create)
  - Test guard allows requests when ENABLE_API_TEST_MODE=true
  - Test guard throws NotFoundException when flag is false/undefined
  - Purpose: Ensure feature flag logic works correctly
  - _Leverage: ApiTestModeGuard from task 2.1_
  - _Requirements: Requirement 1 (Feature Flag Control)_
  - _Prompt: Implement the task for spec test-data-endpoint, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer with NestJS testing expertise | Task: Create unit tests for ApiTestModeGuard in backend/src/modules/internal/guards/api-test-mode.guard.spec.ts covering: (1) canActivate returns true when process.env.ENABLE_API_TEST_MODE='true', (2) throws NotFoundException when 'false', (3) throws NotFoundException when undefined | Restrictions: Mock process.env properly, restore original value after tests, test only the guard logic (no integration), use Jest framework following existing test patterns | Success: 3 test cases pass, all scenarios covered (true/false/undefined), guard behavior is verified, tests are isolated and repeatable | Instructions: After completing implementation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 4.2 Create InternalController.createTestData unit tests
  - Files:
    - `backend/src/modules/internal/controllers/internal.controller.spec.ts` (create)
  - Test successful user creation returns TestDataResponseDTO
  - Test duplicate error triggers query for existing user
  - Test other errors are re-thrown
  - Purpose: Verify POST endpoint idempotent creation logic
  - _Leverage: InternalController from task 2.3, mock UserDBUtil_
  - _Requirements: Requirement 2 (Test User Creation Endpoint)_
  - _Prompt: Implement the task for spec test-data-endpoint, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer with NestJS testing expertise | Task: Create unit tests for InternalController.createTestData() in backend/src/modules/internal/controllers/internal.controller.spec.ts covering: (1) userDBUtil.create() succeeds → returns TestDataResponseDTO with user data, (2) create throws error with code '23505' → findOne called → returns existing user, (3) create throws unknown error → error is re-thrown | Restrictions: Mock UserDBUtil entirely, do not test database behavior, focus on controller logic only, follow existing controller test patterns from auth.controller.spec.ts or app.controller.spec.ts if they exist | Success: 3 test cases pass, idempotent creation logic verified, error handling tested, mock interactions verified | Instructions: After completing implementation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 4.3 Create InternalController.deleteTestData unit tests
  - Files:
    - `backend/src/modules/internal/controllers/internal.controller.spec.ts` (modify - add tests)
  - Test user exists → remove called → success response
  - Test user not found → remove not called → idempotent response
  - Purpose: Verify DELETE endpoint idempotent deletion logic
  - _Leverage: InternalController from task 2.3, mock UserDBUtil_
  - _Requirements: Requirement 3 (Test Data Cleanup Endpoint)_
  - _Prompt: Implement the task for spec test-data-endpoint, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer with NestJS testing expertise | Task: Add unit tests for InternalController.deleteTestData() to backend/src/modules/internal/controllers/internal.controller.spec.ts covering: (1) findOne returns user → remove called → returns { deleted: true, message: '...' }, (2) findOne returns null → remove not called → returns { deleted: false, message: '...' } | Restrictions: Mock UserDBUtil methods (findOne, remove), verify remove is only called when user exists, do not test CASCADE behavior (database responsibility), use same mock setup as task 4.2 | Success: 2 test cases pass, idempotent deletion logic verified, remove called only when appropriate, response format verified | Instructions: After completing implementation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 4.4 Run backend unit tests
  - Command: `make test/unit` (from project root)
  - Verify all unit tests pass including new internal module tests
  - Purpose: Ensure no regressions and new tests pass
  - _Leverage: Existing test infrastructure_
  - _Requirements: All unit testing requirements_
  - _Prompt: Implement the task for spec test-data-endpoint, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer | Task: From project root directory, run 'make test/unit' to execute backend unit test suite, verify all tests pass including newly created ApiTestModeGuard and InternalController tests, investigate and fix any failures | Restrictions: Do not skip failing tests, ensure new tests are discovered and executed, check test coverage if possible | Success: All backend unit tests pass, new guard and controller tests execute successfully, no regressions in existing tests | Instructions: After verifying tests pass, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

## Phase 5: Integration Tests & Validation

- [ ] 5.1 Create integration tests for internal endpoints
  - Files:
    - `api-test/src/tests/internal-test-data.test.ts` (create)
  - Test POST /internal/test-data creates user on first call
  - Test POST /internal/test-data returns same user on second call (idempotent)
  - Test DELETE /internal/test-data removes user successfully
  - Test DELETE /internal/test-data succeeds when user not found (idempotent)
  - Test both endpoints return 404 when ENABLE_API_TEST_MODE=false
  - Purpose: Verify end-to-end behavior of internal endpoints
  - _Leverage: axios from api-test/src/config/axios, TEST_USER_DATA from @project/types_
  - _Requirements: All requirements (integration validation)_
  - _Prompt: Implement the task for spec test-data-endpoint, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Integration Engineer | Task: Create comprehensive integration tests in api-test/src/tests/internal-test-data.test.ts covering: (1) POST creates user first time, (2) POST returns same user second time, (3) DELETE removes user when exists, (4) DELETE succeeds when user not found, (5) both endpoints return 404 with ENABLE_API_TEST_MODE=false (requires env manipulation or separate test environment) | Restrictions: Use existing axios configuration, test actual HTTP responses, verify response structure matches DTOs, ensure test isolation (cleanup between tests), follow existing test patterns from api-test/src/tests/ | Success: 5+ integration tests pass, idempotency verified for both endpoints, response formats validated, feature flag behavior confirmed | Instructions: After completing implementation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 5.2 Verify database CASCADE delete behavior
  - Files:
    - `api-test/src/tests/internal-test-data.test.ts` (modify - add CASCADE verification test)
  - Create test user with related data (oauth token, claim with attachment)
  - Delete user via DELETE /internal/test-data
  - Verify related data is also deleted (query database or check via API)
  - Purpose: Confirm database CASCADE configuration works correctly
  - _Leverage: Existing API endpoints for creating claims/attachments if available_
  - _Requirements: Requirement 3 (Test Data Cleanup Endpoint), database CASCADE design_
  - _Prompt: Implement the task for spec test-data-endpoint, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Integration Engineer | Task: Add integration test to api-test/src/tests/internal-test-data.test.ts that creates test user, creates related oauth token (via auth flow if possible), creates claim with attachment (if endpoints exist), then calls DELETE /internal/test-data and verifies all related data is removed (query via API or check that subsequent operations confirm deletion) | Restrictions: Use existing API endpoints to create related data if available, do not directly query database (use HTTP endpoints), if related data creation is complex, simplify test to verify at least one CASCADE relationship, focus on verifying user deletion triggers CASCADE | Success: Test verifies that deleting user also removes related data via database CASCADE, confirms design.md CASCADE configuration works as expected | Instructions: After completing implementation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 5.3 Run full test suite and validation
  - Commands:
    - `make test/unit` (backend unit tests)
    - `make test/api` (API integration tests)
  - Verify all tests pass
  - Validate test coverage for internal module
  - Purpose: Final validation before marking spec complete
  - _Leverage: Complete test suite_
  - _Requirements: All (final validation)_
  - _Prompt: Implement the task for spec test-data-endpoint, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Lead | Task: Execute full test validation: (1) run 'make test/unit' from project root and verify all backend unit tests pass, (2) run 'make test/api' and verify all integration tests pass including new internal-test-data.test.ts, (3) review test output for any warnings or issues, (4) confirm ENABLE_API_TEST_MODE is properly set in .env | Restrictions: All tests must pass, investigate any failures thoroughly, ensure both unit and integration tests cover internal module functionality | Success: All unit tests pass, all integration tests pass, internal endpoints are fully tested, no regressions detected, spec implementation is validated | Instructions: After all tests pass and validation is complete, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

## Phase 6: Documentation & Cleanup

- [ ] 6.1 Update project documentation
  - Files:
    - `docs/project-info/api-endpoints.md` (modify - add internal endpoints if documented)
    - `CLAUDE.md` (modify - update status section)
  - Document new /internal/test-data endpoints
  - Mark feature as implemented in project status
  - Purpose: Keep documentation synchronized with implementation
  - _Leverage: Existing documentation structure_
  - _Requirements: All (documentation)_
  - _Prompt: Implement the task for spec test-data-endpoint, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical Writer | Task: Update documentation: (1) if docs/project-info/api-endpoints.md exists, add section documenting POST and DELETE /internal/test-data endpoints with request/response formats and ENABLE_API_TEST_MODE requirement, (2) update CLAUDE.md status section to mark internal test endpoints as implemented, include note about feature flag and purpose | Restrictions: Follow existing documentation style and format, clearly mark endpoints as internal/test-only, include security warning about ENABLE_API_TEST_MODE flag, keep documentation concise | Success: Internal endpoints are properly documented, CLAUDE.md reflects implementation status, developers understand how to use feature flag | Instructions: After completing documentation updates, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 6.2 Code quality check and cleanup
  - Run linting: `make lint`
  - Run formatting: `make format`
  - Review code for any TODOs or console.logs
  - Purpose: Ensure code meets project quality standards
  - _Leverage: Existing lint and format tools_
  - _Requirements: All (code quality)_
  - _Prompt: Implement the task for spec test-data-endpoint, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Code Quality Engineer | Task: Execute code quality checks: (1) run 'make format' from project root to format all code, (2) run 'make lint' to check for linting errors, fix any issues found, (3) search for console.log, TODO, FIXME in new code and remove/address them, (4) verify all new files follow project naming conventions and structure | Restrictions: Fix all linting errors, do not suppress warnings without justification, remove debug code (console.log), ensure code follows TypeScript strict mode | Success: make format completes without changes (code already formatted), make lint passes with no errors, no debug code remains, all new files follow conventions | Instructions: After all quality checks pass, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 6.3 Final verification and spec completion
  - Verify ENABLE_API_TEST_MODE behavior in both states (true/false)
  - Confirm api-test no longer has pg dependency
  - Validate implementation matches design.md
  - Purpose: Final sanity check before closing spec
  - _Leverage: Complete implementation_
  - _Requirements: All_
  - _Prompt: Implement the task for spec test-data-endpoint, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Tech Lead | Task: Perform final verification: (1) test endpoints work with ENABLE_API_TEST_MODE=true, (2) test endpoints return 404 with ENABLE_API_TEST_MODE=false, (3) verify 'pg' package is not in api-test/package.json, (4) review implementation against design.md checklist, confirm all components created, (5) verify database CASCADE works (user deletion removes tokens/claims/attachments) | Restrictions: Do not skip any verification step, test both feature flag states, ensure implementation is complete per design.md, confirm no shortcuts or incomplete features | Success: Endpoints work correctly in both flag states, pg dependency removed, implementation matches design completely, database CASCADE confirmed, spec is ready to close | Instructions: After all verifications pass, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`. Spec implementation is complete._

---

**Implementation Notes**:

- **Estimated Total Time**: ~65 minutes for experienced developer (per design.md)
- **Critical Path**: Tasks 1.1 → 2.1-2.4 → 3.1 → Tests
- **Dependencies**: Phase 1 must complete before Phase 2, Phase 2 before Phase 3
- **Testing Strategy**: Unit tests (Phase 4) can be done in parallel with integration tests (Phase 5)

**Linus's Checklist Summary**:
- ✅ Total new files: 11 (6 implementation + 5 test files)
- ✅ Total modified files: 5
- ✅ Total deleted dependencies: 2 (pg, @types/pg)
- ✅ Net complexity: Negative (removed database connection management)
- ✅ Lines of new code: ~200 total (implementation + tests)
