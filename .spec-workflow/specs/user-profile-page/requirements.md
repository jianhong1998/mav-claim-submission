# Requirements Document

## Introduction

**Problem**: Users need to customize their display name and add CC/BCC email addresses to their claim submission emails. Currently, the system only uses the Google OAuth name and sends emails only to finance@mavericks-consulting.com. Users cannot personalize their identity or ensure copies of claim emails are sent to their personal/backup email addresses.

**Solution**: Add user profile page with two features:
1. Username customization: Users can set their display name (used in avatar dropdown and email footer)
2. Email preferences: Users can configure CC/BCC email addresses for claim submission emails

**Value**: Empowers users to control their identity and email workflow. Simple CRUD operations - store preferences, validate them, apply them to outgoing emails. No over-engineering. Database enforces constraints, not application logic.

## Alignment with Product Vision

**Technical Standards**:
- Enforces proper separation of concerns: profile management in dedicated module
- Follows TypeScript strict mode - no `any` types
- Uses Object.freeze() pattern for type constants (no enums)
- Maintains NestJS module patterns: controller → service → database
- Client-side validation with react-hook-form + zod (frontend)

**Architecture**:
- RESTful API design: PATCH /api/users/:userId for profile updates
- Database-first validation: unique constraint `(userId, emailAddress)` prevents duplicates
- Simple replace strategy: delete all + insert all (no smart diff complexity)
- Hard delete: no soft delete, no deletedAt column
- Frontend follows dark mode + mobile responsive requirements

**Business Logic**:
- Username updates overwrite UserEntity.name field (ignore Google account name changes)
- Email preferences apply only to claim submission emails (not other system emails)
- Single validation layer: DTO validation + service business rules
- No test emails, no retry logic - fail fast and report errors

## Requirements

### Requirement 1: User Profile Update Endpoint

**User Story:** As a user, I want to update my profile via API, so that I can customize my display name and email preferences.

#### Acceptance Criteria

1. WHEN user sends PATCH request to `/api/users/:userId` THEN system SHALL validate JWT authentication
2. WHEN user ID in URL does NOT match authenticated user ID THEN system SHALL return 403 Forbidden
3. WHEN user ID matches authenticated user THEN system SHALL process profile update
4. WHEN request body is valid THEN system SHALL update user profile and return 200 OK with updated user data
5. WHEN request body is invalid THEN system SHALL return 400 Bad Request with validation errors
6. WHEN user ID does not exist THEN system SHALL return 404 Not Found
7. WHEN database error occurs THEN system SHALL return 500 Internal Server Error

### Requirement 2: Username Customization

**User Story:** As a user, I want to customize my display name, so that it appears in the system instead of my Google account name.

#### Acceptance Criteria

1. WHEN user provides `name` field in update request THEN system SHALL validate minimum length is 1 character
2. WHEN name is valid THEN system SHALL update `UserEntity.name` field
3. WHEN name is empty string or only whitespace THEN system SHALL return 400 Bad Request
4. WHEN name is not provided in request THEN system SHALL NOT modify existing name
5. WHEN name is updated successfully THEN updated name SHALL appear in: (a) avatar dropdown, (b) email footer of claim submissions
6. WHEN Google account name changes THEN system SHALL ignore external changes and preserve user's customized name

### Requirement 3: Email Preferences Management (CC/BCC)

**User Story:** As a user, I want to add CC/BCC email addresses to my claim submissions, so that I receive copies of my submitted claims.

#### Acceptance Criteria

1. WHEN user provides `emailPreferences` array in update request THEN system SHALL validate each entry
2. WHEN email preference has valid format THEN system SHALL store it in `user_email_preferences` table
3. WHEN email preference format is invalid THEN system SHALL return 400 Bad Request with error details
4. WHEN user includes their own email in preferences THEN system SHALL return 400 Bad Request with message "Cannot add your own email as CC/BCC"
5. WHEN duplicate email addresses exist in submission THEN system SHALL return 400 Bad Request with message "Duplicate email addresses found"
6. WHEN user submits same email as both CC and BCC THEN database unique constraint SHALL prevent it (return 400 with appropriate error)
7. WHEN emailPreferences is empty array THEN system SHALL delete all existing preferences (clear all)
8. WHEN emailPreferences is not provided in request THEN system SHALL NOT modify existing preferences

