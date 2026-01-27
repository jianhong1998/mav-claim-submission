# Design Document: Claim Category Refactoring

## Overview

This design eliminates hard-coded claim categories by making the database the single source of truth. The core principle: **category code in, category UUID out** - every operation that touches categories goes through database lookup.

**Linus's Design Philosophy Applied:**
- **Data structure first**: The change is about data flow, not code structure
- **No special cases**: One unified validation path for all category limits
- **Simplicity**: Reuse existing patterns, don't invent new abstractions
- **Don't break userspace**: API contract unchanged, only internals change

## Steering Document Alignment

### Technical Standards (tech.md)

- **Enum Pattern**: Remove `ClaimCategory` Object.freeze enum - categories become dynamic strings
- **TypeScript Strict**: All category references become `string` type with runtime validation
- **Module Pattern**: Extend existing `claim-category` module with service methods
- **BaseDBUtil Pattern**: Reuse existing database utility patterns

### Project Structure (structure.md)

- **Backend**: Changes in `modules/claims/` and `modules/claim-category/`
- **Frontend**: Changes in `hooks/`, `lib/`, `components/claims/`
- **Shared Types**: Changes in `packages/types/src/dtos/`
- **No new modules**: Fill in existing empty ClaimCategoryService

## Code Reuse Analysis

### Existing Components to Leverage

| Component | How It Will Be Used |
|-----------|-------------------|
| `ClaimCategoryDBUtil` | Already exists - add `getByCode()` method |
| `ClaimCategoryEntity` | Already exists with `limit` relation (eager-loaded) |
| `BaseDBUtil.getOne()` | Use for category lookup by code |
| `useUserProfile` hook | Pattern for new `useCategories` hook |
| `QueryGroup`, `getQueryKey` | Extend for category query keys |
| `apiClient` | Reuse for category API calls |

### Integration Points

| System | Integration |
|--------|------------|
| `ClaimsController` | Inject ClaimCategoryService, use for validation |
| `ClaimDBUtil.create()` | Accept `categoryId` instead of `category` |
| `ClaimEntity` | Remove `category` field, keep `categoryEntity` relation |
| Frontend validation | Replace hard-coded limits with cached API data |

## Architecture

The design follows a **single lookup pattern** - every category operation resolves through database:

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLAIM CREATION FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Request: { category: "telco", amount: 50, ... }                │
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────┐                │
│  │ ClaimCategoryService.getByCode("telco")     │                │
│  │   → SELECT * FROM claim_categories          │                │
│  │     WHERE code = 'telco' AND isEnabled      │                │
│  │     (with eager limit relation)             │                │
│  └─────────────────────────────────────────────┘                │
│                           │                                      │
│              ┌────────────┴────────────┐                        │
│              │                         │                        │
│              ▼                         ▼                        │
│         NOT FOUND                   FOUND                       │
│      400 Bad Request          ClaimCategoryEntity               │
│                                       │                         │
│                                       ▼                         │
│                    ┌──────────────────────────────┐             │
│                    │ validateLimit(category, amt) │             │
│                    │   if (category.limit)        │             │
│                    │     checkTotal(type, amount) │             │
│                    └──────────────────────────────┘             │
│                                       │                         │
│                              ┌────────┴────────┐                │
│                              │                 │                │
│                              ▼                 ▼                │
│                        EXCEEDED            VALID                │
│                     422 Error         Create claim with         │
│                                      categoryId = entity.uuid   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Modular Design Principles

- **Single File Responsibility**: ClaimCategoryService does ONE thing - category data access
- **No Validation Service**: Validation logic stays in controller (same pattern as existing code)
- **No Caching Layer**: Database queries are fast, don't over-engineer
- **Unified Limit Check**: One method handles both monthly/yearly based on `limit.type`

## Components and Interfaces

### 1. ClaimCategoryService (Backend)

**Purpose:** Single point of access for category data from database

**Location:** `backend/src/modules/claim-category/services/claim-category-services.ts`

