# Business Logic & Requirements

## Claim Categories and Limits

**Claim Categories with Monthly Limits**:
- **Telco**: SGD 150/month
- **Fitness**: SGD 50/month  
- **Dental**: No limit
- **Skill Enhancement**: No limit
- **Company Event**: No limit
- **Company Lunch**: No limit
- **Company Dinner**: No limit
- **Others**: No limit (requires claim name field)

## Validation Rules

### Timing Requirements
- Claims must be submitted within 2 months of expense date
- Example: Expense on 1st Sep 2025 must be claimed by 31st Oct 2025

### Amount Validation
- Total amount must be positive number
- Category-specific monthly limits enforced for Telco and Fitness
- No limit validation for other categories

### File Upload Restrictions
- **Allowed Types**: PDF, PNG, JPEG/JPG, IMG
- **File Size**: Maximum 5MB per file
- **Storage**: Employee's personal Google Drive
- **Validation**: Client-side and server-side validation required

## Claim Status Flow

```
draft → sent ↔ paid
draft → failed → sent ↔ paid
```

### Status Definitions
- **draft**: Initial state when claim is created
- **sent**: Email successfully sent to payroll
- **failed**: Email sending failed after 3 retries
- **paid**: Employee manually marked as paid (reversible)

### Status Transitions
- Employee can mark claims as paid or revert to sent
- Failed claims can be resent via "Resend" button
- Confirmation modal required for status changes

## Google Drive Integration

### File Storage Structure
```
Employee's Google Drive/
└── Mavericks Claims/
    └── {year}-{month}-{categoryCode}-{name}-{uploadTimestamp}/
        ├── jason_lee_company_dinner_2025_09_1725456123000.pdf
        └── ...
```

Example folder name: `2025-09-company-lunch-1758268548628`

### File Naming Convention
Format: `{employee_name}_{category}_{year}_{month}_{timestamp}.{extension}`

- `employee_name`: Lowercase, spaces replaced with underscores
- `category`: Lowercase, spaces replaced with underscores  
- `year`: 4-digit year (e.g., 2025)
- `month`: 2-digit month (e.g., 09)
- `timestamp`: Unix timestamp in milliseconds
- `extension`: Original file extension

Example: `jason_lee_company_dinner_2025_09_1725456123000.pdf`

### File Permissions
- Files set to "anyone with the link" for payroll access
- Shareable URLs stored in database
- No direct file attachments in emails (URLs only)

## Email Processing Workflow

### Synchronous Email Processing
- Gmail API sends emails immediately upon claim submission
- No queue system - direct API call using user's OAuth tokens
- Email success/failure determines claim status (sent/failed)
- Email templates include Google Drive shareable URLs (no attachments)

### Email Template Requirements
- HTML templates stored in backend codebase
- Variable substitution: `{{CATEGORY}}`, `{{MONTH}}`, `{{YEAR}}`, `{{TOTAL_AMOUNT}}`, `{{EMPLOYEE_NAME}}`
- Google Drive URLs embedded as links
- Sent from employee's @mavericks-consulting.com email to payroll@mavericks-consulting.com

## User Interface Requirements

### Design Requirements
- **Theme**: Dark mode exclusively
- **Responsive**: Mobile-first responsive design
- **Navigation**: Claims list, new claim form, claim details

### User Experience Flow
1. **Authentication**: Google OAuth with @mavericks-consulting.com domain restriction
   - Scopes: profile, email, gmail.send, drive.file
   - JWT session stored in HttpOnly cookie (24-hour expiry)
2. **Form Entry**: Claim form with real-time validation
3. **File Selection**: Client-side file validation
4. **Preview**: Review claim and attachments before submission
5. **Upload**: Direct Google Drive upload from browser using OAuth token
6. **Confirmation**: Backend creates claim and sends email synchronously
7. **Management**: List view with filtering and status updates

### List Features
- **Filtering**: By category, status, month/year
- **Pagination**: 20 claims per page
- **Actions**: View details, mark as paid/unpaid, resend failed emails
- **Privacy**: Users see only their own claims