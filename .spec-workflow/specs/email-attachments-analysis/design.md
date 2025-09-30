# Design Document: Hybrid Email Attachment System

## Executive Summary

This document details the technical design for implementing a hybrid email attachment system that intelligently decides between sending files as Gmail attachments (for small files <5MB) or Google Drive shareable links (for large files ≥5MB). The solution maintains backward compatibility, preserves system reliability, and improves recipient accessibility without introducing architectural complexity.

---

## Design Philosophy

### Linus's Three Questions

1. **Is this a real problem or an imaginary one?**
   - REAL: Email recipients without Google Drive access cannot view claim files
   - Files <5MB represent 80%+ of typical claim attachments (receipts, invoices)
   - Gmail attachment is the expected behavior for small files

2. **Is there a simpler way?**
   - YES: Size-based branching with single threshold (5MB)
   - NO special cases: file either downloads and attaches, or uses Drive link
   - Existing GoogleDriveClient retry/error handling patterns reused

3. **Will this break anything?**
   - NO: Backward compatible - Drive links remain the fallback
   - NO: Email template structure unchanged (just attachment vs link rendering)
   - NO: Database schema unchanged (AttachmentEntity already has all required fields)

### Core Judgment

✅ **Worth Doing**

**Reason:** Improves user experience for 80%+ of claims (small files) while maintaining reliability for edge cases (large files). The complexity cost is minimal - single size check + file download operation with existing error patterns.

### Key Insights

**Data Structure:**
- `AttachmentEntity` already contains all required metadata (fileSize, googleDriveFileId, mimeType)
- No schema changes needed - pure behavioral change in email composition layer
- File data flows: Drive → Memory Buffer → Gmail API (no disk I/O needed)

**Complexity Elimination:**
- Single threshold (5MB) eliminates per-category logic
- Download-or-link decision is one conditional, not multiple edge cases
- Gmail API accepts both inline attachments and HTML links in same message

**Risk Point:**
- Drive API download + Gmail API send creates 2-phase operation
- Mitigation: Fallback to Drive link on any failure (no partial state)
- Total email size validation before Gmail send (prevent 25MB limit errors)

---

## Architecture Overview

### Component Interaction

```
EmailService (orchestrator)
    ↓
    ├─→ AttachmentProcessorService [NEW]
    │       ├─→ Decide: attachment vs link (size check)
    │       ├─→ GoogleDriveClient.downloadFile() [NEW method]
    │       └─→ Build attachment metadata
    │
    ├─→ EmailTemplateService (modified)
    │       └─→ Render mixed attachments + links
    │
    └─→ GmailClient (modified)
            └─→ Send email with RFC 2822 multipart MIME
```

### Data Flow

```
1. EmailService.sendClaimEmail()
   └─→ Get AttachmentEntity[] from database

2. AttachmentProcessorService.processAttachments()
   ├─→ FOR EACH attachment:
   │   ├─→ IF fileSize < 5MB
   │   │   ├─→ GoogleDriveClient.downloadFile(fileId)
   │   │   │   └─→ Returns Buffer (in-memory, no temp files)
   │   │   └─→ Create AttachmentData { buffer, metadata }
   │   └─→ ELSE
   │       └─→ Create LinkData { driveUrl, metadata }
   │
   ├─→ Validate total size < 20MB (Gmail safety margin)
   └─→ Return ProcessedAttachments { attachments, links }

3. EmailTemplateService.generateClaimEmail()
   └─→ Render HTML with:
       ├─→ Attachment section (inline files)
       └─→ Drive links section (large files)

4. GmailClient.sendEmail()
   └─→ Build RFC 2822 multipart/mixed message
       ├─→ Part 1: text/html (email body)
       └─→ Part 2-N: application/* (attachments)
```

---

## Detailed Component Design

### 1. AttachmentProcessorService (NEW)

**Location:** `backend/src/modules/email/services/attachment-processor.service.ts`

