# Question

For security purpose, can I change the S3 bucket to use Google Drive instead?
As the company subscribe to Google Workspace and created all the employees' email addresses from the Google Workspace. Meaning each of the employee email address are having Google Drive to be storage of the files.
I'm thinking to store their own files onto their own Google Drive (link to the employee's company email address). Then replace the S3 path with the full Google Drive URL.
Is this idea feasible? Possible to have something like the pre-signed URL for client side to upload the attachment?

# Feasibility Assessment

Yes, your idea to switch from AWS S3 to Google Drive for storing claim documents is feasible, with some caveats around implementation, security, and workflow adjustments. Since your company uses Google Workspace (which includes Google Drive for each employee's email account), you can leverage the existing authentication (Google OAuth) to enable uploads to individual employee Drives. This aligns well with your setup, as employees are already authenticated via Google, and Drive is integrated into Workspace.

I'll break this down step by step, including how it compares to the current S3 approach, potential challenges, and whether a "pre-signed URL" equivalent exists for client-side uploads.

## 1. **Overall Feasibility**

- **Technical Viability**: High. The Google Drive API supports file uploads, storage, and URL generation. You can store files in each employee's personal Drive (tied to their `@mavericks-consulting.com` email) and record the shareable Google Drive URLs in your database instead of S3 paths. This would allow the app to display/download files via those URLs for claim viewing.
- **Integration with Existing Setup**:
  - Authentication is already Google OAuth, so the client-side app can easily extend this to interact with the Drive API (e.g., using the Google JavaScript Client Library).
  - No additional subscriptions needed, as Drive storage is included in Google Workspace.
- **Security Considerations**:
  - **Pros**: Files are stored in individual Drives, which could enhance "security" by isolating data per employee (e.g., reducing the risk of a single breach exposing all claims). Workspace admins can still access all Drives for compliance/auditing via domain-wide administration.
  - **Cons**: This decentralizes storage, making it harder to manage (e.g., backups, retention policies). If an employee leaves the company, their Drive (and files) might need manual transfer or export, or they could be lost if the account is deleted. Centralized storage like S3 often provides better access controls, versioning, and lifecycle management. If security is your primary goal, consider using a shared Workspace Drive folder instead of per-employee storage—this keeps things centralized while staying within Google ecosystem.
  - Google Drive uses strong encryption (at rest and in transit), similar to S3, and complies with standards like GDPR/HIPAA if configured properly.
- **Cost**: Likely lower or neutral, as you're avoiding S3 fees and using existing Workspace storage quotas (typically 30GB+ per user, scalable with plans).

## 2. **Client-Side Uploads (Equivalent to Pre-Signed URLs)**

- **Is There a Direct Equivalent to AWS Pre-Signed URLs?** No, Google Drive doesn't offer "pre-signed URLs" like S3 or Google Cloud Storage (GCS). Pre-signed URLs in S3 allow temporary, unauthenticated access for uploads/downloads. Drive is more user-centric and relies on OAuth authentication rather than signed links.
- **Feasible Alternative**: Yes, you can achieve direct client-side uploads without the server handling the file buffer, similar in effect to pre-signed URLs. Here's how:
  - Use the **Google Drive API v3** with the JavaScript Client Library (gapi.client.drive).
  - **Steps for Implementation**:
    1. After Google OAuth login, load the Google API Client Library in your web app (via a `<script>` tag from `https://apis.google.com/js/api.js`).
    2. Initialize the Drive API client with the user's access token (obtained during auth).
    3. When the employee selects files in the form, use the API's `files.create` method to upload directly from the browser. For example (simplified JavaScript snippet based on official docs and samples):

       ```javascript
       // Assume gapi is loaded and auth is initialized
       function uploadFile(file, metadata) {
         const xhr = new XMLHttpRequest();
         xhr.open(
           'POST',
           'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'
         );
         xhr.setRequestHeader(
           'Authorization',
           'Bearer ' + gapi.auth.getToken().access_token
         );

         const form = new FormData();
         form.append(
           'metadata',
           new Blob([JSON.stringify(metadata)], { type: 'application/json' })
         ); // e.g., {name: 'file_name.pdf', parents: ['folder_id']}
         form.append('file', file);

         xhr.send(form);
         xhr.onload = () => {
           if (xhr.status === 200) {
             const response = JSON.parse(xhr.response);
             // Send file ID/URL back to your backend to store in DB
           }
         };
       }
       ```
    - This uploads the file buffer directly from the client to Drive, bypassing your server (just like S3 pre-signed URLs).
    - Validate file type/size/name client-side before upload, or server-side when generating metadata.
    - After upload, the API returns a file ID. Generate a shareable URL (e.g., `https://drive.google.com/file/d/{fileId}/view`) and send it to your backend to store in the database (replacing the S3 path).

  - **Restrictions/Limits**: Similar to your current 5MB/file and types (PDF, PNG, etc.). Drive supports up to 5TB/file, but Workspace quotas apply. Resumable uploads are available for larger files.
  - **Preview Before Submission**: Yes, same as now—show a local preview before initiating the API upload.

- **Differences from S3**: No need for server-generated pre-signed URLs; the client's OAuth token handles authorization. This is more seamless in your Google-centric setup but requires the user to be logged in (which they are).

## 3. **Storage and Database Changes**

- **Per-Employee Storage**: Upload to a specific folder in the employee's Drive (e.g., create a "Mavericks Claims" folder via API if it doesn't exist). Use the file naming convention you specified (e.g., `jason_lee_company_dinner_2025_09_1756983666963.pdf`).
- **Database Updates**: Replace S3 file paths with Google Drive URLs or file IDs. Store metadata like UUID, original name, new name, and URL. For claim viewing, the app can link to the Drive URL (ensure files are shared appropriately—e.g., set sharing to "anyone with the link" via API for payroll access, or use Workspace sharing).
- **Folder Structure**: Mimic your S3 structure, e.g., create subfolders per claim UUID via Drive API.

