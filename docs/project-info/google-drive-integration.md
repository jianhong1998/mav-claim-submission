# Google Drive Integration

## Overview

The system uses Google Drive API v3 for document storage, replacing traditional AWS S3 storage. Files are stored in each employee's personal Google Drive tied to their @mavericks-consulting.com email address.

## Client-Side Upload Architecture

### Why Client-Side Upload
- **No Server Buffer Handling**: Files upload directly from browser to Google Drive
- **OAuth Token Based**: Uses employee's existing authentication
- **Scalable**: Leverages Google's infrastructure
- **Cost Effective**: Uses existing Google Workspace storage

### Upload Workflow

1. **Authentication**: Employee authenticated with Google OAuth 2.0
   - Domain restriction: @mavericks-consulting.com only
   - Required scopes: profile, email, gmail.send, drive.file
   - JWT session created upon successful authentication
2. **OAuth Token Retrieval**: Frontend fetches user's OAuth access token from backend
3. **File Validation**: Client-side validation for type, size, name
4. **Folder Management**: Create "Mavericks Claims" folder structure if needed
5. **Direct Upload**: Browser uploads directly to Google Drive using OAuth token
6. **Permission Setting**: Set file to "anyone with the link" for payroll access
7. **Backend Confirmation**: Send file ID and shareable URL to backend for claim creation

### Required OAuth Scopes

```javascript
// Required Google OAuth scopes
const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/drive.file'
];
```

## Implementation Details

### OAuth Token Flow for Drive Upload

```typescript
// Frontend: Get OAuth access token from backend
async function getOAuthToken(): Promise<string> {
  const response = await fetch('/api/auth/drive-token', {
    credentials: 'include' // Include JWT cookie
  });

  if (!response.ok) {
    throw new Error('Failed to retrieve OAuth token');
  }

  const { accessToken } = await response.json();
  return accessToken;
}

// Use token for Drive API calls
const token = await getOAuthToken();
const driveResponse = await fetch(
  'https://www.googleapis.com/drive/v3/files',
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
```

### File Upload Process

```javascript
// Upload file to Google Drive
async function uploadToGoogleDrive(file, claimUuid, storedFilename) {
  // 1. Create folder structure
  const claimsFolder = await createOrGetFolder('Mavericks Claims');
  const claimFolder = await createOrGetFolder(claimUuid, claimsFolder.id);
  
  // 2. Upload with metadata
  const metadata = {
    name: storedFilename,
    parents: [claimFolder.id]
  };
  
  // 3. Multipart upload
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
  form.append('file', file);
  
  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${gapi.auth.getToken().access_token}`
      },
      body: form
    }
  );
  
  const result = await response.json();
  
  // 4. Set sharing permissions
  await gapi.client.drive.permissions.create({
    fileId: result.id,
    resource: {
      role: 'reader',
      type: 'anyone'
    }
  });
  
  return {
    fileId: result.id,
    shareableUrl: `https://drive.google.com/file/d/${result.id}/view`
  };
}
```

## Backend Integration

### File Verification

```typescript
// Verify file exists in Google Drive
async function verifyGoogleDriveFile(fileId: string, userAccessToken: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,size`,
      {
        headers: {
          'Authorization': `Bearer ${userAccessToken}`
        }
      }
    );
    
    return response.ok;
  } catch (error) {
    return false;
  }
}
```

### Database Storage

Attachments table stores:
- `google_drive_file_id`: Google Drive file ID
- `google_drive_url`: Shareable URL for payroll access
- `original_filename`: Original file name
- `stored_filename`: Renamed file following convention
- `status`: Upload status (pending, uploaded, failed)

## Email Integration

### No File Attachments

Emails contain Google Drive shareable URLs instead of file attachments:

```html
<!-- Email template example -->
<p>Please find the claim documents at the following links:</p>
<ul>
  {{#each googleDriveUrls}}
  <li><a href="{{url}}">{{filename}}</a></li>
  {{/each}}
</ul>
```

### Benefits of URL-Based Approach

- **No Email Size Limits**: Avoid 25MB Gmail attachment limits
- **Always Current**: Links point to latest file version
- **Access Control**: Google Workspace manages permissions
- **Audit Trail**: Google Drive tracks file access

## Error Handling

### Upload Retry Logic

- Client retries failed uploads up to 3 times
- Different error handling for network vs. quota issues
- Graceful degradation for storage quota exceeded

### Token Refresh

- Backend automatically refreshes expired OAuth tokens
- Refresh tokens encrypted and stored in PostgreSQL
- Automatic refresh when tokens expire (1-hour expiry)
- Reuses existing refresh token if Google doesn't provide new one
- Frontend can request fresh token if upload fails with 401

### Quota Management

- Handle Google Drive storage quota limits
- Clear error messages for storage issues
- Guidance for employees to clean up Drive space

## Security Considerations

### File Access Security

- Files stored in employee's personal Drive (data isolation)
- OAuth-based access with encrypted token storage
- JWT authentication required to retrieve OAuth tokens
- "Anyone with link" sharing for payroll team access
- Domain restriction enforced (@mavericks-consulting.com only)
- Google Workspace security policies apply

### Data Protection

- Files encrypted at rest and in transit by Google
- Leverages existing Google Workspace compliance
- Audit logs available through Google Admin Console
- GDPR compliance through Google Workspace settings