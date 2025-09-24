# Attachments Module - Google Drive Integration

## Overview

The Attachments Module provides comprehensive Google Drive integration for the Mavericks Claim Submission System, featuring descriptive folder naming that automatically generates organized folder structures using existing claim data. This module handles client-side file uploads, metadata storage, and intelligent folder organization without requiring database schema changes.

## Architecture

The attachments system implements a service-oriented architecture with clear separation between Google Drive operations, business logic, and data persistence. All folder naming is generated dynamically from existing claim properties, ensuring backward compatibility while providing enhanced organization.

### Component Hierarchy

```
AttachmentService (Business Logic)
├── GoogleDriveClient (Drive API Operations)
│   ├── Folder Creation with Descriptive Naming
│   ├── Collision Detection and Handling
│   └── File Permission Management
├── FolderNamingUtil (Naming Logic)
│   ├── Dynamic Name Generation
│   ├── Category Code Mapping
│   └── Sanitization and Validation
└── AttachmentDBUtil (Database Operations)
    ├── Metadata Storage
    └── Status Management
```

## Features

### Descriptive Folder Naming

The system automatically generates descriptive folder names from existing claim data without requiring new database fields. Folders are created in the format:

```
/Mavericks Claims/{year}-{month}-{timestamp}-{category}[-{claimName}]/
```

**Example Folder Names:**

```
# With claim name
/Mavericks Claims/2024-03-1710123456-telco-mobile-plan-upgrade/

# Without claim name (fallback)
/Mavericks Claims/2024-03-1710123456-fitness/

# Category-specific examples
/Mavericks Claims/2024-12-1703123456-lunch-team-building/
/Mavericks Claims/2024-01-1704234567-dental-annual-checkup/
/Mavericks Claims/2024-06-1718234567-skill-react-certification/
```

### Collision Handling

The system implements intelligent collision detection and resolution:

1. **Existing Folder Detection**: Automatically finds existing folders with the same name
2. **Suffix Generation**: Applies incremental suffixes (-v2, -v3, -copy, etc.)
3. **Fallback Strategy**: Uses timestamp-based naming if all attempts fail
4. **Smart Reuse**: Returns existing folder ID when appropriate

**Collision Resolution Examples:**

```
Original: 2024-03-1710123456-telco-mobile-plan
Collision 1: 2024-03-1710123456-telco-mobile-plan-v2
Collision 2: 2024-03-1710123456-telco-mobile-plan-v3
Collision 3: 2024-03-1710123456-telco-mobile-plan-copy
Fallback: 2024-03-1710123456-telco-mobile-plan-1710987654
```

## Components

### AttachmentService

Core business logic service that orchestrates the complete file attachment workflow with enhanced folder creation.

**Key Features:**

- Descriptive folder creation using existing claim data
- Metadata-only storage (files stored in Google Drive)
- File validation and claim limits enforcement
- Error handling with fallback strategies
- Transaction management for data consistency

**Key Methods:**

```typescript
// Create descriptive folder for claim attachments
async createClaimFolder(
  userId: string,
  claimId: string
): Promise<string | null>

// Store file metadata after client-side upload
async storeFileMetadata(
  claimId: string,
  metadata: FileMetadata
): Promise<IAttachmentUploadResponse>

// Get attachments for a specific claim
async getAttachmentsByClaimId(
  claimId: string
): Promise<IAttachmentListResponse>
```

**Usage Example:**

```typescript
import { AttachmentService } from './attachment.service';

// Create descriptive folder before upload
const folderId = await attachmentService.createClaimFolder(
  'user-123',
  'claim-456',
);

// Store metadata after client-side upload
const result = await attachmentService.storeFileMetadata('claim-456', {
  originalFilename: 'receipt.pdf',
  storedFilename: 'john_doe_telco_2024_03_1710123456.pdf',
  googleDriveFileId: 'drive-file-id',
  googleDriveUrl: 'https://drive.google.com/file/d/...',
  fileSize: 1024000,
  mimeType: 'application/pdf',
});
```

