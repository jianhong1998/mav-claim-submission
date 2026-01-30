# Technical Steering Guide

## Architecture Overview

**Mavericks Claim Submission System** follows a modern TurboRepo monorepo architecture with NestJS backend, Next.js frontend, and deep Google Workspace integration. The system prioritizes type safety, developer experience, and scalable patterns.

## Technology Stack

### Core Technologies
- **Monorepo**: TurboRepo for workspace management and build orchestration
- **Backend**: NestJS with TypeORM for robust API development
- **Frontend**: Next.js with dark mode and mobile-responsive design
- **Database**: PostgreSQL for relational data with ACID compliance
- **Testing**: Vitest for unit testing, custom API test suite for integration
- **Linting**: ESLint + Prettier with TypeScript strict mode

### External Integrations
- **Authentication**: Google OAuth 2.0 with domain restrictions
- **File Storage**: Google Drive API (client-side uploads)
- **Email**: Gmail API (synchronous sending)
- **Documentation**: Swagger/OpenAPI integration

## Workspace Architecture

```
mav-claim-submission/
├── backend/              # NestJS API server
│   ├── src/modules/      # Feature modules (auth, claims, drive, email)
│   │   ├── auth/         # Authentication module
│   │   │   ├── entities/ # OAuth tokens, auth-related entities
│   │   │   └── ...       # Controllers, services, etc.
│   │   ├── claim-category/ # Database-driven categories and limits
│   │   ├── user/         # User profile, email preferences
│   │   ├── internal/     # Test data endpoints (feature-flagged)
│   │   └── common/       # Shared utilities, base classes
│   └── src/configs/      # Application configuration
├── frontend/             # Next.js web application
│   ├── src/app/          # App Router pages and layouts
│   ├── src/components/   # Reusable UI components
│   └── src/lib/          # Client utilities and API calls
├── packages/types/       # Shared TypeScript types (@project/types)
├── api-test/            # Integration test suite
└── docs/                # Project documentation
```

## Database Design

### Core Entities

**User Entity**
- Google OAuth integration with @mavericks-consulting.com domain
- Stored in `src/modules/user/entities/user.entity.ts`
- Links to claims and file permissions

**Claims Entity**
- **Critical Workflow**: Claims created immediately in 'draft' state to provide UUID for file uploads
- Status flow: `draft → sent ↔ paid`, `failed → resend`
- `category_id` FK to `claim_categories` table (database-driven, not hard-coded enum)
- Validation constraints for amounts and dates
- Category-specific limits (monthly/yearly) validated at claim creation/update
- Immutable audit trail with timestamps
- Stored in `src/modules/claims/entities/claim.entity.ts`

**Claim Category Entity**
- Database-driven categories with configurable limits
- `claim_categories` table: code, name, isEnabled, soft delete
- `claim_category_limits` table: one-to-one, type (monthly/yearly), amount in SGD cents
- New categories can be added without code changes
- Stored in `src/modules/claim-category/entities/`

**Attachments Entity**
- Google Drive file metadata only (no binary storage)
- Files organized in `Mavericks Claims/{claimUuid}/` folder structure
- Shareable URL generation for email workflows
- Permission tracking via Google Drive API
- Must link to existing claim UUID (foreign key constraint)
- Stored in `src/modules/claims/entities/attachment.entity.ts`

**OAuth Tokens Entity**
- Secure token storage for Google API access
- Refresh token management
- Scope validation (Gmail + Drive)
- Stored in `src/modules/auth/entities/oauth-token.entity.ts`

### Data Flow Pattern

**CRITICAL: Sequential 3-Phase Workflow**
1. **Claim Creation**: Frontend form submission → Backend creates claim record (status: 'draft') → Returns claim UUID
2. **File Upload**: Browser uses claim UUID → Upload to `Mavericks Claims/{claimUuid}/` → Send metadata to backend
3. **Email Processing**: Backend validates all files uploaded → Gmail API send → Update claim status to 'sent'

**Authentication Flow**: Google OAuth → User creation/login (prerequisite for all operations)

## TypeScript Standards

### Strict Configuration
- **No `any` types**: Enforced across all workspaces
- **Shared types**: `@project/types` for cross-workspace consistency
- **Path aliases**: `src/` (backend), `@/` (frontend)
- **Build validation**: TypeScript strict mode in CI/CD

### Enum Pattern (Critical)
```typescript
// ❌ AVOID: TypeScript enum
export enum ClaimStatus {
  DRAFT = 'draft',
}

// ✅ USE: Object.freeze() with as const
export const ClaimStatus = Object.freeze({
  DRAFT: 'draft',
  SENT: 'sent',
  PAID: 'paid',
  FAILED: 'failed',
} as const);
export type ClaimStatus = (typeof ClaimStatus)[keyof typeof ClaimStatus];
```

**Benefits**: Better tree-shaking, predictable JS output, module compatibility

**Note**: `ClaimCategory` was migrated from Object.freeze enum to database-driven (`claim_categories` table). Categories are now fetched via `GET /claim-categories` API.

## API Design Patterns