### Requirement 4: Email Preference Validation

**User Story:** As a system, I want to validate email preferences at save time, so that only valid email addresses are stored.

#### Acceptance Criteria

1. WHEN email preference is provided THEN system SHALL validate using `@IsEmail()` decorator
2. WHEN email format is invalid THEN system SHALL return 400 Bad Request before database operation
3. WHEN email is user's own Google OAuth email THEN system SHALL reject with 400 Bad Request
4. WHEN duplicate emails exist within single submission THEN system SHALL reject with 400 Bad Request
5. WHEN preferences pass validation THEN system SHALL proceed with database update
6. WHEN validation passes at save time THEN system SHALL NOT re-validate at email send time (single validation layer)

### Requirement 5: Email Preference Update Strategy

**User Story:** As a developer, I want a simple update strategy for email preferences, so that the code is easy to understand and maintain.

#### Acceptance Criteria

1. WHEN email preferences update is requested THEN system SHALL use "delete all + insert all" strategy
2. WHEN deleting existing preferences THEN system SHALL execute single DELETE query: `DELETE FROM user_email_preferences WHERE userId = ?`
3. WHEN inserting new preferences THEN system SHALL execute single batch INSERT query
4. WHEN preferences array is empty THEN system SHALL only delete existing preferences (no insert)
5. WHEN database unique constraint violation occurs THEN system SHALL return 400 Bad Request (duplicate email)
6. WHEN update completes successfully THEN old preference IDs SHALL NOT be preserved (hard delete, new inserts)

### Requirement 6: Apply Email Preferences to Claim Submissions

**User Story:** As a user, I want my CC/BCC preferences automatically applied to claim submission emails, so that I receive copies without manual forwarding.

#### Acceptance Criteria

1. WHEN claim submission email is sent THEN system SHALL query user's email preferences
2. WHEN CC preferences exist THEN system SHALL add them to email CC field
3. WHEN BCC preferences exist THEN system SHALL add them to email BCC field
4. WHEN no preferences exist THEN system SHALL send email without CC/BCC
5. WHEN email send succeeds THEN system SHALL return success to user
6. WHEN email send fails (including CC/BCC delivery) THEN system SHALL return 500 Internal Server Error with message "Failed to send claim submission email"
7. WHEN preferences are invalid at send time THEN system SHALL NOT skip them - SHALL return error (validation should have caught this)

### Requirement 7: Database Schema Changes

**User Story:** As a database, I want proper schema to enforce email preference constraints, so that invalid data cannot exist.

#### Acceptance Criteria

1. WHEN migration runs THEN system SHALL create `user_email_preferences` table with columns: id (uuid), userId (uuid), type (varchar(3)), emailAddress (varchar(255))
2. WHEN migration runs THEN system SHALL create unique index on `(userId, emailAddress)`
3. WHEN migration runs THEN system SHALL add foreign key `userId` referencing `users.id` with `ON DELETE CASCADE`
4. WHEN user is deleted THEN database SHALL automatically delete all related email preferences (CASCADE)
5. WHEN duplicate `(userId, emailAddress)` is inserted THEN database SHALL reject with unique constraint error
6. WHEN `UserEntity` is queried with relations THEN system SHALL be able to load `emailPreferences` array

### Requirement 8: Frontend Profile Page

**User Story:** As a user, I want to access my profile page from the navbar, so that I can update my settings.

#### Acceptance Criteria

1. WHEN user clicks avatar in navbar THEN dropdown menu SHALL display "Profile" menu item
2. WHEN user clicks "Profile" menu item THEN system SHALL navigate to `/profile` route
3. WHEN profile page loads THEN system SHALL display: (a) Display Name input field, (b) CC Email Addresses section, (c) BCC Email Addresses section, (d) Save Changes button
4. WHEN no email preferences exist THEN each section SHALL show [+ Add CC/BCC Email] button
5. WHEN email preferences exist THEN each SHALL display email inputs with [Remove] button next to each
6. WHEN user clicks [+ Add More] THEN new email input field SHALL appear in respective section
7. WHEN user clicks [Remove] THEN that email field SHALL be removed from form (not saved until submit)

