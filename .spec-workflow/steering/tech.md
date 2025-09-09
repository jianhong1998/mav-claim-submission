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
│   ├── src/entities/     # TypeORM database entities
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
- Stores OAuth tokens for Google API access
- Links to claims and file permissions

**Claims Entity** 
- Status flow: `draft → sent ↔ paid`
- Categories using Object.freeze() pattern (not TypeScript enum)
- Validation constraints for amounts and dates
- Immutable audit trail

**Attachments Entity**
- Google Drive file metadata only (no binary storage)
- Shareable URL generation for email workflows
- Permission tracking via Google Drive API

**OAuth Tokens Entity**
- Secure token storage for Google API access
- Refresh token management
- Scope validation (Gmail + Drive)

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
```

## Google API Integration

### Authentication Flow
1. Frontend initiates Google OAuth with required scopes
2. Backend validates @mavericks-consulting.com domain
3. OAuth tokens stored securely with refresh capability
4. API calls use stored tokens with proper error handling

### File Handling Strategy
- **Client-Side Uploads**: Browser directly uploads to Google Drive
- **Backend Metadata**: Only file references and permissions
- **No Binary Storage**: Eliminates S3 costs and data migration
- **Shareable URLs**: Generated via Google Drive API for email

### Email Processing
- **Synchronous**: Immediate Gmail API calls (no queuing)
- **No Attachments**: Use shareable Google Drive URLs
- **Error Handling**: Proper fallbacks for API failures

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

### Authentication
- Google OAuth with domain restrictions (@mavericks-consulting.com)
- JWT tokens for session management
- Proper scope validation for Google APIs

### Data Protection
- Employee file ownership (no backend file storage)
- Audit trails for all claim operations
- Secure OAuth token storage with encryption

### API Security
- Input validation with DTOs
- Rate limiting on endpoints
- CORS configuration for frontend integration

## Migration & Deployment

### Environment Variables
```bash
DATABASE_URL=postgresql://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### Deployment Strategy
- **Database Migrations**: TypeORM migrations with rollback support
- **Google Cloud Console**: Gmail API + Drive API enabled
- **Environment Separation**: Development, staging, production configs

## Technical Debt & Future Considerations

### Current Limitations
- Synchronous email processing (no retry mechanisms)
- Single tenant design (Mavericks-specific)
- Limited offline support

### Evolution Path
- Multi-tenant architecture for other consulting firms
- Background job processing with queues
- Enhanced mobile app with offline capabilities
- Integration with accounting systems (QuickBooks, Xero)