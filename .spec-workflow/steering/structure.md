# Project Structure Steering Guide

## Repository Organization

**Mavericks Claim Submission System** follows TurboRepo monorepo patterns with clear separation of concerns, shared dependencies, and consistent development workflows.

## Root Structure

```
mav-claim-submission/
├── .spec-workflow/          # Specification workflow management
├── backend/                 # NestJS API server
├── frontend/                # Next.js web application  
├── packages/                # Shared packages
│   └── types/              # TypeScript type definitions
├── api-test/               # Integration testing suite
├── docs/                   # Project documentation
├── Makefile                # Development commands
├── turbo.json              # TurboRepo configuration
├── package.json            # Root package management
└── .env                    # Environment variables
```

## Backend Structure (`backend/`)

### NestJS Module Organization

```
backend/src/
├── modules/                 # Feature modules
│   ├── app/               # Root module, health checks
│   ├── auth/              # Google OAuth, JWT sessions, guards
│   ├── claims/            # Claim CRUD, validation, status flow
│   ├── claim-category/    # Database-driven categories and limits
│   ├── attachments/       # File metadata handling
│   ├── drive/             # Google Drive token endpoint
│   ├── email/             # Gmail API, templates, preview service
│   ├── user/              # User profile, email preferences
│   ├── internal/          # Test data endpoints (feature-flagged)
│   └── common/            # Shared utilities, base classes
├── db/                     # Database configuration
│   ├── migrations/        # TypeORM migrations
│   ├── seeders/           # Database seeders
│   └── entities/          # Entity registration
├── configs/               # Application configuration
├── app.module.ts          # Root application module
└── main.ts                # Application entry point
```

### Module Pattern (Standard)

Each feature module follows this structure:
```
module-name/
├── controllers/           # HTTP layer
│   └── module.controller.ts
├── services/             # Business logic layer  
│   └── module.service.ts
├── dtos/                 # Data transfer objects
│   ├── module-request.dto.ts
│   ├── module-response.dto.ts
│   └── index.ts         # Barrel exports
├── entities/            # Database entities (if applicable)
│   └── module.entity.ts
└── module.module.ts     # NestJS module definition
```

## Frontend Structure (`frontend/`)

### Next.js App Router Organization

```
frontend/src/
├── app/                   # App Router (Next.js 15)
│   ├── (auth)/           # Route groups (login, callback)
│   ├── claims/           # Claims page
│   ├── profile/          # User profile page
│   ├── health-check/     # Health check endpoint
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/           # Reusable UI components
│   ├── ui/              # Base components (Dialog, Button, Skeleton, etc.)
│   ├── claims/          # Claim-specific components (forms, cards, lists)
│   ├── attachments/     # Attachment upload/display
│   ├── email/           # Email preview modal, status notification
│   ├── navigation/      # Navigation components
│   ├── headers/         # Header components
│   ├── common/          # Shared components
│   └── providers/       # React providers (Query, Theme)
├── hooks/               # Custom React hooks
│   ├── queries/         # TanStack Query setup and keys
│   ├── categories/      # Category hooks (useCategories, useCategoriesForSelection)
│   ├── claims/          # Claim management hooks
│   ├── email/           # Email hooks (useEmailPreview, useEmailSending)
│   ├── attachments/     # Attachment hooks
│   ├── auth/            # Auth hooks
│   └── user/            # User hooks
├── lib/                 # Utilities and configurations
│   ├── validation/      # Validation utilities
│   ├── api-client.ts    # Axios + React Query setup
│   ├── claim-utils.ts   # Claim utilities
│   └── google-drive-client.ts  # Drive API client
├── types/               # Frontend-specific types
└── constants/           # Application constants
```

### Component Organization Pattern

```
components/
├── ui/                  # Base design system components
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   └── index.ts
│   └── Input/
├── forms/              # Composite form components
│   ├── ClaimForm/         # Multi-step claim creation form
│   │   ├── ClaimDetails/  # Step 1: Basic claim info
│   │   ├── FileUpload/    # Step 2: Document upload with Drive integration
│   │   └── ReviewSubmit/  # Step 3: Review and final submission
│   └── LoginForm/
└── layout/             # Layout and navigation
    ├── Header/
    ├── Sidebar/
    └── Footer/
```

## Shared Packages (`packages/`)

### Type Definitions (`packages/types/`)

