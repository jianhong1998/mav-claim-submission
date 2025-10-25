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

### Email Configuration

The system requires proper email configuration for claim submission workflows:

#### BACKEND_EMAIL_RECIPIENT (Required)

This environment variable configures where automated claim submission emails are sent.

**Configuration Examples:**

```bash
# Single recipient (development/testing)
BACKEND_EMAIL_RECIPIENT=admin@mavericks-consulting.com

# Multiple recipients (production)
BACKEND_EMAIL_RECIPIENT=admin@mavericks-consulting.com,hr@mavericks-consulting.com,finance@mavericks-consulting.com

# With spaces (automatically trimmed)
BACKEND_EMAIL_RECIPIENT=admin@mavericks-consulting.com, hr@mavericks-consulting.com
```

**Validation Requirements:**
- **Required**: System will fail to start if not configured
- **Format**: Must be valid email address(es)
- **Multiple**: Use comma-separated values for multiple recipients
- **Parsing**: Spaces around commas are automatically trimmed
- **Startup**: Email format validated at application startup

**Error Scenarios:**
```bash
# ❌ Invalid - will cause startup failure
BACKEND_EMAIL_RECIPIENT=invalid-email
BACKEND_EMAIL_RECIPIENT=user@domain,invalid-format

# ✅ Valid configurations
BACKEND_EMAIL_RECIPIENT=user@mavericks-consulting.com
BACKEND_EMAIL_RECIPIENT=admin@mavericks-consulting.com,finance@mavericks-consulting.com
```

### Google Drive Folder Configuration

The system requires environment-specific folder naming to organize claim files in Google Drive and prevent data mixing across environments.

#### BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME (Required)

This environment variable configures the root folder name in Google Drive where all claim folders are created. Each environment must use a unique folder name.

**Configuration Examples:**

```bash
# Production environment
BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME="Mavericks Claims"

# Staging environment (use prefix to separate from production)
BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME="[staging] Mavericks Claims"

# Local development (use developer-specific prefix)
BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME="[local] Mavericks Claims"
BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME="[local-alice] Mavericks Claims"

# Automated testing (use test prefix)
BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME="[test] Mavericks Claims"
```

**Validation Requirements:**
- **Required**: System crashes at startup if not configured
- **Format**: String value (Google Drive API validates folder name rules)
- **Startup Check**: Validated via `ConfigService.getOrThrow()` during application bootstrap
- **No Fallback**: No default value - must be explicitly set in `.env`

**Folder Hierarchy Created:**
```
Employee's Google Drive
└── [Configured Root Folder]           ← BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME
    ├── claim-2024-001/                ← Individual claim folders
    │   ├── receipt-1.pdf
    │   └── receipt-2.jpg
    ├── claim-2024-002/
    │   └── invoice.pdf
    └── claim-2024-003/
        ├── medical-bill.pdf
        └── supporting-doc.pdf
```

**Error Scenarios:**
```bash
# ❌ Missing variable - causes application crash
# Error: Configuration validation failed
# Message: BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME is required

# ❌ Empty string - also causes crash
BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME=""

# ✅ Valid configurations
BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME="Mavericks Claims"
BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME="[staging] Mavericks Claims"
BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME="[dev-bob] Mavericks Claims"
```

**Environment-Specific Setup:**

| Environment | Recommended Value                      | Purpose                                   |
| ----------- | -------------------------------------- | ----------------------------------------- |
| Production  | `"Mavericks Claims"`                   | Clean name for production claims          |
| Staging     | `"[staging] Mavericks Claims"`         | Separate staging data from production     |
| Local Dev   | `"[local] Mavericks Claims"`           | Prevent mixing with production data       |
| Developer   | `"[local-yourname] Mavericks Claims"`  | Individual developer isolation            |
| Testing     | `"[test] Mavericks Claims"`            | Automated test data (cleaned up after)    |

**Best Practices:**
- ✅ **DO** use environment prefixes for non-production environments
- ✅ **DO** include developer name in local development folders
- ✅ **DO** verify folder name in `.env` before starting application
- ✅ **DO** document folder naming convention in team onboarding
- ❌ **DON'T** use production folder name in development/testing
- ❌ **DON'T** use special characters that Google Drive doesn't support
- ❌ **DON'T** leave this variable unset - application will crash

**Troubleshooting:**

```bash
# Application crashes at startup with error about missing variable
# Solution: Add the variable to your .env file
echo 'BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME="[local] Mavericks Claims"' >> .env

# Verify configuration is loaded correctly
# Check logs for: "Environment Variables Loaded Successfully"
# Check logs for: "Google Drive folder name: [your-configured-value]"
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