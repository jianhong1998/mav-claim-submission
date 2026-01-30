# Requirements Document: Claim Category Refactoring

## Introduction

This specification covers the refactoring of hard-coded claim categories to a database-driven dynamic system. Currently, claim categories, their display names, and limits are scattered across multiple hard-coded locations in both frontend and backend. This refactoring centralizes all category data in the database, enabling future admin management capabilities and eliminating code duplication.

## Alignment with Product Vision

This feature directly supports the **Mavericks Claim Submission System** vision by:
- **Administrative Efficiency**: Enables future admin module to manage categories without code changes
- **Compliance Tracking**: Centralizes limit enforcement rules in the database for audit trails
- **Scalability**: Removes hard-coded constraints, allowing category additions without deployments

## Background Context

### Current State (Problem)

The system has a **transitional state** where database entities exist but code still uses hard-coded values:

| Location | Hard-Coded Data |
|----------|----------------|
| `backend/src/modules/claims/enums/claim-category.enum.ts` | 8 category codes |
| `backend/src/modules/claims/constants/claim-limits.constants.ts` | TELCO $150/mo, FITNESS $50/mo, DENTAL $300/yr |
| `backend/src/modules/claims/constants/claim-display-name.constants.ts` | Category display names |
| `frontend/src/lib/claim-utils.ts` | MONTHLY_LIMITS, categoryNames |
| `frontend/src/lib/validation/multi-claim-validator.ts` | MONTHLY_LIMITS map |
| `packages/types/src/dtos/claim.dto.ts` | ClaimCategory enum |

### Database State (Already Implemented)

- `claim_categories` table: uuid, code, name, isEnabled, timestamps
- `claim_category_limits` table: uuid, type (monthly/yearly), amount (in cents), category_id FK
- `claims` table: has both old `category` enum column AND new `category_id` FK

### Decisions Made

| Decision | Choice |
|----------|--------|
| Migration Strategy | Remove old `category` enum column from claims table |
| Validation Strategy | Frontend + Backend (both validate, DB is source of truth) |
| Authentication | Authenticated endpoint only (sensitive company policy data) |
| Shared Types | Remove ClaimCategory enum entirely, use `string` type |
| API Response | Keep flat (`category: string`), frontend fetches full data separately |
| Frontend Flow | Fetch categories after login, cache in React Query |

## Requirements

### Requirement 1: Category API Endpoint

**User Story:** As a frontend developer, I want an API endpoint to fetch all enabled claim categories with their limits, so that the frontend can dynamically render category options and validate claims.

#### Acceptance Criteria

1. WHEN authenticated user calls `GET /api/claim-categories` THEN system SHALL return list of enabled categories with their limits
2. WHEN unauthenticated user calls `GET /api/claim-categories` THEN system SHALL return 401 Unauthorized
3. WHEN category has no limit THEN system SHALL return `limit: null` for that category
4. WHEN category has a limit THEN system SHALL return `limit: { type: 'monthly' | 'yearly', amount: number }` where amount is in dollars (not cents)

**Response Format:**
```typescript
{
  success: boolean;
  categories: Array<{
    uuid: string;
    code: string;
    name: string;
    limit: {
      type: 'monthly' | 'yearly';
      amount: number; // in dollars
    } | null;
  }>;
}
```

---

### Requirement 2: Claim Creation Logic Changes

**User Story:** As a backend developer, I want the claim creation flow to use database-driven category validation, so that new categories can be added without code changes.

#### Acceptance Criteria

**DTO Validation Changes:**
1. WHEN `ClaimCreateRequestDto` receives a category THEN system SHALL accept `category: string` (not enum)
2. WHEN validating category THEN system SHALL NOT use `@IsEnum` decorator (remove hard-coded validation)
3. WHEN category string is empty or missing THEN system SHALL return 400 Bad Request

**Controller Logic Changes:**
4. WHEN `createClaim()` is called THEN controller SHALL lookup category by code from database via ClaimCategoryService
5. IF category code not found OR `isEnabled = false` THEN system SHALL return 400 Bad Request with "Invalid category: {code}"
6. WHEN category is valid THEN controller SHALL pass `categoryId` (UUID) to ClaimDBUtil, not category code
7. WHEN claim is created THEN system SHALL store only `category_id` FK (not the old enum column)

**Internal Type Changes:**
8. WHEN `IClaimCreationData` is used THEN interface SHALL have `categoryId: string` instead of `category: ClaimCategory`
9. WHEN `ClaimDBUtil.create()` is called THEN it SHALL set `categoryEntity` relation using the categoryId

**Response Mapping Changes:**
10. WHEN mapping `ClaimEntity` to `IClaimMetadata` THEN system SHALL get category code from `claim.categoryEntity.code`

---

### Requirement 3: Claim Update Logic Changes

**User Story:** As a backend developer, I want the claim update flow to validate category changes against the database.

#### Acceptance Criteria

**DTO Validation Changes:**
1. WHEN `ClaimUpdateRequestDto` receives a category THEN system SHALL accept `category?: string` (optional string, not enum)

**Controller Logic Changes:**
2. WHEN `updateClaim()` receives a category change THEN controller SHALL lookup new category by code from database
3. IF new category code not found OR `isEnabled = false` THEN system SHALL return 400 Bad Request
4. WHEN category is changed THEN system SHALL update `category_id` FK to new category's UUID

---

### Requirement 4: Backend Limit Validation Refactoring

**User Story:** As a system administrator, I want claim limits to be enforced from the database, so that I can update limits without code changes.

#### Acceptance Criteria

