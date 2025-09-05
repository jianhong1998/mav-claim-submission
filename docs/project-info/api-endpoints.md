# API Endpoints

## Existing Endpoints

### Authentication (`/auth`)
- `GET /auth/google` - Initiate Google OAuth flow
- `GET /auth/google/callback` - Handle Google OAuth callback
- `GET /auth/profile` - Get authenticated user profile
- `POST /auth/logout` - Logout and clear session
- `GET /auth/status` - Check authentication status
- `POST /auth/refresh` - Refresh OAuth tokens

### Email (`/email`)
- `POST /email/send` - Send email via Gmail API (requires authentication)
- `POST /email/check-access` - Check Gmail API access status
- `POST /email/refresh-token` - Refresh Gmail OAuth token

## Claims Management Endpoints (To be implemented)

### Claim Submission
```typescript
// Create new claim with attachments metadata
POST /api/claims
Body: {
  category: ClaimCategoryEnum;
  claimName?: string; // Required for 'others'
  month: number; // 1-12
  year: number;
  totalAmount: number;
  attachments: Array<{
    originalFilename: string;
    fileSize: number;
    mimeType: string;
  }>;
}
Response: {
  claimId: string;
  attachments: Array<{
    attachmentId: string;
  }>;
}
```

### Attachment Management
```typescript
// Confirm attachment upload with Google Drive file details
POST /api/claims/:claimId/attachments/:attachmentId/confirm
Body: {
  googleDriveFileId: string;
  googleDriveUrl: string;
  storedFilename: string;
}
Response: 200 | 404 (if file not found in Google Drive)
```

### Claim Details
```typescript
// Get specific claim details
GET /api/claims/:claimId
Response: {
  id: string;
  category: ClaimCategoryEnum;
  claimName?: string;
  month: number;
  year: number;
  totalAmount: number;
  status: ClaimStatusEnum;
  submissionDate?: string;
  attachments: Array<{
    id: string;
    originalFilename: string;
    status: AttachmentStatusEnum;
    googleDriveUrl?: string; // Shareable Google Drive URL
  }>;
}
```

### Claim List & Management
```typescript
// Get user's claims with filtering and pagination
GET /api/claims?category=telco&status=sent&month=9&year=2025&page=1&limit=20
Response: {
  claims: Array<ClaimSummary>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Update claim status
PATCH /api/claims/:claimId/status
Body: { status: 'paid' | 'sent' }
Response: { success: boolean }

// Resend failed claim email
POST /api/claims/:claimId/resend
Response: { jobId: string }
```

## Authentication Requirements

All endpoints support session-based authentication and include test bypass headers for development.

### Required Headers
```
Cookie: session-cookie-from-login
```

### Development Test Headers
For bypassing authentication in development:
```
X-Test-User-Email: user@mavericks-consulting.com
X-Test-User-Id: uuid-string
```

## Request/Response Formats

### Standard Error Response
```json
{
  "statusCode": 400,
  "message": "Validation error details",
  "error": "Bad Request"
}
```

### Pagination Format
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

## Validation Rules

### Claim Validation
- Category must be valid enum value
- Month must be 1-12
- Year must be current or previous year
- Total amount must be positive
- Claim name required only for 'others' category
- Claims must be within 2-month eligibility window

### File Upload Validation
- File types: PDF, PNG, JPEG/JPG, IMG only
- Maximum file size: 5MB per file
- File name validation for special characters
- MIME type verification

## Rate Limiting

Standard rate limiting applied:
- 100 requests per minute per user
- 1000 requests per hour per IP
- Special limits for file upload endpoints

## CORS Configuration

Configured for development and production origins:
- Development: `http://localhost:3000`
- Production: Configured per deployment environment