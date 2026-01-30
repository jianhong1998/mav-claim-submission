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

#### `POST /email/send`
- **Purpose**: Send email via Gmail API with optional attachments (RFC 2822 multipart/mixed)
- **Authentication**: Required (JWT)
- **Request Body**:
```json
{
  "to": "recipient@example.com",
  "subject": "Email subject",
  "body": "Email body content",
  "isHtml": true,
  "attachments": [
    {
      "filename": "document.pdf",
      "content": "<Buffer>",
      "mimeType": "application/pdf"
    }
  ]
}
```
- **Attachment Support** (ADR-003):
  - Small files (<5MB) sent as email attachments
  - Large files (≥5MB) sent as Google Drive shareable links
  - Maximum 20MB total attachment size (Gmail safety margin)
  - Automatic fallback to Drive links on download failure
- **Response**:
```json
{
  "success": true,
  "messageId": "gmail-message-id"
}
```

#### `POST /email/check-access`
- **Purpose**: Check Gmail API access status
- **Authentication**: Required (JWT)

#### `POST /email/refresh-token`
- **Purpose**: Refresh Gmail OAuth token
- **Authentication**: Required (JWT)

## Claim Categories Endpoints

### `GET /claim-categories`
- **Purpose**: Get all claim categories with their limits
- **Authentication**: Required (JWT)
- **Query Parameters**:
  - `includeDisabled` (optional, boolean): Include disabled categories
  - `includeDeleted` (optional, boolean): Include soft-deleted categories
- **Success Response** (200):
```json
{
  "success": true,
  "categories": [
    {
      "uuid": "category-uuid",
      "code": "telco",
      "name": "Telecommunications",
      "limit": {
        "type": "monthly",
        "amount": 150.00
      }
    },
    {
      "uuid": "category-uuid-2",
      "code": "skill-enhancement",
      "name": "Skill Enhancement",
      "limit": null
    }
  ]
}
```
- **Notes**:
  - Limit `amount` is returned in dollars (stored as cents in database)
  - `limit: null` means unlimited
  - `limit.type` is either `"monthly"` or `"yearly"`

## Claims Management Endpoints

### `GET /claims`
- **Purpose**: Get all claims for authenticated user with optional status filtering
- **Authentication**: Required (JWT)
- **Query Parameters**:
  - `status` (optional): Filter by claim status (`draft`, `sent`, `failed`, `paid`)
- **Request Example**:
```bash
GET /claims?status=draft
Authorization: Bearer <jwt-token>
```
- **Success Response** (200):
```json
{
  "success": true,
  "claims": [
    {
      "id": "uuid",
      "userId": "user-uuid",
      "category": "telco",
      "claimName": "Phone bill reimbursement",
      "month": 9,
      "year": 2025,
      "totalAmount": 45.50,
      "status": "draft",
      "submissionDate": null,
      "attachments": [
        {
          "id": "attachment-uuid",
          "claimId": "uuid",
          "originalFilename": "phone-bill.pdf",
          "storedFilename": "stored-filename.pdf",
          "fileSize": 1024567,
          "mimeType": "application/pdf",
          "driveFileId": "google-drive-file-id",
          "driveShareableUrl": "https://drive.google.com/file/d/xyz/view",
          "status": "uploaded",
          "uploadedAt": "2025-01-01T00:00:00Z",
          "createdAt": "2025-01-01T00:00:00Z",
          "updatedAt": "2025-01-01T00:00:00Z"
        }
      ],
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```
- **Error Response** (500):
```json
{
  "success": false,
  "error": "Failed to retrieve claims. Please try again."
}
```

### `POST /claims`
- **Purpose**: Create a new claim
- **Authentication**: Required (JWT)
- **Request Body**:
```json
{
  "category": "telco",
  "claimName": "Phone bill reimbursement",
  "month": 9,
  "year": 2025,
  "totalAmount": 45.50
}
```
- **Success Response** (201):
```json
{
  "success": true,
  "claim": {
    "id": "uuid",
    "userId": "user-uuid",
    "category": "telco",
    "claimName": "Phone bill reimbursement",
    "month": 9,
    "year": 2025,
    "totalAmount": 45.50,
    "status": "draft",
    "submissionDate": null,
    "attachments": [],
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```
- **Validation Error** (400):
```json
{
  "success": false,
  "error": "Validation failed: Month must be between 1 and 12"
}
```
- **Business Rule Error** (422):
```json
{
  "success": false,
  "error": "Claim amount must be greater than zero"
}
```

