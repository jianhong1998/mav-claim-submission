# Tasks Document

## Implementation Tasks for Frontend UX Improvements

### Phase 1: Core Hook and Enum Updates

- [x] 1. Update useMultiClaim hook to 2-phase workflow
  - File: `frontend/src/hooks/useMultiClaim.ts`
  - Remove `UPLOAD: 'upload'` from `MultiClaimPhase` enum (line 14-18)
  - Delete `moveToUploadPhase()` function (lines 184-188)
  - Update all references from 3-phase to 2-phase workflow
  - Purpose: Simplify state machine from 3 phases to 2 phases
  - _Leverage: Existing mutation hooks (createClaim, updateClaim, deleteClaim), React Query cache invalidation patterns_
  - _Requirements: REQ-003 (Phase 1 & 2 Merge)_
  - _Prompt: Implement the task for spec frontend-ux-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React Developer specializing in state management and custom hooks | Task: Update useMultiClaim hook to support 2-phase workflow by removing UPLOAD phase from MultiClaimPhase enum and deleting moveToUploadPhase function, following REQ-003. Maintain all existing mutation hooks and React Query patterns. | Restrictions: Do not modify createClaim, updateClaim, or deleteClaim hooks; Do not change React Query cache keys; Ensure moveToReviewPhase and resetToCreationPhase functions remain functional; Do not break existing phase transition logic | _Leverage: Existing React Query invalidation at lines 97-98, 113-114, 125-126; Existing phase state management at lines 53-55 | _Requirements: REQ-003 | Success: MultiClaimPhase enum has only CREATION and REVIEW values; moveToUploadPhase function deleted; All mutation hooks work correctly; Phase transitions function properly; No TypeScript compilation errors; Tests pass | Instructions: 1. Edit tasks.md and mark this task as in-progress [-]. 2. Implement the changes. 3. Test phase transitions. 4. Mark task as completed [x] in tasks.md._

### Phase 2: Form Component Unification

- [x] 2. Convert MultiClaimForm to ClaimFormModal with create/edit support
  - Files:
    - `frontend/src/components/claims/MultiClaimForm.tsx` (rename to `ClaimFormModal.tsx`)
    - `frontend/src/components/claims/ClaimFormModal.tsx` (new/modified)
  - Rename file from MultiClaimForm.tsx to ClaimFormModal.tsx
  - Wrap existing form in Dialog component (Shadcn/ui Dialog)
  - Add `isOpen` and `onClose` props for modal control
  - Add `initialValues?: Partial<IClaimMetadata>` prop for edit mode
  - Modify form to pre-fill fields when initialValues provided
  - Conditional title: "Add New Claim" (create) vs "Edit Claim" (edit with initialValues.id)
  - Update all imports referencing MultiClaimForm
  - Purpose: Unify create and edit forms into single component
  - _Leverage: Existing CategorySelect, MonthYearPicker, FormActions components; Existing useMultiClaimForm hook; Shadcn/ui Dialog component; react-hook-form validation_
  - _Requirements: REQ-004 (Draft Claim Edit Functionality)_
  - _Prompt: Implement the task for spec frontend-ux-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React Developer specializing in forms and modal dialogs | Task: Convert MultiClaimForm to ClaimFormModal supporting both create and edit modes following REQ-004. Wrap in Dialog component and add initialValues prop for edit mode pre-filling. Rename file and update all imports. | Restrictions: Do not modify CategorySelect, MonthYearPicker, or FormActions components; Reuse 100% of existing validation logic from useMultiClaimForm; Do not create separate edit modal component; Maintain existing form field structure and validation rules; Do not change form submission behavior beyond create/edit distinction | _Leverage: Existing form components at lines 23-24 (CategorySelect, MonthYearPicker); Existing validation hook useMultiClaimForm; Shadcn/ui Dialog from @/components/ui/dialog; react-hook-form at line 26 | _Requirements: REQ-004 | Success: MultiClaimForm.tsx renamed to ClaimFormModal.tsx; Component wrapped in Dialog with isOpen/onClose props; initialValues prop pre-fills form fields for edit mode; Dialog title shows "Add New Claim" or "Edit Claim" contextually; All imports updated; Form validation unchanged; Tests pass | Instructions: 1. Mark task as in-progress [-] in tasks.md. 2. Rename file and wrap in Dialog. 3. Add initialValues logic. 4. Update imports. 5. Test create and edit modes. 6. Mark complete [x] in tasks.md._

