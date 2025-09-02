# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

This is a **TurboRepo monorepo** for a claim submission application with the following structure:

- **`backend/`**: NestJS API server with TypeORM and PostgreSQL
- **`frontend/`**: Next.js 15 application with React 19, TailwindCSS, and TanStack Query
- **`packages/types/`**: Shared TypeScript types used across workspaces as `@project/types`
- **`api-test/`**: Integration/API testing suite using Vitest

### Key Architectural Patterns

**Shared Types System**: The `@project/types` package provides type safety across workspaces. Changes here trigger rebuilds in dependent workspaces.

**Backend Module Structure**: Uses NestJS modules with feature-based organization:

- `src/modules/app/`: Main application module with health checks
- `src/modules/auth/`: Google OAuth authentication with session management
- `src/modules/email/`: Gmail API integration for sending emails
- `src/modules/common/`: Shared utilities and base classes
- `src/db/`: Database entities, migrations, seeders
- `src/configs/`: Application configuration using `AppConfig` class

**Implemented Features**:

- **Authentication System**: Google OAuth 2.0 with session-based authentication
  - Google OAuth strategy with Passport.js
  - User registration and login via Google
  - Session management with express-session
  - Token refresh capability
  - User profile management

- **Email Integration**: Gmail API for sending emails
  - OAuth token-based Gmail access
  - Email sending with HTML support
  - Token refresh for expired Gmail access
  - Access validation endpoints

- **Database Schema**:
  - `users` table: User profiles with Google OAuth integration
  - `oauth_tokens` table: OAuth tokens for Gmail API access
  - Soft delete support with audit timestamps
  - UUID primary keys for security

**Frontend Structure**: Next.js App Router with:

- `src/app/`: Pages using App Router
- `src/components/`: UI components (uses `ui/` for base components)
- `src/hooks/queries/`: TanStack Query hooks for API calls
- `src/lib/`: Utilities including `api-client.ts` for Axios configuration

**Database Configuration**: TypeORM with migrations-first approach. Database config in `backend/src/db/database.config.ts` uses environment variables with defaults.

**Technology Stack**:
- **Framework**: NestJS 11 with TypeScript
- **Database**: PostgreSQL with TypeORM
- **Authentication**: Passport.js with Google OAuth 2.0 strategy  
- **Session Management**: express-session with PostgreSQL store
- **Email Integration**: Google Gmail API with OAuth 2.0
- **Validation**: class-validator and class-transformer
- **Testing**: Vitest for unit tests
- **Development**: Nodemon with hot reload

## Development Commands

### TurboRepo Commands (Preferred)

```bash
pnpm run dev           # Start all workspaces in development
pnpm run build         # Build all workspaces with caching
pnpm run lint          # Lint all workspaces
pnpm run lint:fix      # Fix linting issues
pnpm run format        # Format all code

# Workspace filtering
pnpm run build --filter=frontend    # Build only frontend
pnpm run dev --filter=backend       # Run only backend
```

### Make Commands (Docker & Database)

```bash
make up/build          # Docker: build and start all services
make up                # Docker: start existing services
make down              # Docker: stop services
make down/clean        # Docker: stop and clean volumes

make test/unit         # Backend unit tests
make test/api          # API integration tests

make db/data/up        # Run database seeders
make db/data/reset     # Reset and reseed database
```

### Backend Development

```bash
cd backend
pnpm run dev           # Development with watch (watches types package too)
pnpm run test          # Unit tests with Vitest
pnpm run migration:generate --name=MigrationName
pnpm run migration:run
pnpm run seed:run
```

## API Endpoints

### Authentication (`/auth`)
- `GET /auth/google` - Initiate Google OAuth flow
- `GET /auth/google/callback` - Handle Google OAuth callback
- `GET /auth/profile` - Get authenticated user profile
- `POST /auth/logout` - Logout and clear session
- `GET /auth/status` - Check authentication status
- `POST /auth/refresh` - Refresh OAuth tokens

### Email (`/email`)
- `POST /email/send` - Send email via Gmail API (requires authentication)
- `POST /email/check-access` - Check Gmail API access status
- `POST /email/refresh-token` - Refresh Gmail OAuth token

All endpoints support session-based authentication and include test bypass headers for development.

### Frontend Development

```bash
cd frontend
pnpm run dev           # Next.js with Turbopack
pnpm run build         # Production build with Turbopack
```

## TypeScript Configuration

- **Strict mode enabled** across all workspaces
- **No `any` types** - always use proper typing
- **Shared types**: Import from `@project/types` for cross-workspace types
- **Path aliases**: Backend uses `src/` prefix, frontend uses `@/` prefix

## Database Operations

**Migration Workflow**:

1. Generate: `pnpm run migration:generate --name=Description`
2. Review generated migration in `backend/src/db/migrations/`
3. Run: `pnpm run migration:run`

**Entity Management**: Entities are registered in `backend/src/db/entity-model.ts`

**Seeding**: Use `make db/data/up` or `pnpm run seed:run` from backend directory

## Testing Strategy

- **Backend**: Unit tests with Vitest (`*.spec.ts` files)
- **API Tests**: Integration tests in `api-test/` workspace
- **TurboRepo Caching**: Tests benefit from intelligent caching based on file changes

## Environment Variables

Environment variables are managed from the root `.env` file and shared across workspaces:

- `DATABASE_*`: PostgreSQL connection settings
- `BACKEND_PORT`: API server port (default: 3001)
- `FRONTEND_PORT`: Frontend port (default: 3000)
- `BACKEND_COOKIE_SECRET`: Session security
- `FRONTEND_BACKEND_BASE_URL`: API endpoint for frontend
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `FRONTEND_BASE_URL`: Frontend URL for OAuth redirects

**Required for Google OAuth and Gmail Integration**:
- Configure Google Cloud Console with OAuth 2.0 credentials
- Enable Gmail API access
- Set authorized redirect URIs for OAuth flow

## Workspace Dependencies

When adding dependencies:

- **Shared types**: Always in `packages/types/`
- **Backend specific**: Add to `backend/package.json`
- **Frontend specific**: Add to `frontend/package.json`
- **Cross-workspace types**: Import as `@project/types`

Changes to shared types automatically trigger rebuilds in dependent workspaces due to TurboRepo's dependency management.

## Code Standards

- **ESLint & Prettier**: Configured consistently across all workspaces
- **Commit messages**: Follow conventional commit format without AI tool attribution
- **Module imports**: Use absolute paths with configured aliases
- **Database**: Always use migrations, never synchronize in production
- **Error handling**: Use proper NestJS exception filters and Next.js error boundaries

# Special Instructions
- always use agents if there is suitable agent for the task
- always run `make format` and `make lint` command after modifying of codebase