### `PUT /claims/:id`
- **Purpose**: Update an existing claim
- **Authentication**: Required (JWT)
- **URL Parameters**:
  - `id`: Claim UUID
- **Request Body** (all fields optional):
```json
{
  "category": "fitness",
  "claimName": "Gym membership",
  "month": 10,
  "year": 2025,
  "totalAmount": 75.00,
  "status": "draft"
}
```
- **Success Response** (200):
```json
{
  "success": true,
  "claim": {
    "id": "uuid",
    "userId": "user-uuid",
    "category": "fitness",
    "claimName": "Gym membership",
    "month": 10,
    "year": 2025,
    "totalAmount": 75.00,
    "status": "draft",
    "submissionDate": null,
    "attachments": [],
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:30Z"
  }
}
```
- **Not Found Error** (404):
```json
{
  "success": false,
  "error": "Claim not found"
}
```

### `DELETE /claims/:id`
- **Purpose**: Delete a claim (soft delete)
- **Authentication**: Required (JWT)
- **URL Parameters**:
  - `id`: Claim UUID
- **Success Response** (204): No content
- **Not Found Error** (404):
```json
{
  "statusCode": 404,
  "message": "Claim not found",
  "error": "Not Found"
}
```
- **Business Rule Error** (422):
```json
{
  "statusCode": 422,
  "message": "Cannot delete a claim that has been paid",
  "error": "Unprocessable Entity"
}
```

### `PUT /claims/:id/status`
- **Purpose**: Update claim status with validation
- **Authentication**: Required (JWT)
- **URL Parameters**:
  - `id`: Claim UUID
- **Request Body**:
```json
{
  "status": "sent"
}
```
- **Success Response** (200):
```json
{
  "success": true,
  "claim": {
    "id": "uuid",
    "userId": "user-uuid",
    "category": "telco",
    "claimName": "Phone bill reimbursement",
    "month": 9,
    "year": 2025,
    "totalAmount": 45.50,
    "status": "sent",
    "submissionDate": "2025-01-01T00:00:30Z",
    "attachments": [],
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:30Z"
  }
}
```
- **Invalid Status Transition** (422):
```json
{
  "success": false,
  "error": "Invalid status transition from paid to draft"
}
```

### `POST /claims/:id/resend`
- **Purpose**: Resend email for a claim in sent or failed status
- **Authentication**: Required (JWT)
- **URL Parameters**:
  - `id`: Claim UUID
- **Success Response** (200):
```json
{
  "success": true,
  "claim": {
    "id": "uuid",
    "userId": "user-uuid",
    "category": "telco",
    "claimName": "Phone bill reimbursement",
    "month": 9,
    "year": 2025,
    "totalAmount": 45.50,
    "status": "sent",
    "submissionDate": "2025-01-01T00:00:00Z",
    "attachments": [],
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:30Z"
  }
}
```
- **Bad Request Error** (400):
```json
{
  "statusCode": 400,
  "message": "Cannot resend email: Claim status is draft, expected sent or failed"
}
```
- **Not Found Error** (404):
```json
{
  "statusCode": 404,
  "message": "Claim not found"
}
```

### `GET /claims/:id/preview`
- **Purpose**: Generate a preview of the email that would be sent for a claim submission
- **Authentication**: Required (JWT)
- **URL Parameters**:
  - `id`: Claim UUID (must be a valid UUID format)
- **Constraints**:
  - Claim must be in `draft` status
  - User must own the claim
  - No actual email is sent
- **Request Example**:
```bash
GET /claims/123e4567-e89b-12d3-a456-426614174000/preview
Cookie: jwt=<token>
```
- **Success Response** (200):
```json
{
  "subject": "John Doe - Claim Submission: Gym Membership (January 2025)",
  "htmlBody": "<html>...</html>",
  "recipients": ["finance@mavericks-consulting.com"],
  "cc": ["manager@example.com"],
  "bcc": []
}
```
- **Bad Request Error** (400):
```json
{
  "statusCode": 400,
  "message": "Cannot preview email: Claim status is sent, expected draft",
  "error": "Bad Request"
}
```
- **Forbidden Error** (403):
```json
{
  "statusCode": 403,
  "message": "Access denied: You do not own this claim",
  "error": "Forbidden"
}
```
- **Not Found Error** (404):
```json
{
  "statusCode": 404,
  "message": "Claim not found",
  "error": "Not Found"
}
```
- **Internal Server Error** (500):
```json
{
  "statusCode": 500,
  "message": "Failed to generate email preview: <error details>"
}
```

