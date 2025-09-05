Mavericks Claim Submission Web App - Detailed Requirements

1. Project Overview
   The Mavericks Claim Submission web app enables employees of Mavericks Consulting to submit expense claims digitally, replacing the current manual email-based process. The app streamlines claim submissions, document uploads, and email notifications to the payroll team, while allowing employees to track and manage their claims.
2. Functional Requirements
   2.1 Authentication

FR1.1: The system must integrate with Google OAuth for single sign-on (SSO) using employee email addresses with the @mavericks-consulting.com domain.
FR1.2: All authenticated users are treated as regular employees with no additional roles or permissions.
FR1.3: The system must store the employee’s email ID (from Google Gmail API) in the database for each claim submission.

2.2 Claim Submission Form

FR2.1: The system must provide a form for employees to submit claims with the following fields:
Category: A dropdown with predefined values: Telco, Fitness, Dental, Skill Enhancement, Company Event, Company Lunch, Company Dinner, Others.
Month: A dropdown for selecting the expense month (e.g., January to December).
Year: A dropdown for selecting the expense year (e.g., current year and previous year).
Total Amount: A numeric input for the claim amount (in SGD).
Claim Name: A text input required only for the "Others" category.

FR2.2: The system must enforce the following validations:
Category Limits:
Telco: Maximum SGD 150 per month.
Fitness: Maximum SGD 50 per month.
Dental, Skill Enhancement, Company Event, Company Lunch, Company Dinner, Others: No limit.

Claim Eligibility: Claims must be submitted within two months of the expense date. For example:
Expense on 1st Sep 2025 must be claimed by 31st Oct 2025.
Expense on 30th Sep 2025 must be claimed by 31st Oct 2025.

Total Amount: Must be a valid positive number.

FR2.3: The system must allow employees to submit multiple claims in a single session, with each claim supporting multiple document attachments.
FR2.4: The system must display a preview of the form data and attached documents before submission.

2.3 Document Upload

FR3.1: The system must restrict document uploads to the following file types: PDF, PNG, JPEG/JPG, IMG.
FR3.2: The maximum file size per document is 5MB.
FR3.3: The client must validate file type, size, and name before initiating an upload to Google Drive.
FR3.4: The client must use the Google Drive API (v3) to upload files directly from the browser to the employee’s personal Google Drive account (tied to their @mavericks-consulting.com email), using the employee’s OAuth access token.
FR3.5: The system must create a folder named "Mavericks Claims" in the employee’s Google Drive (if it doesn’t exist) to store all claim-related files.
FR3.6: Files must be uploaded to a subfolder within "Mavericks Claims" named after the claim UUID (e.g., Mavericks Claims/:claimUuid/).
FR3.7: After a successful upload, the client must:
Generate a shareable Google Drive URL for the file (set to "anyone with the link" for payroll access).
Send the file ID, shareable URL, and metadata (e.g., original file name, new file name) to the backend for storage in the database.

FR3.8: If an upload fails, the client must retry the upload up to 3 times before notifying the backend of the failure (status code 404).
FR3.9: Documents must only be uploaded to Google Drive after the employee submits the claim.
FR3.10: The backend must verify the existence of uploaded files in Google Drive (via file ID) and update the attachment status to uploaded in the database upon confirmation.

2.4 Database and Storage

FR4.1: The system must store the following claim details in the database:
Employee email ID (from Google Gmail API).
Category (e.g., Telco, Fitness).
Month (e.g., September).
Year (e.g., 2025).
Total Amount (in SGD).
Claim Name (for "Others" category).
Claim Status (draft, sent, failed, paid).
Submission Date (timestamp of submission).

