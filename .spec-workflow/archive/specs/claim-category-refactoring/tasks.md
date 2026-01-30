# Tasks Document: Claim Category Refactoring

## Task Overview

**Linus's Ordering Principle:** Data structures first, then the code that uses them, then cleanup.

```
Shared Types → Backend Service/API → Claims Refactoring → Migration → Cleanup → Frontend → Tests
```

## Phase 1: Foundation

- [x] 1. Update shared types package
  - Files: `packages/types/src/dtos/claim.dto.ts`, `packages/types/src/dtos/claim-category.dto.ts` (new)
  - Remove `ClaimCategory` enum from claim.dto.ts
  - Change `IClaimMetadata.category` to `string` type
  - Change `IClaimCreateRequest.category` to `string` type
  - Create new `claim-category.dto.ts` with `IClaimCategory`, `IClaimCategoryListResponse` interfaces
  - Export new types from index
  - Purpose: Establish type foundation before any code changes
  - _Leverage: Existing DTO patterns in packages/types/_
  - _Requirements: 7_
  - _Prompt: Implement the task for spec claim-category-refactoring, first run spec-workflow-guide to get the workflow guide then implement the task: Role: TypeScript Developer | Task: Update shared types package - remove ClaimCategory enum, add IClaimCategory interfaces following design.md data models section | Restrictions: Do not modify any backend/frontend code yet, only types package. Ensure backward compatible where possible. | Success: Types compile, no ClaimCategory enum exists, IClaimCategory and IClaimCategoryListResponse are exported. Mark task in-progress before starting, log implementation with log-implementation tool after completion, then mark complete._

## Phase 2: Backend Category API

- [x] 2. Implement ClaimCategoryService methods
  - Files: `backend/src/modules/claim-category/services/claim-category-services.ts`, `backend/src/modules/claim-category/types/` (new types if needed)
  - Implement `getByCode(code: string)` - lookup single category with limit relation
  - Implement `getAllCategories(params?: IGetAllCategoriesParams)` - with includeDisabled/includeDeleted filtering
  - Inject ClaimCategoryDBUtil, use BaseDBUtil.getOne() and getAll() methods
  - Purpose: Single point of truth for category data access
  - _Leverage: `backend/src/modules/claim-category/utils/claim-category-db.util.ts`, `backend/src/modules/common/base-classes/base-db-util.ts`_
  - _Requirements: 2, 3, 4_
  - _Prompt: Implement the task for spec claim-category-refactoring, first run spec-workflow-guide to get the workflow guide then implement the task: Role: NestJS Backend Developer | Task: Implement ClaimCategoryService methods following design.md section 1 - getByCode() and getAllCategories() with filtering params | Restrictions: Use existing BaseDBUtil patterns, eager load limit relation, filter by isEnabled for getByCode. Do not modify controller yet. | Success: Service methods work, getByCode returns entity with limit or null, getAllCategories respects filter params. Mark task in-progress before starting, log implementation with log-implementation tool after completion, then mark complete._

- [x] 3. Implement ClaimCategoryController endpoint
  - Files: `backend/src/modules/claim-category/controllers/claim-category.controller.ts`, `backend/src/modules/claim-category/dto/` (response DTO)
  - Add `GET /claim-categories` endpoint with JwtAuthGuard
  - Accept `includeDisabled` and `includeDeleted` query params
  - Map entities to IClaimCategoryListResponse (convert cents to dollars for limit.amount)
  - Purpose: API endpoint for frontend to fetch categories
  - _Leverage: Existing controller patterns, `backend/src/modules/auth/guards/`_
  - _Requirements: 1_
  - _Prompt: Implement the task for spec claim-category-refactoring, first run spec-workflow-guide to get the workflow guide then implement the task: Role: NestJS Backend Developer | Task: Implement ClaimCategoryController GET endpoint following design.md section 2 - accept query params, return IClaimCategoryListResponse | Restrictions: Must require JWT auth, convert limit amount from cents to dollars in response, use ClaimCategoryService. | Success: GET /claim-categories returns categories, respects query params, requires auth, amounts in dollars. Mark task in-progress before starting, log implementation with log-implementation tool after completion, then mark complete._

