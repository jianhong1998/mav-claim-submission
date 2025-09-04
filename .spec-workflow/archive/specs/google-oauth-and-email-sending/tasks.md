# Tasks Document

- [x] 1. Create shared types for OAuth and email features in packages/types/src/dtos/auth.dto.ts
  - File: packages/types/src/dtos/auth.dto.ts
  - Define TypeScript interfaces for User, OAuthToken, AuthResponse, EmailSendRequest DTOs
  - Export types for cross-workspace usage
  - Purpose: Establish type safety across backend and frontend workspaces
  - _Leverage: packages/types/src/dtos/health-check.dto.ts pattern_
  - _Requirements: 1.1, 1.2_

- [x] 2. Update shared types index in packages/types/src/dtos/index.ts
  - File: packages/types/src/dtos/index.ts (modify existing)
  - Export new auth DTOs alongside existing health-check exports
  - Purpose: Make auth types available via @project/types import
  - _Leverage: existing export pattern in packages/types/src/dtos/index.ts_
  - _Requirements: 1.1_

- [x] 3. Create User entity in backend/src/db/entities/user.entity.ts
  - File: backend/src/db/entities/user.entity.ts
  - Implement TypeORM entity for User with Google OAuth fields
  - Add proper relationships, indexes, and validation decorators
  - Purpose: Database representation for authenticated users
  - _Leverage: existing entity patterns, backend/src/db/entity-model.ts registration_
  - _Requirements: 1.1, 2.1_

- [x] 4. Create OAuthToken entity in backend/src/db/entities/oauth-token.entity.ts
  - File: backend/src/db/entities/oauth-token.entity.ts
  - Implement TypeORM entity for encrypted OAuth tokens
  - Add relationship to User entity and expiration handling
  - Purpose: Secure storage for OAuth access and refresh tokens
  - _Leverage: existing entity patterns, encryption utilities_
  - _Requirements: 2.1, 2.2_

- [x] 5. Register new entities in backend/src/db/entity-model.ts
  - File: backend/src/db/entity-model.ts (modify existing)
  - Add User and OAuthToken entities to ENTITY_MODELS array
  - Purpose: Register entities with TypeORM configuration
  - _Leverage: existing ENTITY_MODELS registration pattern_
  - _Requirements: 2.1_

- [x] 6. Generate database migration for User and OAuthToken tables
  - File: backend/src/db/migrations/[timestamp]-create-auth-tables.ts
  - Run migration generation command to create auth tables
  - Review and adjust generated migration if needed
  - Purpose: Create database schema for authentication features
  - _Leverage: existing migration patterns, pnpm run migration:generate_
  - _Requirements: 2.1, 2.2_

- [x] 7. Install OAuth and Gmail API dependencies in backend
  - File: backend/package.json (modify existing)
  - Install @nestjs/passport, passport, passport-google-oauth20, googleapis
  - Add encryption library for token security
  - Purpose: Add required dependencies for OAuth and email functionality
  - _Leverage: existing package.json structure_
  - _Requirements: 1.1, 3.1_

- [x] 8. Create Token Service in backend/src/modules/auth/services/token.service.ts
  - File: backend/src/modules/auth/services/token.service.ts
  - Implement token encryption, storage, and refresh logic
  - Extend BaseDBUtil pattern for database operations
  - Purpose: Manage OAuth token lifecycle securely
  - _Leverage: backend/src/modules/common/base-classes/base-db-util.ts_
  - _Requirements: 2.2, 3.2_

- [x] 9. Create Google OAuth Strategy in backend/src/modules/auth/strategies/google.strategy.ts
  - File: backend/src/modules/auth/strategies/google.strategy.ts
  - Implement Passport Google OAuth strategy
  - Handle user validation and token extraction
  - Purpose: Configure Google OAuth authentication flow
  - _Leverage: @nestjs/passport patterns, AppConfig for environment variables_
  - _Requirements: 1.1, 3.1_

- [x] 10. Create Auth Service in backend/src/modules/auth/services/auth.service.ts
  - File: backend/src/modules/auth/services/auth.service.ts
  - Implement user creation, authentication, and session management
  - Integrate with Token Service for token operations
  - Purpose: Handle authentication business logic
  - _Leverage: BaseDBUtil pattern, TokenService, existing error handling_
  - _Requirements: 1.1, 1.2, 2.1_

