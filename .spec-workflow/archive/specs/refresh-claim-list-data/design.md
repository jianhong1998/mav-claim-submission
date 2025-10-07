# Design: Fix Cache Invalidation Bug

## Problem

Mutations invalidate `['claims', 'draft']` but not `['claims', 'all']`, causing stale data on home page.

**Root Cause**: When users create/delete/update claims on `/new` page, only the draft claims cache refreshes. The "all claims" cache on `/` (home page) remains stale.

## Solution

Add `queryClient.invalidateQueries({ queryKey: ['claims', 'all'] })` to 4 mutation locations:

### File 1: `frontend/src/hooks/useMultiClaim.ts`

1. **createClaimMutation.onSuccess** (line ~97)
   ```typescript
   onSuccess: () => {
     void queryClient.invalidateQueries({ queryKey: draftClaimsQueryKey });
     void queryClient.invalidateQueries({ queryKey: ['claims', 'all'] }); // ADD THIS
   },
   ```

2. **updateClaimMutation.onSuccess** (line ~112)
   ```typescript
   onSuccess: () => {
     void queryClient.invalidateQueries({ queryKey: draftClaimsQueryKey });
     void queryClient.invalidateQueries({ queryKey: ['claims', 'all'] }); // ADD THIS
   },
   ```

3. **deleteClaimMutation.onSuccess** (line ~123)
   ```typescript
   onSuccess: () => {
     void queryClient.invalidateQueries({ queryKey: draftClaimsQueryKey });
     void queryClient.invalidateQueries({ queryKey: ['claims', 'all'] }); // ADD THIS
   },
   ```

### File 2: `frontend/src/components/claims/DraftClaimsList.tsx`

4. **deleteMutation.onSuccess** (line ~92)
   ```typescript
   onSuccess: () => {
     void queryClient.invalidateQueries({ queryKey: ['claims', 'draft'] });
     void queryClient.invalidateQueries({ queryKey: ['claims', 'all'] }); // ADD THIS
     toast.success('Claim deleted successfully');
   },
   ```

## Testing

**Update existing tests**: Verify both `['claims', 'draft']` AND `['claims', 'all']` query keys are invalidated in `frontend/src/hooks/__tests__/useMultiClaim.test.tsx`.

**Manual verification**:
1. Go to `/new`, create claim → Navigate to `/` → Verify claim appears without refresh
2. Go to `/new`, delete claim → Navigate to `/` → Verify claim removed without refresh
3. Go to `/new`, upload file → Navigate to `/` → Verify attachment count updated without refresh

## Implementation Notes

- Total changes: 4 lines across 2 files
- No breaking changes
- No new dependencies
- Uses existing React Query infrastructure

**Principle**: When data changes, invalidate ALL caches showing that data.
