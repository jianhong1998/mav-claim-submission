# System Architecture

## Overview

The Mavericks Claim Submission System is a TurboRepo monorepo built for digital expense claim processing. It replaces manual email-based workflows with an automated system including claim submission, Google Drive document uploads, email notifications, and claim tracking.

## System Components

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
│   Google Drive  │    │   PostgreSQL    │    │   Google APIs   │
│   (Per Employee)│    │   Database      │    │ (Gmail + Drive) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Workspace Structure

- **`backend/`**: NestJS API server with TypeORM and PostgreSQL
- **`frontend/`**: Next.js 15 application with React 19, TailwindCSS, and TanStack Query
- **`packages/types/`**: Shared TypeScript types used across workspaces as `@project/types`
- **`api-test/`**: Integration/API testing suite using Vitest
- **Job Processing Service**: Asynchronous email processing using RabbitMQ (same codebase as backend)

## Backend Module Structure

Uses NestJS modules with feature-based organization:

- `src/modules/app/`: Main application module with health checks
- `src/modules/auth/`: Google OAuth authentication with session management
- `src/modules/email/`: Gmail API integration for sending emails
- `src/modules/claims/`: Claim submission and management (to be implemented)
- `src/modules/attachments/`: File upload and Google Drive integration (to be implemented)
- `src/modules/jobs/`: RabbitMQ job processing for async email sending (to be implemented)
- `src/modules/common/`: Shared utilities and base classes
- `src/db/`: Database entities, migrations, seeders
- `src/configs/`: Application configuration using `AppConfig` class

## Database Schema

### Existing Tables
- `users` table: User profiles with Google OAuth integration
- `oauth_tokens` table: OAuth tokens for Gmail and Drive API access

### New Tables Required
- `claims` table: Claim submissions with categories, amounts, and status tracking
- `attachments` table: File metadata with Google Drive file IDs and URLs
- `async_jobs` table: RabbitMQ job queue for email processing

All tables use:
- Soft delete support with audit timestamps
- UUID primary keys for security

## Frontend Structure

Next.js App Router with:

- `src/app/`: Pages using App Router
- `src/components/`: UI components (uses `ui/` for base components)
- `src/hooks/queries/`: TanStack Query hooks for API calls
- `src/lib/`: Utilities including `api-client.ts` for Axios configuration

### Key Pages (To be implemented)
- `/claims` - Claims list with filtering and pagination
- `/claims/new` - New claim submission form
- `/claims/[id]` - Claim details and status management

## Technology Stack

- **Framework**: NestJS 11 with TypeScript
- **Database**: PostgreSQL with TypeORM
- **Authentication**: Passport.js with Google OAuth 2.0 strategy  
- **Session Management**: express-session with PostgreSQL store
- **Email Integration**: Google Gmail API with OAuth 2.0
- **File Storage**: Google Drive API v3 with per-employee storage
- **Job Queue**: RabbitMQ for asynchronous email processing
- **Validation**: class-validator and class-transformer
- **Testing**: Vitest for unit tests
- **Development**: Nodemon with hot reload

## Shared Types System

The `@project/types` package provides type safety across workspaces. Changes here trigger rebuilds in dependent workspaces due to TurboRepo's dependency management.

## Database Configuration

TypeORM with migrations-first approach. Database config in `backend/src/db/database.config.ts` uses environment variables with defaults.

**Entity Management**: Entities are registered in `backend/src/db/entity-model.ts`