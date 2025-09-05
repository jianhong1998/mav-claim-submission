# Mavericks Claim Submission System - Architecture Design

## System Overview

The Mavericks Claim Submission system is a comprehensive web application built on a TurboRepo monorepo architecture that enables employees to submit expense claims digitally. The system replaces the manual email-based process with an automated workflow that includes claim submission, document uploads, email notifications, and claim tracking.

### Core Components

1. **Frontend Application** - Next.js 15 with React 19 client application
2. **Backend API Server** - NestJS 11 REST API server  
3. **Job Processing Service** - Asynchronous email processing using RabbitMQ
4. **Database** - PostgreSQL with TypeORM
5. **File Storage** - AWS S3 with CloudFront CDN
6. **Shared Types Package** - Cross-workspace TypeScript type definitions

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │ Job Processing  │
│   (Next.js)     │◄──►│   (NestJS)      │◄──►│   Service       │
│   Port: 3000    │    │   Port: 3001    │    │  (RabbitMQ)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AWS S3 +      │    │   PostgreSQL    │    │   Google APIs   │
│   CloudFront    │    │   Database      │    │   (Gmail)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

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

### New Tables Required

#### claims
```sql
CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('telco', 'fitness', 'dental', 'skill_enhancement', 'company_event', 'company_lunch', 'company_dinner', 'others')),
    claim_name VARCHAR(255) NULL, -- Required only for 'others' category
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'failed', 'paid')),
    submission_date TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX idx_claims_user_id ON claims(user_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_category ON claims(category);
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
    file_path VARCHAR(1000) NOT NULL, -- S3 path including filename
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'failed')),
    upload_url TEXT NULL, -- Pre-signed URL (temporary)
    uploaded_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX idx_attachments_claim_id ON attachments(claim_id);
CREATE INDEX idx_attachments_status ON attachments(status);
```

#### async_jobs
```sql
CREATE TYPE job_type_enum AS ENUM ('send_claim_email', 'cleanup_expired_attachments');
CREATE TYPE job_status_enum AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');

CREATE TABLE async_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type job_type_enum NOT NULL,
    status job_status_enum NOT NULL DEFAULT 'pending',
    payload JSONB NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE NULL,
    completed_at TIMESTAMP WITH TIME ZONE NULL,
    failed_at TIMESTAMP WITH TIME ZONE NULL,
    error_message TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_async_jobs_status ON async_jobs(status);
CREATE INDEX idx_async_jobs_type ON async_jobs(type);
CREATE INDEX idx_async_jobs_scheduled_at ON async_jobs(scheduled_at);
CREATE INDEX idx_async_jobs_priority ON async_jobs(priority DESC);
```

### Database Relationships

```
users (1) ──┐
            ├── oauth_tokens (N)
            └── claims (N)

claims (1) ──┐
             ├── attachments (N)
             └── async_jobs (N) [via payload reference]
```

## API Design

### Authentication Endpoints (Existing)
- `GET /auth/google` - Initiate Google OAuth flow
- `GET /auth/google/callback` - Handle OAuth callback
- `GET /auth/profile` - Get user profile
- `POST /auth/logout` - Logout user
- `GET /auth/status` - Check auth status
- `POST /auth/refresh` - Refresh OAuth tokens

### Email Endpoints (Existing)
- `POST /email/send` - Send email via Gmail API
- `POST /email/check-access` - Check Gmail access
- `POST /email/refresh-token` - Refresh Gmail token

### New Claim Management Endpoints

#### Claim Submission
```typescript
// Create new claim with attachments metadata
POST /api/claims
Body: {
  category: ClaimCategoryEnum;
  claimName?: string; // Required for 'others'
  month: number; // 1-12
  year: number;
  totalAmount: number;
  attachments: Array<{
    originalFilename: string;
    fileSize: number;
    mimeType: string;
  }>;
}
Response: {
  claimId: string;
  attachments: Array<{
    attachmentId: string;
    uploadUrl: string; // Pre-signed CloudFront URL
    expiresAt: string;
  }>;
}
```

#### Attachment Management
```typescript
// Confirm attachment upload
POST /api/claims/:claimId/attachments/:attachmentId/confirm
Response: 200 | 404 (if file not found in S3)

// Get claim details
GET /api/claims/:claimId
Response: {
  id: string;
  category: ClaimCategoryEnum;
  claimName?: string;
  month: number;
  year: number;
  totalAmount: number;
  status: ClaimStatusEnum;
  submissionDate?: string;
  attachments: Array<{
    id: string;
    originalFilename: string;
    status: AttachmentStatusEnum;
    downloadUrl?: string; // Pre-signed download URL
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
Response: { jobId: string }
```