**Interfaces:**
```typescript
interface IGetAllCategoriesParams {
  includeDisabled?: boolean;  // default: false (only enabled)
  includeDeleted?: boolean;   // default: false (only non-deleted)
}

class ClaimCategoryService {
  // Get category by code with limit relation (for claim validation)
  async getByCode(code: string): Promise<ClaimCategoryEntity | null>;

  // Unified method for fetching categories with flexible filtering
  async getAllCategories(params?: IGetAllCategoriesParams): Promise<ClaimCategoryEntity[]>;
}
```

**Usage Patterns:**
- **Claim creation validation**: `getByCode(code)` - lookup single category
- **Frontend category selection**: `getAllCategories()` - enabled only (default)
- **Admin display (future)**: `getAllCategories({ includeDisabled: true })` - all categories
- **Audit/history view**: `getAllCategories({ includeDeleted: true })` - include soft-deleted

**Dependencies:** ClaimCategoryDBUtil

**Reuses:** Existing ClaimCategoryDBUtil with BaseDBUtil.getOne() and BaseDBUtil.getAll()

---

### 2. ClaimCategoryController (Backend)

**Purpose:** API endpoint for frontend to fetch categories

**Location:** `backend/src/modules/claim-category/controllers/claim-category.controller.ts`

**Interfaces:**
```typescript
@Controller('/claim-categories')
@UseGuards(JwtAuthGuard)
class ClaimCategoryController {
  @Get()
  async getCategories(
    @Query('includeDisabled') includeDisabled?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ): Promise<IClaimCategoryListResponse>;
}
```

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `includeDisabled` | `'true'` or omit | omit (false) | Include disabled categories |
| `includeDeleted` | `'true'` or omit | omit (false) | Include soft-deleted categories |

**Usage:**
- `GET /claim-categories` → enabled, non-deleted only (for selection)
- `GET /claim-categories?includeDisabled=true&includeDeleted=true` → all categories (for display)

**Dependencies:** ClaimCategoryService

---

### 3. ClaimsController Changes (Backend)

**Purpose:** Refactor validation to use database lookups

**Location:** `backend/src/modules/claims/claims.controller.ts`

**Changes:**
- Inject `ClaimCategoryService`
- Replace `validateMonthlyLimit()` + `validateYearlyLimit()` with unified `validateCategoryLimit()`
- Lookup category before create/update operations
- Pass `categoryId` to ClaimDBUtil instead of `category`

**Key Method:**
```typescript
private async validateCategoryLimit(
  userId: string,
  category: ClaimCategoryEntity,
  month: number,
  year: number,
  newAmount: number,
  excludeClaimId?: string,
): Promise<void> {
  const limit = category.limit;
  if (!limit) return; // Unlimited category

  // Unified logic - same query, different time window based on limit.type
  const existingTotal = await this.getExistingTotal(
    userId,
    category.uuid,
    limit.type === 'monthly' ? { month, year } : { year }
  );

  if (existingTotal + newAmount > limit.amount / 100) { // cents to dollars
    throw new UnprocessableEntityException(...);
  }
}
```

---

### 4. Category Hooks (Frontend)

**Purpose:** Fetch and cache categories from API for different use cases

**Location:** `frontend/src/hooks/categories/useCategories.ts`

**Two Distinct Use Cases:**

| Use Case | Hook | API Params | Purpose |
|----------|------|-----------|---------|
| **Selection** | `useCategoriesForSelection()` | `{}` (defaults) | Claim form dropdown - only enabled, non-deleted |
| **Display** | `useCategoriesForDisplay()` | `{ includeDisabled: true, includeDeleted: true }` | Showing category name on existing claims |

**Interfaces:**
```typescript
// Base hook with configurable params
const useCategories = (params?: { includeDisabled?: boolean; includeDeleted?: boolean }) => {
  const queryParams = new URLSearchParams();
  if (params?.includeDisabled) queryParams.set('includeDisabled', 'true');
  if (params?.includeDeleted) queryParams.set('includeDeleted', 'true');

  return useQuery<IClaimCategory[]>({
    queryKey: categoryQueryKeys.list(params),
    queryFn: () => apiClient.get(`/claim-categories?${queryParams}`),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Convenience hooks for common use cases
const useCategoriesForSelection = () => useCategories(); // enabled, non-deleted only
const useCategoriesForDisplay = () => useCategories({ includeDisabled: true, includeDeleted: true }); // all
```