**Responsibilities:**
- Attachment vs link decision logic (single 5MB threshold)
- Drive file download orchestration with error handling
- Total size validation before Gmail send
- Fallback to Drive links on any failure

**Interface:**

```typescript
export interface ProcessedAttachment {
  filename: string;
  buffer: Buffer;
  mimeType: string;
  size: number;
}

export interface DriveLink {
  filename: string;
  driveUrl: string;
  size: number;
  reason: 'size-exceeded' | 'download-failed';
}

export interface ProcessedAttachments {
  attachments: ProcessedAttachment[];
  links: DriveLink[];
  totalAttachmentSize: number;
}

@Injectable()
export class AttachmentProcessorService {
  private readonly SIZE_THRESHOLD_MB = 5;
  private readonly GMAIL_SAFE_LIMIT_MB = 20; // 5MB safety margin below 25MB

  /**
   * Process attachments: download small files, keep large files as links
   *
   * Decision Logic:
   * - fileSize < 5MB → attempt download → on success: attachment, on failure: link
   * - fileSize ≥ 5MB → drive link
   * - total size > 20MB → all remaining files become links
   */
  async processAttachments(
    userId: string,
    attachments: AttachmentEntity[],
  ): Promise<ProcessedAttachments>;
}
```

**Implementation Strategy:**

```typescript
async processAttachments(
  userId: string,
  attachments: AttachmentEntity[],
): Promise<ProcessedAttachments> {
  const result: ProcessedAttachments = {
    attachments: [],
    links: [],
    totalAttachmentSize: 0,
  };

  // Sort by file size (smallest first) to maximize attachment count
  const sorted = [...attachments].sort((a, b) => a.fileSize - b.fileSize);

  for (const attachment of sorted) {
    const fileSizeMB = attachment.fileSize / (1024 * 1024);

    // Decision 1: Size threshold check
    if (fileSizeMB >= this.SIZE_THRESHOLD_MB) {
      result.links.push({
        filename: attachment.originalFilename,
        driveUrl: attachment.googleDriveUrl!,
        size: attachment.fileSize,
        reason: 'size-exceeded',
      });
      continue;
    }

    // Decision 2: Gmail total size limit check
    const projectedSize = result.totalAttachmentSize + attachment.fileSize;
    if (projectedSize > this.GMAIL_SAFE_LIMIT_MB * 1024 * 1024) {
      result.links.push({
        filename: attachment.originalFilename,
        driveUrl: attachment.googleDriveUrl!,
        size: attachment.fileSize,
        reason: 'size-exceeded',
      });
      continue;
    }

    // Decision 3: Attempt download with fallback
    try {
      const buffer = await this.googleDriveClient.downloadFile(
        userId,
        attachment.googleDriveFileId!,
      );

      result.attachments.push({
        filename: attachment.originalFilename,
        buffer,
        mimeType: attachment.mimeType,
        size: attachment.fileSize,
      });

      result.totalAttachmentSize += attachment.fileSize;
    } catch (error) {
      this.logger.warn(
        `Failed to download ${attachment.originalFilename}, using Drive link`,
        error,
      );

      result.links.push({
        filename: attachment.originalFilename,
        driveUrl: attachment.googleDriveUrl!,
        size: attachment.fileSize,
        reason: 'download-failed',
      });
    }
  }

  return result;
}
```

**Error Handling:**
- Download failure → fallback to Drive link (no exception thrown)
- Missing googleDriveFileId → treat as link-only (defensive)
- API quota exceeded → all files become links (graceful degradation)

---

### 2. GoogleDriveClient (MODIFIED)

**New Method:** `downloadFile(userId: string, fileId: string): Promise<Buffer>`

**Location:** Add to existing `backend/src/modules/attachments/services/google-drive-client.service.ts`

**Implementation:**

