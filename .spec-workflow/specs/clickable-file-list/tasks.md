# Tasks Document

## Overview

This document breaks down the clickable file list implementation into atomic, testable tasks. The design emphasizes **maximum code reusability** - leveraging existing types, hooks, utilities, and patterns rather than creating new abstractions.

**Total Scope:** 3 implementation tasks modifying a single component file
**Estimated Lines Changed:** ~20 lines (15 JSX, 1 interface, 4 styling)

---

## Implementation Tasks

- [x] 1. Update UploadedFile interface to include driveShareableUrl
  - **File:** `frontend/src/components/attachments/uploaded-files-list.tsx` (lines 13-18)
  - **Changes:** Add `driveShareableUrl?: string` field to `UploadedFile` interface
  - **Purpose:** Expose Google Drive shareable URL to component for clickable functionality
  - **Lines Modified:** 1 line added to interface
  - _Leverage: Align with existing `IAttachmentMetadata` type from `@project/types/src/dtos/attachment.dto.ts` (line 45)_
  - _Requirements: Requirement 1_
  - _Prompt: Implement the task for spec clickable-file-list, first run spec-workflow-guide to get the workflow guide then implement the task: Role: TypeScript Developer specializing in type safety and interface design | Task: Update the UploadedFile interface in frontend/src/components/attachments/uploaded-files-list.tsx to include the driveShareableUrl field, aligning with the existing IAttachmentMetadata type pattern | Restrictions: Do not modify the existing fields in the interface, Make the field optional (?:) for type safety, Do not create new type files or utilities, Maintain existing TypeScript strict mode compliance | Leverage: IAttachmentMetadata type from @project/types/src/dtos/attachment.dto.ts (line 45) - reference for field name and type, Existing interface structure in uploaded-files-list.tsx (lines 13-18) | Success: Interface compiles without TypeScript errors, Field is optional to prevent breaking changes (driveShareableUrl?: string), Component receives data from useAttachmentList hook without type errors, No impact on existing consumers of the component | Instructions: Mark this task as in-progress in .spec-workflow/specs/clickable-file-list/tasks.md (change [ ] to [-]), Read the component file to understand current interface structure, Add the single field to the interface, Run TypeScript compiler to verify no errors, After completing implementation use mcp__spec-workflow__log-implementation tool with taskId: "1" summary: "Added driveShareableUrl field to UploadedFile interface" filesModified: ["frontend/src/components/attachments/uploaded-files-list.tsx"] filesCreated: [] statistics: {linesAdded: 1, linesRemoved: 0} artifacts: {}, Mark task as complete in tasks.md (change [-] to [x])_

- [x] 2. Implement clickable file items with semantic anchor tags
  - **File:** `frontend/src/components/attachments/uploaded-files-list.tsx` (lines 50-101)
  - **Changes:**
    - Wrap file info section (lines 64-71) in conditional anchor tag when `driveShareableUrl` exists
    - Add `cursor-pointer hover:opacity-80 transition-opacity` classes when clickable
    - Include security attributes: `target="_blank" rel="noopener noreferrer"`
  - **Purpose:** Enable click-to-open Google Drive functionality with built-in accessibility
  - **Lines Modified:** ~15 lines (conditional wrapper, styling updates)
  - _Leverage:_
    - _Existing `cn()` utility from `@/lib/utils` for className composition_
    - _Pattern from `AttachmentList.tsx` (lines 113-116, 209, 273) showing `window.open()` usage_
    - _Improvement: Use semantic `<a>` tag instead of `window.open()` for better accessibility_
    - _Existing component structure and styling classes_
  - _Requirements: Requirements 2, 3, 4_
  - _Prompt: Implement the task for spec clickable-file-list, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer specializing in React, accessibility, and semantic HTML | Task: Add clickable functionality to file items in UploadedFilesList component using semantic anchor tags for maximum accessibility and code reusability | Restrictions: Do not create new click handler functions (use native anchor tag behavior), Do not create new hooks or utilities, Do not modify the delete button behavior (preserve existing stopPropagation), Do not change existing component props interface, Must maintain React.memo optimization, Do not add complex keyboard handlers (use semantic HTML for accessibility) | Leverage: cn() utility from @/lib/utils for conditional className composition, Reference pattern from AttachmentList.tsx (lines 113-116, 209, 273) but improve it with semantic HTML, Existing component structure and styling classes, Conditional rendering pattern already used in the codebase | Success: File items with driveShareableUrl render as clickable anchor tags, Clicking opens Google Drive in new tab with security attributes (target="_blank" rel="noopener noreferrer"), Visual feedback: cursor-pointer and hover:opacity-80 transition-opacity when clickable, File items without URL render as non-clickable divs, Delete button continues working independently, Keyboard accessible (Tab focuses link Enter/Space opens URL), Existing props styling and behavior preserved, No TypeScript errors | Instructions: Mark this task as in-progress in .spec-workflow/specs/clickable-file-list/tasks.md (change [ ] to [-]), Read the component file to locate the file info section (currently lines 64-71), Extract the file info JSX into a reusable structure, Add conditional wrapper (anchor tag if URL exists div otherwise), Apply cursor and hover classes using cn() utility, Test in browser (click behavior hover states keyboard navigation), Verify delete button still works independently, After completing implementation use mcp__spec-workflow__log-implementation tool with taskId: "2" summary: "Implemented clickable file items with semantic anchor tags and accessibility" filesModified: ["frontend/src/components/attachments/uploaded-files-list.tsx"] filesCreated: [] statistics: {linesAdded: 18, linesRemoved: 6} artifacts: {components: [{name: "UploadedFilesList", type: "React", purpose: "Display uploaded files with clickable Drive links", location: "frontend/src/components/attachments/uploaded-files-list.tsx", props: "{ files: UploadedFile[], isDeleting: boolean, onDelete: (id, name) => void, className?: string }", exports: ["UploadedFilesList (default)", "UploadedFile (interface)", "UploadedFilesListProps (interface)"]}], integrations: [{description: "UploadedFilesList receives attachment data with driveShareableUrl from useAttachmentList hook and renders clickable links", frontendComponent: "UploadedFilesList", backendEndpoint: "GET /attachments/claim/:claimId (via useAttachmentList hook)", dataFlow: "useAttachmentList fetches IAttachmentMetadata[] → UploadedFilesList receives data → Renders anchor tags with driveShareableUrl → User clicks → Opens Google Drive in new tab"}]}, Mark task as complete in tasks.md (change [-] to [x])_

