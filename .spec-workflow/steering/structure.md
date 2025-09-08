# Project Structure

## Directory Organization

```
mav-claim-submission/                    # TurboRepo monorepo root
├── packages/                            # Shared packages across workspaces
│   └── types/                          # @project/types - Shared TypeScript definitions
│       └── src/                        # Source types organized by domain
│           └── dtos/                   # Data Transfer Objects
├── backend/                            # NestJS API server (Port: 3001)
│   └── src/
│       ├── main.ts                     # Application entry point
│       ├── configs/                    # Application configuration classes
│       ├── db/                         # Database layer (TypeORM)
│       │   ├── migrations/            # Database migration files
│       │   ├── seeders/               # Database seeding scripts
│       │   └── entities/              # TypeORM entity definitions
│       └── modules/                    # Feature-based NestJS modules
│           ├── app/                   # Main application module & health
│           │   ├── controllers/       # HTTP request handlers
│           │   ├── services/          # Business logic services
│           │   └── dtos/             # Request/response DTOs
│           ├── auth/                  # Google OAuth authentication
│           │   ├── controllers/       # Auth endpoints
│           │   ├── services/          # Auth business logic
│           │   ├── strategies/        # Passport strategies
│           │   ├── entities/          # User-related entities
│           │   └── utils/            # Auth utilities
│           ├── user/                  # User management
│           │   ├── entities/          # User entities
│           │   ├── types/            # User-specific types
│           │   └── utils/            # User utilities
│           ├── email/                 # Gmail API integration
│           │   ├── controllers/       # Email endpoints
│           │   └── services/         # Email sending logic
│           ├── claims/                # Expense claims (to be implemented)
│           │   ├── entities/          # Claim entities
│           │   ├── types/            # Claim types
│           │   ├── enums/            # Claim status/category enums
│           │   └── utils/            # Claim utilities
│           ├── jobs/                  # RabbitMQ async processing
│           │   ├── entities/          # Job entities
│           │   ├── types/            # Job types
│           │   ├── enums/            # Job status enums
│           │   └── utils/            # Job utilities
│           └── common/                # Shared utilities
│               ├── base-classes/      # Abstract base classes
│               └── utils/            # Common utilities
├── frontend/                           # Next.js application (Port: 3000)
│   └── src/
│       ├── app/                       # Next.js App Router pages
│       │   ├── layout.tsx            # Root layout (dark mode only)
│       │   ├── page.tsx              # Home page
│       │   ├── auth/                 # Authentication pages
│       │   │   ├── page.tsx          # Login page
│       │   │   └── callback/         # OAuth callback
│       │   └── email/                # Email testing page
│       ├── components/                # React components
│       │   ├── ui/                   # Base UI components (ShadCN components)
│       │   ├── auth/                 # Authentication components
│       │   ├── providers/            # React context providers
│       │   ├── pages/                # Page-specific components
│       │   └── email/                # Email-related components
│       ├── hooks/                     # Custom React hooks
│       │   └── queries/              # TanStack Query hooks
│       │       ├── keys/             # Query key management
│       │       ├── helper/           # Query utilities
│       │       ├── auth/             # Auth-related queries
│       │       ├── health-check/     # Health check queries
│       │       └── email/            # Email queries
│       ├── lib/                       # Utility libraries
│       ├── constants/                 # Application constants
│       └── types/                     # Frontend-specific types
├── api-test/                          # Integration testing suite
├── docs/                              # Project documentation
│   ├── project-info/                 # Technical documentation
│   └── specifications/               # Feature specifications
├── scripts/                           # Build and deployment scripts
└── docker/                           # Docker configuration files
```

## Naming Conventions

### Files
- **Components**: `kebab-case.tsx` (e.g., `google-auth-button.tsx`, `claim-form.tsx`)
- **Services/Classes**: `kebab-case.ts` (e.g., `auth-service.ts`, `email-service.ts`)
- **Utilities/Helpers**: `kebab-case.ts` (e.g., `date-utils.ts`, `api-client.ts`)
- **Types/Interfaces**: `kebab-case.type.ts` (DTOs use `kebab-case.dto.ts` only in backend)
- **Constants**: `kebab-case.ts` (e.g., `error-message.ts`, `api-endpoints.ts`)
- **Tests**: `[filename].test.ts` or `[filename].spec.ts`
- **Pages (Next.js)**: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`

### Code
- **Classes/Types**: `PascalCase` (e.g., `ClaimCategory`, `EmailService`, `AuthController`)
- **Functions/Methods**: `camelCase` (e.g., `sendEmail`, `validateClaim`, `getUserProfile`)
- **Constants**: Use `Object.freeze()` pattern instead of TypeScript enums
  ```typescript
  export const ClaimStatus = Object.freeze({
    DRAFT: 'draft',
    SENT: 'sent',
    PAID: 'paid',
    FAILED: 'failed',
  } as const);
  ```
- **Variables**: `camelCase` (e.g., `claimData`, `userProfile`, `emailConfig`)
- **Environment Variables**: `UPPER_SNAKE_CASE` (e.g., `DATABASE_URL`, `GOOGLE_CLIENT_ID`)

## Import Patterns

### Import Order
1. External dependencies (Node.js built-ins, npm packages)
2. Internal workspace packages (`@project/types`)
3. Internal modules (absolute paths with `src/` prefix in backend, `@/` in frontend)
4. Relative imports (`./`, `../`)

### Module Organization
```typescript
// Example backend service
import { Injectable } from '@nestjs/common';           // External
import { ClaimDto } from '@project/types';            // Workspace package
import { DatabaseService } from 'src/common';         // Internal absolute
import { validateAmount } from './claim-utils';       // Relative

