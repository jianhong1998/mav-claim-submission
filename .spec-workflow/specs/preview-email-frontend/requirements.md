# Requirements Document: Email Preview Frontend UI

## Introduction

The **Email Preview Frontend UI** feature adds a user-facing modal component that displays email preview content fetched from the backend API. This feature completes the email preview workflow by providing employees with a visual confirmation of exactly what will be sent to finance administrators before submitting their claim.

**Purpose**: Provide a user-friendly interface for employees to verify email content before claim submission.

**Value**: Increases user confidence, reduces submission anxiety, and ensures transparency in the claim submission workflow.

**Dependency**: This feature requires the backend `GET /api/claims/:id/preview` endpoint (already implemented in `preview-email-content` spec).

## Alignment with Product Vision

This feature directly supports the **Mavericks Claim Submission System** mission from product.md:

**Employee Autonomy**:
- Empowers employees to verify claim content before submission
- Reduces dependency on administrative staff for corrections
- Self-service preview eliminates back-and-forth communication

**Administrative Efficiency**:
- Fewer resubmissions due to content errors
- Clear communication of what finance team will receive

**Mobile-Responsive Dark Mode UI**:
- Preview modal follows dark mode design exclusively
- Full-screen on mobile for better readability

**Critical Workflow Integration**:
- Fits into existing flow: `draft → preview → send → sent`
- Preview accessible only for draft claims

## Requirements

### Requirement 1: Preview Button in Draft Claim Card

**User Story:** As an employee with a draft claim, I want to see a "Preview Email" button on my draft claim card, so that I can preview the email content before sending.

#### Acceptance Criteria

1. WHEN user views draft claims list THEN each `DraftClaimCard` SHALL display a "Preview" button alongside existing Edit and Delete buttons
2. WHEN user hovers over Preview button THEN system SHALL display tooltip "Preview email content"
3. WHEN Preview button is clicked THEN system SHALL open the preview modal for that claim
4. IF claim has no attachments THEN Preview button SHALL still be visible and functional
5. WHEN user views draft claims on mobile THEN Preview button SHALL be displayed as icon-only (consistent with Edit/Delete buttons)
6. WHEN user views draft claims on desktop THEN Preview button SHALL display text "Preview" or icon with text

### Requirement 2: Preview Modal Display

**User Story:** As an employee, I want to see a modal showing the complete email preview, so that I can verify all content before sending.

#### Acceptance Criteria

1. WHEN preview modal opens THEN system SHALL display large dialog (max-w-4xl) on desktop
2. WHEN preview modal opens on mobile THEN system SHALL display full-screen modal
3. WHEN preview modal opens THEN system SHALL display modal title "Email Preview"
4. WHEN preview modal opens THEN system SHALL display close button (X) in top-right corner
5. WHEN user clicks close button OR clicks outside modal OR presses Escape THEN modal SHALL close
6. WHEN preview modal opens THEN system SHALL display email subject line prominently at top
7. WHEN preview modal opens THEN system SHALL display rendered HTML email body

### Requirement 3: Recipient Information Display

**User Story:** As an employee, I want to see who will receive my claim email, so that I can verify the correct recipients are included.

#### Acceptance Criteria

1. WHEN preview modal displays THEN system SHALL show collapsible recipient header section (collapsed by default)
2. WHEN user clicks recipient header THEN system SHALL expand to show full recipient details
3. WHEN recipient section is expanded THEN system SHALL display "To:" with primary recipient email addresses
4. WHEN recipient section is expanded AND user has CC preferences THEN system SHALL display "CC:" with CC email addresses
5. WHEN recipient section is expanded AND user has BCC preferences THEN system SHALL display "BCC:" with BCC email addresses
6. IF user has no CC preferences THEN CC field SHALL not be displayed
7. IF user has no BCC preferences THEN BCC field SHALL not be displayed
8. WHEN recipient header is collapsed THEN system SHALL show summary text (e.g., "To: finance@... +2 more")