- [x] 11. Create Auth Controller in backend/src/modules/auth/controllers/auth.controller.ts
  - File: backend/src/modules/auth/controllers/auth.controller.ts
  - Implement OAuth endpoints: /auth/google, /auth/google/callback, /auth/profile, /auth/logout
  - Add proper guards and validation
  - Purpose: Expose OAuth authentication API endpoints
  - _Leverage: existing controller patterns, @project/types DTOs_
  - _Requirements: 1.1, 1.2, 5.1_

- [x] 12. Create Auth Module in backend/src/modules/auth/auth.module.ts
  - File: backend/src/modules/auth/auth.module.ts
  - Configure NestJS module with controllers, services, and strategies
  - Set up Passport module integration
  - Purpose: Organize authentication components into cohesive module
  - _Leverage: existing module patterns in backend/src/modules/app/app.module.ts_
  - _Requirements: 1.1, 3.1_

- [x] 13. Create Email Service in backend/src/modules/email/services/email.service.ts
  - File: backend/src/modules/email/services/email.service.ts
  - Implement Gmail API client and email sending logic
  - Integrate with Token Service for authentication
  - Purpose: Send emails via authenticated user's Gmail account
  - _Leverage: googleapis library, TokenService, existing error handling_
  - _Requirements: 3.1, 3.2, 5.2_

- [x] 14. Create Email Controller in backend/src/modules/email/controllers/email.controller.ts
  - File: backend/src/modules/email/controllers/email.controller.ts
  - Implement POST /email/send endpoint with validation
  - Add authentication guard to protect endpoint
  - Purpose: Expose email sending API endpoint
  - _Leverage: existing controller patterns, @project/types DTOs, validation_
  - _Requirements: 3.1, 5.2_

- [x] 15. Create Email Module in backend/src/modules/email/email.module.ts
  - File: backend/src/modules/email/email.module.ts
  - Configure NestJS module with email controller and service
  - Import Auth Module for dependency access
  - Purpose: Organize email functionality into cohesive module
  - _Leverage: existing module patterns_
  - _Requirements: 3.1_

- [x] 16. Update App Module to include Auth and Email modules
  - File: backend/src/modules/app/app.module.ts (modify existing)
  - Import AuthModule and EmailModule
  - Configure proper module dependencies
  - Purpose: Integrate new modules into main application
  - _Leverage: existing AppModule structure and import patterns_
  - _Requirements: 1.1, 3.1_

- [x] 17. Add OAuth environment variables to .env.template
  - File: .env.template (modify existing)
  - Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, OAuth callback URLs
  - Document required Google Cloud Console setup
  - Purpose: Configure OAuth credentials and environment
  - _Leverage: existing .env.template structure_
  - _Requirements: 2.1, 4.1_

- [x] 18. Create Google Auth Button component in frontend/src/components/auth/GoogleAuthButton.tsx
  - File: frontend/src/components/auth/GoogleAuthButton.tsx
  - Implement ShadCN Button component for OAuth initiation
  - Add loading states and error handling
  - Purpose: Provide user interface for Google authentication
  - _Leverage: ShadCN Button component, existing component patterns_
  - _Requirements: 4.1, 4.3_

- [x] 19. Create Auth Status component in frontend/src/components/auth/AuthStatus.tsx
  - File: frontend/src/components/auth/AuthStatus.tsx
  - Display user authentication status and profile information
  - Show logout option for authenticated users
  - Purpose: Provide authentication status feedback to users
  - _Leverage: ShadCN components (Avatar, Card), @project/types_
  - _Requirements: 1.2, 4.3_

- [x] 20. Create Authentication hooks in frontend/src/hooks/queries/auth/useAuth.ts
  - File: frontend/src/hooks/queries/auth/useAuth.ts
  - Implement TanStack Query hooks for auth state management
  - Add login, logout, and profile fetching hooks
  - Purpose: Manage authentication state in React components
  - _Leverage: existing TanStack Query patterns, apiClient_
  - _Requirements: 1.2, 4.3_

- [x] 21. Create Email Composer component in frontend/src/components/email/EmailComposer.tsx
  - File: frontend/src/components/email/EmailComposer.tsx
  - Implement ShadCN Form for email composition
  - Add validation, loading states, and success feedback
  - Purpose: Provide user interface for composing and sending emails
  - _Leverage: ShadCN Form, Input, Textarea, Button components_
  - _Requirements: 3.1, 4.1, 4.3_