## Phase 3: Backend Claims Refactoring

- [x] 4. Update Claims DTOs and internal types
  - Files: `backend/src/modules/claims/dto/claim-create-request.dto.ts`, `backend/src/modules/claims/dto/claim-update-request.dto.ts`, `backend/src/modules/claims/types/claim-creation-data.type.ts`
  - Change `category` from `@IsEnum(ClaimCategory)` to `@IsString()` + `@IsNotEmpty()`
  - Update `IClaimCreationData` to use `categoryId: string` instead of `category: ClaimCategory`
  - Remove ClaimCategory enum imports
  - Purpose: Allow dynamic category strings instead of hard-coded enum validation
  - _Leverage: Existing DTO patterns with class-validator_
  - _Requirements: 2, 3_
  - _Prompt: Implement the task for spec claim-category-refactoring, first run spec-workflow-guide to get the workflow guide then implement the task: Role: NestJS Backend Developer | Task: Update Claims DTOs - replace @IsEnum with @IsString, update IClaimCreationData to use categoryId | Restrictions: Do not modify controller logic yet, only types and validation decorators. Keep other DTO fields unchanged. | Success: DTOs accept string category, IClaimCreationData has categoryId field, no ClaimCategory enum imports. Mark task in-progress before starting, log implementation with log-implementation tool after completion, then mark complete._

- [x] 5. Refactor ClaimsController validation and creation logic
  - Files: `backend/src/modules/claims/claims.controller.ts`, `backend/src/modules/claims/utils/claim-db.util.ts`
  - Inject ClaimCategoryService into ClaimsController
  - Add category lookup in createClaim() - validate category exists and is enabled
  - Replace `validateMonthlyLimit()` + `validateYearlyLimit()` with unified `validateCategoryLimit()`
  - Update ClaimDBUtil.create() to set categoryEntity relation using categoryId
  - Update response mapping to get category code from `claim.categoryEntity.code`
  - Purpose: Core refactoring - all category operations go through database
  - _Leverage: `backend/src/modules/claim-category/services/claim-category-services.ts`_
  - _Requirements: 2, 3, 4_
  - _Prompt: Implement the task for spec claim-category-refactoring, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Senior NestJS Developer | Task: Refactor ClaimsController - inject ClaimCategoryService, add category lookup, create unified validateCategoryLimit(), update ClaimDBUtil to use categoryId, fix response mapping | Restrictions: Do not delete old validation methods yet (will be removed with constants), maintain error message format, keep existing claim flow logic. This is the critical path - test thoroughly. | Success: Claims created with valid category work, invalid category returns 400, limit exceeded returns 422 with correct message, response shows category code from relation. Mark task in-progress before starting, log implementation with log-implementation tool after completion, then mark complete._

## Phase 4: Database Migration

- [x] 6. Update ClaimEntity and generate migration
  - Files: `backend/src/modules/claims/entities/claim.entity.ts`, `backend/src/db/migrations/` (generated)
  - Remove `category` field (the enum column) from ClaimEntity
  - Keep `categoryEntity` ManyToOne relation (already exists)
  - Run `make db/migration/generate name="remove-category-enum-column"`
  - Review generated migration, then run `make db/data/up`
  - Purpose: Remove redundant enum column, single source of truth is category_id FK
  - _Leverage: TypeORM migration generation_
  - _Requirements: 6_
  - _Prompt: Implement the task for spec claim-category-refactoring, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Database Developer | Task: Update ClaimEntity to remove category enum field, generate migration using make command, review and apply | Restrictions: Do NOT write raw SQL manually. Use TypeORM generation. Verify category_id FK data is populated before removing column. Backup data if needed. | Success: ClaimEntity has no category field, only categoryEntity relation. Migration generated and applied. Old enum type dropped. Queries work using categoryEntity. Mark task in-progress before starting, log implementation with log-implementation tool after completion, then mark complete._

## Phase 5: Backend Cleanup

