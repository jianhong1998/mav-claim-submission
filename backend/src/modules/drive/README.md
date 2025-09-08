# Drive Module

## Overview

The Drive module provides comprehensive Google Drive API v3 integration for the Mavericks Claim Submission System. It enables secure file operations on employees' personal Google Drive accounts with robust error handling, retry mechanisms, and proper OAuth authentication.

## Components

### DriveService

Primary service for Google Drive API operations with built-in error handling and retry logic.

**Key Features:**

- OAuth 2.0 authentication with automatic token refresh
- Exponential backoff with jitter for retryable errors
- Comprehensive error mapping and user-friendly error messages
- File validation and sanitization
- Stream-based file processing for memory efficiency

## Error Handling

The Drive module implements comprehensive error handling with specific strategies for different types of failures:

### Error Categories

#### 1. Authentication Errors (401 Unauthorized)

**Common Causes:**

- Expired access tokens
- Invalid OAuth credentials
- Revoked permissions

**Handling Strategy:**

- Automatic token refresh attempt using `refreshUserToken()`
- Falls back to requiring re-authentication if refresh fails
- Returns clear error messages directing users to re-authenticate

**Example Response:**

```typescript
{
  success: false,
  error: "Authentication required. Please re-authenticate."
}
```

#### 2. Permission Errors (403 Forbidden)

**Common Causes:**

- Insufficient Drive API permissions
- Drive API not enabled in Google Cloud Console
- Quota exceeded for the project

**Handling Strategy:**

- No automatic retry (not retryable)
- Logs detailed error information for debugging
- Returns user-friendly error messages

**Example Response:**

```typescript
{
  success: false,
  error: "Drive API access forbidden. Check permissions."
}
```

#### 3. Resource Not Found (404 Not Found)

**Common Causes:**

- File or folder doesn't exist
- File was deleted or moved
- Invalid file ID provided

**Handling Strategy:**

- No retry attempt (not retryable)
- Immediate error response
- Clear indication of missing resource

**Example Response:**

```typescript
{
  success: false,
  error: "File or folder not found."
}
```

#### 4. Conflict Errors (409 Conflict)

**Common Causes:**

- File with same name already exists in target location
- Concurrent operations on the same resource

**Handling Strategy:**

- No retry attempt (not retryable)
- Provides specific conflict information
- Allows application logic to handle naming conflicts

**Example Response:**

```typescript
{
  success: false,
  error: "A file with this name already exists."
}
```

#### 5. Rate Limiting (429 Quota Exceeded)

**Common Causes:**

- API quota limits reached
- Too many requests per second
- Daily quota exhausted

**Handling Strategy:**

- Automatic retry with exponential backoff
- Maximum 3 retry attempts with jitter
- Logs quota usage information for monitoring

**Retry Logic:**

```typescript
// Base delay: 1000ms
// Attempt 1: 1000-2000ms delay
// Attempt 2: 2000-3000ms delay
// Attempt 3: 4000-5000ms delay
```

**Example Response (after retries exhausted):**

```typescript
{
  success: false,
  error: "API quota exceeded. Please try again later."
}
```

#### 6. Server Errors (5xx)

**Common Causes:**

- Google API server issues
- Temporary service unavailability
- Infrastructure problems

**Handling Strategy:**

- Automatic retry with exponential backoff
- Maximum 3 retry attempts
- Retryable error classification

### Error Mapping Utility

The `DriveUtils.mapDriveApiError()` function provides consistent error handling across all Drive operations:

```typescript
interface DriveErrorInfo {
  code: number; // HTTP status code
  message: string; // User-friendly error message
  isRetryable: boolean; // Whether the error should trigger retries
}
```

### Retry Mechanism

The `executeWithRetry()` method implements intelligent retry logic:

**Configuration:**

- Maximum retries: 3 attempts
- Base delay: 1000ms
- Exponential backoff with random jitter
- Only retries errors marked as retryable

**Retry Decision Logic:**

```typescript
// Retryable errors (isRetryable: true):
- 429 (Quota Exceeded)
- 500+ (Server Errors)

// Non-retryable errors (isRetryable: false):
- 401 (Unauthorized) - handled by token refresh
- 403 (Forbidden) - permission issues
- 404 (Not Found) - resource doesn't exist
- 409 (Conflict) - naming conflicts
```