- [x] 3. Update form references in page component
  - File: `frontend/src/app/new/page.tsx`
  - Change all `MultiClaimForm` imports to `ClaimFormModal`
  - Update component usage to include modal props (isOpen, onClose)
  - Add state for modal visibility: `const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)`
  - Add state for editing: `const [editingClaim, setEditingClaim] = useState<IClaimMetadata | null>(null)`
  - Add second modal instance for edit mode with initialValues
  - Purpose: Update page to use unified form component
  - _Leverage: Existing handleClaimCreated callback at lines 76-84; Existing useMultiClaim hook usage_
  - _Requirements: REQ-004 (Draft Claim Edit Functionality)_
  - _Prompt: Implement the task for spec frontend-ux-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React Developer specializing in component integration and state management | Task: Update new/page.tsx to use ClaimFormModal instead of MultiClaimForm, adding modal state management for both create and edit modes following REQ-004. | Restrictions: Do not modify existing useMultiClaim hook usage; Do not change handleClaimCreated callback logic; Maintain existing error handling; Do not modify PhaseIndicator or other page components yet | _Leverage: Existing handleClaimCreated at lines 76-84; Existing useMultiClaim hook at lines 41-50; Existing state management patterns | _Requirements: REQ-004 | Success: Import changed from MultiClaimForm to ClaimFormModal; Modal state added (isCreateModalOpen, editingClaim); Two ClaimFormModal instances (create + edit); Create modal opens on "Add Claim" button; Edit modal opens when claim edit triggered; All existing functionality preserved; No TypeScript errors | Instructions: 1. Mark in-progress [-]. 2. Update imports and add state. 3. Add modal instances. 4. Test modal open/close. 5. Mark complete [x]._

### Phase 3: Card Component Enhancement

- [x] 4. Enhance DraftClaimCard with collapsible file upload
  - File: `frontend/src/components/claims/draft-claim-card.tsx`
  - Add expansion state: `const [isExpanded, setIsExpanded] = useState(defaultExpanded || false)`
  - Add `defaultExpanded?: boolean` prop to interface
  - Replace Edit button toast with functional `onEdit(claim)` call
  - Add collapse/expand button in CardHeader with ChevronUp/ChevronDown icons
  - Add conditional CardContent after existing content with FileUploadComponent
  - Import FileUploadComponent from `@/components/attachments/FileUploadComponent`
  - Add border-t class to uploaded files section
  - Purpose: Enable inline file upload and functional edit button
  - _Leverage: Existing DraftClaimCard layout and styling; Existing FileUploadComponent; Lucide-react icons (ChevronUp, ChevronDown)_
  - _Requirements: REQ-004 (Draft Claim Edit), REQ-005 (Merged Card Component)_
  - _Prompt: Implement the task for spec frontend-ux-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React Developer specializing in UI components and interactive elements | Task: Enhance DraftClaimCard by adding collapsible file upload section and making Edit button functional, following REQ-004 and REQ-005. Add expansion state and conditional FileUploadComponent rendering. | Restrictions: Do not merge display and upload into single monolithic component; Keep FileUploadComponent as separate conditionally-rendered child; Maintain existing claim info display structure; Do not modify Delete button logic; Keep existing mobile-responsive layout classes; Replace RotateCcw with ChevronUp/ChevronDown icons | _Leverage: Existing CardHeader/CardContent structure at lines 32-101; Existing FileUploadComponent from attachments module; Existing Button component styling; Lucide-react icons | _Requirements: REQ-004, REQ-005 | Success: Expansion state added with defaultExpanded prop; Edit button calls onEdit(claim) instead of showing toast; ChevronUp/ChevronDown icons toggle based on isExpanded; FileUploadComponent renders when expanded; Border-top separates upload section; Existing layout preserved; Mobile touch targets maintained (44px); Tests pass | Instructions: 1. Mark in-progress [-]. 2. Add expansion state and props. 3. Update Edit handler. 4. Add conditional FileUploadComponent. 5. Test expansion and file upload. 6. Mark complete [x]._