- [x] 7. Delete hard-coded backend constants
  - Files to DELETE: `backend/src/modules/claims/enums/claim-category.enum.ts`, `backend/src/modules/claims/constants/claim-limits.constants.ts`, `backend/src/modules/claims/constants/claim-display-name.constants.ts`
  - Remove all imports of deleted files across backend
  - Remove old `validateMonthlyLimit()` and `validateYearlyLimit()` methods if not already removed
  - Update any remaining references to use ClaimCategoryService
  - Purpose: Single source of truth - database only, no hard-coded fallbacks
  - _Requirements: 5_
  - _Prompt: Implement the task for spec claim-category-refactoring, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer | Task: Delete hard-coded enum and constants files, remove all imports, clean up any remaining references | Restrictions: Search entire backend for any remaining ClaimCategory, CLAIM_MONTHLY_LIMITS, CLAIM_YEARLY_LIMITS, CLAIM_DISPLAY_NAMES imports. Must have zero references to deleted files. | Success: Files deleted, no import errors, backend builds successfully, all tests pass. Mark task in-progress before starting, log implementation with log-implementation tool after completion, then mark complete._

## Phase 6: Frontend Implementation

- [x] 8. Implement frontend category hooks
  - Files: `frontend/src/hooks/categories/useCategories.ts` (new), `frontend/src/hooks/queries/keys/key.ts`
  - Add `CATEGORIES` to QueryGroup enum
  - Add `categoryQueryKeys` with list function
  - Implement `useCategories(params?)` base hook
  - Implement `useCategoriesForSelection()` convenience hook (defaults)
  - Implement `useCategoriesForDisplay()` convenience hook (includeDisabled + includeDeleted)
  - Purpose: Frontend data fetching layer for categories
  - _Leverage: `frontend/src/hooks/user/useUserProfile.ts` pattern, `frontend/src/lib/api-client.ts`_
  - _Requirements: 8_
  - _Prompt: Implement the task for spec claim-category-refactoring, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React Frontend Developer | Task: Create useCategories hooks following design.md section 4 - base hook with params, two convenience hooks for selection vs display | Restrictions: Follow existing useUserProfile pattern exactly, use React Query with proper staleTime, handle loading/error states. | Success: Hooks fetch from /claim-categories, useCategoriesForSelection returns enabled only, useCategoriesForDisplay returns all including disabled/deleted. Mark task in-progress before starting, log implementation with log-implementation tool after completion, then mark complete._

- [x] 9. Update frontend components and utilities
  - Files: `frontend/src/components/claims/category-select.tsx`, `frontend/src/lib/claim-utils.ts`, `frontend/src/lib/validation/multi-claim-validator.ts`
  - Update CategorySelect to accept `categories` prop from hook, not use hard-coded enum
  - Update `getCategoryDisplayName()` to accept categories array parameter
  - Update `validateMonthlyLimits()` in multi-claim-validator to accept categories parameter
  - Update all call sites to pass categories from hooks
  - Purpose: Frontend uses dynamic API data instead of hard-coded values
  - _Leverage: `useCategoriesForSelection()`, `useCategoriesForDisplay()` hooks_
  - _Requirements: 8, 9, 10_
  - _Prompt: Implement the task for spec claim-category-refactoring, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React Frontend Developer | Task: Update CategorySelect component, getCategoryDisplayName utility, multi-claim-validator to use dynamic categories from hooks | Restrictions: Do not delete hard-coded constants yet (next task). Update function signatures to accept categories parameter. Find and update all call sites. | Success: CategorySelect renders from props, getCategoryDisplayName looks up from array, validation uses passed categories, all call sites updated. Mark task in-progress before starting, log implementation with log-implementation tool after completion, then mark complete._

## Phase 7: Frontend Cleanup

- [x] 10. Delete hard-coded frontend constants
  - Files: `frontend/src/lib/claim-utils.ts` (remove MONTHLY_LIMITS, categoryNames), `frontend/src/lib/validation/multi-claim-validator.ts` (remove MONTHLY_LIMITS)
  - Remove all hard-coded category maps and limits
  - Remove ClaimCategory enum imports from frontend
  - Verify no remaining references to hard-coded values
  - Purpose: Frontend relies solely on API data
  - _Requirements: 10_
  - _Prompt: Implement the task for spec claim-category-refactoring, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer | Task: Remove hard-coded MONTHLY_LIMITS, categoryNames from claim-utils.ts and multi-claim-validator.ts, remove ClaimCategory imports | Restrictions: Search entire frontend for ClaimCategory, MONTHLY_LIMITS references. Must have zero hard-coded category data. | Success: Constants removed, no import errors, frontend builds successfully. Mark task in-progress before starting, log implementation with log-implementation tool after completion, then mark complete._