### Requirement 4: HTML Email Body Rendering

**User Story:** As an employee, I want to see the email exactly as the recipient will see it, so that I can verify the visual appearance.

#### Acceptance Criteria

1. WHEN preview modal displays email body THEN system SHALL render HTML content as formatted email
2. WHEN HTML is rendered THEN system SHALL sanitize content using DOMPurify to prevent XSS
3. WHEN email body is rendered THEN system SHALL display attachment sections (Attached Files, Files on Google Drive) as they appear in actual email
4. WHEN email body is rendered THEN system SHALL NOT make Drive links clickable (display only)
5. WHEN email body is long THEN system SHALL enable vertical scrolling within modal content area
6. WHEN email body renders THEN system SHALL apply styling consistent with dark mode theme

### Requirement 5: Loading State

**User Story:** As an employee, I want to see feedback while the preview is loading, so that I know the system is working.

#### Acceptance Criteria

1. WHEN user clicks Preview button THEN modal SHALL open immediately
2. WHEN preview data is loading THEN modal SHALL display loading spinner in content area
3. WHEN preview data is loading THEN modal SHALL display loading text "Loading preview..."
4. WHEN preview data loads successfully THEN loading state SHALL be replaced with preview content
5. WHEN preview is loading THEN close button SHALL remain functional (user can cancel)

### Requirement 6: Error Handling

**User Story:** As an employee, I want to see clear error messages if preview fails, so that I know what went wrong and can retry.

#### Acceptance Criteria

1. IF preview API returns 404 (claim not found) THEN modal SHALL display error "Claim not found. It may have been deleted."
2. IF preview API returns 403 (access denied) THEN modal SHALL display error "You don't have permission to preview this claim."
3. IF preview API returns 400 (not draft status) THEN modal SHALL display error "Preview is only available for draft claims."
4. IF preview API returns 500 (server error) THEN modal SHALL display error "Failed to load preview. Please try again."
5. IF network error occurs THEN modal SHALL display error "Unable to connect. Please check your connection."
6. WHEN error is displayed THEN modal SHALL show "Try Again" button
7. WHEN user clicks "Try Again" THEN system SHALL retry the preview API call
8. WHEN error is displayed THEN close button SHALL remain functional

### Requirement 7: Mobile Responsiveness

**User Story:** As an employee using a mobile device, I want the preview modal to be optimized for my screen, so that I can easily read the email content.

#### Acceptance Criteria

1. WHEN preview modal opens on mobile (screen width < 640px) THEN modal SHALL take full screen
2. WHEN preview modal is full-screen THEN modal SHALL have proper safe area insets
3. WHEN viewing preview on mobile THEN recipient section SHALL be easily tappable (min 44px touch targets)
4. WHEN viewing preview on mobile THEN scroll behavior SHALL be smooth and native-feeling
5. WHEN viewing preview on mobile THEN close button SHALL be prominently visible and easily tappable
6. WHEN viewing preview on mobile THEN email body SHALL be readable without horizontal scrolling

### Requirement 8: Accessibility

**User Story:** As an employee using assistive technology, I want the preview modal to be accessible, so that I can use it effectively.

#### Acceptance Criteria

1. WHEN preview modal opens THEN focus SHALL be trapped within modal until closed
2. WHEN preview modal opens THEN modal SHALL have role="dialog" and aria-modal="true"
3. WHEN preview modal opens THEN modal SHALL have aria-labelledby pointing to title element
4. WHEN modal closes THEN focus SHALL return to the Preview button that opened it
5. WHEN user presses Escape key THEN modal SHALL close
6. WHEN screen reader reads modal THEN it SHALL announce "Email Preview" title
7. WHEN error state is displayed THEN error message SHALL have role="alert" for screen reader announcement

## Non-Functional Requirements

### Code Architecture and Modularity

