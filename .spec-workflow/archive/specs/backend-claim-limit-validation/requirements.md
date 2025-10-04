# Requirements Document

## Introduction

This feature adds backend enforcement of monthly claim limits to prevent data integrity issues. Currently, only the frontend validates monthly limits ($150 for Telco, $50 for Fitness), but the backend accepts any valid-format request. This creates a vulnerability where malicious actors or buggy clients can bypass frontend checks and submit claims exceeding monthly limits through direct API calls.

The backend will become the authoritative validator while frontend validation remains for instant user feedback. This implements defense-in-depth by enforcing business rules at both presentation and API layers.

**Critical Gap**: Without backend validation, the system cannot guarantee data integrity or prevent financial fraud through API manipulation.

## Alignment with Product Vision

This feature directly supports the **Compliance & Audit Trail** core product requirement by ensuring data integrity at the API layer. Enforcing monthly limits in the backend prevents financial irregularities and maintains accurate expense tracking aligned with company policies.

**Business Rules Enforcement**:
- Telco: SGD $150/month per employee
- Fitness: SGD $50/month per employee
- Other categories: Unlimited (dental, skill-enhancement, company-event, company-lunch, company-dinner, others)

**Security Enhancement**: Implements API-level business rule validation as defense-in-depth security, complementing existing Google OAuth authentication.

## Requirements

### Requirement 1: Create Claim Limit Validation

**User Story:** As an employee, I want the backend to validate my claim against monthly limits immediately, so that I receive clear feedback before uploading files and don't waste time on claims that will be rejected.

#### Acceptance Criteria

1. WHEN an employee submits a create claim request (POST /claims) AND the category is Telco or Fitness THEN the backend SHALL retrieve all existing non-deleted claims for the same userId, category, month, and year using TypeORM repository methods
2. WHEN calculating the total THEN the backend SHALL sum the totalAmount of all retrieved claims plus the new claim amount
3. IF the total exceeds the category's monthly limit THEN the backend SHALL reject the request with HTTP 422 Unprocessable Entity AND return a structured error message containing: category name, monthly limit, current total, attempted amount, and resulting total
4. WHEN the category has no monthly limit (dental, skill-enhancement, company-event, company-lunch, company-dinner, others) THEN the backend SHALL skip limit validation entirely
5. WHEN retrieving existing claims THEN the backend SHALL use TypeORM's default soft-delete filtering (deleted claims automatically excluded)

**Technical Constraints**:
- Use `claimDBUtil.getAll({ criteria: { userId, category, month, year } })` to fetch matching claims
- Calculate sum using array `.reduce()` method: `claims.reduce((sum, claim) => sum + claim.totalAmount, 0)`
- Monthly limits stored as private class constants: `{ [ClaimCategory.TELCO]: 150, [ClaimCategory.FITNESS]: 50 }`
- Soft-deleted claims automatically excluded by TypeORM (no special handling needed)

**Performance Assumption**: Limited categories have low claim counts per month (typically 2-5 claims), making in-memory summation acceptable. If claim volumes exceed 20 claims/month/category, this approach should be re-evaluated for query-level aggregation.

### Requirement 2: Update Claim Limit Validation

**User Story:** As an employee, I want the backend to re-validate limits when I update my draft claim details, so that I cannot accidentally exceed monthly limits by modifying amounts or categories.

#### Acceptance Criteria

1. WHEN an employee submits an update claim request (PUT /claims/:id) AND any limit-relevant field changes (category, month, year, or totalAmount) THEN the backend SHALL re-validate monthly limits using the updated values
2. WHEN fetching existing claims for validation THEN the backend SHALL exclude the claim being updated (by claim ID) to prevent double-counting
3. IF the updated category is limited (Telco or Fitness) THEN the backend SHALL validate against the new category's limit for the specified month/year
4. IF the updated category is unlimited THEN the backend SHALL skip validation regardless of the previous category
5. WHEN only the totalAmount changes within the same limited category/month/year THEN the backend SHALL recalculate the total using: (sum of other claims) + (new amount)

**Edge Cases**:
- **Fitness → Dental**: No validation (unlimited category)
- **Dental → Fitness**: Validate against Fitness limit for specified month/year
- **Telco September → Telco October**: Validate against October's existing Telco claims
- **Amount change within same category/month**: Exclude current claim, add new amount, validate