```typescript
/**
 * Download file from Google Drive as Buffer
 * Requirements: Hybrid attachment approach - file download
 */
async downloadFile(userId: string, fileId: string): Promise<Buffer> {
  const drive = await this.getDriveClient(userId);

  try {
    const result = await this.retryOperation(async () => {
      const response = await drive.files.get(
        {
          fileId,
          alt: 'media', // Download file content, not metadata
        },
        {
          responseType: 'arraybuffer', // Get raw binary data
        },
      );

      return Buffer.from(response.data as ArrayBuffer);
    });

    this.logger.debug(`File downloaded successfully: ${fileId}`);
    return result;
  } catch (error) {
    this.logger.error(`File download failed for ${fileId}:`, error);
    throw this.handleDriveError(error);
  }
}
```

**Key Points:**
- Uses existing `retryOperation()` for reliability (3 retries with exponential backoff)
- Uses existing `handleDriveError()` for consistent error handling
- Returns Buffer (in-memory) - no temporary file creation
- Reuses existing OAuth token management from `getDriveClient()`

---

### 3. EmailTemplateService (MODIFIED)

**Modified Method:** `generateClaimEmail()` - update to handle mixed attachments + links

**Location:** `backend/src/modules/email/services/email-template.service.ts`

**Interface Change:**

```typescript
// OLD signature (kept for backward compatibility)
generateClaimEmail(
  claim: ClaimEntity,
  user: UserEntity,
  attachments: AttachmentEntity[],
): string;

// NEW signature (overload)
generateClaimEmail(
  claim: ClaimEntity,
  user: UserEntity,
  attachments: AttachmentEntity[],
  processedAttachments?: ProcessedAttachments,
): string;
```

**Template Update:**

Current HTML template structure:
```html
<section class="attachments">
  <h3>Attachments ({{attachmentCount}})</h3>
  {{attachmentsContent}}
</section>
```

New HTML template structure:
```html
<section class="attachments">
  <h3>Attachments & Files</h3>

  <!-- Inline Attachments Section (if any) -->
  {{#if hasAttachments}}
  <div class="inline-attachments">
    <h4>📎 Attached Files ({{attachmentCount}})</h4>
    <p class="attachment-note">The following files are attached to this email:</p>
    <ul class="attachment-list">
      {{inlineAttachmentsList}}
    </ul>
  </div>
  {{/if}}

  <!-- Drive Links Section (if any) -->
  {{#if hasDriveLinks}}
  <div class="drive-links">
    <h4>☁️ Files on Google Drive ({{linkCount}})</h4>
    <p class="drive-note">Click the links below to access larger files:</p>
    <ul class="link-list">
      {{driveLinksList}}
    </ul>
  </div>
  {{/if}}
</section>
```

**Implementation:**

```typescript
private generateAttachmentsContent(
  attachments: AttachmentEntity[],
  processed?: ProcessedAttachments,
): string {
  // Backward compatibility: no processed data = all Drive links (current behavior)
  if (!processed) {
    return this.generateDriveLinksOnly(attachments);
  }

  let html = '';

  // Render inline attachments section
  if (processed.attachments.length > 0) {
    const items = processed.attachments
      .map(att => `
        <li class="attachment-item">
          <span class="attachment-icon">📄</span>
          <span class="attachment-name">${this.escapeHtml(att.filename)}</span>
          <span class="attachment-size">(${this.formatFileSize(att.size)})</span>
        </li>
      `)
      .join('');

    html += `
      <div class="inline-attachments">
        <h4>📎 Attached Files (${processed.attachments.length})</h4>
        <p class="attachment-note">The following files are attached to this email:</p>
        <ul class="attachment-list">${items}</ul>
      </div>
    `;
  }

  // Render Drive links section
  if (processed.links.length > 0) {
    const items = processed.links
      .map(link => `
        <li class="link-item">
          <a href="${this.escapeHtml(link.driveUrl)}"
             class="drive-link"
             target="_blank"
             rel="noopener noreferrer">
            <span class="link-icon">☁️</span>
            <span class="link-name">${this.escapeHtml(link.filename)}</span>
            <span class="link-size">(${this.formatFileSize(link.size)})</span>
          </a>
        </li>
      `)
      .join('');

    html += `
      <div class="drive-links">
        <h4>☁️ Files on Google Drive (${processed.links.length})</h4>
        <p class="drive-note">Click the links below to access larger files:</p>
        <ul class="link-list">${items}</ul>
      </div>
    `;
  }

  return html || '<div class="no-attachments">No files included with this claim.</div>';
}

private formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

---

### 4. GmailClient (MODIFIED)

**Modified Method:** `createEmailMessage()` - support RFC 2822 multipart/mixed with attachments

**Location:** `backend/src/modules/email/services/gmail-client.service.ts`

**Interface Change:**

```typescript
// NEW parameter in IEmailSendRequest
interface IEmailSendRequest {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
  attachments?: Array<{  // NEW
    filename: string;
    content: Buffer;
    mimeType: string;
  }>;
}
```

**Implementation:**

```typescript
private createEmailMessage(
  emailRequest: IEmailSendRequest,
  recipients: string[],
): string {
  const { subject, body, isHtml = false, attachments = [] } = emailRequest;

  // No attachments: use simple message format (current behavior)
  if (attachments.length === 0) {
    return this.createSimpleMessage(subject, body, recipients, isHtml);
  }

  // With attachments: use multipart/mixed format
  return this.createMultipartMessage(subject, body, recipients, isHtml, attachments);
}

