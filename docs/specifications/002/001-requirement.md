# Product Overview

Mavericks Claim Submission is a web app that allow employee to submit claim to Mavericks.

All employees are holding emails with domain `mavericks-consulting.com`. Google is the email service provider.

# Current workflow (As Is)

1. Employee prepare the documents (pdf or image) for the claim.
2. Employee write email with certain template and attach the documents to the email.
3. Send the email to `payroll@mavericks-consulting.com`

## Email Template

Replace variables in `{{}}` with the actual values.

### Email Subject

```
Claim for {{CATEGORY}} ({{MONTH}} {{YEAR}}) (${{TOTAL_AMOUNT}})
```

### Email Body

```
Hi,

Please find the attachment claims for {{CATEGORY}} ({{MONTH}} {{YEAR}})
The total claim amount is ${{TOTAL_AMOUNT}}.

Thank you.

Best Regards,
{{EMPLOYEE_NAME}}
```

# Expected new workflow (To Be)

## User workflow:

1. Employee prepare the documents (pdf or image) for the claim.
2. Employee visit the web app.
3. Employee fill up the form on web app including the documents.
   - Employee can submit multiple claims at once.
   - Each claim can contain multiple documents.
4. Employee review the submissions.
5. Employee click on the submit button to submit the claims.

## System workflow:

When receive the list of claims submission:

1. Prepare email template for individual claim.
   - Each email can only contain a claim.
2. Record the claims data into database.
3. Upload attached documents to S3 bucket and record the document info into database. Link the documents info with the respective claim.
4. Send all the email:
   - from: the employee logged in email address.
   - to: `payroll@mavericks-consulting.com`

## After System Workflow Completed

- Employee can view all the claim submissions.
  - Should display these data in the list:
    - Category
    - month of the claim
    - status (pending / paid)
    - submission date

- Employee can view individual claim submission.
  - The claim submission data should be displayed:
    - category
    - month of the claim
    - status (pending / paid)
    - submission date
    - attachments

- Employee can mark claim as paid.
