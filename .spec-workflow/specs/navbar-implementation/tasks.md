# Tasks Document

## Implementation Tasks

- [x] 1. Install Sheet component (if not present)
  - File: frontend/src/components/ui/sheet.tsx
  - Check if Sheet component exists, install via shadcn/ui if missing
  - Purpose: Provide mobile menu component for navbar
  - _Leverage: Existing @radix-ui/react-dialog dependency_
  - _Requirements: 3.1 (Mobile Navigation Experience)_
  - _Prompt: Implement the task for spec navbar-implementation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer | Task: Check if `frontend/src/components/ui/sheet.tsx` exists. If not, run `npx shadcn@latest add sheet` from the frontend directory to install it. Verify the Sheet component is properly exported. | Restrictions: Do not modify existing components, only install if missing | Success: Sheet component exists at frontend/src/components/ui/sheet.tsx and exports Sheet, SheetContent, SheetTrigger. After completing this task, use log-implementation tool to record what was done (include artifacts for any new components created), then mark this task as complete in tasks.md by changing [ ] to [x]._

- [x] 2. Create Navbar component
  - File: frontend/src/components/navigation/navbar.tsx
  - Create the 50-line Navbar component exactly as specified in design.md
  - Desktop: horizontal navigation with active state highlighting
  - Mobile: Sheet-based slide-out menu
  - Purpose: Main navigation component for authenticated users
  - _Leverage: useAuth() hook, usePathname() hook, Sheet component, Button component, Link component_
  - _Requirements: 1.1 (Authenticated Navigation), 2.1 (Desktop Navigation), 3.1 (Mobile Navigation), 4.1 (Active Page Indication)_
  - _Prompt: Implement the task for spec navbar-implementation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React Developer | Task: Create `frontend/src/components/navigation/navbar.tsx` using the complete implementation from design.md (lines 141-216). Copy the code exactly - it's already written. Create the directory if needed. Also create `frontend/src/components/navigation/index.ts` with barrel export: `export { Navbar } from './navbar';`. | Restrictions: Use the exact implementation from design.md, do not add React.memo or useCallback, do not add extra features | Success: Navbar component renders with desktop horizontal nav (hidden md:flex) and mobile Sheet menu (md:hidden). Active route highlighting works. Component hides when not authenticated. After completing this task, use log-implementation tool to record the implementation (include component artifact with name, type, purpose, location, props, exports), then mark this task as complete in tasks.md by changing [ ] to [x]._

- [x] 3. Integrate Navbar into layout
  - File: frontend/src/app/layout.tsx
  - Add Navbar between AppTitle and AuthHeader at line 39
  - Purpose: Make navigation available throughout the app
  - _Leverage: Existing layout structure, AuthProvider context_
  - _Requirements: All requirements (navigation must be visible in app)_
  - _Prompt: Implement the task for spec navbar-implementation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer | Task: Modify `frontend/src/app/layout.tsx` - import Navbar from '@/components/navigation', then add `<Navbar />` at line 39 (between AppTitle and AuthHeader inside the flex gap-3 div). See design.md lines 309-337 for exact placement. | Restrictions: Only add the import and component, do not modify other parts of layout, do not change AuthProvider or header structure | Success: Navbar appears in header between AppTitle and AuthHeader. Navigation shows when logged in, hides when logged out. Mobile menu works on small screens. After completing this task, use log-implementation tool to record the integration (include filesModified: layout.tsx), then mark this task as complete in tasks.md by changing [ ] to [x]._

- [x] 4. Write basic tests
  - File: frontend/src/components/navigation/navbar.test.tsx
  - Write 3 essential tests: renders null when not authenticated, renders nav when authenticated, highlights active route
  - Purpose: Verify core navigation behavior
  - _Leverage: Existing test utilities, React Testing Library_
  - _Requirements: All requirements (ensure navigation works correctly)_
  - _Prompt: Implement the task for spec navbar-implementation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer | Task: Create `frontend/src/components/navigation/navbar.test.tsx` with 3 tests based on design.md lines 238-260. Mock useAuth and usePathname hooks. Test: (1) returns null when not authenticated, (2) renders nav items when authenticated, (3) highlights active route. Keep tests simple - no over-engineering. | Restrictions: Do not test Sheet component internals (it's tested by shadcn/ui), focus on Navbar logic only, use simple mocks | Success: All 3 tests pass. Tests verify authentication gating, nav rendering, and active state. After completing this task, use log-implementation tool to record the test implementation (include functions artifact with test function names and purposes), then mark this task as complete in tasks.md by changing [ ] to [x]._

## Task Summary

**Total Tasks**: 4
**Estimated Effort**: 1-2 hours
**Dependencies**: Tasks must be done in order (Sheet needed before Navbar, Navbar needed before layout integration)

## Implementation Notes

- Task 1 might be skipped if Sheet already exists (check first)
- Task 2 is copy-paste from design.md - don't overthink it
- Task 3 is a one-line change (add component to layout)
- Task 4 is basic testing - 3 simple tests

Keep it simple. Ship fast.