### Requirement 9: Frontend Form Validation

**User Story:** As a user, I want immediate feedback on invalid inputs, so that I can correct errors before submission.

#### Acceptance Criteria

1. WHEN user types in Display Name field THEN system SHALL validate minimum 1 character in real-time
2. WHEN user types in email field THEN system SHALL validate email format in real-time
3. WHEN user enters their own email THEN system SHALL show error "Cannot add your own email as CC/BCC"
4. WHEN user enters duplicate email THEN system SHALL show error "Duplicate email addresses found"
5. WHEN form has validation errors THEN Save Changes button SHALL be disabled
6. WHEN all fields are valid THEN Save Changes button SHALL be enabled
7. WHEN user submits form with valid data THEN system SHALL call PATCH /api/users/:userId API
8. WHEN API returns success THEN system SHALL show success toast notification
9. WHEN API returns error THEN system SHALL show error toast with message from API response

### Requirement 10: No Test Email System

**User Story:** As a developer, I want to avoid building unnecessary features, so that the codebase stays simple.

#### Acceptance Criteria

1. WHEN user adds email preference THEN system SHALL NOT send test email to verify it
2. WHEN user saves email preference THEN validation SHALL be limited to format check only
3. WHEN user submits claim THEN user SHALL discover if email preference works (first real send)
4. WHEN feature is complete THEN system SHALL have zero test email functionality

## Non-Functional Requirements

### Code Architecture and Modularity

**Single Responsibility Principle**:
- UserService handles user profile updates (username + email preferences orchestration)
- UserEmailPreferenceService handles email preference CRUD (delete all + insert all)
- EmailService queries preferences and applies to outgoing emails
- Controller handles HTTP layer and authorization only
- DTOs handle validation only

**Modular Design**:
- User profile endpoint grouped under `/api/users/*` prefix
- Email preference logic in separate service (UserEmailPreferenceService)
- Frontend profile form as isolated component (ProfileForm)
- Form validation schema in separate file (zod schema)

**Dependency Management**:
- Backend UserService depends on UserEmailPreferenceService
- EmailService depends on UserEmailPreferenceEntity repository
- Frontend profile page depends on user API client
- No circular dependencies

**Clear Interfaces**:
- RESTful endpoint: PATCH /api/users/:userId
- Type-safe DTOs: UpdateUserDto, EmailPreferenceDto
- Response format: nested user object with emailPreferences array
- Simple replace strategy: full array replacement (not partial updates)

### Performance

- Profile update response time: <200ms (single user update + batch preference insert)
- Email preference query: <50ms (indexed by userId)
- Frontend form validation: Real-time (<100ms feedback)
- Profile page load: <500ms (single user query with relations)

### Security

- **Authentication**: JWT required for PATCH /api/users/:userId
- **Authorization**: User can only update their own profile (userId match check)
- **Input Validation**: DTO decorators + service-layer business rules
- **No Email Injection**: EmailPreferenceDto validates format with @IsEmail()
- **Database Constraints**: Unique index prevents duplicate emails per user
- **No Sensitive Data**: Email preferences are non-confidential user data

### Reliability

- **Idempotency**: PATCH endpoint can be called multiple times with same data (safe)
- **Error Handling**: Proper HTTP status codes for all scenarios (400/403/404/500)
- **Database Safety**: CASCADE delete ensures no orphaned preferences
- **Transaction Safety**: Email preference update in single transaction (delete + insert)
- **Email Failure Handling**: Fail fast with 500 error if send fails (no silent drops)

### Usability

- **Developer Experience**: Simple replace strategy (3 lines of code vs 50 lines of smart diff)
- **User Experience**: Immediate frontend validation feedback
- **Clear Error Messages**: Specific validation errors ("Cannot add your own email", "Duplicate email addresses")
- **Intuitive UI**: [+ Add More] / [Remove] buttons for email management
- **Success Feedback**: Toast notifications for save success/failure