**Why Separate Concerns:**
- **Selection**: User creating new claim should only see active, non-deleted categories
- **Display**: Viewing existing claim must show category name even if category was later disabled or deleted

**Dependencies:** React Query, apiClient

**Reuses:** Same pattern as useUserProfile

---

### 5. CategorySelect Component (Frontend)

**Purpose:** Dropdown that uses dynamic categories from API (selection use case only)

**Location:** `frontend/src/components/claims/category-select.tsx`

**Changes:**
- Accept `categories` prop from `useCategoriesForSelection()` hook
- Only renders enabled categories (selection use case)
- Display `category.name` with limit info from `category.limit`

---

### 6. Category Display Utility (Frontend)

**Purpose:** Get category display name for existing claims (display use case)

**Location:** `frontend/src/lib/claim-utils.ts`

**Changes:**
- Replace hard-coded `getCategoryDisplayName()` function
- Accept categories array from `useCategoriesForDisplay()` hook
- Lookup by category code, return `name` field

```typescript
// Before (hard-coded)
export const getCategoryDisplayName = (category: ClaimCategory): string => {
  return categoryNames[category] ?? category;
};

// After (dynamic)
export const getCategoryDisplayName = (
  categoryCode: string,
  categories: IClaimCategory[],
): string => {
  const found = categories.find(c => c.code === categoryCode);
  return found?.name ?? categoryCode;
};
```

---

### 7. Validation Utilities (Frontend)

**Purpose:** Validate against dynamic limits from cached data

**Location:** `frontend/src/lib/validation/multi-claim-validator.ts`

**Changes:**
- Accept `categories: IClaimCategory[]` parameter
- Lookup limit from passed categories array, not hard-coded map
- Same validation logic, different data source

## Data Models

### ClaimCategoryEntity (Existing - No Changes)

```typescript
// backend/src/modules/claim-category/entities/claim-category.entity.ts
{
  uuid: UUID;
  code: string;           // 'telco', 'fitness', etc.
  name: string;           // 'Telecommunications', etc.
  isEnabled: boolean;
  limit: ClaimCategoryLimitEntity | null;  // Eager loaded
  createdAt: Date;
  updatedAt: Date;
}
```

### ClaimCategoryLimitEntity (Existing - No Changes)

```typescript
// backend/src/modules/claim-category/entities/claim-category-limit.entity.ts
{
  uuid: UUID;
  type: 'monthly' | 'yearly';
  amount: number;         // In cents (e.g., 15000 = $150)
  category: ClaimCategoryEntity;
}
```

### IClaimCategory (New - Shared Types)

```typescript
// packages/types/src/dtos/claim-category.dto.ts
interface IClaimCategory {
  uuid: string;
  code: string;
  name: string;
  limit: {
    type: 'monthly' | 'yearly';
    amount: number;  // In dollars for frontend
  } | null;
}

interface IClaimCategoryListResponse {
  success: boolean;
  categories: IClaimCategory[];
}
```

### IClaimCreationData (Modified)

```typescript
// backend/src/modules/claims/types/claim-creation-data.type.ts
interface IClaimCreationData {
  userId: string;
  categoryId: string;     // Changed from category: ClaimCategory
  claimName?: string;
  month: number;
  year: number;
  totalAmount: number;
}
```

### ClaimEntity (Modified)

```typescript
// backend/src/modules/claims/entities/claim.entity.ts
// REMOVE:
// @Column({ type: 'enum', enum: ClaimCategory })
// category: ClaimCategory;

// KEEP:
@ManyToOne(() => ClaimCategoryEntity)
@JoinColumn({ name: 'category_id' })
categoryEntity: ClaimCategoryEntity;
```

