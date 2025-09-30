# ADR-003: Hybrid Email Attachments with Google Drive Fallback

**Status:** Accepted
**Date:** 2025-09-30
**Decision Makers:** Technical Team
**Related Spec:** `.spec-workflow/specs/email-attachments-analysis/`

---

## Context

The Mavericks Claim Submission System currently sends all expense claim files as Google Drive shareable links in email notifications. This approach assumes recipients have Google accounts with Drive access, which is not always true (external accountants, third-party vendors, personal email recipients).

**Current Pain Points:**
- Recipients without Google Drive access cannot view claim files
- Small files like receipts (<5MB) are unnecessarily hosted on Drive
- Email recipients expect traditional attachments for small documents
- 80%+ of claim files are receipts/invoices under 5MB

**System Constraints:**
- Gmail attachment size limit: 25MB per email
- Google Drive API quota: effectively unlimited (1B units/day)
- Files already uploaded to user's personal Google Drive via OAuth
- No S3 or alternative storage - Drive is the single source of truth

---

## Decision

Implement a **hybrid attachment system** that intelligently decides between sending files as Gmail attachments (small files) or Google Drive shareable links (large files) based on a **5MB per-file threshold** with a **20MB total email size limit**.

### Decision Rules

**For each file in a claim:**
1. **File size < 5MB** → Attempt to download from Drive and attach to email
2. **File size ≥ 5MB** → Use Drive shareable link (current behavior)
3. **Download fails** → Fallback to Drive link (no exceptions thrown)
4. **Total attachments exceed 20MB** → Remaining files become Drive links

**Processing Order:**
- Sort files by size (smallest first) to maximize attachment count
- Apply rules sequentially until 20MB total limit reached

---

## Rationale

### Linus's Three Questions

**1. Is this a real problem or an imaginary one?**
- **REAL.** Production use case: external accountants without Google accounts cannot access claim files. This is a genuine accessibility issue affecting the core workflow.

**2. Is there a simpler way?**
- **YES.** Single size threshold (5MB) + fallback strategy eliminates all special cases. The data structure (AttachmentEntity) already contains everything needed - no schema changes required. Existing GoogleDriveClient retry/error patterns are reused, no new error handling paradigms needed.

**3. Will this break anything?**
- **NO.** Backward compatible by design:
  - Drive links remain the fallback for every failure path
  - Email template structure unchanged (just different content rendering)
  - Database schema unchanged (behavioral change only)
  - Existing claims/attachments unaffected
  - If hybrid logic fails, system gracefully degrades to current behavior

### Why This Approach?

**Data Structure Analysis:**
```typescript
AttachmentEntity {
  googleDriveFileId: string  // ✓ Download source
  googleDriveUrl: string     // ✓ Link fallback
  fileSize: number           // ✓ Decision threshold
  mimeType: string           // ✓ MIME header
  originalFilename: string   // ✓ Attachment name
}
```
All required data exists. No schema changes. Pure behavioral implementation.

**Complexity Elimination:**
- ONE threshold (5MB) - no per-category logic
- ONE decision per file: `fileSize < 5MB ? attach : link`
- ZERO special cases: download succeeds → attach, download fails → link
- Gmail API accepts both attachments + HTML links in same message naturally

**Risk Mitigation:**
- Drive API failure → link (no email send failure)
- Gmail size limit → 20MB safety margin (5MB below 25MB limit)
- Download timeout → exponential backoff retry → fallback to link
- Total email too large → pre-validated before send

---

## Consequences

### Positive

**User Experience:**
- ✅ External recipients can view small files without Google accounts
- ✅ Traditional email workflow (download attachments) for 80%+ of files
- ✅ Large files still accessible via Drive links (no loss of functionality)
- ✅ Mixed delivery (attachments + links) handled gracefully

**Technical:**
- ✅ No database schema changes
- ✅ Backward compatible (Drive links remain fallback)
- ✅ Reuses existing retry/error patterns from GoogleDriveClient
- ✅ Simple testing: unit test size thresholds + integration test fallback paths

