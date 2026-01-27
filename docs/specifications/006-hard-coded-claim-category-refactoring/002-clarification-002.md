# Follow-up Clarification Questions - Hard-Coded Claim Category Refactoring

## Context

Based on your answers in `002-clarification-001.md`:

1. **Migration**: Remove enum column
2. **Validation**: Frontend + Backend (both)
3. **Authentication**: Authenticated only
4. **Shared Types**: Remove enum entirely

I have the following follow-up concerns:

---

## Concern 1: API Response Structure

Currently, `IClaimMetadata` returns:

```typescript
{
  category: 'telco',  // just the code string
  // ...other fields
}
```

After removing the enum and using dynamic types, should the claim response:

| Option                       | Response Structure                                               | Impact                                                                                    |
| ---------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **A) Keep flat**             | `category: string` (just the code like 'telco')                  | Minimal change. Frontend must call categories API separately to get display names/limits. |
| **B) Embed category object** | `category: { code: string, name: string, limit: {...} \| null }` | More data per request. Frontend has everything in one call. Breaking API change.          |

#### Answer

A. Let frontend fetch the actual category data from the specific category endpoint (Example: `/claim-category`).

---

---

## Concern 2: Frontend Category Fetching Timing

Since categories API is authenticated (your answer), and frontend needs limits for validation (your answer), the frontend must:

1. Fetch categories after user logs in
2. Cache/store them in state (React Query or context)
3. Use cached data for form validation and display

Is this the expected flow? Or do you have a different approach in mind?

#### Answer

Yes, this is the expected flow.

---

---

## Concern 3: Removing Enum - Type Safety Trade-off

Removing `ClaimCategory` enum entirely means:

- `category` becomes `string` type everywhere
- Typos like `'teleco'` instead of `'telco'` won't be caught at compile time
- Only caught at runtime when backend rejects invalid category

Are you okay with this trade-off, or would you prefer a middle ground (e.g., keeping a union type derived from API response)?

#### Answer

Type safety should be fine. As long as it is properly handled. For example, when want to verify the category code, need to fetch from database to ensure the category is exist and the claim amount is within the limit.

---

---

## Summary of Decisions

| Decision | Choice |
|----------|--------|
| API Response Structure | **Keep flat** - `category: string` (code only). Frontend fetches full category data from `/claim-category` endpoint separately. |
| Frontend Fetching Flow | **Confirmed** - Fetch categories after login, cache in React Query, use cached data for validation and display. |
| Type Safety Approach | **Runtime validation** - Category becomes `string` type. Backend validates category exists in DB and enforces limits. |