### GoogleDriveClient

Google Drive API integration service with enhanced folder creation capabilities.

**Key Features:**

- Descriptive folder creation with collision handling
- OAuth2 token management with automatic refresh
- Exponential backoff retry logic for reliability
- File permission management for sharing
- Error handling with proper exception transformation

**Key Methods:**

```typescript
// Create claim folder with descriptive naming
async createClaimFolder(
  userId: string,
  claimId: string,
  claimData?: ClaimDataForFolderNaming
): Promise<string>

// Set file permissions for sharing
async setFilePermissions(
  userId: string,
  fileId: string
): Promise<void>

// Get file information from Drive
async getFileInfo(
  userId: string,
  fileId: string
): Promise<DriveFileInfo | null>
```

**Folder Creation Process:**

```typescript
// 1. Find or create "Mavericks Claims" root folder
const rootFolderId = await this.findOrCreateFolder(userId, 'Mavericks Claims');

// 2. Generate descriptive name using claim data
const nameResult = FolderNamingUtil.generateFolderName(claimData);
const folderName = nameResult.isValid ? nameResult.folderName : claimId;

// 3. Create specific claim folder with collision handling
const claimFolderId = await this.findOrCreateFolderWithCollisionHandling(
  userId,
  folderName,
  rootFolderId,
);
```

### FolderNamingUtil

Utility class for generating descriptive folder names from existing claim data.

**Key Features:**

- Dynamic name generation using existing claim properties
- Category code mapping for shortened identifiers
- Character sanitization and length validation
- Performance optimized (<10ms generation time)
- No external dependencies

**Category Mapping:**

```typescript
const CategoryCodeMapping = {
  telco: 'telco', // Telecommunications
  fitness: 'fitness', // Fitness & wellness
  dental: 'dental', // Dental care
  'skill-enhancement': 'skill', // Professional development
  'company-event': 'event', // Company events
  'company-lunch': 'lunch', // Company lunches
  'company-dinner': 'dinner', // Company dinners
  others: 'others', // Other expenses
};
```

**Name Generation Process:**

```typescript
// Input: ClaimDataForFolderNaming
const claimData = {
  id: 'claim-123',
  claimName: 'Mobile Plan Upgrade',
  category: 'telco',
  month: 3,
  year: 2024,
  createdAt: new Date('2024-03-15T10:30:00Z'),
  totalAmount: 89.99,
};

// Output: FolderNameGenerationResult
const result = FolderNamingUtil.generateFolderName(claimData);
// result.folderName: "2024-03-1710123456-telco-mobile-plan-upgrade"
// result.isValid: true
// result.errors: []
```

**Sanitization Rules:**

- Remove special characters: `!@#$%^&*()+=[]{}|;':",./<>?\`
- Convert to lowercase
- Replace spaces and multiple hyphens with single hyphens
- Trim leading/trailing hyphens
- Truncate claim name to 30 characters maximum
- Truncate total path to 200 characters maximum

## Data Flow

### Claim Folder Creation Flow

```mermaid
sequenceDiagram
    participant A as AttachmentService
    participant C as ClaimDBUtil
    participant F as FolderNamingUtil
    participant G as GoogleDriveClient
    participant D as Google Drive API

    A->>C: Get claim data by ID
    C->>A: Return ClaimEntity
    A->>F: generateFolderName(claimData)
    F->>A: Return folderName + validation
    A->>G: createClaimFolder(userId, claimId, claimData)
    G->>D: Find/create "Mavericks Claims" folder
    G->>D: Create descriptive claim folder
    G->>G: Handle collision if folder exists
    G->>A: Return folder ID
    A->>A: Log success and return folder ID
```

### File Upload Metadata Storage Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant A as AttachmentService
    participant DB as AttachmentDBUtil
    participant V as Validation

    C->>A: storeFileMetadata(claimId, metadata)
    A->>V: Validate claim exists
    A->>V: Check file limit (5 files max)
    A->>DB: Create attachment record
    DB->>A: Return AttachmentEntity
    A->>C: Return success response with attachment ID
```

