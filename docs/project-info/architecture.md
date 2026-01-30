# Mavericks Claim Submission System - Architecture Design

## System Overview

The Mavericks Claim Submission system is a comprehensive web application built on a TurboRepo monorepo architecture that enables employees to submit expense claims digitally. The system replaces the manual email-based process with an automated workflow that includes claim submission, document uploads, email notifications, and claim tracking.

### Core Components

1. **Frontend Application** - Next.js 15 with React 19 client application
2. **Backend API Server** - NestJS 11 REST API server with synchronous email processing
3. **Database** - PostgreSQL with TypeORM
4. **File Storage** - Google Drive per-employee storage
5. **Shared Types Package** - Cross-workspace TypeScript type definitions

## System Components

```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │
│   (Next.js)     │◄──►│   (NestJS)      │
│   Port: 3000    │    │   Port: 3001    │
└─────────────────┘    └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Google Drive  │    │   PostgreSQL    │    │   Google APIs   │
│   (Per Employee)│    │   Database      │    │ (Gmail + Drive) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Workspace Structure

- **`backend/`**: NestJS API server with TypeORM and PostgreSQL
- **`frontend/`**: Next.js 15 application with React 19, TailwindCSS, and TanStack Query
- **`packages/types/`**: Shared TypeScript types used across workspaces as `@project/types`
- **`api-test/`**: Integration/API testing suite using Vitest

## Backend Module Structure

Uses NestJS modules with feature-based organization:

- `src/modules/app/`: Main application module with health checks
- `src/modules/auth/`: Google OAuth authentication with JWT session management
  - `strategies/google-oauth.strategy.ts` - Passport Google OAuth 2.0 strategy
  - `services/auth.service.ts` - OAuth flow processing and token management
  - `services/token.service.ts` - JWT generation and validation
  - `guards/jwt-auth.guard.ts` - JWT authentication guard
  - `utils/token-db.util.ts` - OAuth token database operations with encryption
- `src/modules/email/`: Gmail API integration for sending emails
  - `services/gmail-client.service.ts` - Gmail API client for email sending
  - `services/email-template.service.ts` - Email template generation
  - `services/attachment-processor.service.ts` - Hybrid attachment processing (ADR-003)
  - `services/email-preview.service.ts` - Email preview generation (no external API calls)
  - `services/email.service.ts` - Email orchestration service
- `src/modules/drive/`: Google Drive API integration
- `src/modules/claims/`: Claim entities and database utilities
- `src/modules/claim-category/`: Database-driven claim categories and limits
  - `controllers/claim-category.controller.ts` - GET /claim-categories endpoint
  - `services/claim-category-services.ts` - Category lookup by code, list all categories
  - `entities/claim-category.entity.ts` - ClaimCategoryEntity
  - `entities/claim-category-limit.entity.ts` - ClaimCategoryLimitEntity (one-to-one)
  - `utils/` - Database utility classes
- `src/modules/user/`: User entity and database utilities
- `src/modules/common/`: Shared utilities and base classes
- `src/configs/`: Application configuration using `AppConfig` class

## Database Design

### Existing Tables

#### users
- `id` (UUID, Primary Key)
- `email` (VARCHAR(255), Unique)
- `name` (VARCHAR(255))
- `picture` (VARCHAR(500), Nullable)
- `googleId` (VARCHAR(255), Unique)
- `createdAt` (TIMESTAMP WITH TIME ZONE)
- `updatedAt` (TIMESTAMP WITH TIME ZONE)
- `deletedAt` (TIMESTAMP WITH TIME ZONE, Nullable)

#### oauth_tokens
- `id` (UUID, Primary Key)
- `userId` (UUID, Foreign Key to users)
- `provider` (ENUM: 'google')
- `accessToken` (TEXT)
- `refreshToken` (TEXT)
- `expiresAt` (TIMESTAMP WITH TIME ZONE)
- `scope` (TEXT)
- `createdAt` (TIMESTAMP WITH TIME ZONE)
- `updatedAt` (TIMESTAMP WITH TIME ZONE)
- `deletedAt` (TIMESTAMP WITH TIME ZONE, Nullable)

### Implemented Tables

#### claim_categories
```sql
CREATE TABLE claim_categories (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);
```

#### claim_category_limits
```sql
CREATE TABLE claim_category_limits (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL UNIQUE REFERENCES claim_categories(uuid),
    type VARCHAR(20) NOT NULL CHECK (type IN ('monthly', 'yearly')),
    amount INTEGER NOT NULL DEFAULT 0  -- Amount in SGD cents
);
```

#### claims
```sql
CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES claim_categories(uuid),
    claim_name VARCHAR(255) NULL, -- Required only for 'others' category
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid')),
    submission_date TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX idx_claims_user_id ON claims(user_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_category_id ON claims(category_id);
CREATE INDEX idx_claims_month_year ON claims(month, year);
CREATE INDEX idx_claims_created_at ON claims(created_at);
```

#### attachments
```sql
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(500) NOT NULL,
    google_drive_file_id VARCHAR(255) NOT NULL, -- Google Drive file ID
    google_drive_url VARCHAR(1000) NOT NULL, -- Shareable Google Drive URL
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'failed')),
    uploaded_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX idx_attachments_claim_id ON attachments(claim_id);
