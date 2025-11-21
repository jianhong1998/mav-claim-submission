# Requirements Document

## Introduction

The profile page (`/profile`) currently allows users to update their username and email preferences (CC/BCC for claim submissions) via PATCH /api/users/:userId. However, the page cannot display existing data because there is no GET endpoint to retrieve user profile information. This creates a broken user experience where users can modify settings they cannot see.

This feature adds a GET /api/users/:userId endpoint to complete the basic CRUD operations for user profile management, enabling the frontend to display current username and email preferences on the profile page.

## Alignment with Product Vision

This feature aligns with the product vision by:

1. **Employee Autonomy**: Users need to see their current profile settings to make informed decisions about claim submission preferences
2. **Administrative Efficiency**: Complete profile management enables better self-service, reducing support requests
3. **Compliance Tracking**: Visible email preferences ensure users understand how their claim notifications are distributed

This completes the user profile management feature identified in the **User Management Module** section of the technical architecture, ensuring users have full visibility and control over their profile data.

## Requirements

### Requirement 1: Retrieve User Profile Data

**User Story:** As an authenticated employee, I want to view my current profile information (username and email preferences), so that I can verify my settings before making changes

#### Acceptance Criteria

1. WHEN authenticated user requests GET /api/users/:userId THEN system SHALL return user profile data (username, email, created/updated timestamps) and associated email preferences
2. IF user requests their own profile (JWT userId === params userId) THEN system SHALL return HTTP 200 with complete profile data
3. IF user requests another user's profile (JWT userId !== params userId) THEN system SHALL return HTTP 403 Forbidden
4. IF requested user ID does not exist THEN system SHALL return HTTP 404 Not Found
5. IF user is not authenticated THEN system SHALL return HTTP 401 Unauthorized

### Requirement 2: Email Preferences Data Structure

**User Story:** As an authenticated employee, I want to see my CC and BCC email preferences in a structured format, so that I can understand how my claim notifications are distributed

#### Acceptance Criteria

1. WHEN system retrieves user profile THEN system SHALL include array of email preferences with fields: emailAddress and type (cc/bcc)
2. IF user has no email preferences THEN system SHALL return empty array (not null or error)
3. WHEN multiple email preferences exist THEN system SHALL return all preferences grouped by user
4. WHEN email preference type is specified THEN system SHALL return only 'cc' or 'bcc' values as defined in database

### Requirement 3: Authorization and Security

**User Story:** As a system administrator, I want user profile data protected by proper authorization, so that employees can only access their own profile information

#### Acceptance Criteria

1. WHEN endpoint is called THEN system SHALL validate JWT token from authentication cookie
2. IF JWT token is missing or invalid THEN system SHALL return HTTP 401 Unauthorized
3. IF authenticated user attempts to access different user's profile THEN system SHALL return HTTP 403 Forbidden with error message
4. WHEN authorization succeeds THEN system SHALL allow profile data retrieval
5. IF database query fails THEN system SHALL return HTTP 500 Internal Server Error with appropriate error message

### Requirement 4: API Response Format

**User Story:** As a frontend developer, I want a consistent API response format, so that I can reliably parse and display user profile data

#### Acceptance Criteria

1. WHEN profile data is retrieved successfully THEN system SHALL return JSON response with structure: `{ id, email, username, createdAt, updatedAt, emailPreferences: [{ emailAddress, type }] }`
2. WHEN email preferences exist THEN system SHALL return array of objects with emailAddress (string) and type ('cc' | 'bcc')
3. WHEN timestamps are returned THEN system SHALL use ISO 8601 format
4. WHEN error occurs THEN system SHALL return consistent error response format with statusCode, message, and error fields

## Non-Functional Requirements

### Code Architecture and Modularity

- **Single Responsibility Principle**: GET endpoint logic isolated in UsersController, data retrieval in UsersService, authorization in JwtAuthGuard
- **Modular Design**: Reuse existing UsersService for database queries, existing JwtAuthGuard for authentication, existing AuthorizationGuard pattern for ownership validation
- **Dependency Management**: Leverage existing @project/types for response DTO, avoid creating duplicate type definitions
- **Clear Interfaces**: Define UserProfileResponseDto in @project/types for consistent contract between backend and frontend

### Performance

- **Response Time**: Profile data retrieval SHALL complete within 200ms for 95th percentile
- **Database Query**: Use TypeORM relation loading to fetch user + email preferences in single query (avoid N+1 problem)
- **Caching**: Consider HTTP caching headers (ETag) for profile data that changes infrequently

### Security

- **Authentication**: JWT token validation required for all requests (reuse existing JwtAuthGuard)
- **Authorization**: Users can only access their own profile data (userId from JWT must match params userId)
- **Data Exposure**: Do NOT return sensitive fields (hashed passwords, OAuth tokens, internal IDs)
- **Rate Limiting**: Apply existing rate limiting configuration (100 requests per minute per IP for general endpoints)

### Reliability

- **Error Handling**: Graceful handling of database connection failures, invalid user IDs, and malformed requests
- **Transaction Safety**: Read-only operation does not require transaction management
- **Logging**: Log authorization failures and database errors for audit trail

### Usability

- **Consistent API Design**: Follow existing API patterns (same authorization approach as PATCH /api/users/:userId)
- **Clear Error Messages**: Return descriptive error messages for 400, 401, 403, 404, 500 responses
- **API Documentation**: Add OpenAPI/Swagger annotations for API documentation generation