- [x] 5. Update DraftClaimsList to pass edit handler
  - File: `frontend/src/components/claims/DraftClaimsList.tsx`
  - Modify `handleEditClaim` function to call `onEditClaim(claim)` instead of showing toast (lines 65-72)
  - Remove toast.info call from handleEditClaim
  - Remove "not implemented yet" message
  - Ensure onEditClaim callback prop is properly used
  - Purpose: Connect card edit button to parent page modal
  - _Leverage: Existing onEditClaim prop handling; Existing DraftClaimCard integration at lines 131-140_
  - _Requirements: REQ-004 (Draft Claim Edit Functionality)_
  - _Prompt: Implement the task for spec frontend-ux-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React Developer specializing in component communication and event handling | Task: Update DraftClaimsList handleEditClaim to properly call onEditClaim callback instead of showing placeholder toast, following REQ-004. | Restrictions: Do not modify DraftClaimCard component here; Do not change handleDeleteClaim logic; Maintain existing props interface; Do not alter React Query integration; Keep existing error handling | _Leverage: Existing onEditClaim prop at line 21; Existing handleEditClaim callback structure at lines 65-72; Existing DraftClaimCard usage at lines 131-140 | _Requirements: REQ-004 | Success: handleEditClaim calls onEditClaim(claim) directly; Toast placeholder removed; onEditClaim prop properly utilized; Edit button triggers parent callback; No TypeScript errors; Tests pass | Instructions: 1. Mark in-progress [-]. 2. Update handleEditClaim logic. 3. Remove toast call. 4. Test edit callback. 5. Mark complete [x]._

### Phase 4: Page Component Updates

- [x] 6. Add clickable phase navigation to inline PhaseIndicator
  - File: `frontend/src/app/new/page.tsx`
  - Add `handlePhaseClick` function before PhaseIndicator component (around line 121)
  - Add onClick handlers to desktop phase divs (lines ~126-163)
  - Add onClick handlers to mobile phase indicator (lines ~167-223)
  - Add cursor-pointer class to clickable phase elements
  - Add validation: prevent Review phase click if claimsCount === 0 (show toast)
  - Add no-op check: if already on target phase, return early
  - Purpose: Make phase indicators interactive for navigation
  - _Leverage: Existing moveToReviewPhase and resetToCreationPhase from useMultiClaim; Existing toast notifications; Existing summary.claimsCount validation_
  - _Requirements: REQ-002 (Clickable Phase Navigation)_
  - _Prompt: Implement the task for spec frontend-ux-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React Developer specializing in user interaction and navigation | Task: Add onClick handlers to inline PhaseIndicator component enabling clickable phase navigation, following REQ-002. Add validation to prevent invalid transitions and provide user feedback. | Restrictions: Do not extract PhaseIndicator to separate component; Keep inline implementation; Maintain existing desktop and mobile responsive layouts; Do not modify PhaseIndicator visual styling; Use existing phase transition functions only; Add hover states with CSS classes | _Leverage: Existing moveToReviewPhase at line 190; Existing resetToCreationPhase at line 194; Existing summary.claimsCount at line 241; Existing toast from sonner at line 21; Existing cn utility for className merging | _Requirements: REQ-002 | Success: handlePhaseClick function added with phase validation; Desktop phase divs have onClick handlers; Mobile phase indicators clickable; cursor-pointer class added; Toast shown when clicking Review with no claims; No-op when clicking current phase; Existing layout preserved; Tests pass | Instructions: 1. Mark in-progress [-]. 2. Add handlePhaseClick function. 3. Add onClick to desktop/mobile phases. 4. Test phase navigation. 5. Mark complete [x]._

- [x] 7. Update Phase 1 rendering to show DraftClaimsList
  - File: `frontend/src/app/new/page.tsx`
  - Remove Phase 2 (UPLOAD) conditional rendering block entirely
  - Move DraftClaimsList from Phase 2 to Phase 1 (CREATION phase)
  - Update Phase 1 to render both ClaimFormModal instances (create + edit)
  - Remove BulkFileUploadComponent import and usage
  - Remove NavigationButtons for Phase 2 (UPLOAD)
  - Update "Upload Files" button to navigate directly to Review instead
  - Purpose: Merge upload functionality into creation phase
  - _Leverage: Existing currentPhase conditional rendering pattern; Existing DraftClaimsList component; Existing navigation button patterns_
  - _Requirements: REQ-003 (Phase 1 & 2 Merge)_
  - _Prompt: Implement the task for spec frontend-ux-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React Developer specializing in component composition and conditional rendering | Task: Restructure page rendering to merge Phase 1 and 2 by showing DraftClaimsList in CREATION phase and removing UPLOAD phase block, following REQ-003. | Restrictions: Do not delete ClaimReviewComponent (Phase 3/REVIEW); Maintain existing Phase 1 layout structure; Keep navigation button patterns consistent; Do not modify PhaseIndicator yet; Ensure both create and edit modals render; Remove all BulkFileUploadComponent references | _Leverage: Existing currentPhase === MultiClaimPhase.CREATION block at lines 377-440; Existing DraftClaimsList at line 438; Existing NavigationButtons pattern at lines 227-303; Existing ClaimReviewComponent at line 498 | _Requirements: REQ-003 | Success: Phase UPLOAD conditional block removed; DraftClaimsList moved to CREATION phase; Both create and edit modals render in Phase 1; BulkFileUploadComponent deleted from imports and usage; Navigation flows CREATION → REVIEW; Phase 3 (REVIEW) rendering unchanged; Tests pass | Instructions: 1. Mark in-progress [-]. 2. Remove UPLOAD phase block. 3. Move DraftClaimsList to CREATION. 4. Update navigation buttons. 5. Test phase flow. 6. Mark complete [x]._