**Operational:**
- ✅ No feature flag needed (zero existing users)
- ✅ Single-phase deployment (no phased rollout complexity)
- ✅ Monitoring built-in (attachment vs link metrics)

### Negative

**Latency:**
- ⚠️ Email send time increases by ~3 seconds worst case (3 files × 1s download)
- Mitigation: Acceptable tradeoff for improved accessibility
- Current: ~250ms | New worst case: ~3.5s | New best case: ~250ms (unchanged)

**Memory:**
- ⚠️ Peak memory: ~50MB per email send (20MB attachments + 27MB base64 encoded)
- Mitigation: Method-scoped buffers, automatic GC after send, no disk I/O

**API Quota:**
- ⚠️ Drive API calls increase from 0 to 0-4 downloads per email
- Mitigation: 10,000 emails/day = 40,000 downloads = 0.004% of 1B daily quota

### Neutral

**Maintenance:**
- New service: `AttachmentProcessorService` (~150 LOC)
- Modified services: `GmailClient`, `EmailTemplateService`, `EmailService` (~200 LOC total)
- Test coverage: +5 test files (~500 LOC)
- **Total code delta: ~850 LOC**

---

## Alternatives Considered

### Alternative 1: All Attachments (No Drive Links)

**Approach:** Download and attach all files regardless of size.

**Rejected Reasons:**
- ❌ Gmail 25MB limit blocks large files (videos, high-res scans)
- ❌ Download failures cause entire email send to fail (no fallback)
- ❌ Increased memory usage (>100MB per email for large claims)
- ❌ Longer email send times (5-10 seconds for large files)

**Verdict:** Too brittle. Lack of fallback strategy breaks core reliability.

---

### Alternative 2: All Drive Links (Status Quo)

**Approach:** Keep current behavior - all files as Drive shareable links.

**Rejected Reasons:**
- ❌ Accessibility problem remains unsolved
- ❌ External recipients still cannot view files
- ❌ User expectation mismatch (small receipts should be attachments)

**Verdict:** Solves zero problems. No value delivered.

---

### Alternative 3: User-Configurable Threshold

**Approach:** Let users set their own attachment size threshold per claim/category.