## Phase 8: Testing

- [x] 11. Backend unit tests for ClaimCategoryService
  - Files: `backend/src/modules/claim-category/services/__tests__/claim-category-services.test.ts` (new)
  - Test `getByCode()` - found, not found, disabled category cases
  - Test `getAllCategories()` - default params, includeDisabled, includeDeleted
  - Mock ClaimCategoryDBUtil
  - Purpose: Verify service logic in isolation
  - _Leverage: Existing test patterns in backend_
  - _Requirements: 2, 3, 4_
  - _Prompt: Implement the task for spec claim-category-refactoring, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer | Task: Write unit tests for ClaimCategoryService methods - test all paths including edge cases | Restrictions: Mock database util, test logic only. Follow existing backend test patterns. | Success: Tests pass, cover success and error paths, good coverage of filter combinations. Mark task in-progress before starting, log implementation with log-implementation tool after completion, then mark complete._

- [x] 12. API integration tests
  - Files: `api-test/src/tests/claim-categories.test.ts` (new), update `api-test/src/tests/claims.test.ts`
  - Test `GET /claim-categories` - auth required, returns categories, respects query params
  - Test claim creation with valid category
  - Test claim creation with invalid category (400)
  - Test claim creation exceeding limit (422)
  - Purpose: Verify end-to-end API behavior
  - _Leverage: Existing api-test patterns_
  - _Requirements: 1, 2, 3, 4_
  - _Prompt: Implement the task for spec claim-category-refactoring, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer | Task: Write API integration tests for claim-categories endpoint and updated claims behavior | Restrictions: Follow existing api-test patterns. Test real API calls, not mocks. Ensure test database has seeded categories. | Success: All API tests pass, cover auth, valid/invalid category, limit exceeded scenarios. Mark task in-progress before starting, log implementation with log-implementation tool after completion, then mark complete._

- [x] 13. Frontend tests for category hooks and components
  - Files: `frontend/src/hooks/categories/__tests__/useCategories.test.ts` (new), update component tests
  - Test useCategories hook - loading, success, error states
  - Test useCategoriesForSelection vs useCategoriesForDisplay different params
  - Test CategorySelect renders from props
  - Test getCategoryDisplayName lookup
  - Purpose: Verify frontend logic works with dynamic data
  - _Leverage: Existing frontend test patterns with React Testing Library_
  - _Requirements: 8, 9_
  - _Prompt: Implement the task for spec claim-category-refactoring, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend QA Engineer | Task: Write tests for useCategories hooks and updated components | Restrictions: Mock API responses, test hook behavior and component rendering. Follow existing frontend test patterns. | Success: Hook tests pass for all states, component tests verify dynamic rendering, getCategoryDisplayName tests cover found/not found. Mark task in-progress before starting, log implementation with log-implementation tool after completion, then mark complete._

## Summary

| Phase                 | Tasks | Focus                               |
| --------------------- | ----- | ----------------------------------- |
| 1. Foundation         | 1     | Shared types                        |
| 2. Backend API        | 2-3   | Category service + endpoint         |
| 3. Claims Refactoring | 4-5   | DTOs, controller, validation        |
| 4. Migration          | 6     | Remove enum column                  |
| 5. Backend Cleanup    | 7     | Delete hard-coded files             |
| 6. Frontend           | 8-9   | Hooks + components                  |
| 7. Frontend Cleanup   | 10    | Delete hard-coded constants         |
| 8. Testing            | 11-13 | Unit + integration + frontend tests |

**Total: 13 tasks**

**Critical Path:** Tasks 1 → 2 → 3 → 4 → 5 → 6 → 7 must be sequential. Frontend tasks (8-10) can start after task 3. Testing tasks can run in parallel after their dependencies.