CREATE INDEX idx_attachments_status ON attachments(status);
CREATE INDEX idx_attachments_drive_file_id ON attachments(google_drive_file_id);
```

### Database Relationships

```
users (1) ──┐
            ├── oauth_tokens (N)
            ├── user_email_preferences (N)
            └── claims (N)

claim_categories (1) ── claim_category_limits (0..1)
claim_categories (1) ── claims (N)

claims (1) ── attachments (N)
```

All tables use:
- Soft delete support with audit timestamps
- UUID primary keys for security

## API Design

### Authentication Endpoints (Implemented)
- `GET /auth/google` - Initiate Google OAuth flow with domain restriction
- `GET /auth/google/callback` - Handle OAuth callback and generate JWT session
- `GET /auth/profile` - Get authenticated user profile
- `POST /auth/logout` - Logout user and clear JWT cookie
- `GET /auth/status` - Check authentication status without rate limiting

### Email Endpoints (Existing)
- `POST /email/send` - Send email via Gmail API
- `POST /email/check-access` - Check Gmail access
- `POST /email/refresh-token` - Refresh Gmail token

### New Claim Management Endpoints

#### Claim Submission
```typescript
// Create new claim with uploaded attachment details
POST /api/claims
Body: {
  category: string (category code);
  claimName?: string; // Required for 'others'
  month: number; // 1-12
  year: number;
  totalAmount: number;
  attachments: Array<{
    originalFilename: string;
    storedFilename: string;
    googleDriveFileId: string;
    googleDriveUrl: string;
    fileSize: number;
    mimeType: string;
  }>;
}
Response: {
  claimId: string;
  status: 'sent' | 'failed';
}
```

```typescript
// Get claim details
GET /api/claims/:claimId
Response: {
  id: string;
  category: string (category code);
  claimName?: string;
  month: number;
  year: number;
  totalAmount: number;
  status: ClaimStatus;
  submissionDate?: string;
  attachments: Array<{
    id: string;
    originalFilename: string;
    status: 'uploaded';
    googleDriveUrl: string; // Shareable Google Drive URL
  }>;
}
```

#### Claim List & Management
```typescript
// Get user's claims with filtering and pagination
GET /api/claims?category=telco&status=sent&month=9&year=2025&page=1&limit=20
Response: {
  claims: Array<ClaimSummary>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Update claim status
PATCH /api/claims/:claimId/status
Body: { status: 'paid' | 'sent' }
Response: { success: boolean }

// Resend failed claim email
POST /api/claims/:claimId/resend
Response: { status: 'sent' | 'failed' }
```

## Frontend Architecture

### Application Structure
```
frontend/src/
├── app/ (App Router)
│   ├── (authenticated)/
│   │   ├── claims/
│   │   │   ├── page.tsx          # Claims list
│   │   │   ├── new/
│   │   │   │   └── page.tsx      # New claim form
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Claim details
│   │   └── layout.tsx            # Authenticated layout
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx          # Login page with Google OAuth button
│   │   └── callback/
│   │       └── page.tsx          # OAuth callback handler
│   ├── globals.css
│   ├── layout.tsx                # Root layout with AuthProvider
│   └── page.tsx                  # Landing page
├── components/
│   ├── ui/ (Base components)
│   │   ├── button.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── modal.tsx
│   │   ├── table.tsx
│   │   └── pagination.tsx
│   ├── forms/
│   │   ├── ClaimForm.tsx
│   │   ├── FileUpload.tsx
│   │   └── ClaimPreview.tsx
│   ├── lists/
│   │   ├── ClaimsList.tsx
│   │   ├── ClaimFilters.tsx
│   │   └── ClaimListItem.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Navigation.tsx
│   │   └── Footer.tsx
│   └── common/
│       ├── StatusBadge.tsx
│       ├── LoadingSpinner.tsx
│       └── ErrorBoundary.tsx
├── hooks/
│   ├── queries/
│   │   ├── useClaimsQuery.ts
│   │   ├── useClaimMutation.ts
│   │   └── useGoogleDriveUpload.ts
│   ├── auth/
│   │   ├── useAuthStatus.ts      # Auth status with React Query
│   │   ├── useLogout.ts          # Logout mutation
│   │   └── useAuth.ts            # Auth context consumer
└── lib/
    ├── api-client.ts
    ├── auth.ts
    ├── google-drive.ts
    ├── utils.ts
    └── validations.ts
```

### State Management Strategy
- **TanStack Query**: Server state management, caching, and synchronization
  - Auth status polling with 30-second stale time
  - Automatic retry for network errors
  - Performance optimized for <100ms auth checks
- **React Hook Form**: Form state and validation
- **React Context (AuthProvider)**: Authentication state and user context
  - Provides user, isAuthenticated, logout functionality
  - Wraps entire application for global auth access
- **Local State**: Component-specific UI state

## Technology Stack

- **Framework**: NestJS 11 with TypeScript
- **Database**: PostgreSQL with TypeORM
- **Authentication**: Passport.js with Google OAuth 2.0 strategy (@mavericks-consulting.com domain restriction)
- **Session Management**: JWT tokens with HttpOnly cookies (24-hour expiry)
- **OAuth Token Storage**: Encrypted OAuth tokens in PostgreSQL with automatic refresh
- **Email Integration**: Google Gmail API with OAuth 2.0 (synchronous)
- **File Storage**: Google Drive API v3 with per-employee storage
- **Validation**: class-validator and class-transformer
- **Testing**: Vitest for unit tests
- **Development**: Nodemon with hot reload

## File Upload Architecture

### Google Drive Structure
```
Employee's Google Drive/
└── Mavericks Claims/
    └── {year}-{month}-{categoryCode}-{name}-{uploadTimestamp}/
        ├── jason_lee_company_dinner_2025_09_1725456123000.pdf
        ├── jason_lee_company_dinner_2025_09_1725456124000.png
        └── ...
```

Example folder name: `2025-09-company-lunch-1758268548628`

### File Upload Flow
1. **Client-Side Upload**: Client uploads files directly to employee's Google Drive using:
   - Google Drive API v3 with employee's OAuth access token
   - Create "Mavericks Claims" folder if it doesn't exist
   - Create claim-specific subfolder using claim UUID
   - Upload files with proper naming convention
   - Set file sharing to "anyone with the link" for payroll access
2. **Claim Creation**: Client sends POST to `/api/claims` with complete file details (IDs, URLs, metadata)
3. **Backend Processing**: 
   - Validate claim data and user permissions
   - Create claim and attachment records with `uploaded` status
   - Send email immediately via Gmail API with Drive URLs
   - Update claim status to `sent` or `failed` based on email result
4. **Response**: Return claim ID and final status to client

### File Naming Convention
Format: `{employee_name}_{claim_category}_{year}_{month}_{timestamp}.{extension}`
- `employee_name`: Lowercase, spaces replaced with underscores
- `claim_category`: Lowercase, spaces replaced with underscores  
- `year`: 4-digit year (e.g., 2025)
- `month`: 2-digit month (e.g., 09)
- `timestamp`: Unix timestamp in milliseconds
- `extension`: Original file extension

Example: `jason_lee_company_dinner_2025_09_1725456123000.pdf`

## Email Processing

### Synchronous Email Sending

#### Email Sending Process
1. **Claim Creation**: API endpoint receives claim with Google Drive file details
2. **Attachment Processing**: AttachmentProcessorService applies hybrid attachment strategy (ADR-003):
   - Download small files (<5MB) from Google Drive as email attachments
   - Keep large files (≥5MB) as Google Drive shareable links
   - Apply 20MB total attachment size limit (Gmail safety margin)
   - Fallback to Drive links on any download failure
3. **Email Generation**: Generate email from HTML template with both attachments and Drive links
4. **Email Sending**: Send multipart MIME email via Gmail API using user's OAuth tokens
5. **Status Update**: Update claim status to `sent` or `failed` based on email result
6. **Response**: Return final status to client

#### Email Template Integration
```typescript
// Email template with hybrid attachments + links (ADR-003)
interface EmailTemplateData {
  employeeName: string;
  category: string;
  month: string;
  year: number;
  totalAmount: number;
  processedAttachments?: {
    attachments: Array<{
      filename: string;
      size: number;
    }>;
    links: Array<{
      filename: string;
      url: string;
      size: number;
    }>;
  };
}

// Template renders both sections conditionally
const emailTemplate = `
  {{#if attachments.length}}
  <h3>📎 Attached Files</h3>
  <ul>
    {{#each attachments}}
    <li>{{filename}} ({{formatFileSize size}})</li>
    {{/each}}
  </ul>
  {{/if}}

  {{#if links.length}}
  <h3>☁️ Files on Google Drive</h3>
  <ul>
    {{#each links}}
    <li><a href="{{url}}">{{filename}}</a> ({{formatFileSize size}})</li>
    {{/each}}
  </ul>
  {{/if}}
`;
```

## Security Considerations

### Authentication & Authorization
- **Google OAuth 2.0**: Secure authentication with hard domain restriction (@mavericks-consulting.com)
  - Scopes: `profile`, `email`, `gmail.send`, `drive.file`
  - Offline access with refresh tokens for long-term API access
  - Automatic token refresh when expired
- **JWT Session Management**:
  - JWT tokens stored in HttpOnly cookies with SameSite=lax
  - 24-hour session expiry
  - Secure flag enabled in production
- **OAuth Token Management**:
  - Encrypted OAuth tokens stored in PostgreSQL
  - Automatic refresh token reuse when not provided by Google
  - Token upsert strategy to handle re-authentication
- **API Security**:
  - JWT-based authentication for protected endpoints
  - Rate limiting on OAuth endpoints (initiate: 10/min, callback: 20/min)
  - Optional JWT guard for flexible auth status checking

### File Security
- **Upload Validation**: File type, size, and content validation (client and server-side)
- **Google Drive Security**: Files encrypted at rest and in transit by Google Workspace
- **Per-Employee Isolation**: Files stored in individual employee Google Drives
- **Access Control**: Files shared with "anyone with the link" for payroll access
- **Workspace Integration**: Leverages existing Google Workspace security policies
- **OAuth-based Access**: File operations use employee's OAuth tokens

### Data Protection
- **Database Encryption**: Sensitive data encrypted at rest
- **Connection Security**: TLS/SSL for all database connections
- **Audit Trail**: Soft deletes and timestamp tracking
- **Input Validation**: Comprehensive validation on both client and server

### Application Security
- **CORS Configuration**: Restricted to allowed origins
- **Rate Limiting**: API rate limiting to prevent abuse
- **SQL Injection Protection**: TypeORM parameterized queries
- **XSS Protection**: Input sanitization and CSP headers
- **CSRF Protection**: CSRF tokens for state-changing operations

## Deployment Architecture

### Environment Configuration
```bash
# Database
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=mavericks_claims
DATABASE_USER=claims_user
DATABASE_PASSWORD=secure_password

# Authentication & Google APIs
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
BACKEND_COOKIE_SECRET=secure_session_secret

# Application URLs
FRONTEND_BASE_URL=http://localhost:3000
BACKEND_BASE_URL=http://localhost:3001
```

### Monitoring & Logging
- **Application Logs**: Structured JSON logging with correlation IDs
- **Database Monitoring**: Query performance and connection pooling metrics
- **Google API Monitoring**: OAuth token refresh rates and API quota usage
- **Health Checks**: Liveness and readiness probes for all services

### Scalability Considerations
- **Horizontal Scaling**: Backend can scale horizontally
- **Database**: Connection pooling and read replicas for scaling reads
- **File Storage**: Google Drive leverages Google's global infrastructure
- **Caching**: Session storage in PostgreSQL (acceptable for current scale)
- **Google API Limits**: Handle quota limits for Drive API operations with proper error responses

## Development Workflow

### Local Development Setup
1. **Environment Setup**: Copy `.env.template` to `.env` and configure
2. **Dependencies**: `pnpm install` to install all workspace dependencies
3. **Database**: `make up` to start PostgreSQL with Docker
4. **Migrations**: `make db/data/up` to run migrations and seed data
5. **Development**: `pnpm run dev` to start all services with hot reload

### Code Quality
- **TypeScript**: Strict mode enabled across all workspaces
- **ESLint & Prettier**: Consistent code formatting and linting
- **Husky**: Pre-commit hooks for code quality checks
- **Testing**: Unit tests with Vitest, API tests in dedicated workspace
- **Type Safety**: Shared types package ensures consistency across services

## Shared Types System

The `@project/types` package provides type safety across workspaces. Changes here trigger rebuilds in dependent workspaces due to TurboRepo's dependency management.

## Database Configuration

TypeORM with migrations-first approach. Database config in `backend/src/db/database.config.ts` uses environment variables with defaults.

**Entity Management**: Entities are registered in `backend/src/db/entity-model.ts`

This architecture provides a robust, scalable foundation for the Mavericks Claim Submission system while fully leveraging the Google Workspace ecosystem for authentication, email, and file storage. The integration with Google Drive provides enhanced security through per-employee file isolation and eliminates the need for additional cloud storage infrastructure.