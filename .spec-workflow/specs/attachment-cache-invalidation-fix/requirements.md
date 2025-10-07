# Requirements Document

## Problem Statement

**Bug:** Uploaded attachments don't appear in review page.

**Root Cause:** Two different cache keys for the same draft claims data:
- `useMultiClaim.ts:62-70` uses `['email', 'list', 'draft-claims']`
- `ClaimReviewComponent.tsx:214` uses `['claims', 'draft']`

Missing cache invalidation after attachment upload causes stale data.

**Impact:** Users cannot verify uploaded files before submission.

## Requirements

### Requirement 1: Unified Query Key

Change `useMultiClaim` to use `['claims', 'draft']` for cache consistency.

#### Acceptance Criteria

1. `useMultiClaim.ts` draftClaimsQueryKey = `['claims', 'draft']`
2. All invalidation calls updated to use `['claims', 'draft']`
3. No code remains that references `['email', 'list', 'draft-claims']`

#### Backward Compatibility

**Current invalidation sites using old key:**
- `useMultiClaim.ts:106` - createClaimMutation onSuccess
- `useMultiClaim.ts:121` - updateClaimMutation onSuccess
- `useMultiClaim.ts:132` - deleteClaimMutation onSuccess
- `useMultiClaim.ts:149` - markClaimsReadyMutation onSuccess

**Migration Strategy:** Change all at once (atomic update - single commit).

### Requirement 2: Invalidate Cache After Upload

After `/attachments/metadata` succeeds, invalidate `['claims', 'draft']`.

#### Acceptance Criteria

1. FileUploadComponent calls `queryClient.invalidateQueries({ queryKey: ['claims', 'draft'] })` after successful upload
2. Attachments appear in all UI components immediately after upload
3. No manual refresh required

#### Testing

**Success Criteria:**
1. Upload file → attachment count increases in BulkFileUploadComponent
2. Navigate to review → uploaded files visible
3. Upload another file → count updates in both upload and review views

## Non-Functional Requirements

### Performance
- Selective invalidation: only `['claims', 'draft']`, not all claims
- React Query handles refetch automatically (no manual logic)

### Reliability
- Backend already returns attachments relation (`ClaimsController.ts:620`)
- Stale data never displayed after successful upload
