# Clarification Questions - Hard-Coded Claim Category Refactoring

## Context

The codebase currently has a transitional state where:

- Database has new `claim_categories` and `claim_category_limits` tables with seeded data
- `claims` table has both old `category` enum column AND new `category_id` FK
- All code still uses hard-coded values (enums, constants, maps)

## Questions

### 1. Migration Strategy - Old `category` enum column

Should the old `category` enum column be removed from the claims table in this refactoring?

| Option                    | Description                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------- |
| **A) Keep both columns**  | Keep category enum AND category_id FK. Less breaking changes, but data redundancy.  |
| **B) Remove enum column** | Remove the old category enum column. Cleaner design but requires careful migration. |

#### Answer

B. Remove Enum column, as it is not required any more. Refactor all the places using of this enum column.

---

### 2. Validation Strategy

Should frontend validation be removed in favor of backend-only validation, or should frontend fetch limits from API and validate locally?

| Option                            | Description                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------- |
| **A) Backend-only (Recommended)** | Frontend sends data, backend validates against DB. Simpler, single source of truth.         |
| **B) Frontend + Backend**         | Frontend fetches limits from API and validates locally too. Better UX but duplicated logic. |

#### Answer

B. No, should keep both frontend and backend validation for better UX and keep DB as single source of truth.

---

### 3. Authentication for Category API

Should the category list API require authentication, or be public?

| Option                                  | Description                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------- |
| **A) Authenticated only (Recommended)** | Only logged-in users can fetch categories. Consistent with existing claims API. |
| **B) Public endpoint**                  | Anyone can fetch categories without authentication.                             |

#### Answer

A. As the data are sensitive to the company claim policy.

---

### 4. Shared Types Package (@project/types)

What should happen to the ClaimCategory type in the shared package?

| Option                          | Description                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **A) Keep enum, add API types** | Keep ClaimCategory enum for type-safety, add IClaimCategoryResponse for API data.                            |
| **B) Remove enum entirely**     | Remove ClaimCategory enum, use only dynamic API response types. More flexible but loses compile-time safety. |

#### Answer

B.

---

## Current Hard-Coded Locations

| Location                                                               | What's Hard-Coded                             |
| ---------------------------------------------------------------------- | --------------------------------------------- |
| `backend/src/modules/claims/enums/claim-category.enum.ts`              | 8 category codes                              |
| `backend/src/modules/claims/constants/claim-limits.constants.ts`       | TELCO $150/mo, FITNESS $50/mo, DENTAL $300/yr |
| `backend/src/modules/claims/constants/claim-display-name.constants.ts` | Category display names                        |
| `frontend/src/lib/claim-utils.ts`                                      | MONTHLY_LIMITS, categoryNames                 |
| `frontend/src/lib/validation/multi-claim-validator.ts`                 | MONTHLY_LIMITS map                            |
| `packages/types/src/dtos/claim.dto.ts`                                 | ClaimCategory enum                            |

## Database State

- `claim_categories` table: uuid, code, name, isEnabled, timestamps
- `claim_category_limits` table: uuid, type (monthly/yearly), amount (in cents), category_id FK
- `claims` table: has both `category` enum column AND `category_id` FK