### DTO Structure (In Development)
- **Request DTOs**: Input validation with class-validator
- **Response DTOs**: Consistent API responses across modules
- **Swagger Integration**: Auto-generated API documentation

### Module Pattern
```typescript
auth/
├── controllers/auth.controller.ts    # HTTP endpoints
├── services/auth.service.ts          # Business logic
├── dtos/                            # Request/response types
│   ├── auth-logout-response.dto.ts
│   ├── auth-profile-response.dto.ts
│   └── index.ts                     # Barrel exports
└── entities/                        # Database models
    └── oauth-token.entity.ts
```

## Google API Integration

### Authentication Flow Implementation Details

**OAuth Strategy Configuration**
- **Client Setup**: Google OAuth2 strategy with passport-google-oauth20
- **Scopes**: `['profile', 'email', 'https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/drive.file']`
- **Authorization Parameters**: `access_type: 'offline', prompt: 'consent'` for refresh token
- **Domain Validation**: Hard-coded `@mavericks-consulting.com` restriction in GoogleOAuthStrategy.validate()

**Session Management**
- **JWT Tokens**: Generated by TokenService with 24-hour expiry
- **Cookie Configuration**: HttpOnly, secure in production, sameSite: 'lax', 24-hour maxAge
- **Token Storage**: Encrypted OAuth tokens in PostgreSQL with automatic refresh

**Rate Limiting Configuration**
- **OAuth Initiate**: 10 requests per minute per IP
- **OAuth Callback**: 20 requests per minute per IP  
- **General Auth**: 100 requests per minute per IP
- **Test Mode**: Unlimited for NODE_ENV=test or API_TEST_MODE=true

### File Handling Strategy
- **Client-Side Uploads**: Browser directly uploads to Google Drive
- **Backend Metadata**: Only file references and permissions
- **No Binary Storage**: Eliminates S3 costs and data migration
- **Shareable URLs**: Generated via Google Drive API for email

### Email Processing
- **Synchronous**: Immediate Gmail API calls (no queuing)
- **Hybrid Attachments** (ADR-003): Files <5MB sent as email attachments, >=5MB as shareable Drive URLs
- **Email Preview**: Draft claims can be previewed before submission (no external API calls)
- **Error Handling**: Proper fallbacks for API failures, automatic fallback to Drive links on download failure

### Token Management Implementation
- **Automatic Refresh**: Tokens refreshed on expiry using googleapis OAuth2 client
- **Fallback Logic**: Reuse existing refresh tokens if new ones not provided
- **Scope Tracking**: Store and validate required scopes in database
- **Hard Delete**: Remove existing tokens before creating new ones to avoid constraints

## Development Workflow

### Commands
```bash
# Development
pnpm run dev           # All workspaces
make format && make lint # Code quality (mandatory)

# Database
make up                # PostgreSQL container
make db/data/up        # Migrations + seed data

# Testing
make test/unit         # Backend unit tests
make test/api          # Integration tests
```

### Quality Gates
- **Pre-commit**: ESLint + Prettier + TypeScript compilation
- **CI/CD**: Unit tests + integration tests + build verification
- **Code Review**: Type safety + Google API patterns

## Performance Considerations

### Critical Paths
- **Claim Submission**: <2 second response time
- **Google Drive Upload**: Progress indicators for large files
- **Email Sending**: Synchronous with proper timeout handling

### Scalability Patterns
- **Database Indexing**: Claims by user_id, created_at
- **API Rate Limiting**: Google API quotas with exponential backoff
- **Connection Pooling**: PostgreSQL connection management

## Security Requirements

### Authentication Implementation
- **Google OAuth**: Domain restrictions to @mavericks-consulting.com enforced in strategy
- **JWT Session**: 24-hour expiry with HttpOnly cookies
- **Token Encryption**: OAuth tokens encrypted at rest in PostgreSQL
- **Scope Validation**: Required scopes verified during token storage

### Data Protection
- **Employee File Ownership**: Files remain in employee's personal Google Drive
- **Audit Trails**: All claim operations logged with timestamps
- **Token Security**: Secure storage with automatic cleanup on logout

### API Security
- **Input Validation**: DTOs with class-validator decorators
- **Rate Limiting**: Throttler guards on all endpoints with different limits
- **CORS Configuration**: Restricted origins for frontend integration

## Migration & Deployment

### Environment Variables
```bash
DATABASE_URL=postgresql://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:8080/api/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

### Deployment Strategy
- **Database Migrations**: TypeORM migrations with rollback support
- **Google Cloud Console**: Gmail API + Drive API enabled
- **Environment Separation**: Development, staging, production configs

## Technical Debt & Future Considerations

### Current Limitations
- **Synchronous Email Processing**: No retry mechanisms for failed sends
- **Single Tenant Design**: Mavericks-specific domain hardcoded
- **Limited Offline Support**: No cache for failed network requests

### Evolution Path
- **Multi-tenant Architecture**: Configurable domain restrictions
- **Background Job Processing**: Queue system for email sending
- **Enhanced Mobile App**: Offline capabilities with sync
- **Integration APIs**: QuickBooks, Xero accounting system connectors