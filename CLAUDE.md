# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Overview

**Mavericks Claim Submission System** - A TurboRepo monorepo for digital expense claim processing that replaces manual email workflows. Built with NestJS backend, Next.js frontend, Google Drive file storage, and RabbitMQ job processing.

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

**Google Drive Client-Side Uploads**: Files upload directly from browser to employee's Google Drive using OAuth tokens. Backend only handles metadata and verification.

**Async Email Processing**: RabbitMQ jobs send emails with Google Drive shareable URLs instead of file attachments. Jobs run in separate Docker container.

**Claim Status Flow**: `draft → sent ↔ paid` or `draft → failed → sent ↔ paid`

**Dark Mode Only**: UI exclusively uses dark theme with mobile-responsive design.

## TypeScript Standards

- **Strict mode enabled** across all workspaces
- **No `any` types** - always use proper typing
- **Shared types**: Import from `@project/types` for cross-workspace consistency
- **Path aliases**: Backend uses `src/` prefix, frontend uses `@/` prefix

## Environment Variables

Managed from root `.env` file:

- `DATABASE_*`: PostgreSQL settings
- `GOOGLE_CLIENT_ID/SECRET`: OAuth credentials
- `RABBITMQ_*`: Job queue settings
- **Required**: Gmail API and Google Drive API enabled in Google Cloud Console

## Special App Requirements

- For claim features, refer to detailed requirements in `docs/specifications/002/`
- Google Drive integration must use client-side uploads with OAuth tokens
- Email processing must be asynchronous using RabbitMQ
- UI must support dark mode and mobile responsiveness only

## Current Status

✅ **Implemented**: Google OAuth authentication, Gmail API integration, user management, database foundation

🚧 **In Development**: Claim submission system, Google Drive integration, RabbitMQ job processing

📋 **Next Phase**: Frontend claim forms, attachment uploads, email templates, status management

## Development Practices

- Always use agents if suitable for the task
- Always run `make format` and `make lint` after code changes
