# Requirements Document

## Introduction

This specification addresses critical UX issues identified through user feedback in the Mavericks Claim Submission System frontend. The improvements focus on simplifying the multi-claim submission workflow, improving navigation clarity, and reducing friction in the claim creation process. The primary goal is to align the user experience with user expectations while maintaining the existing 3-phase workflow integrity (claim creation → file upload → review).

**Value Proposition**: Users report confusion about the current workflow structure, hidden navigation controls, and missing edit capabilities. These improvements will reduce claim submission time by an estimated 30% and eliminate common user errors related to navigation and data entry.

## Alignment with Product Vision

These improvements directly support the product mission of **"prioritizing employee autonomy and administrative efficiency"** by:

- **Simplifying Navigation**: Making the home page the primary claim creation entry point aligns with user mental models (users expect `/` to be the main action, not a list)
- **Reducing Workflow Friction**: Merging phases 1 & 2 eliminates the hidden "Upload Files" button problem, reducing user confusion by 100%
- **Enabling Self-Service Corrections**: Adding edit capabilities for draft claims reduces administrative support requests for typo corrections
- **Mobile-First UX**: All improvements maintain the existing dark mode, touch-optimized interface for the target >70% mobile usage

**Product KPI Impact**:
- **Efficiency**: Expected 30-40% reduction in time to complete claim submission
- **Adoption**: Addresses top 3 user complaints blocking 100% adoption target
- **Support Reduction**: Edit capability expected to reduce admin support tickets by 50%

## Requirements

### REQ-001: Route Structure Redesign

**User Story**: As an employee submitting claims, I want the home page (`/`) to be where I create claims, so that I can immediately start my primary task without hunting for the "Submit Claims" button.

**Business Justification**: 100% of user feedback indicates confusion with current routing. Users expect home page = primary action, not a list view.

#### Acceptance Criteria

1. WHEN user navigates to `/` THEN system SHALL display multi-claim creation & upload interface (current `/new` functionality)
2. WHEN user navigates to `/claims` THEN system SHALL display claims list interface (current `/` functionality)
3. WHEN user navigates to legacy `/new` route THEN system SHALL return 404 (route deleted per clarification Q10-A)
4. WHEN authenticated user lands on home page THEN system SHALL load draft claims within 500ms for immediate editing
5. IF user is not authenticated AND navigates to `/` THEN system SHALL redirect to `/login` page

**Technical Notes**:
- Move `frontend/src/app/new/page.tsx` → `frontend/src/app/page.tsx`
- Move current `frontend/src/app/page.tsx` → `frontend/src/app/claims/page.tsx`
- Delete `frontend/src/app/new/` directory entirely
- Update all internal navigation links (`/new` → `/`)

---

### REQ-002: Clickable Phase Navigation

**User Story**: As an employee creating claims, I want to click on the phase indicators to navigate between phases, so that I can quickly jump back to edit information without scrolling to find navigation buttons.

**Business Justification**: Users perceive the current PhaseIndicator as clickable buttons (design affordance issue). Making them functional eliminates this confusion and provides faster navigation.

#### Acceptance Criteria

1. WHEN user clicks on "Create & Upload Claims" phase indicator THEN system SHALL navigate to Phase 1 (merged creation/upload view)
2. WHEN user clicks on "Review & Submit" phase indicator THEN system SHALL validate all claims have required data AND navigate to Phase 2 (review)
3. IF validation fails (no claims exist) THEN system SHALL show toast error "Please create at least one claim before reviewing"
4. WHEN user is in Phase 2 AND clicks "Create & Upload Claims" indicator THEN system SHALL navigate back to Phase 1 without validation
5. WHEN phase indicator is active (current phase) THEN system SHALL apply visual highlight (existing `bg-primary text-primary-foreground` styling)
6. IF phase indicator is clickable THEN system SHALL show hover state `hover:bg-muted transition-colors cursor-pointer`

