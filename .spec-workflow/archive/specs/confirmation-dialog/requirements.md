# Requirements Document

## Introduction

The Mavericks Claim Submission System currently uses browser-native `window.confirm()` dialogs for critical user confirmations (claim submission, deletion, attachment removal). User feedback indicates this is poor UX because native dialogs break the dark mode design consistency, provide limited customization, and offer suboptimal mobile experiences. This specification defines requirements for replacing all `window.confirm()` instances with a custom confirmation modal that aligns with the application's design system, maintains accessibility standards, and provides a superior user experience.

## Alignment with Product Vision

**Product Alignment**: This feature directly supports the mission statement's emphasis on "employee autonomy" and "administrative efficiency" by:
- Reducing friction in critical workflows (claim submission/deletion) through consistent, branded UI
- Maintaining mobile-responsive design exclusively, as specified in the product vision
- Supporting the dark mode UI requirement (Product Vision, Core Features #1)

**Technical Alignment**: Follows the tech.md principles:
- Type safety with TypeScript strict mode
- Reusable component patterns following NestJS/Next.js module structure
- Integration with existing UI design system (shadcn/ui components)
- Zero breaking changes to existing workflows (backward compatibility)

**User Impact**: Affects **all employees** (primary users) during critical workflows:
- Batch claim submission confirmation
- Individual claim deletion warnings
- Attachment deletion confirmations

## Requirements

### Requirement 1: Replace window.confirm with Custom AlertDialog

**User Story:** As an employee submitting claims, I want confirmation dialogs that match the application's dark mode design, so that I have a consistent and professional experience throughout the workflow.

#### Acceptance Criteria

1. WHEN the system needs user confirmation for destructive actions THEN the system SHALL display a custom modal dialog instead of browser-native `window.confirm()`
2. WHEN the dialog is displayed THEN the system SHALL match the existing dark mode color scheme and design language defined in the application
3. WHEN the dialog is displayed on mobile devices THEN the system SHALL render a touch-optimized, responsive interface
4. IF the application UI theme is dark mode THEN the dialog SHALL use dark mode styling consistently

### Requirement 2: Implement Promise-Based Confirmation API

**User Story:** As a developer maintaining the codebase, I want a simple async/await API for confirmations, so that I can replace `window.confirm()` calls without refactoring business logic.

#### Acceptance Criteria

1. WHEN a component calls the confirmation API THEN the system SHALL return a Promise that resolves to boolean (true for confirm, false for cancel)
2. WHEN the user clicks "Confirm" THEN the Promise SHALL resolve to `true`
3. WHEN the user clicks "Cancel" or dismisses the dialog THEN the Promise SHALL resolve to `false`
4. WHEN the confirmation API is called THEN it SHALL accept configuration parameters including title, message, confirmText, cancelText, and variant (danger/warning/info)
5. IF the ESC key is pressed THEN the system SHALL treat it as cancellation (resolve to `false`)

### Requirement 3: Maintain Existing Confirmation Workflows

**User Story:** As an employee using the claims system, I want existing functionality to work exactly as before, so that the UI improvement doesn't disrupt my workflow.

#### Acceptance Criteria

1. WHEN marking all claims as ready (useMarkClaimsReady.ts:83) THEN the system SHALL display a confirmation dialog with the existing warning message structure
2. WHEN deleting a draft claim (DraftClaimsList.tsx:85) THEN the system SHALL display a confirmation dialog with the existing Google Drive file warning
3. WHEN deleting an attachment (AttachmentList.tsx:93) THEN the system SHALL display a confirmation dialog with the existing deletion warning
4. IF a claim has no attachments THEN the batch submission dialog SHALL include the warning "Some claims do not have any attachments"
5. IF a claim has attachments THEN the deletion dialog SHALL include the Google Drive retention warning
6. WHEN any confirmation is cancelled THEN the system SHALL abort the action exactly as the current `window.confirm()` implementation does

### Requirement 4: Accessibility Compliance

**User Story:** As an employee using assistive technology, I want confirmation dialogs to be fully accessible, so that I can complete critical actions independently.

#### Acceptance Criteria

1. WHEN the dialog opens THEN the system SHALL apply `role="alertdialog"` and `aria-modal="true"` attributes
2. WHEN the dialog opens THEN the system SHALL move keyboard focus to the first focusable element (typically the Cancel button for safety)
3. WHEN the dialog is open THEN Tab key SHALL cycle focus only within the dialog (focus trap)
4. WHEN the dialog is open THEN Escape key SHALL close the dialog and return focus to the triggering element
5. WHEN the dialog closes THEN the system SHALL return keyboard focus to the element that triggered the dialog
6. IF the confirmation is for a destructive action THEN the system SHALL use appropriate ARIA labels (e.g., `aria-label="Confirm deletion"`)

### Requirement 5: Visual Design Consistency

**User Story:** As an employee familiar with the application's design, I want confirmation dialogs to feel native to the app, so that the experience is cohesive and professional.

#### Acceptance Criteria

1. WHEN the dialog is displayed THEN the system SHALL use the existing Button component from `@/components/ui/button`
2. WHEN displaying a destructive action (delete, submit) THEN the confirm button SHALL use the `variant="destructive"` styling (red)
3. WHEN displaying a warning action THEN the confirm button SHALL use appropriate warning styling
4. WHEN the dialog content includes multiple paragraphs or bullet points THEN the system SHALL render them with proper spacing and typography
5. IF the message contains line breaks (`\n`) THEN the system SHALL render them as separate paragraphs or list items

### Requirement 6: Reusable Component Architecture

**User Story:** As a developer adding new confirmation flows, I want a single reusable component, so that I maintain consistency and minimize code duplication.

#### Acceptance Criteria

1. WHEN implementing the dialog THEN the system SHALL create ONE reusable AlertDialog component or hook
2. WHEN the component is implemented THEN it SHALL be located in `frontend/src/components/ui/` or `frontend/src/hooks/`
3. WHEN other components need confirmations THEN they SHALL import and use this single implementation
4. IF future features need confirmations THEN they SHALL be able to use the same component without modifications

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: The confirmation dialog component shall handle ONLY user confirmation logic, not business logic
- **Modular Design**: The component shall be independent and have no direct dependencies on claim, attachment, or business domain logic
- **Dependency Management**: The component shall depend only on base UI components (shadcn/ui Dialog/AlertDialog) and React hooks
- **Clear Interfaces**: The API shall provide a clean contract: `confirm(options) => Promise<boolean>`

### Performance
- **Modal Render Time**: Dialog shall render and display within 50ms of being triggered
- **Zero Layout Shift**: Opening the dialog shall not cause visible page reflow or content shifts
- **Memory Efficiency**: Dialog state shall be cleaned up immediately after resolution to prevent memory leaks
- **Bundle Size**: The confirmation dialog implementation shall add no more than 5KB to the frontend bundle

### Security
- **No XSS Vulnerabilities**: All user-provided messages shall be sanitized before rendering (use React's built-in XSS protection)
- **No Injection Risks**: Dialog content shall not accept or execute JavaScript from string inputs
- **Focus Trap Security**: Dialog shall prevent focus from escaping to underlying page content during display

### Reliability
- **Promise Resolution Guarantee**: The confirmation Promise shall ALWAYS resolve (never hang) even if errors occur
- **Error Handling**: If the dialog component fails to mount, the system shall fall back to `window.confirm()` and log the error
- **State Consistency**: Multiple simultaneous confirmation requests shall be queued or rejected to prevent race conditions

### Usability
- **Mobile Touch Targets**: Buttons shall be minimum 44x44 pixels for mobile accessibility
- **Clear Visual Hierarchy**: Destructive actions (confirm delete) shall have visual prominence
- **Readable Typography**: Dialog text shall maintain minimum 16px font size for readability
- **Safe Default Action**: Cancel/dismiss shall be the default action (Enter key should NOT confirm destructive actions)
- **Responsive Design**: Dialog shall adapt gracefully to viewport sizes from 320px (mobile) to desktop widths

## Technical Constraints

### Frontend Framework
- **Next.js Integration**: Must work with Next.js App Router client components
- **shadcn/ui Compatibility**: Shall use existing shadcn/ui AlertDialog component as foundation
- **React 18+**: Must leverage React 18 features (concurrent rendering, transitions)

### Browser Compatibility
- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Mobile Browsers**: iOS Safari, Chrome Mobile (latest versions)
- **No IE11 Support**: Following project's modern-only approach

### Existing Codebase Integration
- **Zero Breaking Changes**: Existing mutation logic (React Query) shall remain unchanged
- **Type Safety**: Full TypeScript support with no `any` types
- **Import Paths**: Follow existing frontend alias pattern (`@/components`, `@/hooks`)

## Success Criteria

The feature shall be considered successfully implemented when:
1. All three `window.confirm()` calls are replaced with the custom dialog
2. All acceptance criteria pass manual testing on mobile and desktop
3. Accessibility audit (keyboard navigation, screen reader) passes
4. Visual QA confirms dark mode consistency
5. No regression in existing claim submission/deletion workflows
6. Code review confirms adherence to project TypeScript and architecture standards