**Calculation Logic for Updates**:
```typescript
// Pseudo-code for update validation
existingClaims = getAll({ userId, category: NEW_CATEGORY, month: NEW_MONTH, year: NEW_YEAR })
otherClaims = existingClaims.filter(claim => claim.id !== CLAIM_BEING_UPDATED_ID)
total = sum(otherClaims) + NEW_AMOUNT
if (total > limit) reject()
```

### Requirement 3: Clear Actionable Error Messages

**User Story:** As an employee, I want clear error messages when my claim exceeds monthly limits, so that I understand exactly why it was rejected and how much I can still claim this month.

#### Acceptance Criteria

1. WHEN a claim is rejected due to exceeding monthly limits THEN the error response SHALL include:
   - HTTP status: 422 Unprocessable Entity
   - Error type: "MONTHLY_LIMIT_EXCEEDED" (for programmatic handling)
   - Human-readable message with: category name (uppercase), monthly limit, current total, proposed amount, resulting total
2. WHEN the error occurs (create or update) THEN the message format SHALL be:
   `"TELCO monthly limit of $150.00 exceeded. Current: $120.00, Proposed: $50.00, Total: $170.00"`
3. WHEN formatting amounts THEN all currency values SHALL be formatted to exactly 2 decimal places with proper rounding

**Message Format Requirements**:
- Category: UPPERCASE (TELCO, FITNESS)
- Currency: "SGD $" prefix with 2 decimal places ($150.00, $50.50)
- Structure: "LIMIT exceeded. Current: X, Proposed: Y, Total: Z"
- Clarity: Message should immediately tell employee how much they've already claimed and how much they're proposing to add
- Consistency: Same message format for both create and update operations

**Error Response Structure** (for API documentation):
```json
{
  "statusCode": 422,
  "message": "TELCO monthly limit of $150.00 exceeded. Current: $120.00, Proposed: $50.00, Total: $170.00",
  "error": "Unprocessable Entity",
  "errorType": "MONTHLY_LIMIT_EXCEEDED"
}
```

### Requirement 4: Concurrent Request Handling Strategy

**User Story:** As a technical stakeholder, I need the system's behavior during concurrent claim submissions to be clearly defined and documented, so that we understand the tradeoffs between consistency guarantees and implementation complexity.

#### Acceptance Criteria

1. WHEN two claim requests are submitted concurrently for the same employee, category, and month THEN the system's behavior SHALL be documented as eventual consistency with possible race conditions
2. IF race conditions cause limit violations THEN the system SHALL detect this during periodic audits (future enhancement) but will NOT block concurrent requests in real-time
3. WHEN implementing validation logic THEN it SHALL use NestJS's default transaction isolation level (READ COMMITTED in PostgreSQL)
4. WHEN race conditions are detected in logs THEN they SHALL be flagged for manual review but not automatically reversed

**Race Condition Scenario** (documented acceptable behavior):
```
Timeline:
T0: Employee has $100 Telco claims for September
T1: Request A checks limit: $100 + $60 = $160 > $150 → REJECT ✓
T2: Request B checks limit: $100 + $40 = $140 < $150 → ACCEPT ✓
T3: Request A rejected, Request B saved
Result: $140 total (no race condition in this scenario)

Problem Scenario:
T0: Employee has $100 Telco claims
T1: Request A reads $100, calculates $100 + $55 = $155 > $150 → will reject
T2: Request B reads $100, calculates $100 + $55 = $155 > $150 → will reject
T3: Both rejected correctly (no race condition)

Actual Race Condition (rare):
T0: Employee has $100
T1: Request A reads $100
T2: Request B reads $100 (before A commits)
T3: Request A calculates $100 + $60 = $160 > $150 → reject
T4: Request B calculates $100 + $55 = $155 > $150 → reject
Result: No race condition due to atomic validation+save in transaction

True Race (extremely rare):
Only possible if validation and save are NOT in same transaction
```

**Decision**: Accept eventual consistency. Race conditions are **extremely rare** in practice because:
1. Single employee unlikely to submit 2+ claims simultaneously
2. NestJS request handling is sequential per user session
3. Cost of stricter isolation (SERIALIZABLE) outweighs minimal risk

**Future Enhancement**: Implement optimistic locking with version field on User entity if race conditions are observed in production logs.

