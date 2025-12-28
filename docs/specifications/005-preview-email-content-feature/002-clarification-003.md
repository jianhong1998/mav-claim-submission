# Frontend UI Implementation - Clarification Questions

## Context

Backend implementation is complete with:

- **API Endpoint**: `GET /api/claims/:id/preview`
- **Response**: `{ subject, htmlBody, recipients[], cc[], bcc[] }`
- **Restriction**: Only draft claims can be previewed

Frontend patterns established:

- Dialog/Modal: Radix UI `Dialog` component
- Styling: Tailwind CSS with dark mode
- API: Axios + React Query
- Existing claim components: `DraftClaimCard`, `ClaimFormModal`, `ClaimCard`

---

## Clarification Questions

### 1. Preview Button Placement

**Question**: Where should the "Preview Email" button be located?

**Options**:

**Option A: In DraftClaimCard (Recommended)**

- Add "Preview" button alongside existing "Edit" and "Delete" buttons
- Accessible from claim list view
- User can preview any draft claim without opening form

**Option B: In ClaimFormModal**

- Add "Preview" button next to "Submit" button in form modal
- User previews while editing/creating claim
- Preview reflects current form data (may not be saved yet)

**Option C: Both locations**

- Preview available in both draft card and form modal
- More access points but potentially confusing

**My recommendation**: Option A - simpler UX, clearer flow (save draft → preview → send)

**Please confirm which option you prefer.**

#### Answer

Option A

---

### 2. Preview Modal Size

**Question**: What size should the preview modal be?

**Options**:

**Option A: Standard dialog (max-w-2xl)**

- Similar size to existing ClaimFormModal
- May require scrolling for long emails

**Option B: Large dialog (max-w-4xl)**

- More space for email content
- Better for viewing full email layout

**Option C: Full-screen modal**

- Maximum space for email preview
- Immersive preview experience
- Might feel disconnected from main UI

**My recommendation**: Option B - enough space for email content while staying modal-like

**Please confirm which option you prefer.**

#### Answer

Option B.

---

### 3. Recipient Information Display

**Question**: How should recipients (To/CC/BCC) be displayed in the preview modal?

**Options**:

**Option A: Header section above email body**

```
┌─────────────────────────────────────┐
│ Email Preview                    X  │
├─────────────────────────────────────┤
│ Subject: John Doe - Claim for...    │
│ To: finance@mavericks-consulting... │
│ CC: manager@mavericks-consulting... │
│ BCC: accounting@mavericks-...       │
├─────────────────────────────────────┤
│ [Email HTML Body rendered here]     │
│                                     │
└─────────────────────────────────────┘
```

**Option B: Sidebar layout**

```
┌───────────────────────────────────────────┐
│ Email Preview                          X  │
├──────────────────────┬────────────────────┤
│                      │ To: finance@...    │
│ [Email HTML Body]    │ CC: manager@...    │
│                      │ BCC: accounting@...|
│                      │                    │
└──────────────────────┴────────────────────┘
```

**Option C: Collapsible header (default collapsed)**

- Recipients shown in collapsed header
- Click to expand and see full details
- More space for email body

**My recommendation**: Option A - clear, familiar email preview layout

**Please confirm which option you prefer.**

#### Answer

Option A and C.

---

### 4. HTML Email Rendering

**Question**: How should the HTML email body be rendered?

**Options**:

**Option A: Direct HTML render with sanitization (Recommended)**

- Use `dangerouslySetInnerHTML` with DOMPurify sanitization
- Email displays exactly as recipient will see it
- Fast rendering

**Option B: Iframe sandbox**

- Render HTML in isolated iframe
- Complete style isolation
- More complex implementation

**Option C: Styled container with scoped styles**

- Render HTML with CSS scoping to prevent style bleed
- Balance between security and simplicity

**My recommendation**: Option A - backend already escapes HTML, add DOMPurify for safety

**Please confirm which option you prefer.**

#### Answer

Option A.

---

### 5. Send Workflow Integration

**Question**: Should the preview modal include a "Send" button?

**Options**:

**Option A: Preview only (Recommended)**

- Modal only shows preview content
- User closes modal and uses existing send flow
- Clear separation of concerns

**Option B: Preview + Send**

- Modal includes "Send Claim" button at bottom
- User can send directly from preview
- Requires confirmation dialog (already have ConfirmationProvider)

**Option C: Preview + Edit + Send**

- Preview shows content
- "Edit" button returns to form
- "Send" button submits claim
- Most complex but most convenient

**My recommendation**: Option B - natural flow (preview → confirm → send)

**Please confirm which option you prefer.**

#### Answer

Option A.

---

### 6. Loading and Error States

**Question**: How should loading and error states be handled?

**For loading**:

- Option A: Show loading spinner in modal content area
- Option B: Show loading spinner before opening modal (modal opens when data ready)

**For errors**:

- Option A: Show error message inside modal with retry button
- Option B: Close modal and show toast notification with error
- Option C: Show error inline with "Try Again" button

**My recommendation**:

- Loading: Option B (wait for data before opening modal)
- Errors: Option C (inline error with retry)

**Please confirm your preferences.**

#### Answer

For loading, option A.
For error, option A.

---

### 7. Mobile Responsiveness

**Question**: How should the preview modal behave on mobile?

**Options**:

**Option A: Full-screen on mobile, dialog on desktop**

- Mobile: Modal takes full screen for better readability
- Desktop: Standard centered dialog

**Option B: Same dialog on all devices**

- Responsive width but consistent modal style
- May require more scrolling on mobile

**My recommendation**: Option A - better mobile UX

**Please confirm which option you prefer.**

#### Answer

Option A.

---

## Summary

Once these questions are answered, I can create a complete frontend UI spec with:

1. Component structure (PreviewEmailModal, useEmailPreview hook)
2. UI/UX design with wireframes
3. API integration with React Query
4. Error handling and loading states
5. Mobile responsiveness
6. Testing strategy

**Please provide answers to proceed with spec creation.**
