# Tasks: Fix Cache Invalidation Bug

## Task Breakdown

- [x] 1. Add cache invalidation to mutation callbacks
  - Files:
    - `frontend/src/hooks/useMultiClaim.ts` (3 locations)
    - `frontend/src/components/claims/DraftClaimsList.tsx` (1 location)
  - Add `queryClient.invalidateQueries({ queryKey: ['claims', 'all'] })` to 4 mutation onSuccess callbacks
  - _Leverage: Existing `queryClient.invalidateQueries()` pattern already in place_
  - _Requirements: 1.1, 1.2, 1.3_
  - _Prompt: Implement the task for spec refresh-claim-list-data, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer | Task: Add `queryClient.invalidateQueries({ queryKey: ['claims', 'all'] })` to 4 mutation onSuccess callbacks: (1) createClaimMutation.onSuccess line ~97 in useMultiClaim.ts, (2) updateClaimMutation.onSuccess line ~112 in useMultiClaim.ts, (3) deleteClaimMutation.onSuccess line ~123 in useMultiClaim.ts, (4) deleteMutation.onSuccess line ~92 in DraftClaimsList.tsx | Restrictions: Do not modify any other code, keep existing `['claims', 'draft']` invalidation, add the new line immediately after existing invalidation | Success: All 4 mutations now invalidate both `['claims', 'draft']` AND `['claims', 'all']` query keys | Instructions: Mark this task as in-progress `[-]` in tasks.md before starting, mark as complete `[x]` when done_

- [x] 2. Update unit tests
  - File: `frontend/src/hooks/__tests__/useMultiClaim.test.tsx`
  - Verify both `['claims', 'draft']` and `['claims', 'all']` query keys are invalidated in mutation tests
  - _Leverage: Existing test structure with mocked `invalidateQueries()`_
  - _Requirements: 1.4_
  - _Prompt: Implement the task for spec refresh-claim-list-data, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer | Task: Update existing mutation tests in useMultiClaim.test.tsx to verify `invalidateQueries()` is called with both `['claims', 'draft']` AND `['claims', 'all']` query keys | Restrictions: Do not add new tests, only update existing mutation tests to verify the additional invalidation call | Success: All mutation tests verify both query keys are invalidated, tests pass | Instructions: Mark this task as in-progress `[-]` in tasks.md before starting, mark as complete `[x]` when done_

- [x] 3. Manual verification
  - Verify fix works in browser
  - Test scenarios:
    1. Create claim on `/new` → Navigate to `/` → Verify claim appears without refresh
    2. Delete claim on `/new` → Navigate to `/` → Verify claim removed without refresh
    3. Upload file on `/new` → Navigate to `/` → Verify attachment count updated without refresh
  - _Requirements: All_
  - _Prompt: Implement the task for spec refresh-claim-list-data, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer | Task: Perform manual browser testing following the 3 test scenarios: (1) Create claim verification, (2) Delete claim verification, (3) Upload file verification | Restrictions: Do not skip any scenario, test in actual browser with services running | Success: All 3 scenarios work without manual page refresh, claim list updates automatically | Instructions: Mark this task as in-progress `[-]` in tasks.md before starting, mark as complete `[x]` when done_

## Summary

**Total tasks**: 3
**Estimated effort**: 30 minutes
**Risk**: Zero - adding cache invalidation cannot break existing functionality