### File Upload Endpoints
```typescript
// Generate pre-signed upload URL
POST /api/files/upload-url
Body: {
  filename: string;
  fileSize: number;
  mimeType: string;
  claimId: string;
}
Response: {
  uploadUrl: string;
  expiresAt: string;
  attachmentId: string;
}
```

## File Upload Architecture

### AWS S3 Structure
```
mavericks-claims-bucket/
├── claims/
│   └── {claimUuid}/
│       └── attachments/
│           ├── jason_lee_company_dinner_2025_09_1725456123000.pdf
│           ├── jason_lee_company_dinner_2025_09_1725456124000.png
│           └── ...
└── temp/ (for cleanup of failed uploads)
```

### File Upload Flow
1. **Client Request**: Client sends POST to `/api/files/upload-url` with file metadata
2. **Backend Validation**: Validate file type, size, and user permissions
3. **Pre-signed URL Generation**: Generate CloudFront pre-signed URL with 15-minute expiry
4. **Database Record**: Create attachment record with `pending` status
5. **Client Upload**: Client uploads directly to CloudFront URL
6. **Upload Confirmation**: Client calls `/api/claims/:claimId/attachments/:attachmentId/confirm`
7. **Backend Verification**: Backend verifies file exists in S3
8. **Status Update**: Update attachment status to `uploaded`
9. **Job Trigger**: When all attachments uploaded, create async job for email sending

### File Naming Convention
Format: `{employee_name}_{claim_category}_{year}_{month}_{timestamp}.{extension}`
- `employee_name`: Lowercase, spaces replaced with underscores
- `claim_category`: Lowercase, spaces replaced with underscores  
- `year`: 4-digit year (e.g., 2025)
- `month`: 2-digit month (e.g., 09)
- `timestamp`: Unix timestamp in milliseconds
- `extension`: Original file extension

Example: `jason_lee_company_dinner_2025_09_1725456123000.pdf`

## Async Job Processing with RabbitMQ

### Architecture Components
- **Producer**: Backend API server creates jobs
- **Queue**: RabbitMQ message broker
- **Consumer**: Dedicated job processing service
- **Dead Letter Queue**: Failed jobs for manual inspection

### Job Types

#### Send Claim Email Job
```typescript
interface SendClaimEmailJobPayload {
  claimId: string;
  userId: string;
  retryCount: number;
}
```

#### Cleanup Expired Attachments Job
```typescript
interface CleanupAttachmentsJobPayload {
  olderThanHours: number;
  status: 'pending' | 'failed';
}
```

### Job Processing Flow

#### Email Sending Process
1. **Job Creation**: Backend creates `send_claim_email` job after all attachments uploaded
2. **Job Queue**: Job added to RabbitMQ with retry configuration
3. **Job Processing**: 
   - Fetch claim and user data from database
   - Get valid OAuth tokens for user's Gmail access
   - Refresh tokens if expired
   - Generate email from HTML template
   - Send email via Gmail API
   - Update claim status based on result
4. **Retry Logic**: Up to 3 retries with exponential backoff
5. **Failure Handling**: Mark claim as `failed` after max retries

#### Job Monitoring
```typescript
// Job status tracking
interface JobStatus {
  id: string;
  type: JobTypeEnum;
  status: JobStatusEnum;
  retryCount: number;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
}
```

### RabbitMQ Configuration
```typescript
// Queue configuration
const queueConfig = {
  emailQueue: {
    name: 'claim-emails',
    durable: true,
    deadLetterExchange: 'claim-emails-dlx',
    messageTtl: 3600000, // 1 hour
    maxRetries: 3
  },
  cleanupQueue: {
    name: 'cleanup-tasks',
    durable: true,
    schedule: '0 2 * * *' // Daily at 2 AM
  }
};
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
│   ├── auth/
│   │   └── callback/
│   │       └── page.tsx          # OAuth callback
│   ├── globals.css
│   ├── layout.tsx                # Root layout
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
│   │   ├── useAuthQuery.ts
│   │   └── useFileUpload.ts
│   └── useAuth.ts
└── lib/
    ├── api-client.ts
    ├── auth.ts
    ├── utils.ts
    └── validations.ts
```

### State Management Strategy
- **TanStack Query**: Server state management, caching, and synchronization
- **React Hook Form**: Form state and validation
- **React Context**: Authentication state and user context
- **Local State**: Component-specific UI state

### Key Components

#### ClaimForm Component
```typescript
interface ClaimFormProps {
  onSubmit: (data: ClaimFormData) => Promise<void>;
  initialData?: ClaimFormData;
  isSubmitting: boolean;
}

interface ClaimFormData {
  category: ClaimCategoryEnum;
  claimName?: string;
  month: number;
  year: number;
  totalAmount: number;
  attachments: File[];
}
```

