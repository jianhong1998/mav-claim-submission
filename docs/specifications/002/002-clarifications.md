# 1 - Authentication and Authorization

- How should employees authenticate to access the web app? Since you mentioned Google as the email service provider, should the app integrate with Google OAuth for single sign-on (SSO) using their `@mavericks-consulting.com` email addresses?
- Are there any specific roles or permissions (e.g., admin vs. regular employee) that need to be considered?

## Answer

Currently the authentication part is done in the project. Users will be using Google OAuth to login to the app. For now, all the employees are regular user. No admin role will be there.

# 2 - Form Details

- What specific fields should the claim submission form include? For example, are `CATEGORY`, `MONTH`, `YEAR`, and `TOTAL_AMOUNT` the only required fields, or are there additional fields like a description or claim ID?
- Are there predefined categories for claims (e.g., travel, medical, equipment), or can employees enter custom categories?
- Should the form validate the `TOTAL_AMOUNT` (e.g., ensure it’s a valid number or within a certain range)?

## Answer

### Claim submission fields

- Category
  - Fixed value, look at the section below

- Month
  - The month of the expense happen.
  - Currently the restriction for employees is to claim within 2 months.
    - Example 1: An expense on 1st Sep 2025, it must be claimed by 31st Oct 2025. From 1st Nov 2025, it will not be eligible for claim.
    - Example 2: An expense on 30th Sep 2025, it must be claimed by 31st Oct 2025 also. From 1st Nov 2025, it will not be eligible for claim.

- Year
  - The year of the expense happen.

- Total amount
  - The total amount for the specific claim.
  - Max eligible amount is based on the category.

- Claim Name
  - Only for the category `Others`.

### Claim category and amount limit

1. Telco. Limited to SGD 150 per month.
2. Fitness. Limited to SGD 50 per month.
3. Dental.
4. Skill Enhancement.
5. Company Event. No limit.
6. Company Lunch. No limit.
7. Company Dinner. No limit.
8. Others. No limit.
   - Need to mention the claim name.

# 3 - Document Upload

- Are there any restrictions on file types (e.g., only PDF and specific image formats like PNG/JPEG) or file size limits for uploads?
- Should the system allow employees to preview uploaded documents before submission?

## Answer

### File Types

For now the file types can resetict to `PDF`, `PNG`, `JPEG/JPG` and `IMG`.

Client side will send POST request to backend server for getting the file upload URL. The file name, file size and file extension is included in the request body payload.

The backend server should only generate the AWS Cloudfront pre-signed URL after validating the file type (mimetype), file size and file name.

### File Size

For now can limit up to 5MB.

### Review Before Submission

Yes, should allow employee to review before submission.
The attachments should only be uploaded when the employee submit.

### Approach of Uploading

Should use presigned URL from the AWS Cloudfront to let client side to upload the file buffer. The server should not handle the file buffer.

# 4 - Database and Storage

- Are there specific database fields you want to store for each claim and document? For example, should the database store metadata like file size, upload date, or file name for documents?
- For the S3 bucket, should documents be stored with a specific naming convention or folder structure (e.g., organized by employee, claim ID, or date)?
- Should the database track the status history of claims (e.g., when it changes from pending to paid)?

## Answer

### Database

- All the claim form details should be stored into DB. The email id responsed from Goodle Gmail API should be stored as well.
  - When the claims being created, it should store the claim status as `draft`.
  - When the email being send, system should update the claim status to `sent`.
  - The user will manually update the claim status to be `paid`.
- For document uploads, database should store the below data:
  - attachment UUID
  - original file name
  - new file name
  - file path (file path in S3 bucket, including file name)

### S3 bucket

- Folder structure in S3 bucket:
  - /claims - All files related to claim submissions
  - /claims/:claimUuid - All related files for a specific claim submission
  - /claims/:claimUuid/attachment/ - Folder for claim submission attachments

### File Name

When uploading a file to S3 bucket, the file should be rename to format: `{{EMPLOYEE_NAME}}_{{CLAIM_CATEGORY}}_{{YEAR}}_{{MONTH}}_{{TIMESTAMP}}.{{FILE_EXTENSION}}`.
Example: `jason_lee_company_dinner_2025_09_1756983666963.pdf` is a PDF file uploaded by employee `Jason Lee` for claiming `Compant Dinner` on `September 2025`. This PDF file is uploaded at `2025-09-04T11:01:06.963Z` and `1756983666963` is Unix timestamp.