```
packages/types/src/
├── dtos/               # API data transfer objects
│   ├── auth.dto.ts
│   ├── claim.dto.ts           # Claim CRUD types (category as code string)
│   ├── claim-category.dto.ts  # IClaimCategory, IClaimCategoryListResponse
│   ├── attachment.dto.ts
│   ├── email.dto.ts
│   ├── email/                 # Email-specific DTOs
│   │   └── preview-email-response.dto.ts  # IPreviewEmailResponse
│   ├── drive-request.dto.ts
│   ├── drive-response.dto.ts
│   ├── health-check.dto.ts
│   └── index.ts              # Barrel exports
├── auth/               # Auth-specific types
├── drive.type.ts       # Drive types
├── test-data/          # Test data types
└── index.ts            # Main exports
```

**Usage Pattern**:
```typescript
// Backend & Frontend
import { IClaimCategory, IClaimCreateRequest, ClaimStatus } from '@project/types';
```

**Note**: `ClaimCategory` enum was removed. Categories are now database-driven and fetched via `GET /claim-categories`.

## Testing Structure

### Backend Tests (`backend/src/`)
```
**/*.test.ts            # Unit tests (alongside source files)
test/                   # Test utilities
├── fixtures/          # Test data
├── mocks/             # Mock implementations
└── setup.ts           # Test configuration
```

### Integration Tests (`api-test/`)
```
api-test/src/
├── tests/             # Test suites
│   ├── auth.test.ts
│   ├── claims.test.ts
│   └── drive.test.ts
├── fixtures/          # Test data
├── utils/             # Test utilities
└── setup.ts           # Test environment setup
```

### Frontend Tests (`frontend/src/`)
```
**/*.test.tsx          # Component tests (alongside components)
__tests__/             # Integration tests
├── pages/            # Page-level tests
└── api/              # API integration tests
```

## Documentation Structure (`docs/`)

```
docs/
├── project-info/      # Core project documentation
│   ├── architecture.md
│   ├── business-logic.md
│   ├── api-endpoints.md
│   ├── development-commands.md
│   └── google-drive-integration.md
├── adr/              # Architecture Decision Records
│   └── 003-hybrid-email-attachments.md
├── specifications/    # Detailed feature specs (001-006)
└── deployment/       # Deployment documentation
```

## Configuration Management

### Environment Variables (Root `.env`)
```bash
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=mav_claims
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=password

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Application
NODE_ENV=development
JWT_SECRET=...
```

### TurboRepo Configuration (`turbo.json`)
```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "lint": {
      "outputs": []
    }
  }
}
```

## Development Workflow Integration

### Makefile Commands
```makefile
# Development
dev:          # Start all services
format:       # Format code with Prettier  
lint:         # Run ESLint across workspaces

# Database
up:           # Start PostgreSQL container
db/data/up:   # Run migrations and seeds

# Testing
test/unit:    # Backend unit tests
test/api:     # Integration tests
```

### Git Workflow
- **Main Branch**: `main` (protected)
- **Feature Branches**: `feature/issue-number-description`
- **Commit Convention**: Conventional commits
- **Pre-commit Hooks**: Format, lint, type-check

## Dependency Management

### Workspace Dependencies
- **Root**: TurboRepo, shared dev dependencies
- **Backend**: NestJS, TypeORM, PostgreSQL drivers
- **Frontend**: Next.js, React, Tailwind CSS
- **Types**: Pure TypeScript (no runtime dependencies)
- **API Test**: Vitest, testing utilities

### Version Strategy
- **Locked Versions**: Critical dependencies pinned
- **Semantic Versioning**: Follow semver for updates
- **Security Updates**: Automated via Dependabot

## File Naming Conventions

### TypeScript Files
- **Components**: PascalCase (`ClaimForm.tsx`)
- **Services**: camelCase (`auth.service.ts`) 
- **Types**: kebab-case (`claim-status.types.ts`)
- **Tests**: `*.test.ts` or `*.test.tsx`

### Directories
- **kebab-case**: All directory names
- **Singular**: Entity directories (`claim/` not `claims/`)
- **Plural**: Collection directories (`tests/`, `docs/`)

## Build and Deployment Structure

### Build Outputs
```
backend/dist/          # Compiled NestJS application
frontend/.next/        # Next.js build output
packages/types/dist/   # Compiled TypeScript types
```

### Docker Configuration
```
docker/
├── Dockerfile.backend     # Backend container
├── Dockerfile.frontend    # Frontend container
└── docker-compose.yml     # Development stack
```

## Quality Assurance Structure

### Linting Configuration
- **ESLint**: Shared config across workspaces
- **Prettier**: Consistent code formatting
- **TypeScript**: Strict mode enforcement

### CI/CD Pipeline
1. **Install**: `pnpm install`
2. **Type Check**: `turbo run type-check`
3. **Lint**: `turbo run lint`
4. **Test**: `turbo run test`
5. **Build**: `turbo run build`

This structure ensures scalable development with clear separation of concerns, consistent patterns, and robust quality gates.