### Requirement 5: Claim Status Inclusion Rules

**User Story:** As a developer, I need clear rules for which claim statuses count toward monthly limits, so that the validation logic is consistent and predictable across all scenarios.

#### Acceptance Criteria

1. WHEN calculating monthly totals THEN claims with status 'draft', 'sent', 'paid', and 'failed' SHALL all count toward the monthly limit
2. WHEN using TypeORM to fetch claims THEN soft-deleted claims SHALL automatically be excluded (TypeORM default behavior)
3. IF a claim's status changes (e.g., draft → sent → paid) THEN it SHALL continue counting toward the monthly limit without recalculation
4. WHEN a claim is soft-deleted THEN it SHALL immediately stop counting toward monthly limits for subsequent validations

**Rationale**:
| Status | Counts? | Reason |
|--------|---------|--------|
| draft | ✅ Yes | Represents committed expense waiting for file upload; prevents circumventing limits by creating multiple drafts |
| sent | ✅ Yes | Submitted to payroll for processing; represents actual expense claim |
| paid | ✅ Yes | Completed expense reimbursement; definitely counts toward monthly spending |
| failed | ✅ Yes | Temporary failure state; claim can be resent, represents valid expense attempt |
| deleted | ❌ No | Cancelled/invalid claim; employee decided not to pursue reimbursement |

**Technical Implementation**: TypeORM's `find()` method automatically excludes soft-deleted records (where `deletedAt IS NOT NULL`) unless `withDeleted: true` is specified. No special filtering needed.

## Non-Functional Requirements

### Code Architecture and Modularity

- **Single Responsibility**: Create private method `validateMonthlyLimit(userId, category, month, year, amount, excludeClaimId?)` in ClaimsController
- **Reusability**: Same validation method used by both `createClaim()` and `updateClaim()` endpoints
- **Separation of Concerns**: Validation logic in controller, data fetching via ClaimDBUtil, no business logic in DBUtil
- **Testability**: Validation method must be unit testable via protected accessor or test-specific public method
- **Constants Management**: Monthly limits defined as `private static readonly MONTHLY_LIMITS = { ... }` at class level

### Performance

- **Query Efficiency**: Single TypeORM `find()` call per validation (no N+1 queries)
- **Response Time**: Validation overhead target <100ms (expect ~20-50ms for typical scenarios)
- **Memory Footprint**: Acceptable to load 2-10 claim entities (typical monthly volume) for in-memory summation
- **Database Indexing**: Requires composite index on `(user_id, category, month, year)` for fast retrieval
- **Scalability Threshold**: If monthly claim counts exceed 20 per category, consider migrating to query-level aggregation (`SELECT SUM(total_amount) ...`)

### Security

- **Authoritative Validation**: Backend is single source of truth; frontend validation only for UX
- **Defense in Depth**: Even if frontend is bypassed/buggy, backend enforces limits
- **Input Validation**: Category, month, year values validated by existing DTO validators before limit check
- **Information Disclosure**: Error messages only expose current user's own claim totals (no cross-user data leakage)
- **Audit Trail**: All limit violations logged with user ID, category, amounts, timestamp for compliance review

### Reliability

