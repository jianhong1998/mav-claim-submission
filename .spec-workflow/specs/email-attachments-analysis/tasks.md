# Tasks Document

## Overview
Straightforward implementation: download small files (<5MB), attach to email. Large files stay as Drive links. Single threshold, clean fallback, zero breaking changes.

**Total Time:** 15.5 hours (~2 days)

---

- [x] 0.1. Write ADR for hybrid approach
  - File: docs/adr/003-hybrid-email-attachments.md
  - Document the "why" before writing code
  - Context: recipient accessibility vs system complexity
  - Decision: 5MB threshold with Drive link fallback
  - Consequences: +3s latency, graceful degradation
  - Alternatives: all-attachments, all-links approaches rejected
  - _Time: 30 minutes_
  - _Requirements: Design Phase 0_

- [x] 1.1. Add downloadFile() to GoogleDriveClient
  - File: backend/src/modules/attachments/services/google-drive-client.service.ts
  - Download file from Google Drive as in-memory Buffer
  - Implement `downloadFile(userId, fileId): Promise<Buffer>`
  - Use `alt: 'media'` and `responseType: 'arraybuffer'`
  - Reuse existing `retryOperation()` and `handleDriveError()`
  - _Leverage: Existing getFileInfo() method - same retry/error logic_
  - _Time: 1 hour_
  - _Requirements: 1.2_

- [x] 1.2. Create AttachmentProcessorService
  - File: backend/src/modules/email/services/attachment-processor.service.ts
  - Size-based decision logic: attach small files, link large files
  - Implement `processAttachments(userId, attachments[]): Promise<ProcessedAttachments>`
  - Apply 5MB per-file and 20MB total thresholds
  - Fallback to Drive links on any download failure (no exceptions thrown)
  - Sort files by size (smallest first) before processing
  - Update docs/project-info/architecture.md with new service component
  - _Leverage: GoogleDriveClient for retry/error patterns_
  - _Time: 3 hours_
  - _Requirements: 1.1_

- [x] 2.1. Update GmailClient for multipart MIME
  - File: backend/src/modules/email/services/gmail-client.service.ts
  - Add RFC 2822 multipart/mixed support for email attachments
  - Add optional `attachments[]` to IEmailSendRequest interface
  - Extract current logic to `createSimpleMessage()` private method
  - Implement `createMultipartMessage()` for attachments
  - Update packages/types/src/email/email.types.ts
  - Update docs/project-info/api-endpoints.md with attachment parameter
  - MIME format: multipart/mixed with proper boundaries and base64 encoding
  - _Time: 2 hours_
  - _Requirements: 2.3_
  - _Parallel: Can run in parallel with Task 2.2_

- [x] 2.2. Update EmailTemplateService for mixed rendering
  - File: backend/src/modules/email/services/email-template.service.ts
  - Render both attached files and Drive links in email HTML
  - Add overload: `generateClaimEmail(..., processedAttachments?: ProcessedAttachments)`
  - Render "📎 Attached Files" section (show filename + size)
  - Render "☁️ Files on Google Drive" section (show link + size)
  - Implement `formatFileSize(bytes): string` helper
  - Maintain XSS escaping for all user input
  - _Time: 2 hours_
  - _Requirements: 2.3_
  - _Parallel: Can run in parallel with Task 2.1_

- [x] 2.3. Update EmailService orchestration
  - File: backend/src/modules/email/services/email.service.ts
  - Wire AttachmentProcessorService into email sending workflow
  - Call `attachmentProcessorService.processAttachments()` after validation
  - Pass result to `emailTemplateService.generateClaimEmail()`
  - Map attachments to Gmail API format
  - Add AttachmentProcessorService to email.module.ts providers
  - Maintain existing transaction handling, error flows, status updates
  - _Time: 1 hour_
  - _Requirements: 1.2, 2.1, 2.2_

- [x] 3.1. Unit tests for GoogleDriveClient.downloadFile
  - File: backend/src/modules/attachments/services/__tests__/google-drive-client.service.spec.ts
  - Test: Downloads file as Buffer
  - Test: Retries on 503, throws on 404
  - Test: Respects maxRetries (3 attempts)
  - Test: Uses alt='media' and responseType='arraybuffer'
  - _Time: 1 hour_
  - _Requirements: 1.1_

- [x] 3.2. Unit tests for AttachmentProcessorService
  - File: backend/src/modules/email/services/__tests__/attachment-processor.service.spec.ts
  - Test: Attaches files <5MB, links files ≥5MB
  - Test: Respects 20MB total size limit
  - Test: Fallback to link on download failure
  - Test: Sorts smallest files first
  - Test: Handles empty attachments array
  - _Time: 2 hours_
  - _Requirements: 1.2_

- [x] 3.3. Unit tests for GmailClient multipart MIME
  - File: backend/src/modules/email/services/__tests__/gmail-client.service.spec.ts
  - Test: Creates simple message (no attachments)
  - Test: Creates multipart message (with attachments)
  - Test: Proper MIME boundaries and base64 encoding
  - Test: Handles multiple attachments correctly
  - _Time: 1.5 hours_
  - _Requirements: 2.1_

- [x] 3.4. Unit tests for EmailTemplateService
  - File: backend/src/modules/email/services/__tests__/email-template.service.spec.ts
  - Test: Renders attachments section, links section, both sections
  - Test: Formats file sizes correctly (B, KB, MB)
  - Test: Escapes HTML in filenames
  - Test: formatFileSize() helper (0 bytes, KB, MB edge cases)
  - Test: Fallback to current behavior when processedAttachments undefined
  - _Time: 1.5 hours_
  - _Requirements: 2.2_

- [ ] 3.5. Integration tests for email sending
  - File: backend/src/modules/email/services/__tests__/email.service.integration.spec.ts
  - Test: Sends email with mixed attachments + links
  - Test: Sends attachments-only, links-only
  - Test: Fallback to links on Drive API failure
  - Test: Updates claim status (SENT on success, FAILED on error)
  - Test: Handles total size exceeding 20MB gracefully
  - _Time: 2 hours_
  - _Requirements: 2.3, all unit tests_

---

## Execution Plan

### Critical Path (Sequential)
1. Task 0.1 → Task 1.1 → Task 1.2 → Task 2.3 → Task 3.5

### Parallel Work (After Task 1.2)
- Task 2.1 + Task 3.3 (run in parallel)
- Task 2.2 + Task 3.4 (run in parallel)

### Rationale
Tasks 2.1 and 2.2 have zero dependencies on each other. Implement in parallel to save time.

---

## Definition of Done

**Per Task:**
- [ ] Acceptance criteria met
- [ ] Tests written and passing (`make test/unit`)
- [ ] Code formatted and linted (`make format && make lint`)
- [ ] Documentation updated inline (if applicable)

**No Separate Doc Phase:** Update docs WITH code changes, not after.

---

## Risk Mitigation

**Task 1.1 (Download):**
- Risk: API failures break email sending
- Mitigation: Fallback to Drive links (tested in Task 3.2)

**Task 2.1 (MIME):**
- Risk: Malformed MIME breaks delivery
- Mitigation: Follow RFC 2822 exactly, validate in Task 3.3

**Task 3.5 (Integration):**
- Risk: Missing edge cases
- Mitigation: Test all failure paths (size limits, API errors, mixed delivery)

---

## Reference Implementations

- **Retry Pattern:** GoogleDriveClient.retryOperation()
- **Error Handling:** GoogleDriveClient.handleDriveError()
- **Service Structure:** EmailTemplateService (existing)
- **Testing Pattern:** google-drive-client.service.spec.ts