## Error Handling

The attachment system implements comprehensive error handling with specific strategies for different failure scenarios.

### Error Categories

#### 1. Google Drive API Errors

**Common Causes:**

- Token expiration or invalid credentials (401)
- Insufficient permissions (403)
- Quota exceeded (403 quotaExceeded)
- Rate limiting (429)
- File not found (404)

**Handling Strategy:**

- Automatic token refresh for expired tokens
- Exponential backoff retry for rate limiting
- User-friendly error messages for quota issues
- Graceful degradation for permission errors

**Example Error Responses:**

```typescript
// Rate limiting error
{
  message: "Google Drive rate limit exceeded, please try again later",
  code: 429
}

// Quota exceeded error
{
  message: "Google Drive quota exceeded",
  code: 403
}

// Authentication error
{
  message: "Google Drive authentication failed",
  code: 401
}
```

#### 2. Folder Naming Errors

**Common Causes:**

- Invalid claim data
- Name generation failures
- Sanitization issues
- Length constraint violations

**Handling Strategy:**

- Fallback to claim ID for invalid names
- Error logging with detailed context
- Graceful degradation without breaking file uploads
- Validation error collection

**Example Fallback Flow:**

```typescript
try {
  const nameResult = FolderNamingUtil.generateFolderName(claimData);
  folderName = nameResult.isValid ? nameResult.folderName : claimId;
} catch (error) {
  // Fallback to basic naming
  folderName = `${claimData.year}-${claimData.month}-${claimData.id}`;
  logger.warn('Folder name generation failed, using fallback:', error);
}
```

#### 3. Database Operation Errors

**Common Causes:**

- Claim not found
- File limit exceeded (5 files per claim)
- Database connection issues
- Transaction failures

**Handling Strategy:**

- Validation before database operations
- Clear error messages for business rule violations
- Transaction rollback for consistency
- Retry logic for temporary failures

### Error Recovery Patterns

#### Retry with Exponential Backoff

```typescript
private async retryOperation<T>(
  operation: () => Promise<T>,
  attempt = 1
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (attempt >= this.maxRetries) throw error;

    if (this.isRetryableError(error)) {
      const delay = this.baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryOperation(operation, attempt + 1);
    }

    throw error;
  }
}
```

#### Fallback Folder Creation

```typescript
// Primary: descriptive folder creation
try {
  const folderId = await this.googleDriveClient.createClaimFolder(
    userId,
    claimId,
    claimData,
  );
  return folderId;
} catch (error) {
  // Fallback: basic folder creation without descriptive naming
  const fallbackId = await this.googleDriveClient.createClaimFolder(
    userId,
    claimId,
  );
  this.logger.warn('Used fallback folder creation:', error.message);
  return fallbackId;
}
```

## Configuration

### Environment Variables

The attachment module uses existing Google OAuth configuration:

```bash
# Google OAuth Configuration (required)
GOOGLE_CLIENT_ID=your_oauth_client_id
GOOGLE_CLIENT_SECRET=your_oauth_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback

# Database Configuration (inherited from project)
DATABASE_URL=postgresql://username:password@localhost:5432/claims_db
```

### Business Logic Constants

```typescript
// Attachment service configuration
const MAX_FILES_PER_CLAIM = 5;

// Folder naming constraints
const CLAIM_NAME_MAX_LENGTH = 30;
const TOTAL_PATH_MAX_LENGTH = 200;

// Retry configuration
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
```

### Folder Structure

```
Google Drive Organization:
└── Mavericks Claims/
    ├── 2024-01-1704067200-telco-internet-upgrade/
    │   ├── receipt.pdf
    │   └── invoice.jpg
    ├── 2024-02-1706659200-fitness-gym-membership/
    │   └── membership_card.pdf
    ├── 2024-03-1709251200-dental-checkup/
    │   ├── dental_receipt.pdf
    │   └── treatment_summary.pdf
    └── 2024-03-1709337600-lunch-team-building/
        └── restaurant_bill.jpg
```