// Example frontend component  
import { useState } from 'react';                     // External
import { ClaimStatus } from '@project/types';        // Workspace package
import { Button } from '@/components/ui/button';     // Internal absolute
import { formatCurrency } from '../utils';           // Relative
```

## Code Structure Patterns

### Module/Class Organization
1. **Imports**: External → workspace → internal → relative
2. **Constants**: Module-level constants and configuration
3. **Types/Interfaces**: Local type definitions (prefer @project/types)
4. **Main Implementation**: Class definition with dependencies
5. **Helper Functions**: Private utility methods
6. **Exports**: Public API (typically just the class/component)

### NestJS Module Pattern
```typescript
// Standard NestJS module structure
@Module({
  imports: [TypeOrmModule.forFeature([Entity])],
  controllers: [FeatureController],
  providers: [FeatureService],
  exports: [FeatureService],
})
export class FeatureModule {}
```

### React Component Pattern
```typescript
// Standard React component structure
import { FC } from 'react';

interface ComponentProps {
  // Props interface first
}

export const ComponentName: FC<ComponentProps> = ({ prop }) => {
  // Hooks at the top
  // Event handlers in the middle  
  // Render logic at the bottom
};
```

### File Organization Principles
- **One primary export per file**: Each file has one main class/component/function
- **Related functionality grouped**: Helper functions stay close to their consumers
- **Public API clarity**: Export statements make public interface obvious
- **Implementation details hidden**: Internal utilities not exported

## Code Organization Principles

1. **Feature-Based Modules**: Code organized by business domain (claims, auth, email) rather than technical layer
2. **Dependency Direction**: Dependencies flow inward toward business logic, outward toward external services
3. **Single Responsibility**: Each file, class, and function has one clear purpose
4. **Testability**: Structure supports easy unit testing and mocking
5. **Workspace Isolation**: Each workspace (backend/frontend/types) has clear boundaries

## Module Boundaries

### Workspace Boundaries
- **@project/types**: Shared type definitions only, no business logic
- **Backend**: API endpoints, business logic, database access, external service integration
- **Frontend**: UI components, user interactions, client-side state management
- **API-Test**: Integration testing that crosses workspace boundaries

### Backend Module Boundaries
- **Common**: Shared utilities, base classes, cross-cutting concerns
- **Auth**: Authentication, authorization, user session management
- **Email**: Gmail API integration, email template processing
- **Claims**: Business logic for expense claim processing (to be implemented)
- **Jobs**: Asynchronous task processing with RabbitMQ
- **User**: User profile management and preferences

### Frontend Module Boundaries
- **UI Components**: Reusable, presentational components with no business logic
- **Feature Components**: Business-aware components for specific domains
- **Hooks/Queries**: Server state management with TanStack Query
- **Pages**: Route-level components using App Router

## Code Size Guidelines

- **File Size**: Maximum 200-300 lines per file (excluding generated code)
- **Function/Method Size**: Maximum 20-30 lines per function for readability
- **Component Complexity**: React components should have single responsibility
- **Module Dependencies**: Limit circular dependencies, prefer unidirectional flow
- **Nesting Depth**: Maximum 3-4 levels of nesting for maintainability

## Import Alias Configuration

### Backend (TypeScript Path Mapping)
```json
{
  "paths": {
    "src/*": ["./src/*"]
  }
}
```

### Frontend (Next.js Alias)  
```json
{
  "paths": {
    "@/*": ["./src/*"]
  }
}
```

## Documentation Standards

- **Public APIs**: All exported classes, functions, and components must have JSDoc comments
- **Complex Logic**: Non-obvious business logic requires inline comments
- **Module Documentation**: Each major module has a README.md explaining its purpose
- **Type Definitions**: Complex types include documentation comments
- **Configuration**: All environment variables documented in .env.template

## Development Workflow Structure

### TurboRepo Configuration
- **Workspace Dependencies**: Automatic rebuilds when @project/types changes
- **Task Pipeline**: Parallel execution with proper dependency ordering
- **Caching Strategy**: Aggressive caching for build, lint, and test tasks

### Testing Organization
- **Unit Tests**: Co-located with source files using `.test.ts` suffix
- **Integration Tests**: Separate `api-test` workspace for cross-service testing
- **Test Utilities**: Shared test helpers in each workspace's test directories