- [x] 3. Add component tests for clickable functionality
  - **File:** `frontend/src/components/attachments/__tests__/uploaded-files-list.test.tsx` (create new file)
  - **Changes:** Create comprehensive test suite covering new clickable behavior
  - **Purpose:** Ensure reliability, accessibility, and prevent regressions
  - **Lines Added:** ~150 lines (new test file)
  - _Leverage:_
    - _Existing Vitest test setup and configuration_
    - _Test patterns from `frontend/src/components/attachments/__tests__/AttachmentList.test.tsx`_
    - _React Testing Library utilities already configured_
  - _Requirements: All requirements (validation through testing)_
  - _Prompt: Implement the task for spec clickable-file-list, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer specializing in React component testing, accessibility testing, and Vitest | Task: Create comprehensive test suite for UploadedFilesList component covering the new clickable functionality, accessibility, and existing behavior preservation | Restrictions: Do not test implementation details (e.g. specific CSS classes), Do not create custom test utilities (use existing React Testing Library), Do not skip accessibility tests, Must test both success and edge cases, Tests must be isolated and independent | Leverage: Existing Vitest configuration and test setup, React Testing Library utilities (render screen fireEvent waitFor), Test patterns from AttachmentList.test.tsx for reference, @testing-library/jest-dom matchers | Success: Renders anchor tag when driveShareableUrl present, Anchor has correct href target="_blank" and rel="noopener noreferrer", Renders div (not anchor) when driveShareableUrl missing, Clickable items have appropriate styling classes, Non-clickable items don't have cursor-pointer, Anchor tags are keyboard accessible (can be focused), Screen reader attributes are correct, Delete button works independently of file item click, Component returns null when files array is empty, All existing props are supported, All test cases pass with >90% code coverage for component | Instructions: Mark this task as in-progress in .spec-workflow/specs/clickable-file-list/tasks.md (change [ ] to [-]), Create new test file frontend/src/components/attachments/__tests__/uploaded-files-list.test.tsx, Set up test suite with describe blocks and test cases, Mock file data with and without driveShareableUrl, Write tests for each success criterion listed above, Run tests (pnpm test uploaded-files-list), Ensure all tests pass and coverage is adequate, After completing implementation use mcp__spec-workflow__log-implementation tool with taskId: "3" summary: "Created comprehensive test suite for UploadedFilesList clickable functionality and accessibility" filesModified: [] filesCreated: ["frontend/src/components/attachments/__tests__/uploaded-files-list.test.tsx"] statistics: {linesAdded: 150, linesRemoved: 0} artifacts: {}, Mark task as complete in tasks.md (change [-] to [x])_

---

## Testing & Validation

### Manual Testing Checklist (Post-Implementation)

**Browser Compatibility:**
- [ ] Chrome: Click behavior, hover states, keyboard nav
- [ ] Safari: Click behavior, hover states, keyboard nav
- [ ] Firefox: Click behavior, hover states, keyboard nav

**Mobile Testing:**
- [ ] iOS Safari: Tap to open, long-press menu
- [ ] Chrome Android: Tap to open, touch feedback

**Accessibility:**
- [ ] Keyboard: Tab to focus, Enter to activate, focus indicators visible
- [ ] Screen Reader: VoiceOver/NVDA announces as link with filename
- [ ] Touch Targets: File items meet 44x44px minimum size

**Edge Cases:**
- [ ] File without `driveShareableUrl`: Renders as non-clickable, no errors
- [ ] Delete button: Works independently, no Drive navigation on delete
- [ ] Empty files array: Component returns null

**Visual Regression:**
- [ ] Dark mode: Styling intact, contrast maintained
- [ ] Mobile responsive: Layout works on small screens
- [ ] Hover states: Opacity transition smooth and visible

---

## Task Summary

**Total Tasks:** 3 implementation tasks
**Files Modified:** 1 (`uploaded-files-list.tsx`)
**Files Created:** 1 (test file)
**Estimated Total Lines:** ~20 production code + ~150 test code

**Code Reusability Score: 95%**
- Reuses existing types, hooks, utilities, and patterns
- No new dependencies, abstractions, or infrastructure
- Leverages semantic HTML for built-in accessibility
- Minimal code changes for maximum functionality gain