#### FileUpload Component
```typescript
interface FileUploadProps {
  onFilesChange: (files: File[]) => void;
  maxFiles: number;
  maxSize: number; // In bytes
  acceptedTypes: string[];
  existingFiles?: AttachmentSummary[];
}
```

#### ClaimsList Component
```typescript
interface ClaimsListProps {
  filters: ClaimFilters;
  onFiltersChange: (filters: ClaimFilters) => void;
  pagination: PaginationState;
  onPaginationChange: (pagination: PaginationState) => void;
}
```

### User Flows

#### Claim Submission Flow
1. **Authentication**: User logs in via Google OAuth
2. **Form Entry**: User fills claim form with validation
3. **File Selection**: User selects files with client-side validation
4. **Preview**: User reviews claim details and attachments
5. **Submission**: Files uploaded to S3, claim created in database
6. **Confirmation**: User redirected to claims list with success message
7. **Background Processing**: Email job processed asynchronously

#### Claim Management Flow
1. **List View**: User sees paginated claims with filters
2. **Status Updates**: User can mark claims as paid/unpaid
3. **Detail View**: User can view claim details and download attachments
4. **Resend**: User can retry failed email sends

## Security Considerations

### Authentication & Authorization
- **Google OAuth 2.0**: Secure authentication with domain restriction (@mavericks-consulting.com)
- **Session Management**: Secure session cookies with HttpOnly and SameSite flags
- **Token Management**: Encrypted OAuth tokens in database
- **API Security**: Session-based authentication for all protected endpoints

### File Security
- **Upload Validation**: File type, size, and content validation
- **Pre-signed URLs**: Time-limited access (15 minutes) for uploads
- **S3 Security**: Files encrypted at rest (AES-256)
- **Access Control**: User can only access their own files
- **CloudFront**: Secure CDN with signed URLs for downloads

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

### Container Strategy
```yaml
# docker-compose.yml structure
services:
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    environment:
      - NEXT_PUBLIC_API_URL=${BACKEND_URL}
  
  backend:
    build: ./backend
    ports: ["3001:3001"]
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - RABBITMQ_URL=${RABBITMQ_URL}
    depends_on: [postgres, redis, rabbitmq]
  
  job-processor:
    build: ./backend # Same codebase, different entry point
    command: ["npm", "run", "start:jobs"]
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - RABBITMQ_URL=${RABBITMQ_URL}
    depends_on: [postgres, rabbitmq]
  
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=${DATABASE_NAME}
      - POSTGRES_USER=${DATABASE_USER}
      - POSTGRES_PASSWORD=${DATABASE_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
  
  rabbitmq:
    image: rabbitmq:3-management-alpine
    environment:
      - RABBITMQ_DEFAULT_USER=${RABBITMQ_USER}
      - RABBITMQ_DEFAULT_PASS=${RABBITMQ_PASSWORD}
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
```

### Environment Configuration
```bash
# Database
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=mavericks_claims
DATABASE_USER=claims_user
DATABASE_PASSWORD=secure_password

# Authentication
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
BACKEND_COOKIE_SECRET=secure_session_secret

# AWS Configuration
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=mavericks-claims-bucket
AWS_CLOUDFRONT_DOMAIN=your-cloudfront-domain.cloudfront.net

# RabbitMQ
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=claims_queue
RABBITMQ_PASSWORD=secure_queue_password

# Application URLs
FRONTEND_BASE_URL=http://localhost:3000
BACKEND_BASE_URL=http://localhost:3001
```

### Monitoring & Logging
- **Application Logs**: Structured JSON logging with correlation IDs
- **Database Monitoring**: Query performance and connection pooling metrics
- **Job Queue Monitoring**: RabbitMQ management interface and metrics
- **File Storage Monitoring**: S3 and CloudFront usage metrics
- **Health Checks**: Liveness and readiness probes for all services

### Scalability Considerations
- **Horizontal Scaling**: Backend and job processors can scale independently
- **Database**: Connection pooling and read replicas for scaling reads
- **File Storage**: CloudFront CDN for global file access
- **Queue Processing**: Multiple job processor instances for parallel processing
- **Caching**: Redis for session storage and query result caching

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

### Deployment Process
1. **Build**: `pnpm run build` to build all workspaces
2. **Test**: Run unit and integration tests
3. **Docker**: Build containerized services
4. **Migration**: Run database migrations in production
5. **Deploy**: Rolling deployment with health checks
6. **Monitoring**: Verify all services are healthy post-deployment

This architecture provides a robust, scalable foundation for the Mavericks Claim Submission system while leveraging the existing authentication and email infrastructure.