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

### Status Transition Rules
Valid status transitions:
- `draft` → `sent`
- `sent` → `paid`, `draft`, `failed`
- `failed` → `draft`, `sent`
- `paid` → (no transitions allowed)

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
- **Category**: Must be one of: `telco`, `fitness`, `dental`, `skill-enhancement`, `company-event`, `company-lunch`, `company-dinner`, `others`
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