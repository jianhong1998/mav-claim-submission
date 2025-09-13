# API Endpoints

## Implemented Endpoints

### Authentication (`/auth`)

#### `GET /auth/google`
- **Purpose**: Initiate Google OAuth flow with domain restriction
- **Rate Limit**: 10 requests per minute (OAuth initiate protection)
- **Scopes**: profile, email, gmail.send, drive.file
- **Domain**: Only @mavericks-consulting.com accounts allowed
- **Response**: Redirect to Google OAuth consent screen

#### `GET /auth/google/callback`
- **Purpose**: Handle OAuth callback and generate JWT session
- **Rate Limit**: 20 requests per minute (OAuth callback protection)
- **Process**:
  - Validates Google OAuth response
  - Creates/updates user in database
  - Stores encrypted OAuth tokens
  - Generates JWT and sets HttpOnly cookie
- **Success**: Redirect to `/callback` page
- **Failure**: Redirect to `/login?error=auth_failed`

#### `GET /auth/profile`
- **Purpose**: Get authenticated user profile
- **Authentication**: Required (JWT)
- **Rate Limit**: Standard API rate limit
- **Response**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@mavericks-consulting.com",
    "name": "User Name",
    "picture": "url",
    "googleId": "google-id",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  },
  "message": "Profile retrieved successfully"
}
```

#### `POST /auth/logout`
- **Purpose**: Logout user and clear JWT cookie
- **Authentication**: Optional (graceful handling)
- **Rate Limit**: Standard API rate limit
- **Process**:
  - Deletes OAuth tokens from database
  - Clears JWT cookie
- **Response**:
```json
{
  "message": "Logged out successfully"
}
```

#### `GET /auth/status`
- **Purpose**: Check authentication status
- **Authentication**: Optional (uses JwtOptionalGuard)
- **Rate Limit**: None (for integration tests)
- **Response**:
```json
{
  "isAuthenticated": true,
  "user": { /* user object if authenticated */ }
}
```

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

### JWT Authentication
Protected endpoints require JWT token in HttpOnly cookie:
```
Cookie: jwt=<token>
```

### JWT Token Details
- **Type**: JWT with HS256 signing
- **Storage**: HttpOnly cookie with SameSite=lax
- **Expiry**: 24 hours
- **Payload**: Contains user ID and email
- **Secure Flag**: Enabled in production

### Guards
- **JwtAuthGuard**: Requires valid JWT token
- **JwtOptionalGuard**: Allows both authenticated and unauthenticated access

### OAuth Token Management
- **Storage**: Encrypted in PostgreSQL
- **Refresh**: Automatic when expired
- **Scopes**: profile, email, gmail.send, drive.file
- **Provider**: Google OAuth 2.0

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

### OAuth Endpoints
- **`/auth/google`**: 10 requests per minute (initiate protection)
- **`/auth/google/callback`**: 20 requests per minute (callback protection)

### Standard API Endpoints
- **Authenticated endpoints**: Standard rate limit
- **`/auth/status`**: No rate limit (for integration tests)

### Implementation
- Uses custom decorators: `@OAuthProtected()` and `@AuthGeneralRateLimit()`
- Rate limiting by IP address
- Returns 429 Too Many Requests when exceeded

## CORS Configuration

Configured for development and production origins:
- Development: `http://localhost:3000`
- Production: Configured per deployment environment