## Usage Examples

### File Upload with Error Handling

```typescript
try {
  const result = await driveService.uploadFile({
    userId: 'user123',
    fileName: 'expense-receipt.pdf',
    mimeType: 'application/pdf',
    fileBuffer: fileData,
    parentFolderId: 'folder123',
  });

  if (result.success) {
    console.log('File uploaded:', result.fileId);
  } else {
    // Handle upload failure
    console.error('Upload failed:', result.error);
  }
} catch (error) {
  // Handle service-level errors
  if (error instanceof UnauthorizedException) {
    // Redirect to re-authentication
  } else if (error instanceof BadRequestException) {
    // Show validation error to user
  }
}
```

### Folder Creation with Error Handling

```typescript
try {
  const result = await driveService.createFolder({
    userId: 'user123',
    folderName: 'Expense Claims 2024',
    parentFolderId: 'rootFolder123',
  });

  if (result.success) {
    console.log('Folder created:', result.folderId);
  } else {
    console.error('Folder creation failed:', result.error);
  }
} catch (error) {
  // Handle specific error types
  console.error('Service error:', error.message);
}
```

### Drive Access Verification

```typescript
const accessResult = await driveService.checkDriveAccess('user123');

if (accessResult.hasAccess) {
  console.log('Drive access confirmed for:', accessResult.email);
} else {
  console.log('Drive access denied:', accessResult.error);
  // Handle re-authentication or permission request
}
```

## Error Monitoring and Logging

### Logging Levels

**INFO Level:**

- Successful operations with file/folder details
- Token refresh completions
- Operation duration metrics

**WARN Level:**

- Retry attempts with delay information
- Drive access check failures
- Non-critical error conditions

**ERROR Level:**

- Failed operations after all retries
- Authentication failures
- Validation errors

### Monitoring Integration

The service logs structured data suitable for monitoring systems:

```typescript
// Success logging
logger.log(`File uploaded successfully: ${fileName}, fileId: ${fileId}`);

// Error logging with context
logger.error(
  `Failed to upload file ${fileName}:`,
  error instanceof Error ? error.message : 'Unknown error',
);

// Retry logging for monitoring
logger.warn(
  `Drive API operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`,
  error instanceof Error ? error.message : 'Unknown error',
);
```

## Common Error Scenarios and Solutions

### Scenario 1: Token Expired During Operation

**Error:** 401 Unauthorized
**Solution:** Automatic token refresh, retry operation, or require re-authentication

### Scenario 2: Insufficient Storage Space

**Error:** 403 Forbidden with specific storage message
**Solution:** Direct user to Google Drive to free up space

### Scenario 3: File Size Exceeds Limits

**Error:** 400 Bad Request (caught by validation)
**Solution:** Client-side validation prevents API call, shows size limit

### Scenario 4: Network Connectivity Issues

**Error:** Network timeout or connection error
**Solution:** Retry mechanism handles transient network issues

### Scenario 5: API Quota Exhausted

**Error:** 429 Quota Exceeded
**Solution:** Exponential backoff with retry, monitoring alerts for capacity planning

## Best Practices

1. **Always check return values** - Services return success/error objects
2. **Handle authentication gracefully** - Provide clear re-authentication flows
3. **Validate inputs client-side** - Prevent unnecessary API calls
4. **Monitor quota usage** - Track API calls for capacity planning
5. **Log with context** - Include user ID and operation details in logs
6. **Use structured error responses** - Consistent error format across operations

## Integration Points

- **TokenService**: OAuth token management and refresh
- **LoggerUtil**: Structured logging with contextual information
- **DriveUtils**: Error mapping, validation, and retry logic utilities
- **EnvironmentVariableUtil**: Google API credentials configuration

## Configuration

Required environment variables:

```bash
GOOGLE_CLIENT_ID=your_oauth_client_id
GOOGLE_CLIENT_SECRET=your_oauth_client_secret
GOOGLE_REDIRECT_URI=your_redirect_uri
```

Optional configuration:

```typescript
// Customize retry behavior
MAX_RETRIES = 3;
RETRY_DELAY_BASE = 1000;

// File size limits
MAX_FILE_SIZE = 104857600; // 100MB
```