**Validation Method Changes:**
1. WHEN `validateMonthlyLimit()` is called THEN it SHALL fetch limit from `ClaimCategoryService.getCategoryWithLimit(code)`
2. WHEN `validateYearlyLimit()` is called THEN it SHALL fetch limit from `ClaimCategoryService.getCategoryWithLimit(code)`
3. WHEN category has `limit.type = 'monthly'` THEN system SHALL apply monthly validation logic
4. WHEN category has `limit.type = 'yearly'` THEN system SHALL apply yearly validation logic
5. WHEN category has `limit = null` THEN system SHALL skip limit validation (unlimited)

**Error Messages:**
6. IF limit is exceeded THEN system SHALL return 422 with message: "{CategoryName} {type} limit of ${limit} exceeded. Current: ${current}, Proposed: ${proposed}, Total: ${total}"

**ClaimCategoryService Methods Required:**
7. `getCategoryByCode(code: string)` SHALL return category entity or null
8. `getCategoryWithLimit(code: string)` SHALL return category with eager-loaded limit relation

---

### Requirement 5: Remove Hard-Coded Backend Constants

**User Story:** As a backend developer, I want to remove all hard-coded category constants, so that the codebase has a single source of truth.

#### Acceptance Criteria

1. WHEN refactoring is complete THEN `claim-category.enum.ts` SHALL be deleted
2. WHEN refactoring is complete THEN `claim-limits.constants.ts` SHALL be deleted
3. WHEN refactoring is complete THEN `claim-display-name.constants.ts` SHALL be deleted
4. WHEN category data is needed THEN system SHALL fetch from ClaimCategoryService (database)

---

### Requirement 6: Remove Old Category Enum Column

**User Story:** As a database administrator, I want to remove the redundant `category` enum column from claims table, so that there is no data duplication.

#### Acceptance Criteria

1. WHEN migration runs THEN system SHALL drop the `category` column from `claims` table
2. WHEN migration runs THEN system SHALL drop the PostgreSQL enum type `claims_category_enum`
3. WHEN ClaimEntity is updated THEN system SHALL remove `category` field and rely solely on `categoryEntity` relation
4. WHEN querying claims THEN system SHALL use `categoryEntity.code` for category code access

---

### Requirement 7: Update Shared Types Package

**User Story:** As a developer, I want the shared types package updated to remove hard-coded ClaimCategory enum, so that types reflect the dynamic nature of categories.

#### Acceptance Criteria

1. WHEN refactoring is complete THEN `ClaimCategory` enum SHALL be removed from `@project/types`
2. WHEN refactoring is complete THEN `IClaimMetadata.category` SHALL be typed as `string`
3. WHEN refactoring is complete THEN new `IClaimCategoryResponse` type SHALL be added for API response
4. WHEN refactoring is complete THEN `IClaimCreateRequest.category` SHALL be typed as `string`

---

### Requirement 8: Frontend Category Fetching

**User Story:** As a frontend developer, I want to fetch categories from the API after login, so that the UI displays current category data from the database.

#### Acceptance Criteria

1. WHEN user logs in successfully THEN frontend SHALL fetch categories from `/api/claim-categories`
2. WHEN categories are fetched THEN frontend SHALL cache them using React Query with appropriate stale time
3. WHEN category select component renders THEN component SHALL use cached categories (not hard-coded values)
4. WHEN displaying category name THEN component SHALL use `name` field from API response

---

### Requirement 9: Frontend Validation with Dynamic Limits

**User Story:** As a user, I want immediate feedback when my claim exceeds category limits, so that I can correct it before submission.

#### Acceptance Criteria

1. WHEN user enters claim amount THEN frontend SHALL validate against cached category limits
2. WHEN limit is exceeded THEN frontend SHALL display warning message before form submission
3. WHEN category has no limit THEN frontend SHALL not display any limit warning
4. WHEN validation fails THEN frontend SHALL prevent form submission and highlight the error

---

### Requirement 10: Remove Hard-Coded Frontend Constants

**User Story:** As a frontend developer, I want to remove all hard-coded category constants, so that the frontend relies on API data.

#### Acceptance Criteria

1. WHEN refactoring is complete THEN `MONTHLY_LIMITS` in `claim-utils.ts` SHALL be removed
2. WHEN refactoring is complete THEN `categoryNames` map in `getCategoryDisplayName` SHALL be removed
3. WHEN refactoring is complete THEN `MONTHLY_LIMITS` in `multi-claim-validator.ts` SHALL be removed
4. WHEN category display name is needed THEN system SHALL use cached API data

---

## Non-Functional Requirements

### Code Architecture and Modularity

- **Single Responsibility**: ClaimCategoryService handles all category data access
- **Modular Design**: Category fetching hook is reusable across components
- **Dependency Management**: Frontend depends on category API, not hard-coded constants
- **Clear Interfaces**: IClaimCategoryResponse defines clear contract between frontend and backend

### Performance

- Category API response time SHALL be under 200ms
- Frontend SHALL cache categories with 5-minute stale time to reduce API calls
- Database queries SHALL use indexes on `isEnabled` column

### Security

- Category endpoint SHALL require JWT authentication
- Category data is considered sensitive company policy information

### Reliability

- Backend SHALL handle database connection failures gracefully
- Frontend SHALL display cached data if API call fails (stale-while-revalidate)

### Backward Compatibility

- API changes SHALL be non-breaking (adding fields, not removing)
- Migration SHALL handle existing claims by using `category_id` FK (already populated)

### Testing

- Backend unit tests SHALL cover limit validation logic
- Frontend tests SHALL mock category API responses
- Integration tests SHALL verify end-to-end category flow
