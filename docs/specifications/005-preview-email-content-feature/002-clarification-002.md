# Email Preview Feature - Additional Clarification

## Review of Answers

I've reviewed all your answers. Most are clear, but there's one critical issue that needs clarification to ensure preview accuracy.

---

## Critical Issue: Attachment Display Mismatch

### The Problem

**Your Answer #2**: "Preview should not show clickable link, should only show the file name instead. No matter file size."

**Your Answer #10**: "User should only see the email content and the list of attachment name. The attachment content should not be fetched."

**Current Email Template Behavior** (from EmailTemplateService.generateMixedAttachmentsContent()):

The ACTUAL sent email shows attachments in TWO separate sections:

```
📎 Attached Files
• invoice.pdf (1.2 MB)
• receipt.jpg (500 KB)

☁️ Files on Google Drive
• contract.pdf (click to view) (8.5 MB)
• presentation.pptx (click to view) (12 MB)
```

- Files <5MB: Listed under "Attached Files" (actually attached to email)
- Files ≥5MB: Listed under "Files on Google Drive" (shown as clickable Drive links)

This creates a **preview vs reality mismatch**.

---

## Clarification Question

**For the preview, which approach should we take?**

### Option A: Match Email Structure (Without Links)

Show the SAME two-section structure as the actual email, but disable Drive links:

```
Preview will show:

📎 Attached Files
• invoice.pdf (1.2 MB)
• receipt.jpg (500 KB)

☁️ Files on Google Drive
• contract.pdf (8.5 MB)  [Note: no clickable link in preview]
• presentation.pptx (12 MB)  [Note: no clickable link in preview]
```

**Pros**:

- Preview accurately represents email structure
- User knows which files will be attached vs Drive links
- Matches email layout exactly

**Cons**:

- Slightly more complex

---

### Option B: Simple Flat List

Show all attachments in a single list without categorization:

```
Preview will show:

Attachments:
• invoice.pdf (1.2 MB)
• receipt.jpg (500 KB)
• contract.pdf (8.5 MB)
• presentation.pptx (12 MB)
```

**Pros**:

- Simpler implementation
- Cleaner UI

**Cons**:

- Does NOT match actual email structure
- User doesn't know which files will be attached vs sent as links
- Preview misleads user about final email appearance

---

### Option C: Flat List with Indicators

Show all attachments in one list but indicate how they'll be sent:

```
Preview will show:

Attachments:
• invoice.pdf (1.2 MB) - Will be attached
• receipt.jpg (500 KB) - Will be attached
• contract.pdf (8.5 MB) - Will be sent as Google Drive link
• presentation.pptx (12 MB) - Will be sent as Google Drive link
```

**Pros**:

- Clear indication of what will happen
- User understands the behavior

**Cons**:

- Still doesn't match actual email layout
- Adds extra text that won't appear in real email

---

## My Recommendation

**Option A: Match Email Structure (Without Links)**

**Reasoning**:

1. **Preview accuracy principle**: "Preview MUST match actual email as closely as possible"
2. The only difference is Drive links are not clickable in preview (which is what you requested)
3. User sees EXACTLY what the email layout will look like
4. Implementation is simple: Reuse existing `generateMixedAttachmentsContent()` but pass a flag to disable link generation

**Implementation approach**:

- Modify `EmailTemplateService.generateMixedAttachmentsContent()` to accept optional `disableLinks` parameter
- Preview endpoint: Pass `disableLinks: true`
- Actual send: Pass `disableLinks: false` (default)
- Same structure, different link rendering

---

## Question

**Which option do you prefer: A, B, or C?**

Please confirm so I can proceed with the correct implementation plan.

### Answer

Option A.

---

## Additional Note on Implementation

**Your Answer #10 clarification is understood**:

- Preview will NOT call `AttachmentProcessorService.processAttachments()` (which downloads files from Drive)
- Preview will ONLY use `AttachmentEntity` metadata from database (fileSize, originalFilename)
- This means:
  - No Drive API calls during preview
  - No file downloads
  - No performance impact
  - Fast preview generation

**This is good design and I'll implement it this way.**

---

## Summary

Once you confirm the attachment display format (Option A, B, or C), I have everything needed to create a complete implementation plan using spec-workflow.

All other answers are clear and I have no further concerns.