### Preview Response Fields
| Field | Type | Description |
|-------|------|-------------|
| `subject` | string | Email subject line with user name, category, and claim period |
| `htmlBody` | string | Complete HTML content of the email body |
| `recipients` | string[] | Primary recipient email addresses (typically finance team) |
| `cc` | string[] | CC email addresses from user's email preferences |
| `bcc` | string[] | BCC email addresses from user's email preferences |

### Status Transition Rules
Valid status transitions:
- `draft` → `sent`
- `sent` → `paid`, `draft`, `failed`
- `failed` → `draft`, `sent`
- `paid` → `sent` (for workflow corrections)

### Business Rules Validation
All endpoints enforce these business rules:
- **Amount limits**: Must be greater than 0, maximum $10,000
- **Date constraints**: Cannot create claims for future years
- **Month validation**: Must be between 1-12
- **Status transitions**: Must follow valid transition rules
- **User ownership**: Users can only access their own claims

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
- **JwtAuthGuard**: Requires valid JWT token (used by all claims endpoints)
- **JwtOptionalGuard**: Allows both authenticated and unauthenticated access

### Claims Authentication
All claims endpoints (`/claims/*`) require authentication:
- JWT token must be present in HttpOnly cookie
- Token must be valid and not expired
- User ownership is enforced automatically (users can only access their own claims)

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

### Claims API Error Responses
Claims endpoints use a consistent response format for errors:
```json
{
  "success": false,
  "error": "Error message description"
}
```

### HTTP Status Codes
Claims API endpoints return the following status codes:
- **200 OK**: Successful GET/PUT operations
- **201 Created**: Successful POST operations (claim creation)
- **204 No Content**: Successful DELETE operations
- **400 Bad Request**: Validation errors (invalid input format)
- **401 Unauthorized**: Authentication required or invalid JWT
- **404 Not Found**: Claim not found or user doesn't own the claim
- **422 Unprocessable Entity**: Business rule violations (invalid status transitions, amount limits)
- **500 Internal Server Error**: Database or server errors

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
- **Category**: Must be a valid category code from the database (e.g., `telco`, `fitness`, `dental`, `skill-enhancement`, `company-event`, `company-lunch`, `company-dinner`, `others`). Validated via `ClaimCategoryService.getByCode()`
- **Month**: Must be between 1 and 12 (integer)
- **Year**: Must be between 2020 and 2100 (integer)
- **Total Amount**: Must be positive number with at most 2 decimal places, maximum $10,000
- **Claim Name**: Optional string, 1-255 characters when provided
- **Status**: Must be valid enum value: `draft`, `sent`, `failed`, `paid`

### Business Rule Validation
- Amount must be greater than zero
- Cannot create claims for future years
- Status transitions must follow valid flow (see Status Transition Rules above)
- Cannot delete claims with status `paid`
- Users can only access claims they own

### File Upload Validation
- File types: PDF, PNG, JPEG/JPG, IMG only
- Maximum file size: 5MB per file
- File name validation for special characters
- MIME type verification

## User Management Endpoints

### `PATCH /users/:userId`
- **Purpose**: Update user profile (name and email preferences for claim submissions)
- **Authentication**: Required (JWT)
- **Authorization**: Users can only update their own profile (userId must match authenticated user)
- **URL Parameters**:
  - `userId`: User UUID