- `EMPLOYEE_NAME`: The employee's name who submitting the claim. Lowercase, join all the whitespaces with `_`.
- `CLAIM_CATEGORY`: The claim category. Lowercase, join all the whitespaces with `_`.
- `YEAR`: The year of the expense.
- `MONTH`: The month of the expense.
- `TIME_STAMP`: The unix timestamp that the file being uploaded.
- `FILE_EXTENSION`: The original file extension.

# 5 - Email Sending

- Should the email template exactly match the provided format, or are there additional details (e.g., CC/BCC, specific email signatures, or formatting)?
- Should the system retry sending emails if there’s a failure (e.g., due to network issues or email server errors)?
- Should the system notify the employee if an email fails to send?

## Answer

### Email Template

Yes, a HTML file will be stored in backend codebase as the email template. The backend need to filling up some variables in the HTML file like `{{CATEGORY}}` to the actual value.

### Send Email Flow

Email sending should be handled by asynchronos delayed job. This asynchronos delayed job should be using the same backend codebase but running on another docker container that connecting to the database.

So the step will be as such:

1. Client side send request to the backend server to create a new claim submission.
   - Including attachment info for getting the AWS Cloudfront pre-signed URL.

2. Backend server insert claim submission data into DB. Claim submission status as `draft`

3. Backend getting pre-signed URLs from AWS Cloudfront.

4. Backend send the response with the pre-signed URLs (each URL for a file).

5. Client receive the response, then send the attachment to the individual pre-signed URL.

6. Client should send requests to backend server for attachment uploaded successfully. Each request for a file.

7. Backend verify if the file exist in the Cloudfront.
   - If it exists, then update the attachment status to `uploaded` in database.
   - If it does not exist, then response to client side with status code 404.

8. If all attachments are uploaded, then backend will insert a delayed job data into DB. Including delayed job type and the payload for delayed job to execute the task.

9. Backend response to client side with status code 200 without any body payload.

10. When client receive response:
    - if it is status code 404, then client side should retry to send the file again to the presigned URL.
    - if it is status code 200, then client side should wait until all files uploaded, then redirect to the claim list page.

11. When delayed job started, it should grab necessary data for the email sending. Then fill up the template with the data and call the Google Gmail API to send the email.
    - It should retry 3 times, if failed.
    - If more than 3 times failed, then it should update the claim submission status to be `failed`.
    - If success, then it should update the claim submission status to `sent`.

12. On client side, if employee see claim submission status is `failed`, then he/she can click on the `resend` button. Then client side will send request to backend to retry.

13. Server side will create an other delayed job to resend the email again. Then repeat the flow on step 11.

# 6 - Claim Viewing and Status Update

- For the list of claim submissions, should there be filtering, sorting, or pagination options (e.g., filter by status, month, or category)?
- When employees mark a claim as "paid," should this action be restricted to specific users (e.g., payroll team), or can any employee mark their own claims as paid?
- Should there be a confirmation step before marking a claim as paid?

## Answer

### Filtering and Pagination

Yes, on the list of claim submissions page should have options for filter. And it should have simple pagination (20 per page).

Claim submission can be filtered by `category`, `status` and `month` (month with year).

Employee can only see their own claim submission.

### Mark Claim Submission to be Paid

Employee himself/herself can mark a claim submission to be `paid`. And this action should be able to revert.

For better UX, there should have a popup modal for confirmation when employee click on the `mark as paid` button.

But the claim submission status flow only be these ways:

`draft` -> `sent` <-> `paid`

`draft` -> `failed` -> `sent` <-> `paid`

# 7 - System Requirements

- Are there specific technologies or frameworks preferred for the web app (e.g., React, Django, Node.js)?
- Are there requirements for hosting (e.g., AWS, Azure) or specific integrations (e.g., with existing payroll systems)?
- Are there any security or compliance requirements (e.g., GDPR, data encryption for documents)?

## Answer

### Tech stack and hosting

The tech stack for backend and frontend is written in another documentation. The delayed job should be using the same tech stack with backend plus RabbitMQ for the queue service.

Only the S3 bucket and cloudfront is tightly coupled with the AWS. The rest of the system component (backend server, frontend server, delayed job server, database server) will be deciding later. The hosting of services is already done.

### Security

It should keep the attachments safe, cause this is the only sensitive data.

# 8 - User Interface and Experience

- Are there specific design preferences or branding guidelines for the web app (e.g., colors, logos)?
- Should the app support responsive design for mobile access?

## Answer

- The app should be only in dark mode.
- The app should support mobile responsive design.