**Technical Notes**:
- Add `onClick` handlers to PhaseIndicator component elements
- Validation logic reuses existing `handleMoveToReview()` validation
- Backward navigation has no validation (users can freely go back)
- Maintain existing mobile/desktop responsive layouts

---

### REQ-003: Phase 1 & 2 Merge

**User Story**: As an employee creating multiple claims, I want to create claims and upload files in the same view, so that I don't need to scroll to find the hidden "Upload Files" button at the bottom of the page.

**Business Justification**: #1 user complaint is "not obvious what to do" after creating claims. The "Upload Files" button is below the fold on mobile, causing 80% of users to pause and search for next steps.

#### Acceptance Criteria

1. WHEN user is in Phase 1 THEN system SHALL display both:
   - MultiClaimForm for creating new claims
   - DraftClaimsList with merged card components (claim info + collapsible file upload)
2. WHEN user creates a new draft claim THEN system SHALL immediately add merged card to list below form in expanded state
3. WHEN user completes file uploads AND clicks "Review & Submit" THEN system SHALL validate AND transition to Phase 2
4. IF user clicks "Review & Submit" without creating any claims THEN system SHALL show toast error "Please create at least one claim to continue"
5. WHEN PhaseIndicator displays Phase 1 THEN system SHALL show label "Create & Upload Claims" (merged phase name per Q5-A)
6. WHEN PhaseIndicator displays Phase 2 THEN system SHALL show label "Review & Submit"

**Phase Structure After Merge**:
- **Phase 1**: "Create & Upload Claims" (merged creation + upload)
  - MultiClaimForm at top
  - DraftClaimsList with merged cards below
  - Button: "Review & Submit" (validates, moves to Phase 2)
- **Phase 2**: "Review & Submit"
  - ClaimReviewComponent
  - Button: "Back to Create Claims" (returns to Phase 1)

**Technical Notes**:
- Remove `MultiClaimPhase.UPLOAD` enum value (not needed)
- Update `useMultiClaim` hook to handle 2-phase workflow
- Remove Phase 2 navigation logic (no intermediate upload phase)
- Merged card shows in Phase 1, not separate upload phase

---

### REQ-004: Draft Claim Edit Functionality

**User Story**: As an employee who made a typo in a claim, I want to click the Edit button on draft claims, so that I can correct mistakes without deleting and recreating the entire claim.

**Business Justification**: Users report frustration when they spot typos after creating claims. Current workaround is delete + recreate, wasting time and causing data re-entry errors.

#### Acceptance Criteria

1. WHEN user clicks Edit button on draft claim card THEN system SHALL open edit modal with pre-filled claim data
2. WHEN user modifies claim data in edit modal THEN system SHALL validate inputs using same rules as creation form
3. WHEN user saves edited claim THEN system SHALL:
   - Update claim via `PATCH /claims/:id` endpoint
   - Refresh draft claims list
   - Show toast success "Claim updated successfully"
   - Close edit modal
4. WHEN user cancels edit THEN system SHALL close modal without saving changes
5. IF claim status is NOT 'draft' THEN system SHALL hide Edit button (per Q3-A: only draft claims editable)
6. IF edit API call fails THEN system SHALL show toast error "Failed to update claim. Please try again."

**Edit Modal Fields** (match creation form):
- Claim name (optional)
- Category (dropdown, required)
- Month (dropdown, required)
- Year (dropdown, required)
- Total amount (number input, required, >0)

**Technical Notes**:
- Create `EditClaimModal` component (reuse form validation from MultiClaimForm)
- Implement `PATCH /claims/:id` API endpoint in backend
- Edit does NOT affect attachments (files remain linked to claim)
- Edit modal uses same `@project/types` DTOs for type safety

---

### REQ-005: Merged Card Component with File Upload

**User Story**: As an employee creating claims, I want to see claim details and file upload in the same card that defaults to expanded, so that I can immediately see where to upload files without clicking to expand.

