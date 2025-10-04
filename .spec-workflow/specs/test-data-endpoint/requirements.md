# Requirements Document

## Introduction

**Problem**: API tests directly connect to PostgreSQL using the `pg` package to create test data. This is architectural garbage - tests bypass the backend's data layer, creating two separate paths for data manipulation (TypeORM in backend + raw SQL in tests). This doubles maintenance burden and violates separation of concerns.

**Solution**: Backend owns all data creation and cleanup. Two endpoints:
- POST `/internal/test-data`: Setup test fixtures (idempotent - returns existing if already created)
- DELETE `/internal/test-data`: Teardown test data for clean state

API tests call these endpoints like any HTTP client. Feature flag `ENABLE_API_TEST_MODE` gates access. When flag is off, endpoints return 404. When on, they manage test data lifecycle.

**Value**: Eliminates dual data-creation paths. Tests use the same interface as production. Backend controls all database logic. Clean test isolation with proper setup/teardown. Simple, no special cases.

## Alignment with Product Vision

**Technical Standards (tech.md)**:
- Enforces proper separation of concerns: backend owns data layer
- Removes dependency on `pg` package from api-test workspace
- Aligns with NestJS module patterns: internal endpoints under proper controllers
- Maintains TypeScript strict mode and type safety

**Architecture (structure.md)**:
- Follows module pattern: controller → service → database
- API tests become pure HTTP clients (no database coupling)
- Reduces test complexity: single responsibility (HTTP verification only)

**Security**:
- Feature flag prevents accidental production exposure
- Internal endpoints separated from public API routes
- Test-only functionality clearly marked and gated

## Requirements

### Requirement 1: Feature Flag Control

**User Story:** As a developer, I want test endpoints to only be available when explicitly enabled, so that they cannot be accidentally exposed in production.

#### Acceptance Criteria

1. WHEN `ENABLE_API_TEST_MODE` environment variable is not set THEN system SHALL treat it as disabled (default: false)
2. WHEN `ENABLE_API_TEST_MODE=false` THEN both POST and DELETE `/internal/test-data` SHALL return 404 Not Found
3. WHEN `ENABLE_API_TEST_MODE=true` THEN both POST and DELETE `/internal/test-data` SHALL process requests normally
4. WHEN request is made to disabled endpoint THEN system SHALL NOT log error messages (404 is expected behavior)

### Requirement 2: Test User Creation Endpoint (Idempotent)

**User Story:** As an API test suite, I want to create test users via HTTP endpoint with idempotency, so that multiple calls return the same user without errors.

#### Acceptance Criteria

1. WHEN POST `/internal/test-data` called THEN system SHALL check if test user already exists in database
2. WHEN test user does NOT exist THEN system SHALL create user using backend's UserDBUtil and return 201 Created
3. WHEN test user already exists (by id or email) THEN system SHALL return existing user with 200 OK (no duplicate creation)
4. WHEN response is successful (200 or 201) THEN it SHALL include: `{ user: { id: string, email: string, name: string, googleId: string } }`
5. WHEN database error occurs THEN system SHALL return 500 Internal Server Error with error details
6. WHEN feature flag is disabled THEN system SHALL return 404 Not Found before any processing
7. WHEN endpoint called multiple times THEN it SHALL always return same user data (fully idempotent)

### Requirement 3: Test Data Cleanup Endpoint

**User Story:** As an API test suite, I want to delete all test data via HTTP endpoint, so that each test run starts with a clean database state.

#### Acceptance Criteria

1. WHEN DELETE `/internal/test-data` called THEN system SHALL delete test user from database
2. WHEN test user exists THEN system SHALL delete user and return 200 OK with deletion confirmation
3. WHEN test user does NOT exist THEN system SHALL return 200 OK (idempotent deletion)
4. WHEN deletion succeeds THEN response SHALL include: `{ deleted: boolean, message: string }`
5. WHEN database error occurs THEN system SHALL return 500 Internal Server Error with error details
6. WHEN feature flag is disabled THEN system SHALL return 404 Not Found before any processing
7. WHEN endpoint called multiple times THEN it SHALL always succeed (idempotent)

