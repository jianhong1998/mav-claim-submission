# Email Preview Feature - Linus's Analysis & Clarification Questions

## Prerequisite Thinking - Linus's Three Questions

1. **"Is this a real problem or an imaginary one?"**
   - ✅ REAL PROBLEM: Users explicitly requested it - they're unsure what gets sent

2. **"Is there a simpler way?"**
   - ✅ YES: Reuse existing `EmailTemplateService.generateClaimEmail()` - already does everything we need
   - Just add one endpoint that calls existing code

3. **"Will this break anything?"**
   - ✅ NO: Pure addition, zero breaking changes
   - CRITICAL: Preview MUST use identical code path as actual email sending

---

## Understanding of Requirement

Based on user feedback and existing codebase analysis:

**Users want to see exactly what the email will look like before sending a claim.**

Current state:

- `EmailTemplateService` already generates HTML email content (backend/src/modules/email/services/email-template.service.ts:36)
- Template file exists at `backend/src/modules/email/templates/claim-submission.html`
- Email rendering supports both attachments and Drive links
- XSS protection, formatting, and template variables already handled

**Simple solution**: Add GET endpoint that returns the same HTML that would be sent.

---

## Core Judgment

✅ **WORTH DOING**

**Reason**: Real user need with trivial implementation cost. No new complexity - just expose existing functionality.

---

## Key Insights

**Data Structure**:

- Reuse existing structures entirely
- ClaimEntity + UserEntity + AttachmentEntity[] → EmailTemplateService → HTML string
- Zero new data structures required

**Complexity to Eliminate**:

- Don't build separate preview logic
- Don't create new template rendering
- Use EXACT same code path as `EmailService.sendClaimEmail()` to guarantee preview matches reality

**Risk Point**:

- If preview and actual email differ, users lose trust immediately
- Solution: Share identical rendering logic - never duplicate

---

## Critical Questions Requiring Clarification

### 1. Data Completeness & Validation

**Question**: Should preview work with incomplete/invalid claim data?

Scenarios:

- Claim has no `claimName` (optional field) - show preview?
- Claim has no attachments - show preview?
- Claim data fails validation (e.g., invalid month/year) - show preview anyway?

**My suggestion**:

- Allow preview with incomplete data (helps users build the claim)
- Show template with whatever data exists
- Display validation warnings separately from preview

**Confirm**: Is this acceptable?

#### Preview

- If a field is mandatory:
  - should not be able to preview.
- If a field is optional:
  - if the field is empty, then should be able to preview.
  - If the field data is invalid, then should not be able to preview.

---

### 2. Attachment Handling in Preview

**Question**: How should attachments appear in preview when they're not fully uploaded yet?

Current email template shows:

- **Hybrid mode**: Separate sections for "Attached Files" (<5MB) and "Files on Google Drive" (≥5MB)
- File names, sizes, and clickable Drive links

Preview scenarios:

- **Scenario A**: User uploads files to Drive → Preview shows actual Drive links (clickable)
- **Scenario B**: User hasn't uploaded yet → Preview shows what? Placeholder text? Empty list?
- **Scenario C**: Files uploaded but not linked to claim yet → How to handle?

**My suggestion**:

- If `AttachmentEntity` exists with `googleDriveUrl` → Show actual link
- If `AttachmentEntity` exists without URL → Show filename with "(URL pending)" text
- If no attachments → Show "No attachments included with this claim."

**Confirm**: Does this match your expectation?

#### Answer

Preview should not show clickable link, should only show the file name instead. No metter file size.

---

### 3. Email Preferences (CC/BCC) Display

**Question**: Should preview show CC/BCC email addresses from user preferences?

Current implementation:

- `user_email_preferences` table stores CC/BCC emails
- `EmailService.sendClaimEmail()` queries and applies them (email.service.ts:91-101)

Options:

- **Option A**: Show CC/BCC in preview (full transparency)
- **Option B**: Don't show CC/BCC (simpler UI, but less complete)
- **Option C**: Show CC/BCC in separate section, not in email preview itself

**My suggestion**: Option C - Return CC/BCC list separately from HTML preview, let frontend decide where to display

**Confirm**: Which option do you prefer?

#### Answer

Prefer option A.

---

### 4. When to Show Preview

**Question**: At what stage(s) should users access the preview?

Options:

- **Option A**: Real-time preview while editing draft (updates as user types)
- **Option B**: Manual "Preview" button after form completion
- **Option C**: Preview available at any time for any draft/sent claim

**My suggestion**: Option B - Manual preview button, simpler implementation, lower backend load

**Confirm**: Which option aligns with user workflow?

#### Answer

Option B.

---

### 5. Preview Scope

**Question**: What should the preview endpoint return?

Options:

- **Option A**: HTML body only (what goes in email content)
- **Option B**: HTML body + subject line
- **Option C**: HTML body + subject line + CC/BCC + recipient email

**My suggestion**: Option C - Return complete email context for full transparency

Response structure:

```typescript
{
  subject: string;          // "John Doe - Claim for Fitness & Wellness (12/2024) ($150.00)"
  htmlBody: string;         // Full HTML email content
  recipients: string[];     // ["finance@mavericks-consulting.com"]
  cc: string[];            // CC email addresses from preferences
  bcc: string[];           // BCC email addresses from preferences
}
```

**Confirm**: Is this the right scope?

#### Answer

Option C.

---

### 6. Endpoint Design

**Question**: Where should the preview endpoint live?

Options:

- **Option A**: `GET /api/claims/:claimId/preview` (RESTful, claim-specific)
- **Option B**: `POST /api/email/preview` with claim data in body (more flexible)
- **Option C**: `GET /api/claims/:claimId/email/preview` (explicit nesting)

**My suggestion**: Option A - RESTful, clear intent, consistent with existing API design

**Confirm**: Does this match your API conventions?

#### Answer

Option A

---

### 7. Authorization & Access Control

**Question**: Who can preview which claims?

Assumptions:

- Users can only preview their own claims (same as send restrictions)
- Preview requires claim to exist in database (no arbitrary preview)

**Confirm**: Are these assumptions correct?

#### Answer

Yes, both assumptions are correct.

---

## Potential Concerns & Edge Cases

### Edge Case 1: Claim Status

**Question**: Should preview work for claims in any status?

- Draft claims: YES (primary use case)
- Sent claims: ? (user wants to see what was sent)
- Paid claims: ? (historical view)
- Failed claims: ? (debugging)

**My suggestion**: Allow preview for ALL statuses - no reason to restrict

**Confirm**: Any status restrictions needed?

#### Answer

Only allow draft status to be able to preview.
Because users can see the sent email from their Gmail directly.

---

### Edge Case 2: Template Changes Over Time

**Question**: If email template changes, should preview of old sent claims use:

- Current template (shows what would be sent NOW)
- Original template (shows what was ACTUALLY sent)

**Current limitation**: We don't store sent email content, so we can only show "current template"

**My suggestion**:

- Accept this limitation for MVP
- Document that preview shows "current template rendering"
- Future enhancement: Store sent email HTML in database if historical accuracy is critical

**Confirm**: Is this acceptable?

#### Answer

As we only allow draft status to be able to preview, this edge case should never happen. User will always see the updated template before they click the send button.

---

### Edge Case 3: Performance

**Question**: Should preview endpoint use caching?

Considerations:

- Template rendering is fast (string manipulation)
- Attachment processing might query Drive API (slower)
- User might click preview multiple times while editing

**My suggestion**:

- No caching for MVP (simpler)
- Preview generates fresh HTML on each request
- Monitor performance, add caching only if needed

**Confirm**: Is this acceptable?

#### Answer

Yes, the preview will not use cache for now.
Note that, there is no requirement to query the attachments in the preview. User should only see the email content and the list of attachment name. The attachment content should not be fetched.

---

## Proposed Implementation Approach

**If all clarifications are confirmed, here's the dumb simple solution:**

1. Add new endpoint: `GET /api/claims/:claimId/preview`
2. Reuse existing validation from `EmailService.validateClaimForSending()`
3. Call `EmailTemplateService.generateClaimEmail()` with claim data
4. Call `EmailTemplateService.generateSubject()` for subject line
5. Query `user_email_preferences` for CC/BCC
6. Return JSON with full email context

**Lines of code**: ~80 (controller + service method)

**New complexity**: ZERO (reuse everything)

**Breaking changes**: ZERO (pure addition)

---

## Questions Summary

Please confirm/clarify:

1. ✅ Allow preview with incomplete claim data?
2. ✅ Attachment display strategy when files not uploaded?
3. ✅ Include CC/BCC in preview response?
4. ✅ Manual preview button vs real-time updates?
5. ✅ Return subject + HTML + CC/BCC + recipients?
6. ✅ Endpoint: `GET /api/claims/:claimId/preview`?
7. ✅ Users can only preview their own claims?
8. ✅ Allow preview for all claim statuses?
9. ✅ Accept that preview uses current template (not historical)?
10. ✅ No caching for MVP?

**Once these are answered, implementation is trivial.**

---

## Final Note

This is a perfect example of "good taste" in software design:

- Existing `EmailTemplateService` already does what we need
- No special cases required
- No new abstractions needed
- Just expose existing functionality through new endpoint

The "bad taste" alternative would be:

- Build separate preview template rendering
- Duplicate template logic
- Create new service for preview
- Risk preview != actual email

**Keep it simple. Reuse what works.**