- **Request Body** (all fields optional):
```json
{
  "name": "Updated Name",
  "emailPreferences": [
    {
      "type": "cc",
      "emailAddress": "cc1@example.com"
    },
    {
      "type": "bcc",
      "emailAddress": "bcc1@example.com"
    }
  ]
}
```
- **Success Response** (200):
```json
{
  "id": "user-uuid",
  "email": "user@mavericks-consulting.com",
  "name": "Updated Name",
  "googleId": "google-id",
  "picture": "url",
  "emailPreferences": [
    {
      "id": "preference-uuid",
      "userId": "user-uuid",
      "type": "cc",
      "emailAddress": "cc1@example.com"
    },
    {
      "id": "preference-uuid-2",
      "userId": "user-uuid",
      "type": "bcc",
      "emailAddress": "bcc1@example.com"
    }
  ],
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:30Z"
}
```
- **Validation Error** (400):
```json
{
  "statusCode": 400,
  "message": [
    "name must be at least 1 character",
    "emailAddress must be a valid email"
  ],
  "error": "Bad Request"
}
```
- **Business Rule Error** (400):
```json
{
  "statusCode": 400,
  "message": "Cannot add your own email to CC/BCC preferences",
  "error": "Bad Request"
}
```
- **Authorization Error** (403):
```json
{
  "statusCode": 403,
  "message": "Cannot update other users",
  "error": "Forbidden"
}
```
- **Not Found Error** (404):
```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```
- **Internal Server Error** (500):
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

### Email Preference Validation Rules
- Email preferences are applied to claim submission emails
- **Type**: Must be either `cc` or `bcc`
- **Email Format**: Must be valid email address
- **Own Email**: Cannot add authenticated user's own email
- **Duplicates**: Cannot add duplicate email addresses
- **Update Strategy**: Replace all existing preferences (delete + insert)

### Email Preference Integration
When a claim is submitted, the user's email preferences are automatically applied:
- CC emails receive a copy of the claim submission email
- BCC emails receive a blind copy (hidden from other recipients)
- Preferences are stored in `user_email_preferences` table with unique constraint on (userId, emailAddress)

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

## Internal Test Endpoints

⚠️ **SECURITY WARNING**: These endpoints are for testing only and must be disabled in production by setting `ENABLE_API_TEST_MODE=false`.

### `POST /internal/test-data`
- **Purpose**: Create or return existing test user (idempotent)
- **Authentication**: None (internal endpoint)
- **Feature Flag**: Requires `ENABLE_API_TEST_MODE=true` in environment
- **Request Body**: None
- **Success Response** (200/201):
```json
{
  "user": {
    "id": "00000000-0000-0000-0000-000000000001",
    "email": "test@mavericks-consulting.com",
    "name": "Test User",
    "googleId": "test-google-id-12345"
  }
}
```
- **Feature Disabled Response** (404):
```json
{
  "statusCode": 404,
  "message": "Not Found"
}
```
- **Behavior**:
  - First call creates test user with predefined data from `TEST_USER_DATA` constant
  - Subsequent calls return existing user (idempotent)
  - Catches duplicate key errors and queries existing user
- **Usage**: Integration tests use this endpoint to set up test data instead of direct database access

### `DELETE /internal/test-data`
- **Purpose**: Delete test user and all related data (idempotent)
- **Authentication**: None (internal endpoint)
- **Feature Flag**: Requires `ENABLE_API_TEST_MODE=true` in environment
- **Request Body**: None
- **Success Response** (200):
```json
{
  "deleted": true,
  "message": "Test data deleted successfully"
}
```
- **User Not Found Response** (200):
```json
{
  "deleted": false,
  "message": "Test data not found (already deleted or never created)"
}
```
- **Feature Disabled Response** (404):
```json
{
  "statusCode": 404,
  "message": "Not Found"
}
```
- **Behavior**:
  - Deletes test user by predefined ID from `TEST_USER_DATA` constant
  - Database CASCADE automatically removes related data (oauth_tokens, claims, attachments)
  - Returns success even if user not found (idempotent)
- **Usage**: Integration tests use this endpoint for cleanup between test runs

### Feature Flag Configuration

Add to `.env` file to enable internal endpoints:
```bash
# Enable internal test data endpoints (SECURITY: Set to false in production)
ENABLE_API_TEST_MODE=true
```

**Important Notes**:
- These endpoints are gated by `ApiTestModeGuard` which checks the `ENABLE_API_TEST_MODE` environment variable
- When disabled, endpoints return 404 (not 403) to hide their existence in production
- Never enable in production environments - for development and testing only
- Test user data is defined in `@project/types` package as `TEST_USER_DATA` constant

## CORS Configuration

Configured for development and production origins:
- Development: `http://localhost:3000`
- Production: Configured per deployment environment