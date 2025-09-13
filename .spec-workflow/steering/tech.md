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
│   │   ├── user/         # User management module
│   │   │   ├── entities/ # User entity
│   │   │   └── ...       # User-related logic
│   │   └── claims/       # Claims module
│   │       ├── entities/ # Claims, attachments entities
│   │       └── ...       # Claims-related logic
│   └── src/shared/       # Common utilities and DTOs
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
- Status flow: `draft → sent ↔ paid`
- Categories using Object.freeze() pattern (not TypeScript enum)
- Validation constraints for amounts and dates
- Immutable audit trail
- Stored in `src/modules/claims/entities/claim.entity.ts`

**Attachments Entity**
- Google Drive file metadata only (no binary storage)
- Shareable URL generation for email workflows
- Permission tracking via Google Drive API
- Stored in `src/modules/claims/entities/attachment.entity.ts`

**OAuth Tokens Entity**
- Secure token storage for Google API access
- Refresh token management
- Scope validation (Gmail + Drive)
- Stored in `src/modules/auth/entities/oauth-token.entity.ts`

### Data Flow Pattern

1. **Authentication**: Google OAuth → User creation/login
2. **File Upload**: Browser → Google Drive (client-side)
3. **Metadata Sync**: Frontend → Backend (file references)
4. **Email Processing**: Backend → Gmail API (synchronous)

## TypeScript Standards

### Strict Configuration
- **No `any` types**: Enforced across all workspaces
- **Shared types**: `@project/types` for cross-workspace consistency
- **Path aliases**: `src/` (backend), `@/` (frontend)
- **Build validation**: TypeScript strict mode in CI/CD

### Enum Pattern (Critical)
```typescript
// ❌ AVOID: TypeScript enum
export enum ClaimCategory {
  TELCO = 'telco',
}

// ✅ USE: Object.freeze() with as const
export const ClaimCategory = Object.freeze({
  TELCO: 'telco',
  FITNESS: 'fitness',
  DENTAL: 'dental',
  COMPANY_EVENT: 'company-event',
  COMPANY_LUNCH: 'company-lunch',
  COMPANY_DINNER: 'company-dinner',
  OTHERS: 'others',
} as const);
export type ClaimCategory = (typeof ClaimCategory)[keyof typeof ClaimCategory];
```

**Benefits**: Better tree-shaking, predictable JS output, module compatibility

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
- **No Attachments**: Use shareable Google Drive URLs
- **Error Handling**: Proper fallbacks for API failures

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