## Performance Optimization

### Folder Name Generation Performance

- **Target**: <10ms per generation
- **Optimization**: In-memory category mapping
- **Monitoring**: Performance logging in development mode
- **Caching**: No caching needed due to fast generation

### Google Drive API Optimization

- **Rate Limiting**: Exponential backoff for 429 errors
- **Connection Pooling**: OAuth2 client reuse
- **Batch Operations**: Grouped folder creation when possible
- **Request Optimization**: Minimal field selection for API calls

### Database Query Optimization

- **Claim Data**: Single query with required fields only
- **Attachment Counting**: Efficient limit checking
- **Index Usage**: Proper indexing on claimId for attachment queries

## Testing

### Test Coverage

The attachment module includes comprehensive test coverage:

- **Unit Tests**: Individual service methods and utility functions
- **Integration Tests**: End-to-end folder creation workflows
- **API Tests**: Full attachment upload and retrieval flows
- **Error Handling**: All error scenarios and edge cases

### Test Examples

**Folder Naming Utility Tests:**

```typescript
describe('FolderNamingUtil', () => {
  it('should generate descriptive folder name with claim name', () => {
    const claimData = {
      id: 'claim-123',
      claimName: 'Mobile Plan Upgrade',
      category: ClaimCategory.TELCO,
      month: 3,
      year: 2024,
      createdAt: new Date('2024-03-15T10:30:00Z'),
      totalAmount: 89.99,
    };

    const result = FolderNamingUtil.generateFolderName(claimData);

    expect(result.isValid).toBe(true);
    expect(result.folderName).toMatch(
      /^2024-03-\d{10}-telco-mobile-plan-upgrade$/,
    );
    expect(result.errors).toHaveLength(0);
  });

  it('should handle collision with suffix generation', () => {
    // Test collision handling scenarios
  });

  it('should sanitize special characters in claim names', () => {
    // Test sanitization logic
  });
});
```

**Google Drive Client Tests:**

```typescript
describe('GoogleDriveClient', () => {
  it('should create descriptive folder with claim data', async () => {
    const mockClaimData = {
      id: 'claim-123',
      claimName: 'Test Claim',
      category: ClaimCategory.TELCO,
      month: 3,
      year: 2024,
      createdAt: new Date(),
      totalAmount: 100,
    };

    const folderId = await googleDriveClient.createClaimFolder(
      'user-123',
      'claim-123',
      mockClaimData,
    );

    expect(folderId).toBeDefined();
    expect(mockDriveService.files.create).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({
          name: expect.stringMatching(/^2024-03-\d{10}-telco-test-claim$/),
        }),
      }),
    );
  });
});
```

## Usage Examples

### Basic Folder Creation

```typescript
import { AttachmentService } from './attachment.service';

// Create descriptive folder for new claim
const attachmentService = new AttachmentService(/* dependencies */);

async function createClaimFolder(userId: string, claimId: string) {
  try {
    const folderId = await attachmentService.createClaimFolder(userId, claimId);

    if (folderId) {
      console.log(`Folder created: ${folderId}`);
      return folderId;
    } else {
      console.error('Failed to create folder');
      return null;
    }
  } catch (error) {
    console.error('Folder creation error:', error);
    throw error;
  }
}
```

### File Upload Workflow

```typescript
// Complete file upload workflow with descriptive folders
async function uploadClaimFile(
  userId: string,
  claimId: string,
  fileMetadata: FileMetadata,
) {
  // 1. Create descriptive folder
  const folderId = await attachmentService.createClaimFolder(userId, claimId);

  if (!folderId) {
    throw new Error('Failed to create claim folder');
  }

  // 2. Client uploads file to the created folder (handled by frontend)
  // const uploadResult = await uploadToGoogleDrive(file, folderId);

  // 3. Store metadata in database
  const result = await attachmentService.storeFileMetadata(claimId, {
    originalFilename: fileMetadata.originalFilename,
    storedFilename: generateStoredFilename(fileMetadata),
    googleDriveFileId: fileMetadata.driveFileId,
    googleDriveUrl: fileMetadata.shareableUrl,
    fileSize: fileMetadata.size,
    mimeType: fileMetadata.type,
  });

  return result;
}
```

