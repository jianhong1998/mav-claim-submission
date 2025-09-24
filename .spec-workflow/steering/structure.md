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
│   ├── auth/               # Authentication & OAuth
│   │   ├── controllers/    # HTTP endpoints
│   │   ├── services/       # Business logic
│   │   ├── dtos/          # Request/response types
│   │   └── entities/      # Database models
│   ├── claims/            # Claim management (3-phase workflow)
│   │   ├── controllers/   # Create claim → File upload → Email send
│   │   ├── services/      # Business logic for sequential processing
│   │   ├── dtos/         # Sequential request/response types
│   │   └── entities/     # Claims with draft/sent/paid status
│   ├── attachments/       # File metadata management
│   │   ├── controllers/   # Metadata storage after Drive upload
│   │   ├── services/      # Drive folder structure validation
│   │   └── entities/      # Attachment metadata with claim UUID links
│   ├── drive/             # Google Drive integration
│   └── email/             # Gmail integration
├── shared/                 # Cross-module utilities
│   ├── config/            # Configuration management
│   ├── decorators/        # Custom decorators
│   └── filters/           # Exception filters
├── database/              # Database configuration
│   ├── migrations/        # TypeORM migrations
│   └── seeds/             # Test data
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
├── app/                   # App Router (Next.js 13+)
│   ├── (auth)/           # Route groups
│   │   ├── login/        # Login page
│   │   └── layout.tsx    # Auth layout
│   ├── dashboard/        # Dashboard pages
│   ├── claims/           # Claim management
│   │   ├── create/       # 3-phase claim creation workflow
│   │   ├── [id]/         # Individual claim view/edit
│   │   └── list/         # Claims listing with filters
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/           # Reusable UI components
│   ├── ui/              # Base components (buttons, inputs)
│   ├── forms/           # Form components
│   ├── layout/          # Layout components
│   └── charts/          # Data visualization
├── lib/                 # Utilities and configurations
│   ├── api/             # API client functions
│   ├── auth/            # Authentication utilities
│   ├── hooks/           # Custom React hooks
│   └── utils/           # Helper functions
├── styles/              # CSS and styling
│   ├── globals.css      # Global styles
│   └── components.css   # Component styles
└── types/               # Frontend-specific types
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
├── entities/            # Database entity types
│   ├── user.types.ts
│   ├── claim.types.ts
│   └── attachment.types.ts
├── dtos/               # API data transfer objects
│   ├── auth/
│   ├── claims/            # 3-phase workflow DTOs
│   │   ├── create-claim.dto.ts      # Phase 1: Initial claim creation
│   │   ├── attach-files.dto.ts      # Phase 2: File metadata attachment
│   │   └── submit-claim.dto.ts      # Phase 3: Final submission
│   ├── attachments/       # File metadata DTOs
│   └── drive/
├── enums/              # Shared enums (Object.freeze pattern)
│   ├── claim-status.ts
│   └── claim-category.ts
├── api/               # API response types
└── index.ts           # Main exports
```

**Usage Pattern**:
```typescript
// Backend
import { ClaimCategory, ClaimStatus } from '@project/types';

// Frontend  
import { ClaimCreateRequest, ClaimResponse } from '@project/types';
```

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
│   └── development-commands.md
├── specifications/    # Detailed feature specs
│   └── 002/          # Claim system specification
└── guides/           # Development guides
    ├── setup.md
    └── deployment.md
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