FR4.2: The system must store the following document metadata in the database:
Attachment UUID (unique identifier).
Original file name.
New file name (as per naming convention).
Google Drive file ID.
Google Drive shareable URL (e.g., https://drive.google.com/file/d/{fileId}/view).

FR4.3: Documents must be stored in the employee’s Google Drive with the following folder structure:
Mavericks Claims/:claimUuid/ (where :claimUuid is a unique identifier for the claim).

FR4.4: Documents must be renamed in Google Drive using the format: {{EMPLOYEE_NAME}}_{{CLAIM_CATEGORY}}_{{YEAR}}_{{MONTH}}_{{TIMESTAMP}}.{{FILE_EXTENSION}}.
Example: jason_lee_company_dinner_2025_09_1756983666963.pdf.
EMPLOYEE_NAME: Lowercase, spaces replaced with underscores.
CLAIM_CATEGORY: Lowercase, spaces replaced with underscores.
YEAR: Four-digit year of the expense.
MONTH: Two-digit month of the expense (e.g., 09 for September).
TIMESTAMP: Unix timestamp of the upload time.
FILE_EXTENSION: Original file extension (e.g., pdf, png).

FR4.5: The system must set the claim status to draft upon creation, sent upon successful email sending, failed if email sending fails after 3 retries, and paid when manually updated by the employee.

2.5 Email Sending

FR5.1: The system must generate emails using a predefined HTML template stored in the backend codebase, replacing variables (e.g., {{CATEGORY}}, {{MONTH}}, {{YEAR}}, {{TOTAL_AMOUNT}}, {{EMPLOYEE_NAME}}) with actual values.
FR5.2: Each email must correspond to a single claim and include shareable Google Drive URLs for all associated documents (e.g., "Please find the claims documents here: [link1], [link2]") instead of attachments.
FR5.3: Emails must be sent from the employee’s @mavericks-consulting.com email address to payroll@mavericks-consulting.com.
FR5.4: Email sending must be handled by an asynchronous delayed job using RabbitMQ, running in a separate Docker container connected to the database.
FR5.5: The email sending process must follow these steps:
Client sends a request to create a claim, including document metadata.
Backend inserts claim data into the database with status draft.
Client uploads files directly to Google Drive using the Drive API and sends file IDs/URLs to the backend.
Backend verifies file existence in Google Drive (via file ID) and updates attachment status to uploaded.
If all documents are uploaded, the backend inserts a delayed job into the database with the claim data and Drive URLs.
Backend responds to the client with a 200 status code (or 404 for failed uploads).
The delayed job retrieves claim data, populates the email template with Drive URLs, and sends the email via Google Gmail API.
If email sending fails, retry up to 3 times:
If all retries fail, update claim status to failed.
If successful, update claim status to sent.

FR5.6: If the claim status is failed, employees must be able to click a "Resend" button to trigger a new delayed job to retry sending the email.
FR5.7: The client must redirect to the claim list page after receiving a 200 status code and confirming all files are uploaded.

2.6 Claim Viewing

FR6.1: The system must display a list of the employee’s claim submissions, showing:
Category.
Month (e.g., September 2025).
Status (draft, sent, failed, paid).
Submission Date.

FR6.2: The claim list must support filtering by:
Category (e.g., Telco, Fitness).
Status (draft, sent, failed, paid).
Month/Year (e.g., September 2025).

FR6.3: The claim list must support pagination with 20 claims per page.
FR6.4: Employees must only view their own claim submissions.
FR6.5: The system must allow employees to view individual claim details, displaying:
Category.
Month (e.g., September 2025).
Status (draft, sent, failed, paid).
Submission Date.
List of documents (with original file names and Google Drive shareable URLs for viewing/downloading).

FR6.6: Employees must be able to mark a claim as paid or revert it to sent via a button.
FR6.7: Marking a claim as paid must trigger a confirmation modal to confirm the action.
FR6.8: The claim status must follow these transitions:
draft -> sent <-> paid.
draft -> failed -> sent <-> paid.

3. Non-Functional Requirements
   3.1 User Interface and Experience

NFR1.1: The web app must use a dark mode theme exclusively.
NFR1.2: The web app must be fully responsive and optimized for mobile devices.

3.2 Security

NFR2.1: Documents stored in Google Drive must be encrypted (using Google Workspace’s default encryption at rest and in transit).
NFR2.2: Google Drive files must be set to "anyone with the link" visibility to allow payroll access, with sharing permissions set via the Drive API during upload.
NFR2.3: The system must ensure that only authenticated employees can access their own claims and documents.
NFR2.4: The system must handle Google Drive quota exceeded errors gracefully and notify employees if uploads fail due to storage limits.

3.3 Performance

NFR3.1: The system must handle file uploads and email sending asynchronously to avoid blocking the user interface.
NFR3.2: The claim list page must load within 2 seconds for up to 100 claims (with pagination).

3.4 Scalability

NFR4.1: The system must support asynchronous email sending via RabbitMQ to handle high volumes of claim submissions.
NFR4.2: The database must support efficient querying for claim filtering and pagination.

4. Technical Constraints

TC1: The system must use Google Drive for document storage, with client-side uploads via the Google Drive API (v3).
TC2: Email sending must integrate with the Google Gmail API.
TC3: Asynchronous delayed jobs must use RabbitMQ for queue management, running in a separate Docker container.
TC4: The backend and delayed job must use the same tech stack (as defined in separate documentation).
TC5: The system must integrate with Google Workspace for authentication and Drive access.

5. Assumptions

The tech stack for frontend and backend is documented elsewhere and does not impact these requirements.
Hosting infrastructure is already set up and does not require additional configuration.
No specific branding guidelines (e.g., logos, colors) are provided beyond the dark mode requirement.
Google Workspace provides sufficient storage quotas for employee Drives to handle claim documents.
Payroll team members have Google Workspace accounts to access shared Drive URLs.

6. Out of Scope

Admin roles or permissions.
Integration with external payroll systems.
Support for light mode or custom branding.
Real-time notifications for email sending status (beyond the claim status in the UI).
Multi-language support or localization.
Direct email attachments (replaced by Google Drive URLs).

7. Glossary

Claim: An expense submission by an employee for reimbursement.
Category: The type of expense (e.g., Telco, Fitness, Others).
Google Drive URL: A shareable link to a file in Google Drive (e.g., https://drive.google.com/file/d/{fileId}/view).
Delayed Job: An asynchronous task for sending emails, managed via RabbitMQ.
Claim Status: The state of a claim (draft, sent, failed, paid).

8. Version History

Version 1.0: Initial requirements draft based on provided answered-version.md (September 4, 2025).
Version 2.0: Updated to replace AWS S3 with Google Drive for document storage, using client-side uploads and Drive URLs in emails (September 5, 2025).