### Folder Name Customization

```typescript
// Custom folder naming for specific claim types
function getCustomFolderData(claim: ClaimEntity): ClaimDataForFolderNaming {
  return {
    id: claim.id,
    claimName:
      claim.category === ClaimCategory.COMPANY_EVENT
        ? `${claim.claimName}-event`
        : claim.claimName,
    category: claim.category,
    month: claim.month,
    year: claim.year,
    createdAt: claim.createdAt,
    totalAmount: claim.totalAmount,
  };
}
```

## Integration Points

### Backend Service Integration

- **ClaimDBUtil**: Claim data retrieval for folder naming
- **AttachmentDBUtil**: File metadata persistence
- **AuthService**: Google OAuth token management
- **TokenDBUtil**: Encrypted token storage and refresh

### Frontend Integration

- **Drive Upload Client**: Direct browser-to-Drive uploads using OAuth tokens
- **Attachment Upload Forms**: File selection and metadata collection
- **Progress Tracking**: Upload status and error handling
- **File Management**: Attachment listing and deletion

### Google Workspace Integration

- **Google Drive API**: Folder creation and file management
- **OAuth 2.0**: Secure authentication and authorization
- **Shareable Links**: Public URL generation for email attachments

## Migration and Compatibility

### Backward Compatibility

The descriptive folder naming system maintains full backward compatibility:

- **Existing Claims**: Continue using existing folder structures
- **Legacy Folders**: No modification of existing folders required
- **API Compatibility**: All existing endpoints remain unchanged
- **Fallback Behavior**: Automatic fallback to old naming if generation fails

### Migration Strategy

No migration is required as the system:

1. **Uses Existing Data**: Generates names from current claim properties
2. **No Schema Changes**: No database modifications needed
3. **Gradual Adoption**: New claims automatically use descriptive naming
4. **Zero Downtime**: Implementation requires no service interruption

## Best Practices

1. **Error Handling**: Always implement fallback strategies for folder creation
2. **Performance**: Monitor folder name generation performance (<10ms target)
3. **Logging**: Log folder creation success/failure for debugging
4. **Validation**: Validate claim data before attempting folder creation
5. **Security**: Ensure proper OAuth token management and encryption
6. **Testing**: Test collision handling scenarios thoroughly
7. **Monitoring**: Track Google Drive API rate limits and quota usage

## Common Issues and Solutions

### Issue 1: Folder Creation Fails

**Symptoms:** Folder creation returns null or throws exceptions
**Solution:** Check Google Drive API credentials and user permissions, implement fallback naming

### Issue 2: Duplicate Folder Names

**Symptoms:** Multiple folders with similar names
**Solution:** Collision detection is automatically handled with suffix generation

### Issue 3: Performance Issues

**Symptoms:** Slow folder name generation (>10ms)
**Solution:** Review claim data size and optimize string operations

### Issue 4: Invalid Characters in Folder Names

**Symptoms:** Google Drive API errors due to invalid characters
**Solution:** Folder naming utility automatically sanitizes all input

## Dependencies

### Required Dependencies

- **Google APIs**: `googleapis` for Drive API integration
- **NestJS**: Framework and dependency injection
- **TypeORM**: Database entity management
- **@project/types**: Shared type definitions

### Optional Dependencies

- **Vitest**: Unit testing framework
- **Supertest**: API integration testing
- **@nestjs/testing**: NestJS testing utilities

This documentation provides comprehensive coverage of the attachments module's Google Drive integration and descriptive folder naming capabilities.