**Single Responsibility Principle**:
- **PreviewEmailModal**: Modal UI component (presentation only)
- **useEmailPreview**: React Query hook for API calls and state management
- **EmailPreviewContent**: Email body rendering component
- **RecipientHeader**: Collapsible recipient display component

**Modular Design**:
- Components isolated in `frontend/src/components/email/` directory
- Hook isolated in `frontend/src/hooks/email/` directory
- Follows existing frontend patterns from `ClaimFormModal`

**Dependency Management**:
- Depends only on existing UI components (Dialog, Button, Skeleton)
- Uses existing apiClient for API calls
- No new external dependencies except DOMPurify for HTML sanitization

**Clear Interfaces**:
- Props interfaces defined for all components
- Uses `IPreviewEmailResponse` from `@project/types`

### Performance

- **Response Time**: Preview modal content SHALL load within 500ms (backend guarantee)
- **Render Time**: HTML email body SHALL render within 100ms after data received
- **Bundle Size**: DOMPurify is ~15KB minified - acceptable for security benefit
- **Memory**: No memory leaks from modal open/close cycles

### Security

- **XSS Prevention**: All HTML content sanitized with DOMPurify before rendering
- **No Sensitive Data Exposure**: Preview only shows data user owns
- **Safe Rendering**: Use dangerouslySetInnerHTML only with sanitized content

### Reliability

- **Error Recovery**: Retry button for failed requests
- **Graceful Degradation**: Modal closes cleanly on any error
- **State Cleanup**: React Query handles cache invalidation
- **No Data Loss**: Preview is read-only, no user data at risk

### Usability

- **Discoverability**: Preview button clearly visible alongside Edit/Delete
- **Feedback**: Loading spinner indicates progress
- **Error Clarity**: Actionable error messages with retry option
- **Responsive**: Optimal experience on both desktop and mobile
- **Dark Mode**: Follows existing dark mode theme exclusively

## Technical Constraints

### Must Use Existing Patterns

From frontend codebase analysis:
- **Dialog Component**: `frontend/src/components/ui/dialog.tsx` (Radix UI)
- **API Client**: `frontend/src/lib/api-client.ts` (Axios + React Query)
- **Button Component**: `frontend/src/components/ui/button.tsx`
- **Skeleton Component**: `frontend/src/components/ui/skeleton.tsx`
- **Toast Notifications**: Sonner library for error toasts

### Must Follow Conventions

From tech.md:
- **TypeScript Strict Mode**: No `any` types
- **Path Aliases**: `@/` for frontend imports
- **Shared Types**: Import `IPreviewEmailResponse` from `@project/types`
- **Dark Mode Only**: No light mode styling

### Must NOT Implement

- **Send Button in Modal**: Preview is read-only (user confirmed Option A)
- **Real-time Updates**: Manual preview button only
- **Caching**: Fresh preview on each request (no stale data)

## Success Criteria

**Feature is complete when**:
1. User can click "Preview" button on any draft claim card
2. Preview modal opens showing subject, recipients, and email body
3. Email body renders exactly as it will appear to recipients
4. Modal is responsive (full-screen on mobile, dialog on desktop)
5. Loading and error states provide clear feedback
6. Modal meets accessibility requirements (keyboard navigation, screen reader support)
7. All tests pass (unit + integration)

**Acceptance Test Scenario**:
```gherkin
Given an employee has a draft claim with:
  - Category: Fitness & Wellness
  - Month: December 2024
  - Total Amount: $150.00
  - 2 attachments uploaded
  - CC preference: manager@mavericks-consulting.com
When the employee clicks "Preview" button on the draft claim card
Then the preview modal opens showing:
  - Title: "Email Preview"
  - Subject: "John Doe - Claim for Fitness & Wellness (12/2024) ($150.00)"
  - Collapsible recipient header (collapsed by default)
  - HTML email body with claim details and attachment sections
And when employee clicks the recipient header
Then they see:
  - To: finance@mavericks-consulting.com
  - CC: manager@mavericks-consulting.com
And the modal closes when clicking X or pressing Escape
```