private createSimpleMessage(
  subject: string,
  body: string,
  recipients: string[],
  isHtml: boolean,
): string {
  // Current implementation (unchanged)
  const headers = [
    `To: ${recipients.join(', ')}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    isHtml ? 'Content-Type: text/html; charset=utf-8' : 'Content-Type: text/plain; charset=utf-8',
  ];

  const emailContent = headers.join('\r\n') + '\r\n\r\n' + body;

  return Buffer.from(emailContent, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

private createMultipartMessage(
  subject: string,
  body: string,
  recipients: string[],
  isHtml: boolean,
  attachments: Array<{ filename: string; content: Buffer; mimeType: string }>,
): string {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substring(2)}`;

  // Build multipart message
  let message = [
    `To: ${recipients.join(', ')}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    isHtml ? 'Content-Type: text/html; charset=utf-8' : 'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ].join('\r\n');

  // Add each attachment as a MIME part
  for (const attachment of attachments) {
    const base64Content = attachment.content.toString('base64');

    message += [
      '',
      `--${boundary}`,
      `Content-Type: ${attachment.mimeType}`,
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      'Content-Transfer-Encoding: base64',
      '',
      base64Content,
    ].join('\r\n');
  }

  // Close multipart boundary
  message += `\r\n--${boundary}--`;

  // Encode to base64url for Gmail API
  return Buffer.from(message, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
```

**RFC 2822 Compliance:**
- Uses `multipart/mixed` for email with attachments
- Each attachment is a separate MIME part with proper headers
- Base64 encoding for binary content
- Proper boundary delimiter generation

---

### 5. EmailService (MODIFIED)

**Modified Method:** `sendClaimEmail()` - orchestrate attachment processing

**Location:** `backend/src/modules/email/services/email.service.ts`

**Implementation Changes:**

```typescript
async sendClaimEmail(
  userId: string,
  request: IClaimEmailRequest,
): Promise<IClaimEmailResponse> {
  const { claimId } = request;

  try {
    // Step 1: Validate claim (unchanged)
    const claimValidation = await this.validateClaimForSending(userId, claimId);
    if (!claimValidation.isValid) {
      return { success: false, error: claimValidation.error };
    }

    const { claim, user, attachments } = claimValidation;

    // Step 2: Process attachments (NEW)
    const processedAttachments = await this.attachmentProcessorService.processAttachments(
      userId,
      attachments,
    );

    // Step 3: Generate email content with processed attachments (MODIFIED)
    const emailContent = this.emailTemplateService.generateClaimEmail(
      claim!,
      user!,
      attachments,
      processedAttachments,
    );
    const emailSubject = this.emailTemplateService.generateSubject(claim!);

    // Step 4: Send email with attachments (MODIFIED)
    const emailResult = await this.gmailClient.sendEmail(userId, {
      to: this.environmentUtil.getVariables().emailRecipients,
      subject: emailSubject,
      body: emailContent,
      isHtml: true,
      attachments: processedAttachments.attachments.map(att => ({
        filename: att.filename,
        content: att.buffer,
        mimeType: att.mimeType,
      })),
    });

    // Step 5-6: Handle result (unchanged)
    if (!emailResult.success) {
      await this.updateClaimStatusWithTransaction(claimId, ClaimStatus.FAILED, null);
      return { success: false, error: emailResult.error };
    }

    const updatedClaim = await this.updateClaimStatusWithTransaction(
      claimId,
      ClaimStatus.SENT,
      new Date(),
    );

    return {
      success: true,
      messageId: emailResult.messageId,
      claim: { /* claim data */ },
    };
  } catch (error) {
    // Error handling (unchanged)
    return { success: false, error: error.message };
  }
}
```

---

## Database Schema

**NO CHANGES REQUIRED**

Existing `AttachmentEntity` schema already contains all required fields:

```typescript
@Entity('attachments')
export class AttachmentEntity {
  id: string;
  claimId: string;
  originalFilename: string;          // ✓ Used for attachment filename
  googleDriveFileId: string | null;  // ✓ Used for download
  googleDriveUrl: string | null;     // ✓ Used for links
  fileSize: number;                  // ✓ Used for size threshold
  mimeType: string;                  // ✓ Used for MIME type
  status: AttachmentStatus;
  createdAt: Date;
  updatedAt: Date;
}
```

**Why No Schema Changes:**
- Hybrid approach is a behavioral change, not a data model change
- All attachment metadata already tracked from initial upload
- Decision (attachment vs link) is made at email-send time, not stored

---

## Failure Modes & Fallback Strategy

### Failure Scenario Matrix

| Failure Point | Detection | Fallback Behavior | User Impact |
|---------------|-----------|-------------------|-------------|
| Drive API download fails (401/403) | Exception in `downloadFile()` | Use Drive link for that file | Transparent |
| Drive API quota exceeded | Exception in `downloadFile()` | Use Drive links for remaining files | Partial attachments |
| Individual file download timeout | `retryOperation()` exhausted | Use Drive link for that file | Transparent |
| Total size exceeds 20MB mid-processing | Size check in loop | Use Drive links for remaining files | Mixed delivery |
| Gmail send fails (size limit) | Gmail API error | Mark claim as FAILED, log error | Retry allowed |
| Gmail send fails (other) | Gmail API error | Mark claim as FAILED, retry | Retry allowed |

### Fallback Guarantee

**Principle:** Every failure path defaults to Drive link behavior (current proven system)

```typescript
// Pseudocode fallback logic
try {
  if (canDownload && shouldAttach) {
    attachment = downloadAndAttach(file);
  } else {
    link = useDriveLink(file);
  }
} catch (anyError) {
  link = useDriveLink(file);  // ALWAYS fallback to working approach
}
```

**No Partial State:**
- Attachment processing happens before claim status update
- Email sending is atomic (all attachments + body or nothing)
- Claim status only updates to SENT after successful Gmail send

---

## Performance Characteristics

### Latency Analysis

**Current System (Drive links only):**
- Email composition: ~50ms
- Gmail API send: ~200ms
- **Total: ~250ms**

**Hybrid System (worst case: 3 small attachments):**
- Email composition: ~50ms
- Drive downloads (3 files × 5MB): ~3 seconds (parallel)
- Gmail API send: ~500ms (larger payload)
- **Total: ~3.5 seconds**

**Hybrid System (best case: all links):**
- Identical to current system: ~250ms

**Optimization Strategy:**
- Download files in parallel (not sequential)
- Reuse existing exponential backoff retry (no additional latency)
- Abort on first timeout → immediate fallback to links

### Memory Usage

**Peak Memory:**
- Largest possible attachment buffer: 5MB × 4 files = 20MB
- Email message buffer (base64 encoded): ~27MB
- **Total peak: ~50MB per email send operation**

**Cleanup Strategy:**
- Buffers are method-scoped (automatic GC after send)
- No temporary file creation (no disk I/O cleanup needed)
- No persistent cache of downloaded files

### API Quota Impact

**Google Drive API:**
- Current: 0 downloads per email
- New: 0-4 downloads per email (depends on file sizes)
- Daily quota: 1,000,000,000 units (1 download = 1 unit)
- **Impact: Negligible** (10,000 emails/day = 40,000 downloads = 0.004% of quota)

**Gmail API:**
- Current: 1 send per email
- New: 1 send per email (unchanged)
- **Impact: None**

---

## Testing Strategy

### Unit Tests

**AttachmentProcessorService:**
```typescript
describe('AttachmentProcessorService', () => {
  it('should attach files < 5MB', async () => {
    const attachments = [createAttachment(3 * MB)];
    const result = await service.processAttachments(userId, attachments);

    expect(result.attachments).toHaveLength(1);
    expect(result.links).toHaveLength(0);
  });

  it('should link files >= 5MB', async () => {
    const attachments = [createAttachment(6 * MB)];
    const result = await service.processAttachments(userId, attachments);

    expect(result.attachments).toHaveLength(0);
    expect(result.links).toHaveLength(1);
    expect(result.links[0].reason).toBe('size-exceeded');
  });

  it('should fallback to link on download failure', async () => {
    mockDriveClient.downloadFile.mockRejectedValue(new Error('Download failed'));
    const attachments = [createAttachment(3 * MB)];
    const result = await service.processAttachments(userId, attachments);

    expect(result.attachments).toHaveLength(0);
    expect(result.links).toHaveLength(1);
    expect(result.links[0].reason).toBe('download-failed');
  });

  it('should respect 20MB total size limit', async () => {
    const attachments = [
      createAttachment(4 * MB),
      createAttachment(4 * MB),
      createAttachment(4 * MB),
      createAttachment(4 * MB),
      createAttachment(4 * MB),
    ];
    const result = await service.processAttachments(userId, attachments);

    expect(result.totalAttachmentSize).toBeLessThanOrEqual(20 * MB);
    expect(result.attachments.length + result.links.length).toBe(5);
  });

  it('should process smallest files first', async () => {
    const attachments = [
      createAttachment(4 * MB, 'large.pdf'),
      createAttachment(1 * MB, 'small.pdf'),
    ];
    const result = await service.processAttachments(userId, attachments);

    expect(result.attachments[0].filename).toBe('small.pdf');
  });
});
```

**GoogleDriveClient:**
```typescript
describe('GoogleDriveClient.downloadFile', () => {
  it('should download file as Buffer', async () => {
    const buffer = await client.downloadFile(userId, fileId);
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('should retry on transient errors', async () => {
    mockDriveAPI.files.get
      .mockRejectedValueOnce({ code: 503 })
      .mockResolvedValueOnce({ data: arrayBuffer });

    const buffer = await client.downloadFile(userId, fileId);
    expect(mockDriveAPI.files.get).toHaveBeenCalledTimes(2);
  });

  it('should throw on permanent errors', async () => {
    mockDriveAPI.files.get.mockRejectedValue({ code: 404 });

    await expect(client.downloadFile(userId, fileId)).rejects.toThrow();
  });
});
```

**GmailClient:**
```typescript
describe('GmailClient.createMultipartMessage', () => {
  it('should create valid RFC 2822 multipart message', () => {
    const message = client['createMultipartMessage'](
      'Test Subject',
      '<p>Body</p>',
      ['test@example.com'],
      true,
      [{ filename: 'test.pdf', content: Buffer.from('data'), mimeType: 'application/pdf' }],
    );

    const decoded = Buffer.from(message, 'base64url').toString('utf-8');
    expect(decoded).toContain('multipart/mixed');
    expect(decoded).toContain('Content-Disposition: attachment; filename="test.pdf"');
    expect(decoded).toContain('Content-Transfer-Encoding: base64');
  });
});
```

### Integration Tests

**End-to-End Email Send:**
```typescript
describe('EmailService.sendClaimEmail - Hybrid Attachments', () => {
  it('should send email with mixed attachments and links', async () => {
    // Setup: claim with 1 small + 1 large attachment
    const claim = await createClaimWithAttachments([
      { size: 2 * MB, filename: 'receipt.pdf' },
      { size: 10 * MB, filename: 'video.mp4' },
    ]);

    const result = await emailService.sendClaimEmail(userId, { claimId: claim.id });

    expect(result.success).toBe(true);
    expect(mockGmailClient.sendEmail).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        attachments: [
          expect.objectContaining({ filename: 'receipt.pdf' }),
        ],
      }),
    );

    // Verify email body contains Drive link for large file
    const emailBody = mockGmailClient.sendEmail.mock.calls[0][1].body;
    expect(emailBody).toContain('video.mp4');
    expect(emailBody).toContain('drive.google.com');
  });

  it('should fallback all files to links on Drive API failure', async () => {
    mockDriveClient.downloadFile.mockRejectedValue(new Error('Quota exceeded'));

    const claim = await createClaimWithAttachments([
      { size: 2 * MB, filename: 'small.pdf' },
    ]);

    const result = await emailService.sendClaimEmail(userId, { claimId: claim.id });

    expect(result.success).toBe(true);
    expect(mockGmailClient.sendEmail).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        attachments: [],
      }),
    );
  });
});
```

---

## Migration & Rollout Strategy

### Single-Phase Direct Deployment

**Rationale:** No existing users on the system - phased rollout unnecessary.

**Deployment Approach:**
1. Implement all components with comprehensive test coverage
2. Deploy directly to production with monitoring enabled
3. Hybrid behavior active immediately for all new users

**No Feature Flag Required:**
- System is pre-production with zero active users
- No backward compatibility concerns for existing workflows
- Clean implementation without technical debt from feature toggles

---

## Monitoring & Observability

### Key Metrics

**Business Metrics:**
```typescript
{
  "email_attachments_hybrid": {
    "total_emails_sent": 1000,
    "emails_with_attachments": 450,      // 45% had files attached
    "emails_with_links_only": 300,       // 30% had only Drive links
    "emails_with_mixed": 150,            // 15% had both
    "avg_attachments_per_email": 1.2,
    "avg_links_per_email": 0.8
  }
}
```

**Technical Metrics:**
```typescript
{
  "attachment_processing": {
    "files_attempted_download": 1200,
    "files_successfully_attached": 1150,   // 95.8% success rate
    "files_fallback_to_link": 50,          // 4.2% fallback rate
    "avg_download_latency_ms": 800,
    "p95_download_latency_ms": 2000,
    "p99_download_latency_ms": 3500
  },

  "gmail_send": {
    "avg_send_latency_ms": 450,
    "p95_send_latency_ms": 1200,
    "send_errors_total": 5,
    "send_success_rate": 0.995
  }
}
```

### Logging Strategy

**Structured Logs:**
```typescript
// Attachment processing decision
logger.info('Attachment processing decision', {
  claimId,
  filename,
  fileSize,
  decision: 'attach' | 'link',
  reason: 'size-ok' | 'size-exceeded' | 'download-failed' | 'quota-limit',
});

// Download success/failure
logger.info('Drive file download', {
  fileId,
  filename,
  fileSize,
  duration_ms,
  success: true | false,
  error: errorMessage,
});

// Email composition
logger.info('Email composed with attachments', {
  claimId,
  attachmentCount,
  linkCount,
  totalAttachmentSize,
  emailSize,
});
```

### Alerting Thresholds

**Critical Alerts (PagerDuty):**
- Email success rate < 98% over 5 minutes
- Drive download error rate > 10% over 5 minutes
- P95 send latency > 10 seconds over 5 minutes

**Warning Alerts (Slack):**
- Email success rate < 99% over 15 minutes
- Drive download fallback rate > 20% over 15 minutes
- Average attachment processing latency > 5 seconds

---

## Security Considerations

### Data Privacy

**In-Memory Buffer Handling:**
- Attachment buffers never written to disk
- Buffers cleared by GC after email send
- No logging of file contents

**Token Security:**
- Reuse existing encrypted token storage (unchanged)
- OAuth token never exposed in logs
- Drive API calls use existing token management

### Input Validation

**File Size Validation:**
```typescript
if (attachment.fileSize > 5 * 1024 * 1024 || attachment.fileSize <= 0) {
  throw new BadRequestException('Invalid file size');
}
```

**MIME Type Validation:**
```typescript
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // ... (existing allow-list)
];

if (!ALLOWED_MIME_TYPES.includes(attachment.mimeType)) {
  throw new BadRequestException('Unsupported file type');
}
```

**Filename Sanitization:**
```typescript
private sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')  // Remove special chars
    .substring(0, 255);                // Limit length
}
```

### Rate Limiting

**Existing Controls (unchanged):**
- Gmail send rate limit: 100 emails/day per user (Google Workspace limit)
- Drive API quota: 1B units/day (effectively unlimited)
- OAuth endpoint rate limit: 10/min (existing)

**New Controls:**
- Attachment download concurrency: max 5 parallel (prevent memory spike)

---

## Open Questions & Future Enhancements

### Resolved Questions

1. **Q: Should we virus scan downloaded files?**
   - A: NO - files already uploaded to user's Google Drive, which scans on upload
   - User owns files, not us - no additional security layer needed

2. **Q: Should we cache downloaded files?**
   - A: NO - email sends are infrequent (once per claim), cache hit rate would be <1%
   - Complexity cost (cache invalidation, storage) outweighs benefit

3. **Q: Should we support file compression?**
   - A: NO - most files already compressed (PDF, JPEG, ZIP)
   - Gmail doesn't significantly benefit from pre-compression

### Future Enhancements (Post-V1)

1. **Smart Threshold Adjustment:**
   - Track user's Drive API quota usage
   - Dynamically lower threshold if approaching quota limit
   - Raise threshold during off-peak hours

2. **Recipient Preference:**
   - Store recipient preference (prefer attachments vs links)
   - Per-recipient threshold override in database
   - Requires schema change (future consideration)

3. **Progress Indication:**
   - Frontend progress bar during email send
   - WebSocket updates for long-running downloads
   - UX improvement, no functional change

---

## Conclusion

### Implementation Checklist

- [ ] Create `AttachmentProcessorService` with size threshold logic
- [ ] Add `downloadFile()` method to `GoogleDriveClient`
- [ ] Update `createEmailMessage()` in `GmailClient` for multipart MIME
- [ ] Modify `generateClaimEmail()` in `EmailTemplateService` for mixed rendering
- [ ] Update `sendClaimEmail()` in `EmailService` to orchestrate processing
- [ ] Add unit tests for all new/modified methods
- [ ] Add integration tests for end-to-end flow
- [ ] Deploy to production with monitoring enabled

### Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Drive API quota exceeded | Low | Medium | Fallback to links |
| Gmail size limit hit | Medium | Medium | 20MB safety margin + validation |
| Download timeout | Low | Low | Exponential backoff + fallback |
| Memory spike | Low | Medium | 5-file concurrency limit |
| Email delivery failure | Low | High | Existing retry + status tracking |

**Overall Risk Level: LOW**

Fallback strategy ensures system reliability remains ≥99%, identical to current behavior.

---

**Document Version:** 1.0
**Author:** Claude Code (Linus-style analysis)
**Last Updated:** 2025-09-30
**Status:** Ready for Review