- **Error Handling**: Database errors during validation result in HTTP 500 with generic message (don't expose DB internals)
- **Logging**: Log all validation attempts at INFO level, limit violations at WARN level
- **Idempotency**: Multiple validation calls with identical data produce identical results (pure function)
- **Transaction Safety**: Validation and claim creation/update occur in same database transaction (rollback on failure)
- **Graceful Degradation**: If ClaimDBUtil is unavailable, reject claim with 503 Service Unavailable (fail closed for security)

### Usability

- **Error Clarity**: Messages immediately actionable (employee knows exact remaining budget)
- **API Documentation**: OpenAPI/Swagger specs updated with 422 response examples for both endpoints
- **Developer Experience**: Use dedicated exception class `MonthlyLimitExceededException` for type-safe error handling
- **Frontend Compatibility**: Error response format matches existing frontend error parsing in `MultiClaimForm.tsx`
- **Consistency**: Validation behaves identically for create vs. update operations (predictable API behavior)

## Out of Scope

The following are explicitly **NOT** included in this specification:

1. **Frontend Modifications**: No changes to `multi-claim-validator.ts` or `MultiClaimForm.tsx` (frontend validation stays as-is)
2. **Configurable Limits**: Monthly limits remain hardcoded constants (no admin UI or database configuration)
3. **Historical Data Validation**: No backfilling or retroactive validation of claims created before this feature
4. **Limit Usage Analytics**: No dashboard, charts, or reporting on how close employees are to limits
5. **Proactive Notifications**: No email/push alerts when employees approach monthly limits
6. **Multi-Period Limits**: Only single-month limits supported (no quarterly, annual, or rolling 30-day limits)
7. **Partial-Month Limits**: No pro-rated limits for employees starting mid-month
8. **Manager Override Workflow**: No approval mechanism for exceptions or limit increases
9. **Category-Specific Rules**: No complex rules like "fitness + wellness combined limit" (each category independent)
10. **Optimistic Locking**: No version fields or row-level locking (accepting eventual consistency tradeoff)

## Success Criteria

This feature is successfully implemented when all of the following are verified:

1. ✅ **Functional**: Backend rejects all claims exceeding monthly limits with HTTP 422 status code
2. ✅ **Messaging**: Error responses include clear, formatted messages showing limit, current, attempted, and total amounts
3. ✅ **Consistency**: Both POST /claims and PUT /claims/:id endpoints validate limits using identical logic
4. ✅ **Edge Cases**: Update validation correctly excludes the claim being updated from total calculation
5. ✅ **Testing**: Unit tests cover: normal validation, limit exceeded, unlimited categories, update scenarios, concurrent requests
6. ✅ **Integration**: API integration tests demonstrate limit enforcement across multiple sequential requests
7. ✅ **Documentation**: OpenAPI/Swagger specs include 422 response examples with sample error messages
8. ✅ **Compatibility**: Existing frontend error handling works without modifications (verified in dev environment)
9. ✅ **Performance**: Validation adds <100ms overhead measured via integration tests
10. ✅ **Logging**: All limit violations logged with sufficient detail for audit trail (user ID, category, amounts, timestamp)

## Dependencies

**Required Infrastructure**:
- **Database**: PostgreSQL with existing Claims table (columns: id, userId, category, month, year, totalAmount, status, deletedAt)
- **ORM**: TypeORM with soft-delete enabled on ClaimEntity
- **Backend**: NestJS ClaimsController and ClaimDBUtil already implemented

**Required for Testing**:
- **Unit Tests**: Vitest configured for backend testing
- **Integration Tests**: Existing API test suite with claim creation endpoints

**Database Index Required**:
```sql
CREATE INDEX idx_claims_user_category_month_year
ON claims(user_id, category, month, year)
WHERE deleted_at IS NULL;
```
(Partial index for better performance by excluding deleted rows)

**Frontend Compatibility Assumption**:
- Frontend already handles HTTP 422 errors (verified in `MultiClaimForm.tsx` error handling)
- Error message format compatible with existing `toast.error()` usage

## Rollout Strategy

### Phase 1: Implementation & Testing (This Spec)
1. Implement validation logic in ClaimsController
2. Add unit tests for all scenarios
3. Add integration tests for limit enforcement
4. Update OpenAPI/Swagger documentation
5. Verify frontend compatibility in dev environment

### Phase 2: Deployment & Monitoring (Post-Implementation)
1. Deploy to staging environment
2. Run smoke tests against staging API
3. Monitor backend logs for validation errors
4. Collect metrics on validation performance (<100ms target)
5. Deploy to production with feature flag (if available)

### Phase 3: Observation & Iteration (Post-Deployment)
1. Monitor production logs for limit violations (expect initial spike as users adjust)
2. Analyze patterns: Are users repeatedly hitting limits? Specific categories?
3. Gather user feedback via support tickets on error message clarity
4. Measure race condition frequency (should be near-zero)
5. Assess if performance/scalability assumptions hold at production scale

### Future Enhancements (Separate Specs)
- **Admin Configuration UI**: Allow HR/finance to adjust monthly limits without code changes
- **Usage Analytics Dashboard**: Show employees their current month's claim usage and remaining budget
- **Proactive Notifications**: Email alerts when employees reach 80% of monthly limit
- **Manager Approval Workflow**: Allow one-time exceptions with manager approval for edge cases
- **Optimistic Locking**: Add version field to prevent race conditions if observed in production