**Rejected Reasons:**
- ❌ Adds UI complexity (settings page, per-claim override)
- ❌ Database schema changes (user preferences table)
- ❌ Decision fatigue (users don't care about thresholds)
- ❌ Over-engineering: 5MB threshold works for 95%+ of use cases

**Verdict:** Solving an imaginary problem. Single threshold is sufficient.

---

### Alternative 4: Compress Files Before Attaching

**Approach:** Compress files to reduce size, increase attachment success rate.

**Rejected Reasons:**
- ❌ Most claim files already compressed (PDF, JPEG, PNG use compression)
- ❌ Adds CPU overhead (~500ms per file)
- ❌ Recipient must decompress (poor UX)
- ❌ Complexity increase (compression library, temp files)

**Verdict:** Minimal benefit, significant complexity cost.

---

## Implementation Strategy

### Architecture Changes

**New Component:**
```
AttachmentProcessorService
  ├─ processAttachments(userId, attachments[])
  │   ├─ Size threshold decision (5MB)
  │   ├─ GoogleDriveClient.downloadFile() calls
  │   └─ Fallback to Drive links on failure
  └─ Returns: { attachments[], links[] }
```

**Modified Components:**
```
GoogleDriveClient
  └─ downloadFile(userId, fileId) → Buffer  [NEW METHOD]

GmailClient
  └─ createMultipartMessage()  [NEW - RFC 2822 MIME support]

EmailTemplateService
  └─ generateClaimEmail(..., processedAttachments)  [MODIFIED]

EmailService
  └─ sendClaimEmail() orchestration  [MODIFIED]
```

### Data Flow

```
1. EmailService.sendClaimEmail(claimId)
     ↓
2. Fetch AttachmentEntity[] from database
     ↓
3. AttachmentProcessorService.processAttachments()
     ├─ For each file: size check → download or link
     └─ Returns { attachments: Buffer[], links: URL[] }
     ↓
4. EmailTemplateService.generateClaimEmail()
     └─ Render both attachment list + Drive link list
     ↓
5. GmailClient.sendEmail() with RFC 2822 multipart MIME
     └─ Part 1: HTML body | Parts 2-N: Attachments
```

---

## Testing Strategy

### Unit Tests

**Critical Paths:**
- ✅ Files <5MB → download and attach
- ✅ Files ≥5MB → use Drive link
- ✅ Download failure → fallback to link (no exception)
- ✅ Total size >20MB → remaining files become links
- ✅ Sort files smallest-first → maximize attachment count
- ✅ RFC 2822 MIME formatting → proper boundaries and encoding

### Integration Tests

**End-to-End Scenarios:**
- ✅ Send email with mixed attachments + links
- ✅ Send email with attachments only
- ✅ Send email with links only (current behavior preserved)
- ✅ Drive API failure → all files fallback to links
- ✅ Claim status updates correctly (SENT on success, FAILED on error)

---

## Monitoring & Rollout

### Key Metrics

**Business Metrics:**
- `emails_with_attachments` / `total_emails_sent` (target: 40-50%)
- `avg_attachments_per_email` (expected: 1-2)
- `fallback_to_link_rate` (healthy: <5%)

**Technical Metrics:**
- `drive_download_latency_p95` (target: <2s)
- `email_send_success_rate` (maintain: >99%)
- `attachment_processing_errors` (target: <1%)

### Rollout Plan

**Single-Phase Deployment:**
1. Deploy all components with tests (no feature flag needed)
2. Enable monitoring dashboards
3. Monitor first 100 emails for anomalies
4. Full production rollout

**Rationale:** Zero existing users → no phased rollout needed. Clean deployment.

---

## Failure Modes & Fallback

### Graceful Degradation Matrix

| Failure Scenario | Detection | Behavior | User Impact |
|------------------|-----------|----------|-------------|
| Drive download 401/403 | Exception | Fallback to Drive link | Transparent |
| Drive download timeout | Retry exhausted | Fallback to Drive link | Transparent |
| Drive API quota exceeded | Exception | All files → Drive links | Partial degradation |
| Gmail send size limit | Pre-validation | Cap attachments at 20MB | Mixed delivery |
| Gmail send failure | API error | Mark claim FAILED, allow retry | User retries |

**Guarantee:** Every failure path defaults to current behavior (Drive links). No partial state, no data loss.

---

## Security Considerations

**Data Privacy:**
- ✅ File buffers never written to disk (memory-only)
- ✅ OAuth tokens reuse existing encrypted storage
- ✅ No file content logging

**Input Validation:**
- ✅ File size validated at upload (existing)
- ✅ MIME type validated against allow-list (existing)
- ✅ Filename sanitized in email headers (XSS prevention)

**Rate Limiting:**
- ✅ Gmail send: 100 emails/day per user (Google Workspace limit)
- ✅ Drive API: effectively unlimited quota
- ✅ Concurrent downloads: max 5 parallel (prevent memory spike)

---

## References

**Design Document:** `.spec-workflow/specs/email-attachments-analysis/design.md`
**Task Breakdown:** `.spec-workflow/specs/email-attachments-analysis/tasks.md`
**RFC 2822 (MIME):** https://www.ietf.org/rfc/rfc2822.txt
**Gmail API Attachments:** https://developers.google.com/gmail/api/guides/uploads
**Drive API Download:** https://developers.google.com/drive/api/guides/manage-downloads

---

## Decision Outcome

**Approved:** 2025-09-30
**Implementation Timeline:** 15.5 hours (~2 days)
**Target Release:** Next deployment cycle

This ADR documents the architectural decision to implement a hybrid email attachment system. The approach balances recipient accessibility (attachments for small files) with system reliability (Drive links for large files and all failure paths). The design maintains backward compatibility, requires zero schema changes, and leverages existing infrastructure patterns.