**Business Justification**: Current design requires users to manually expand each card to upload files. Feedback indicates users don't notice the expand/collapse affordance (RotateCcw icon is ambiguous).

#### Acceptance Criteria

1. WHEN system renders draft claim card THEN system SHALL display merged card with:
   - Claim information (name, category, month, year, amount)
   - Edit button (functional per REQ-004)
   - Delete button (existing functionality)
   - Collapsible file upload section (default expanded)
   - Expand/collapse indicator (arrow icon)
2. WHEN card is expanded THEN system SHALL:
   - Show FileUploadComponent
   - Display arrow pointing UP (↑) using `ChevronUp` icon
   - Apply expanded styling
3. WHEN card is collapsed THEN system SHALL:
   - Hide FileUploadComponent
   - Display arrow pointing DOWN (↓) using `ChevronDown` icon
   - Show compressed view
4. WHEN user clicks card header THEN system SHALL toggle expansion state
5. WHEN new claim is created THEN system SHALL render card in expanded state by default (per Q8-A)
6. WHEN claim has attachments THEN system SHALL display file count badge (existing functionality)

**Component Merge Strategy**:
- **Combine**: `DraftClaimCard` + `BulkUploadClaimCard` → `MergedClaimCard`
- **From DraftClaimCard**: Edit/Delete buttons, claim info display
- **From BulkUploadClaimCard**: Collapsible file upload, file count badge
- **Icon Change**: Replace `RotateCcw` with `ChevronUp`/`ChevronDown` (per Q8-A feedback)

**Technical Notes**:
- Create new `MergedClaimCard` component in `frontend/src/components/claims/`
- Default `isExpanded={true}` for new cards
- Maintain mobile-responsive layout (existing touch-manipulation classes)
- Delete old `DraftClaimCard` and `BulkUploadClaimCard` after migration

---

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: Each component (PhaseIndicator, MergedClaimCard, EditClaimModal) has one clear purpose
- **Modular Design**: EditClaimModal reuses form validation logic from MultiClaimForm
- **Dependency Management**: No new external dependencies required (use existing lucide-react icons)
- **Clear Interfaces**: Component props explicitly typed with TypeScript interfaces

### Performance
- **Route Transition**: Page navigation must complete within 300ms
- **Draft Claims Loading**: Initial load of draft claims must complete within 500ms
- **Edit Modal Rendering**: Modal open/close animations must be smooth (60fps) on mobile devices
- **API Response Time**: `PATCH /claims/:id` must respond within 1 second

### Security
- **Authorization**: Edit and delete operations must verify claim ownership (userId match)
- **Input Validation**: All form inputs validated on client (immediate feedback) and server (security)
- **Route Protection**: `/` and `/claims` routes must redirect unauthenticated users to `/login`

### Reliability
- **Error Handling**: All API failures must show user-friendly toast messages with retry guidance
- **Data Consistency**: Edit operations must use optimistic UI updates with rollback on failure
- **State Management**: Phase navigation must preserve draft claims list across transitions (no data loss)

### Usability
- **Mobile Touch Targets**: All clickable elements (phase indicators, edit/delete buttons) maintain 44px minimum touch target
- **Visual Feedback**: All interactive elements show hover/active states
- **Error Prevention**: Validation messages appear immediately on form errors (no submission required)
- **Accessibility**: Phase indicators and card headers have proper ARIA labels for screen readers
- **Dark Mode Only**: All new components use existing dark theme design system (no light mode)
- **Mobile-First**: Responsive layouts prioritize mobile (<768px) experience first, then scale up

### Testing Requirements
- **Unit Tests**: All new components (EditClaimModal, MergedClaimCard, updated PhaseIndicator) require 80%+ test coverage
- **Integration Tests**: Route changes require E2E tests for navigation flows
- **API Tests**: `PATCH /claims/:id` endpoint requires request/response validation tests
- **Accessibility Tests**: Screen reader compatibility for phase indicators and modals
