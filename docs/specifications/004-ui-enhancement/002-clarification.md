# Q1: Home Page Route (Feedback 001)

Should / redirect to /new, or should we move the create claim functionality to / and rename routes?

Option A: Keep /new for creation, make / redirect there
Option B: Move creation to /, rename current / to /claims or /history

## Answer

Option B - Move creation to /, list to /claims. Simpler mental model.

# Q2: Phase Combination Strategy (Feedback 003)

This is a MAJOR UX change. Which approach:

Option A: Combine phases 1 & 2, keep phase 3 (review) separate

- Create claim form with inline file upload
- Separate review/submit step

Option B: Collapse all phases into single form

- Everything on one page with expandable sections

Option C: Keep phase concept but make all accessible/visible

- Accordion-style with all phases shown

## Answer

Proceed with option A.
Users have 2 place to upload files:

1. `Create draft claim` form
2. Each `DraftClaimCard`

Note that project documents might need to update due to the changes.

# Q3: Edit Capability Scope (Feedback 004)

What claims should be editable?

Option A: Only draft claims (status = 'draft')
Option B: Draft + sent claims (requires email resend)
Option C: All claims (including paid) - audit trail concern

## Answer

Option A.

# Q4: Profile Page Design (Feedback 005)

Username/Email changes:

- Apply to all existing claims or only new ones?
- Require re-authentication for email change?

CC/BCC email addresses:

- Per-claim setting (different recipients per claim)?
- Global user preference (same recipients for all claims)?
- Both options available?

## Answer

For now just a global user preference is good enough, which will be applied to all the email sending after the email address added.

---

# Additional Technical Clarifications (Based on Current Implementation)

## Q5: Phase Indicator After Merge

If we combine phases 1 & 2, should the PhaseIndicator show:

**Option A**: 2 phases: "Create & Upload Claims" → "Review & Submit"
**Option B**: Keep 3 phases visually but phases 1 & 2 both map to same view: "Create Claims" → "Upload Files" → "Review & Submit"

Current implementation: PhaseIndicator is inline component in new/page.tsx (lines 122-224)

### Answer

Option A.

## Q6: PhaseIndicator Clickability Behavior

If PhaseIndicator becomes clickable (Feedback 002):

**Option A**: Users can navigate both forward and backward freely
**Option B**: Users can only navigate backward (can't skip validation by jumping forward)
**Option C**: Keep existing button navigation, make PhaseIndicator read-only visual indicator

### Answer

User should be freely to navigate forward and backward. But validation still apply. Means the effect is actually the same with clicking `Review & submit` button (forward) and `back to create claim` button (backward).

## Q7: File Upload Flow in Combined Phase

You said users have 2 places to upload files:

1. Create draft claim form
2. Each DraftClaimCard

**Clarification needed**:

- If user uploads files in the create form, do those files immediately attach to the claim when they click "Add Claim"?
- Then later, can they add MORE files by expanding the DraftClaimCard?
- Or should the create form NOT have file upload, and ALL file uploads happen via the card?

Current: MultiClaimForm has no file upload. BulkUploadClaimCard handles all uploads in Phase 2.

### Answer

Actually you are right, before user clicking `Add draft to list` button, the claim is not created. Means an attachment cannot be added to a claim immediately after the uploading process is done.
So we should make the create form NOT have file upload. Then users can only upload files in the card.
Note that this is happen in phase 1.

## Q8: Card Component Merge Strategy

Feedback 003 says "Replace DraftClaimCard with BulkUploadClaimCard and combine functionality."

**Current components**:

- **DraftClaimCard** (Phase 1): Shows claim info, has Edit/Delete buttons, NO file upload
- **BulkUploadClaimCard** (Phase 2): Shows claim info, file count badge, collapsible file upload section, NO edit/delete

**Merged component should have**:

- Claim info display ✓
- Edit button (make functional per Feedback 004)
- Delete button
- File upload section (collapsible)
- Default to expanded or collapsed? (Feedback 003 says "default to expanded")

**Question**: Should the merged card:

- Always show expanded in the combined phase?
- Start collapsed if claim has no files, expanded if it has files?
- Always start collapsed (user manually expands)?

### Answer

The merged card should always default to expanded. User can click on the card itself to collapse.
Also, the icon in current `BulkUploadClaimCard` is not obvious to user about the card is expandable/collapsable. Please change it to an arrow icon (example : `V`). When the card is expanded, the arrow should point up, and when the card is collapsed, then the arrow should point down.

## Q9: Navigation Button After Phase Merge

Current Phase 1 button: "Upload Files" (moves to Phase 2)
Current Phase 2 button: "Review & Submit" (moves to Phase 3)

After merging Phase 1 & 2:

**Option A**: Single button "Review & Submit" (validates all claims have files)
**Option B**: No phase transition button, just "Submit" button in merged view
**Option C**: Keep two-step with intermediate validation checkpoint

### Answer

Validation checkpoint is still required.

## Q10: Route Structure Changes

You chose Option B: "/" for creation, "/claims" for list

**Question**: What happens to existing "/new" route?

**Option A**: DELETE /new entirely, move all logic to /
**Option B**: Keep /new but redirect it to / for backward compatibility
**Option C**: Keep both routes functional (same page, different URLs)

Current structure:

- `/` (page.tsx) → "All Claims" list page
- `/new` (new/page.tsx) → Multi-claim submission page (3 phases)

### Answer

Option A.