### Phase 5: Route Restructuring

- [x] 8. Move route files and update navigation
  - Files:
    - `frontend/src/app/new/page.tsx` → `frontend/src/app/page.tsx`
    - `frontend/src/app/page.tsx` → `frontend/src/app/claims/page.tsx`
    - `frontend/src/app/new/` (directory - DELETE)
  - Move multi-claim submission page from `/new` to `/` (root)
  - Move claims list page from `/` to `/claims`
  - Delete `/new` directory entirely after moving page.tsx
  - Update "Submit Claims" button in claims/page.tsx to navigate to `/` instead of `/new`
  - Update any other internal navigation links from `/new` to `/`
  - Purpose: Restructure routes per user expectations (home = creation)
  - _Leverage: Next.js App Router file-based routing; Existing navigation patterns with useRouter_
  - _Requirements: REQ-001 (Route Structure Redesign)_
  - _Prompt: Implement the task for spec frontend-ux-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Full-stack Developer specializing in Next.js routing and file structure | Task: Restructure application routes by moving multi-claim page to root (/), claims list to /claims, and deleting /new route, following REQ-001. Update all navigation references. | Restrictions: Do not modify page component logic during move; Only change file locations and navigation links; Ensure no broken imports after file moves; Maintain existing authentication redirects; Do not create redirect from /new to / (404 is intentional) | _Leverage: Next.js App Router patterns; Existing useRouter navigation at lines 20-26 in claims list page; Existing router.push calls | _Requirements: REQ-001 | Success: Multi-claim page at frontend/src/app/page.tsx; Claims list at frontend/src/app/claims/page.tsx; /new directory deleted; Submit Claims button navigates to /; No broken imports; All internal links updated; Tests pass; /new returns 404 | Instructions: 1. Mark in-progress [-]. 2. Move page.tsx files. 3. Delete /new directory. 4. Update navigation links. 5. Test all routes. 6. Mark complete [x]._

### Phase 6: Cleanup and Testing

- [x] 9. Delete BulkUploadClaimCard component
  - Files:
    - `frontend/src/components/attachments/BulkUploadClaimCard.tsx` (DELETE)
    - `frontend/src/components/attachments/__tests__/BulkUploadClaimCard.test.tsx` (DELETE if exists)
    - `frontend/src/components/attachments/BulkFileUploadComponent.tsx` (check for imports)
  - Delete BulkUploadClaimCard.tsx component file
  - Delete associated test file if exists
  - Remove any remaining imports of BulkUploadClaimCard
  - Verify BulkFileUploadComponent no longer references deleted card
  - Purpose: Remove redundant component replaced by enhanced DraftClaimCard
  - _Leverage: Enhanced DraftClaimCard now handles file upload functionality_
  - _Requirements: REQ-005 (Merged Card Component with File Upload)_
  - _Prompt: Implement the task for spec frontend-ux-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer specializing in code cleanup and dependency management | Task: Delete BulkUploadClaimCard component and all references since functionality moved to enhanced DraftClaimCard, following REQ-005. Ensure no broken imports remain. | Restrictions: Do not delete BulkFileUploadComponent (still used); Do not delete FileUploadComponent (still used); Only remove BulkUploadClaimCard and its imports; Verify no unused exports remain; Check for barrel exports that need updating | _Leverage: Enhanced DraftClaimCard with collapsible FileUploadComponent; Existing file upload functionality | _Requirements: REQ-005 | Success: BulkUploadClaimCard.tsx deleted; Associated test file deleted; All imports removed; No broken references; BulkFileUploadComponent still functional; Tests pass; No unused code warnings | Instructions: 1. Mark in-progress [-]. 2. Search for all BulkUploadClaimCard imports. 3. Delete component file and tests. 4. Remove import statements. 5. Run build to verify. 6. Mark complete [x]._