## 4. **Email Sending Workflow Adjustments**

- **Current Issue**: Your delayed job sends emails via Gmail API with attachments. If files are in the employee's Drive, the server can't directly access them without additional setup.
- **Feasible Solutions**:
  - **Option 1: Include Links Instead of Attachments** (Recommended for Simplicity):
    - Modify the email template to include Drive share links (e.g., "Please find the claims documents here: [link1], [link2]") instead of attachments.
    - This avoids downloading files server-side. Set files to "anyone with the link" visibility during upload (via API metadata).
    - Pros: Keeps client-side upload pure; no server buffer handling for emails.
    - Cons: Changes the "as-is" workflow slightly (links vs. attachments). Payroll might prefer attachments for offline access.
  - **Option 2: Attach Files (Maintain Original Workflow)**:
    - Use a Google Workspace **service account** with domain-wide delegation. This allows your server (delayed job) to impersonate the employee and access their Drive.
      - Setup: In Google Admin Console, enable delegation for the Drive API. Your backend uses the service account to download the file (via Drive API `files.get` with `alt=media`), then base64-encode and attach it to the Gmail API `messages.send` call.
      - Example flow: Delayed job fetches file bytes from Drive, builds the MIME message with attachments, and sends.
    - Pros: Keeps email attachments as-is.
    - Cons: Server handles file buffer (undoing some client-side upload benefits); requires admin setup for delegation. Retries (your 3 attempts) still apply.
  - **Gmail API Notes**: Attachments must be uploaded with the email (up to 25MB total/message). No direct "attach from Drive" without downloading first.

## 5. **Claim Viewing and Status Updates**

- No major changes needed. Use stored Drive URLs for displaying attachments (e.g., embed previews or provide download links). Ensure URLs are accessible—e.g., share files with the payroll email or make them link-shareable.
- Employees can only access their own claims, aligning with personal Drive storage.

## 6. **Potential Challenges and Recommendations**

- **Permissions and Sharing**: Files in personal Drives aren't automatically accessible company-wide. Use API to set sharing during upload (e.g., add `payroll@mavericks-consulting.com` as a viewer).
- **Error Handling**: Handle Drive quota exceeded or auth expirations. Your retry logic can extend to Drive API calls.
- **Performance**: Drive uploads are reliable but might be slower than S3 for large files; test with your 5MB limit.
- **Migration**: For existing S3 files, script a one-time transfer to Drives if needed.
- **Alternatives if Issues Arise**: If per-employee storage proves tricky, use a shared Google Drive (via Workspace) as a centralized bucket-like store. Or switch to Google Cloud Storage (GCS), which has true signed URLs and integrates with Workspace auth.
- **Testing**: Start with Google Drive API quickstarts (JavaScript for client-side, Node.js/Python for server if needed).

In summary, this switch is practical and aligns with your Google Workspace ecosystem, potentially simplifying costs and auth. However, it introduces decentralization—consider if a shared Drive better suits company needs. If you proceed, update your tech stack docs for Drive API integration. Let me know if you need code samples or further refinements!