## Database Migration

### Migration: Remove Category Enum Column

**Generation Command:**
```bash
# After removing category field from ClaimEntity, generate migration:
make db/migration/generate name="remove-category-enum-column"
```

**Process:**
1. Update `ClaimEntity` - remove `category` field, keep only `categoryEntity` relation
2. Run TypeORM migration generation command above
3. TypeORM will auto-detect:
   - Drop `category` column from `claims` table
   - Drop `claims_category_enum` PostgreSQL type
   - Update any indexes referencing the old column
4. Review generated migration before running
5. Run `make db/data/up` to apply

**Note:** TypeORM migration generation ensures consistency with entity definitions and handles edge cases automatically. Do not write raw SQL manually.

## Error Handling

### Error Scenarios

| Scenario | HTTP Code | Message | Handling |
|----------|-----------|---------|----------|
| Invalid category code | 400 | "Invalid category: {code}" | Controller catches null from service |
| Disabled category | 400 | "Invalid category: {code}" | Service filters by isEnabled |
| Monthly limit exceeded | 422 | "{Name} monthly limit of ${X} exceeded..." | Unified validateCategoryLimit |
| Yearly limit exceeded | 422 | "{Name} yearly limit of ${X} exceeded..." | Same unified method |
| Category API failure | 500 | "Failed to fetch categories" | Frontend shows stale cache |

### Error Flow

```
Category Lookup Failed → 400 Bad Request
     │
     ▼
Limit Validation Failed → 422 Unprocessable Entity (detailed message)
     │
     ▼
Database Error → 500 Internal Server Error
```

## Testing Strategy

### Unit Testing

**Backend:**
- `ClaimCategoryService.getByCode()` - returns entity or null
- `ClaimCategoryService.getAllCategories()` - respects `includeDisabled` param
- `ClaimsController.validateCategoryLimit()` - unified limit validation
- `ClaimsController.createClaim()` - category lookup integration

**Frontend:**
- `useCategories` hook - loading, error, data states with different params
- `useCategoriesForSelection` - returns only enabled categories
- `useCategoriesForDisplay` - returns all categories including disabled
- `CategorySelect` - renders from props, not hard-coded
- `getCategoryDisplayName` - lookup from categories array

### Integration Testing

**Backend (api-test):**
- `POST /api/claims` with valid category code → 201
- `POST /api/claims` with invalid category code → 400
- `POST /api/claims` exceeding limit → 422
- `GET /api/claim-categories` → returns enabled categories with limits

### Files to Delete After Refactoring

| File | Reason |
|------|--------|
| `backend/src/modules/claims/enums/claim-category.enum.ts` | Replaced by database |
| `backend/src/modules/claims/constants/claim-limits.constants.ts` | Replaced by database |
| `backend/src/modules/claims/constants/claim-display-name.constants.ts` | Replaced by database |

### Files to Modify

| File | Changes |
|------|---------|
| `packages/types/src/dtos/claim.dto.ts` | Remove ClaimCategory enum, add IClaimCategory types |
| `backend/src/modules/claims/entities/claim.entity.ts` | Remove category field |
| `backend/src/modules/claims/claims.controller.ts` | Inject service, refactor validation |
| `backend/src/modules/claims/dto/claim-create-request.dto.ts` | Remove @IsEnum, use @IsString |
| `frontend/src/lib/claim-utils.ts` | Remove hard-coded limits/names |
| `frontend/src/lib/validation/multi-claim-validator.ts` | Accept categories parameter |
| `frontend/src/components/claims/category-select.tsx` | Use props instead of enum |

## Summary

**The essence of this design in one sentence:** Replace every hard-coded category reference with a database lookup through ClaimCategoryService.

**Complexity eliminated:**
- Two separate limit validation methods → One unified method
- Hard-coded constants in 6 files → One database table
- Enum type checking → Runtime validation with clear error messages

**Risk points:**
- Migration must run AFTER ensuring all claims have `category_id` populated (already done)
- Frontend must fetch categories before rendering claim forms
