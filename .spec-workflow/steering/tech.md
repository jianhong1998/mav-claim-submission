# Technology Stack

## Project Type

Full-stack web application with asynchronous job processing - a TurboRepo monorepo for digital expense claim processing that integrates with Google Workspace APIs and replaces manual email workflows.

## Core Technologies

### Primary Language(s)
- **Language**: TypeScript 5.7+ (strict mode enabled across all workspaces)
- **Runtime**: Node.js 22+ (specified in engines)
- **Language-specific tools**: pnpm 9.0.0 (package manager), TurboRepo 2.5+ (monorepo build system)

### Key Dependencies/Libraries

**Backend (NestJS API)**:
- **NestJS 11**: Modular TypeScript framework with dependency injection
- **TypeORM 0.3**: Object-relational mapping with PostgreSQL
- **Passport.js**: Authentication with Google OAuth 2.0 strategy
- **googleapis 159+**: Google APIs client library (Gmail + Drive)
- **google-auth-library 10.3+**: OAuth token management
- **class-validator/class-transformer**: Request validation and transformation
- **express-session**: Session management with PostgreSQL store

**Frontend (Next.js)**:
- **Next.js 15.5**: React framework with App Router and Turbopack
- **React 19.1**: Latest React with concurrent features
- **TanStack React Query 5.85+**: Server state management with 5-minute stale time
- **TailwindCSS 4**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **React Hook Form**: Form handling with Zod validation
- **Axios**: HTTP client with custom configuration

**Shared Types**:
- **@project/types**: Workspace package for cross-workspace type safety

### Application Architecture

**Monorepo Structure**: TurboRepo with workspace-based dependency management
- **Client-Server**: Next.js frontend communicates with NestJS backend via REST API
- **Job Queue Architecture**: RabbitMQ for asynchronous email processing (same backend codebase, different entry point)
- **Google-First Integration**: Direct Google API integration rather than third-party abstractions
- **Feature-based Modules**: NestJS modules organized by business domain (auth, email, claims, attachments, jobs)

### Data Storage

- **Primary storage**: PostgreSQL with TypeORM migrations-first approach
- **Session storage**: PostgreSQL-backed express-session store
- **File storage**: Google Drive per-employee (not local/S3)
- **Caching**: TanStack React Query client-side with 5-minute stale time
- **Data formats**: JSON for API communication, TypeScript interfaces for type safety

### External Integrations

- **APIs**: Google Gmail API, Google Drive API v3, Google OAuth 2.0
- **Protocols**: HTTP/REST for client-server, HTTPS for Google APIs
- **Authentication**: Google OAuth 2.0 with @mavericks-consulting.com domain restriction
- **File Operations**: Direct client-to-Google Drive uploads (no server relay)
- **Email Processing**: Gmail API for sending (no SMTP)

### Monitoring & Dashboard Technologies

- **Dashboard Framework**: Next.js with React 19 and TailwindCSS dark mode
- **Data Fetching**: TanStack React Query with intelligent background updates
- **Visualization Libraries**: Lucide React icons, Radix UI components
- **State Management**: TanStack React Query as single source of truth for server state
- **UI Components**: Radix UI + custom components using class-variance-authority

## Development Environment

### Build & Development Tools

- **Build System**: TurboRepo with workspace filtering and intelligent caching
- **Package Management**: pnpm with workspace protocol for internal dependencies
- **Development workflow**: 
  - Hot reload via Nodemon (backend) and Next.js Turbopack (frontend)
  - Cross-workspace TypeScript watching (backend watches types package)
  - Docker Compose for PostgreSQL and RabbitMQ services

### Code Quality Tools

- **Static Analysis**: ESLint 9+ with TypeScript rules and Prettier integration
- **Formatting**: Prettier 3.4+ with consistent configuration across workspaces
- **Testing Framework**: Vitest 3.2+ for backend unit tests, separate api-test workspace for integration
- **Documentation**: TypeScript JSDoc comments, markdown documentation in docs/

### Version Control & Collaboration

- **VCS**: Git with Husky 9.1+ for pre-commit hooks
- **Branching Strategy**: Feature branch workflow with main branch protection
- **Code Review Process**: GitHub-based with automated linting and format checks
- **Commit Standards**: Conventional commits enforced via Husky hooks

### Dashboard Development

- **Live Reload**: Next.js Fast Refresh with Turbopack compilation
- **Port Management**: Fixed ports (3000 frontend, 3001 backend, 5432 PostgreSQL)
- **Multi-Instance Support**: TurboRepo workspace filtering allows selective service startup

## Deployment & Distribution

- **Target Platform(s)**: Docker containers for production, local development via Node.js
- **Distribution Method**: Container registry deployment (backend), static site generation (frontend)
- **Installation Requirements**: Node.js 22+, PostgreSQL 14+, RabbitMQ 3+
- **Update Mechanism**: Rolling deployment with database migrations

## Technical Requirements & Constraints

### Performance Requirements

- **API Response Time**: <200ms for CRUD operations, <2s for Google API calls
- **File Upload**: Direct client-to-Google Drive (no server bandwidth consumption)
- **Memory Usage**: <512MB per backend instance, optimized Next.js bundle
- **Database**: Connection pooling with TypeORM for concurrent requests

### Compatibility Requirements  

- **Platform Support**: Linux containers (production), macOS/Windows (development)
- **Browser Support**: Modern browsers with ES2022+ support
- **Node.js**: Version 22+ (specified in engines field)
- **Google APIs**: Gmail API v1, Google Drive API v3

### Security & Compliance

- **Security Requirements**: 
  - Google OAuth 2.0 domain restriction (@mavericks-consulting.com)
  - HTTPS-only in production
  - SQL injection protection via TypeORM parameterized queries
  - XSS protection via React's built-in sanitization
- **Data Protection**: Files stored in user's personal Google Drive (GDPR compliant)
- **Authentication**: No password storage, Google-managed identity

### Scalability & Reliability

- **Expected Load**: 50 concurrent users, 1000 claims/month
- **Availability Requirements**: 99.5% uptime during business hours
- **Growth Projections**: Horizontal scaling via container orchestration
- **Job Processing**: RabbitMQ queue for async email processing with retry mechanisms

## Technical Decisions & Rationale

### Decision Log

1. **TurboRepo over Lerna/Nx**: Better caching, simpler configuration, excellent TypeScript support
2. **Google Drive over S3**: Leverages existing Google Workspace, maintains user data ownership, no additional storage costs
3. **TypeORM over Prisma**: Better NestJS integration, migration-first approach, enterprise-grade features
4. **TanStack Query over SWR**: Superior caching controls, better DevTools, optimistic updates
5. **Object.freeze() over TypeScript enums**: Better tree-shaking, predictable JS output, const assertion compatibility
6. **Client-side Google Drive uploads**: Reduces server load, improves upload speed, maintains Google's security model

## Known Limitations

- **Google API Rate Limits**: Gmail API has sending quotas, Drive API has request limits (mitigated with retry logic)
- **File Size Constraints**: 5MB limit enforced client-side and server-side for user experience
- **Browser Dependency**: Requires modern browser with Google OAuth support (IE not supported)
- **Domain Lock-in**: Tightly coupled to @mavericks-consulting.com Google Workspace (intentional design)
- **Single Database**: No read replicas or sharding (acceptable for current scale, future consideration)
- **Manual Status Updates**: Paid/unpaid status requires manual employee input (business requirement, not technical limitation)