- [x] 22. Create Email hooks in frontend/src/hooks/queries/email/useEmail.ts
  - File: frontend/src/hooks/queries/email/useEmail.ts
  - Implement TanStack Query mutation for email sending
  - Add error handling and success notifications
  - Purpose: Manage email sending operations in React components
  - _Leverage: existing TanStack Query patterns, apiClient, ShadCN toast_
  - _Requirements: 3.1, 5.3_

- [x] 23. Create authentication page in frontend/src/app/auth/page.tsx
  - File: frontend/src/app/auth/page.tsx
  - Implement login page using ShadCN components
  - Include GoogleAuthButton and AuthStatus components
  - Purpose: Provide dedicated authentication interface
  - _Leverage: Next.js App Router, ShadCN layout components_
  - _Requirements: 4.1, 4.3_

- [x] 24. Create email page in frontend/src/app/email/page.tsx
  - File: frontend/src/app/email/page.tsx
  - Implement email interface with EmailComposer component
  - Add authentication guard to protect access
  - Purpose: Provide dedicated email composition interface
  - _Leverage: Next.js App Router, ShadCN layout components, auth hooks_
  - _Requirements: 3.1, 4.1_

- [x] 25. Update API client for authentication in frontend/src/lib/api-client.ts
  - File: frontend/src/lib/api-client.ts (modify existing)
  - Add authentication headers and token management
  - Handle authentication errors and token refresh
  - Purpose: Ensure authenticated API requests
  - _Leverage: existing apiClient structure, auth hooks_
  - _Requirements: 1.2, 5.3_

- [x] 26. Write unit tests for Token Service
  - File: backend/src/modules/auth/services/token.service.spec.ts
  - Test token encryption, storage, refresh, and expiration logic
  - Mock database operations and external dependencies
  - Purpose: Ensure token management reliability
  - _Leverage: existing test patterns, Vitest configuration_
  - _Requirements: 2.2, 5.1_

- [x] 27. Write unit tests for Auth Service
  - File: backend/src/modules/auth/services/auth.service.spec.ts
  - Test user authentication, creation, and session management
  - Mock OAuth strategy and database operations
  - Purpose: Ensure authentication business logic reliability
  - _Leverage: existing test patterns, Vitest configuration_
  - _Requirements: 1.1, 1.2, 5.1_

- [x] 28. Write unit tests for Email Service
  - File: backend/src/modules/email/services/email.service.spec.ts
  - Test Gmail API integration and email sending logic
  - Mock Gmail API calls and token operations
  - Purpose: Ensure email functionality reliability
  - _Leverage: existing test patterns, Vitest configuration_
  - _Requirements: 3.1, 3.2, 5.1_

- [x] 29. Write integration tests for Auth endpoints
  - File: api-test/src/tests/auth-endpoints.spec.ts
  - Test complete OAuth flow and authentication endpoints
  - Use test Google OAuth credentials
  - Purpose: Ensure API endpoints work correctly end-to-end
  - _Leverage: existing api-test patterns, test configuration_
  - _Requirements: 1.1, 1.2, 5.2_

- [x] 30. Write integration tests for Email endpoints
  - File: api-test/src/tests/email-endpoints.spec.ts
  - Test email sending with authenticated requests
  - Mock Gmail API responses for testing
  - Purpose: Ensure email API functionality works correctly
  - _Leverage: existing api-test patterns, test configuration_
  - _Requirements: 3.1, 3.2, 5.2_

- [x] 31. Run database migration and test OAuth setup
  - File: Database migration execution
  - Execute migration to create User and OAuthToken tables
  - Set up Google Cloud Console project with OAuth credentials
  - Purpose: Prepare database and OAuth configuration for testing
  - _Leverage: existing migration commands, Google Cloud Console_
  - _Requirements: 2.1, 4.1_

- [x] 32. Test complete OAuth and email flow
  - File: Manual testing workflow
  - Test Google OAuth authentication from frontend to backend
  - Verify email sending functionality with authenticated user
  - Purpose: Validate complete feature integration
  - _Leverage: all implemented components_
  - _Requirements: All_

- [x] 33. Final integration and code quality
  - File: Multiple files for cleanup and optimization
  - Run linting and formatting commands (make lint, make format)
  - Fix any integration issues or code quality concerns
  - Purpose: Ensure code quality and proper integration
  - _Leverage: existing code quality tools, TurboRepo caching_
  - _Requirements: All_