### Requirement 4: Remove Direct Database Access from Tests

**User Story:** As a test maintainer, I want API tests to only use HTTP calls, so that tests don't bypass backend logic.

#### Acceptance Criteria

1. WHEN API test suite initializes THEN it SHALL call DELETE `/internal/test-data` for cleanup, then POST `/internal/test-data` to create fixtures
2. WHEN test suite completes THEN it MAY call DELETE `/internal/test-data` for final cleanup (optional)
3. WHEN test data is created THEN response SHALL contain all necessary test user information (no second query needed)
4. WHEN migration is complete THEN `pg` package SHALL be removed from api-test dependencies
5. WHEN migration is complete THEN `api-test/src/setup/test-setup.ts` SHALL be deleted (no longer needed)

### Requirement 5: Request/Response Contract

**User Story:** As an API client, I want predictable request/response formats, so that I can reliably create test data.

#### Acceptance Criteria

**POST `/internal/test-data`**:
1. WHEN sending request THEN body SHALL be empty (uses predefined test user constants)
2. WHEN response is successful (200 or 201) THEN it SHALL include:
```json
{
  "user": {
    "id": "string",
    "email": "string",
    "name": "string",
    "googleId": "string"
  }
}
```

**DELETE `/internal/test-data`**:
1. WHEN sending request THEN body SHALL be empty (deletes predefined test user by id)
2. WHEN response is successful THEN it SHALL include: `{ deleted: boolean, message: string }`

## Non-Functional Requirements

### Code Architecture and Modularity

**Single Responsibility Principle**:
- Endpoints only handle HTTP layer and feature flag check
- Database util handles user creation/deletion logic (reuse existing UserDBUtil)
- No business logic in controller
- No database queries in test setup scripts

**Modular Design**:
- Internal endpoints grouped under `/internal/*` prefix (POST and DELETE for test-data)
- Feature flag check extracted to reusable guard/middleware (applied to both endpoints)
- Test data constants centralized (shared between backend and api-test)

**Dependency Management**:
- Backend exposes HTTP interface, tests consume it
- Zero database dependencies in api-test workspace after migration
- Feature flag environment variable only (no complex configuration)

**Clear Interfaces**:
- RESTful endpoints (POST for create, DELETE for cleanup) with standard HTTP status codes
- Type-safe request/response DTOs from `@project/types`
- Explicit 404 for disabled endpoints (not 403, to avoid leaking endpoint existence)
- Both endpoints fully idempotent (safe to call multiple times)

### Performance

- Endpoint response time: <100ms (single database insert/select)
- No impact on production (gated by feature flag)
- Idempotent operation: safe to call multiple times

### Security

- **Access Control**: Feature flag `ENABLE_API_TEST_MODE` must be set to "true"
- **Production Safety**: Flag defaults to false/disabled
- **No Authentication**: Internal endpoint trusts calling environment (only available when flag enabled)
- **Minimal Surface**: Two endpoints (POST/DELETE) with minimal functionality
- **Clear Separation**: `/internal/*` prefix indicates non-production routes

### Reliability

- **Idempotency**:
  - POST: Creating same user twice returns existing user (no error, 200 OK)
  - DELETE: Deleting non-existent user returns success (no error, 200 OK)
- **Error Handling**: Proper HTTP status codes for all scenarios
- **Database Safety**: Uses backend's TypeORM (same path as production)
- **Test Isolation**: DELETE before POST ensures clean state for each test run
- **No Cascading Effects**: Deleting test user does not affect other data (if FK constraints exist, handle appropriately)

### Usability

- **Developer Experience**: API tests call two simple endpoints (POST/DELETE) instead of managing database connections
- **Simple Migration**: Replace `pg` setup with HTTP calls
- **Clear Feedback**: Responses contain all data/status needed for tests
- **Documentation**: Swagger endpoints marked as "Internal - Test Only"
- **Clean Test Runs**: DELETE before POST ensures consistent starting state
