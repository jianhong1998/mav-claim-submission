# Design Document

## Overview

Fix cache inconsistency causing uploaded attachments to not appear in review page. Two-line change: unify query key + add cache invalidation.

## Code Reuse Analysis

**No new code needed.** React Query and backend already handle everything. Just fix the query keys.

### Existing Components to Leverage
- **React Query**: Built-in cache invalidation and refetch (no custom logic needed)
- **useMultiClaim**: Change one constant
- **useAttachmentUpload**: Add one invalidation call
- **Backend ClaimsController**: Already returns attachments relation (line 620)

### Integration Points
- **Query Key Pattern**: `['claims', 'draft']` (already used by ClaimReviewComponent)
- **Cache Invalidation**: `queryClient.invalidateQueries()` (already available)

## Architecture

**No architecture changes.** This is a bug fix, not a feature.

**Current Problem:**
```typescript
// useMultiClaim.ts:62-70
const draftClaimsQueryKey = ['email', 'list', 'draft-claims'];  // WRONG

// ClaimReviewComponent.tsx:214
queryKey: ['claims', 'draft']  // CORRECT

// useAttachmentUpload.ts:377 - only invalidates attachments
queryClient.invalidateQueries({
  queryKey: attachmentQueryKeys.list(claimId),  // Doesn't touch claims cache
});
```

**Fixed:**
```typescript
// useMultiClaim.ts:62-70
const draftClaimsQueryKey = ['claims', 'draft'];  // FIXED

// useAttachmentUpload.ts:377 - invalidate both
queryClient.invalidateQueries({
  queryKey: attachmentQueryKeys.list(claimId),
});
queryClient.invalidateQueries({
  queryKey: ['claims', 'draft'],  // ADDED
});
```

## Components and Interfaces

### Component 1: useMultiClaim.ts
- **Purpose:** Change query key from `['email', 'list', 'draft-claims']` to `['claims', 'draft']`
- **File:** `frontend/src/hooks/useMultiClaim.ts`
- **Line:** 62-70
- **Change:** One constant reassignment
- **Dependencies:** None changed
- **Reuses:** Existing React Query cache

### Component 2: useAttachmentUpload.ts
- **Purpose:** Invalidate claims cache after upload
- **File:** `frontend/src/hooks/attachments/useAttachmentUpload.ts`
- **Line:** 375-379 (onSuccess handler)
- **Change:** Add one invalidateQueries call
- **Dependencies:** queryClient (already imported)
- **Reuses:** Existing React Query invalidation

## Data Models

**No data model changes.** Backend already returns:
```typescript
// ClaimsController.ts:620
relation: { attachments: true }
```

Attachments array already in response. Just need to refresh the cache.

## Error Handling

**No new error handling needed.**

React Query handles errors automatically:
- Failed refetch → shows stale data with background retry
- Network error → useQuery.isError flag
- Existing error boundaries already catch query errors

## Testing Strategy

### Manual Test (30 seconds)
1. Create claim → upload file → see count increase
2. Click "Review" → uploaded files visible
3. Upload another → count updates everywhere

**Success:** No manual refresh needed. Attachment count live updates.

### Edge Cases (already handled by React Query)
- Upload fails → cache not invalidated (correct)
- Network offline → stale data shown (correct)
- Multiple uploads → all invalidations batched (React Query does this)

### No Unit Tests Needed
This fixes broken behavior. If manual test passes, it works. Unit testing cache invalidation is testing React Query, not our code.
