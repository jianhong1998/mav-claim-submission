# Development Commands

## TurboRepo Commands (Preferred)

```bash
# Development
pnpm run dev           # Start all workspaces in development
pnpm run build         # Build all workspaces with caching
pnpm run lint          # Lint all workspaces
pnpm run lint:fix      # Fix linting issues
pnpm run format        # Format all code

# Workspace filtering
pnpm run build --filter=frontend    # Build only frontend
pnpm run dev --filter=backend       # Run only backend
```

## Make Commands (Docker & Database)

```bash
# Docker services
make up/build          # Docker: build and start all services
make up                # Docker: start existing services
make down              # Docker: stop services
make down/clean        # Docker: stop and clean volumes

# Testing
make test/unit         # Backend unit tests
make test/api          # API integration tests

# Database operations
make db/data/up        # Run database seeders
make db/data/down      # Remove seeded data
make db/data/reset     # Reset and reseed database
```

## Backend Development

```bash
cd backend

# Development
pnpm run dev           # Development with watch (watches types package too)
pnpm run test          # Unit tests with Vitest

# Database migrations
pnpm run migration:generate --name=MigrationName
pnpm run migration:run
pnpm run seed:run

# Required for claims system
pnpm run migration:generate --name=CreateClaimsTable
pnpm run migration:generate --name=CreateAttachmentsTable  
pnpm run migration:generate --name=CreateAsyncJobsTable
```

## Frontend Development

```bash
cd frontend

# Development
pnpm run dev           # Next.js with Turbopack
pnpm run build         # Production build with Turbopack
```

## RabbitMQ Setup

```bash
# Local RabbitMQ for job processing
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management-alpine

# Job processor (same backend codebase, different entry point)
make job-processor  # Runs backend with job processing mode
```

## Testing Commands

```bash
# Backend unit tests
cd backend && pnpm run test

# API integration tests  
cd api-test && pnpm run test

# Run specific test
cd backend && pnpm run test -- --grep "specific test name"
```

## Code Quality

```bash
# Format and lint (run after code changes)
make format
make lint

# TypeScript compilation check
pnpm run build
```

## Environment Setup

```bash
# Initial setup
cp .env.template .env  # Configure environment variables
pnpm install          # Install dependencies
make up               # Start Docker services
make db/data/up       # Run migrations and seed data
pnpm run dev          # Start development servers
```

## Google Drive Integration Testing

```bash
# Test OAuth scopes include Drive API access
# Verify in Google Cloud Console:
# - Gmail API enabled
# - Google Drive API enabled
# - OAuth 2.0 credentials configured
# - Authorized redirect URIs set

# Test file upload workflow
# 1. Login with Google OAuth
# 2. Upload test file to verify Drive API access
# 3. Check folder creation: "Mavericks Claims"
# 4. Verify file sharing permissions
```

## Development Workflow

### Local Development Setup

1. **Environment Setup**: Copy `.env.template` to `.env` and configure
2. **Dependencies**: `pnpm install` to install all workspace dependencies
3. **Database**: `make up` to start PostgreSQL with Docker
4. **Migrations**: `make db/data/up` to run migrations and seed data
5. **Development**: `pnpm run dev` to start all services with hot reload

### Code Quality Checks

Always run before committing:
```bash
make format    # Format code
make lint      # Check linting
pnpm run build # Verify TypeScript compilation
```

### Database Development

```bash
# Migration workflow
pnpm run migration:generate --name=DescriptiveName
# Review generated migration in backend/src/db/migrations/
pnpm run migration:run

# Seeding
make db/data/up    # From root
# OR
cd backend && pnpm run seed:run
```

## Troubleshooting

### Common Issues

**Port conflicts**: Check if ports 3000, 3001, 5432 are available
**Database connection**: Ensure PostgreSQL is running via `make up`
**TypeScript errors**: Run `pnpm run build` to check for compilation issues
**Google API issues**: Verify OAuth configuration in Google Cloud Console

### Reset Environment

```bash
make down/clean    # Stop and clean all Docker volumes
make up/build      # Rebuild and restart services
make db/data/up    # Reinitialize database
```