- [x] 10. Update component tests for changes
  - Files:
    - `frontend/src/hooks/__tests__/useMultiClaim.test.ts`
    - `frontend/src/components/claims/__tests__/DraftClaimCard.test.tsx`
    - `frontend/src/components/claims/__tests__/MultiClaimForm.test.tsx` (rename to ClaimFormModal.test.tsx)
  - Update useMultiClaim tests to remove UPLOAD phase tests
  - Update DraftClaimCard tests to include expansion and edit handler
  - Rename and update MultiClaimForm tests to ClaimFormModal tests
  - Add tests for create vs edit mode in ClaimFormModal
  - Add tests for phase navigation onClick handlers
  - Purpose: Ensure test coverage for all changes
  - _Leverage: Existing test utilities from Vitest; Existing test patterns for components and hooks; React Testing Library_
  - _Requirements: All requirements (testing coverage)_
  - _Prompt: Implement the task for spec frontend-ux-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer specializing in React component testing and Vitest | Task: Update all component and hook tests to cover new functionality including 2-phase workflow, unified form, enhanced card, and clickable navigation, following all requirements. Ensure 80%+ test coverage. | Restrictions: Do not reduce existing test coverage; Maintain existing test structure and patterns; Use React Testing Library best practices; Do not test implementation details; Focus on user-facing behavior; Mock external dependencies properly | _Leverage: Existing Vitest setup; Existing React Testing Library utilities; Existing test patterns in __tests__ directories; Existing mock patterns | _Requirements: All (REQ-001 through REQ-005) | Success: useMultiClaim tests updated (no UPLOAD phase tests); DraftClaimCard tests include expansion and edit; ClaimFormModal tests cover create and edit modes; Phase navigation tests added; All tests pass; Coverage >= 80%; No flaky tests | Instructions: 1. Mark in-progress [-]. 2. Update useMultiClaim tests. 3. Update DraftClaimCard tests. 4. Rename and update form tests. 5. Run all tests. 6. Mark complete [x]._

- [x] 11. Run integration tests and fix issues
  - Files: Run entire test suite across frontend
  - Execute `make test/unit` for backend (verify no breakage)
  - Execute frontend test suite with `pnpm test`
  - Execute `make format && make lint` for code quality
  - Fix any failing tests or linting issues
  - Verify mobile responsive layouts on different screen sizes
  - Test phase navigation flow end-to-end
  - Purpose: Ensure all changes work together without breaking existing functionality
  - _Leverage: Existing Makefile commands; TurboRepo test execution; CircleCI pipeline (if applicable)_
  - _Requirements: All requirements (integration validation)_
  - _Prompt: Implement the task for spec frontend-ux-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Lead specializing in integration testing and quality assurance | Task: Execute complete test suite (unit, integration, E2E) and verify all UX improvements work together without breaking existing functionality, following all requirements. Fix any issues found. | Restrictions: Do not skip failing tests; Do not disable linting rules; Fix root causes, not symptoms; Ensure mobile responsiveness validated on multiple viewports; Verify dark mode consistency; Run tests in CI-like environment | _Leverage: Existing Makefile at project root; Existing test scripts in package.json; Existing linting configuration; Chrome DevTools for responsive testing | _Requirements: All (REQ-001 through REQ-005) | Success: All unit tests pass; All integration tests pass; Format and lint checks pass; Mobile layouts work on 375px, 768px, 1024px viewports; Phase navigation works end-to-end; Create and edit flows functional; No console errors; Ready for deployment | Instructions: 1. Mark in-progress [-]. 2. Run test suite. 3. Fix any failures. 4. Run format/lint. 5. Test manually on mobile. 6. Mark complete [x]._

## Task Summary

**Total Tasks**: 11
- Hook updates: 1 task
- Form unification: 2 tasks
- Card enhancement: 2 tasks
- Page updates: 2 tasks
- Route restructuring: 1 task
- Cleanup and testing: 3 tasks

**Estimated Effort**:
- Tasks 1-7: ~6-8 hours (core functionality)
- Tasks 8-11: ~3-4 hours (cleanup and testing)
- **Total**: ~10-12 hours

**Dependencies**:
- Task 2 must complete before Task 3 (form rename blocks page update)
- Task 1 must complete before Task 6-7 (enum change blocks phase rendering)
- Tasks 1-7 must complete before Task 11 (integration testing requires all changes)

**Critical Path**: Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8 → Task 9 → Task 10 → Task 11
