# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Overview

**Mavericks Claim Submission System** - A TurboRepo monorepo for digital expense claim processing that replaces manual email workflows. Built with NestJS backend, Next.js frontend, Google Drive file storage, and synchronous Gmail email processing.

## Architecture & Requirements

📋 **[System Architecture](docs/project-info/architecture.md)** - TurboRepo structure, components, database schema, and technology stack

🏢 **[Business Logic](docs/project-info/business-logic.md)** - Claim categories, validation rules, status flows, and Google Drive integration requirements

🔗 **[API Endpoints](docs/project-info/api-endpoints.md)** - Authentication, email, and claims management endpoints (existing and planned)

☁️ **[Google Drive Integration](docs/project-info/google-drive-integration.md)** - Client-side uploads, file organization, and email workflow

⚡ **[Development Commands](docs/project-info/development-commands.md)** - TurboRepo, Make, testing, and setup commands

## Key Development Patterns

### Workspace Structure

```
backend/          # NestJS API with Google OAuth & Gmail
frontend/         # Next.js with dark mode & mobile responsive
packages/types/   # Shared TypeScript types as @project/types
api-test/         # Integration testing suite
```

### Essential Commands

```bash
# Development
pnpm run dev           # Start all workspaces
make format && make lint  # Always run after code changes

# Database
make up                # Start PostgreSQL
make db/data/up        # Run migrations & seed data
pnpm run migration:generate --name=Name  # Create migration

# Testing
make test/unit         # Backend unit tests
make test/api          # API integration tests
```

### Google Workspace Integration

- **Authentication**: Google OAuth with @mavericks-consulting.com domain
- **File Storage**: Employee's personal Google Drive (not S3)
- **Email**: Gmail API with shareable Drive URLs (no attachments)
- **Required Scopes**: Gmail send + Drive file access

### Critical Implementation Notes

**Google Drive Client-Side Uploads**: Files upload directly from browser to employee's Google Drive using OAuth tokens. Backend only handles metadata.

**Synchronous Email Processing**: Gmail API sends emails immediately with Google Drive shareable URLs instead of file attachments.

**Claim Status Flow**: `draft → sent ↔ paid`

**Dark Mode Only**: UI exclusively uses dark theme with mobile-responsive design.

## TypeScript Standards

- **Strict mode enabled** across all workspaces
- **No `any` types** - always use proper typing
- **Shared types**: Import from `@project/types` for cross-workspace consistency
- **Path aliases**: Backend uses `src/` prefix, frontend uses `@/` prefix
- **Enum Pattern**: Use `Object.freeze()` with `as const` instead of TypeScript `enum`

### Enum Implementation Pattern

**❌ Avoid TypeScript `enum`:**
```typescript
// DON'T use this pattern
export enum ClaimCategory {
  TELCO = 'telco',
  FITNESS = 'fitness',
}
```

**✅ Prefer `Object.freeze()` with `as const`:**
```typescript
// USE this pattern instead
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

**Benefits of `Object.freeze()` pattern:**
- Better tree-shaking support
- More predictable JavaScript output
- Avoids TypeScript enum pitfalls
- Compatible with const assertions
- Better integration with module systems

## Environment Variables

Managed from root `.env` file:

- `DATABASE_*`: PostgreSQL settings
- `GOOGLE_CLIENT_ID/SECRET`: OAuth credentials
- **Required**: Gmail API and Google Drive API enabled in Google Cloud Console

## Special App Requirements

- For claim features, refer to detailed requirements in `docs/specifications/002/`
- Google Drive integration must use client-side uploads with OAuth tokens
- Email processing must be synchronous using Gmail API
- UI must support dark mode and mobile responsiveness only

## Current Status

✅ **Implemented**: 
- **Database Layer**: Complete entity models with proper relationships:
  - User entity with Google OAuth integration
  - Claims entity with categories, status flow, and validation constraints
  - Attachments entity with Google Drive file metadata
  - OAuth tokens entity for Google API access
- **Database Utilities**: Full CRUD operations for all entities with TypeORM
- **Business Logic**: Claim categories, status enums using Object.freeze() pattern
- **Architecture**: TurboRepo monorepo with NestJS backend, Next.js frontend
- **Testing**: Vitest unit testing setup with coverage reporting
- **Development Tools**: ESLint, Prettier, TypeScript strict mode across workspaces

🚧 **In Development**: 
- **API Endpoints Refactor**: New standardized DTO structure across all modules:
  - Auth endpoints with proper response DTOs (logout, profile, refresh, status)
  - Drive endpoints with structured response DTOs (access check, file operations, permissions)
  - Email endpoints with request/response DTOs (access check, send operations)
- **Swagger Integration**: API documentation with OpenAPI specifications
- **Controllers & Services**: Implementation of business logic layers

📋 **Next Phase**: 
- Complete API endpoint implementations and testing
- Google Drive client-side integration with OAuth flow  
- Frontend claim submission and management interfaces
- Email notification templates and workflows

## Development Practices

- Always use agents if suitable for the task
- Always run `make format` and `make lint` after code changes
- always format code with command `make format` before running lint check
- Always pause and prompt user to run services (including backend, frontend and database). Do not run service yourself.