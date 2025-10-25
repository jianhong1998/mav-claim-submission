# Claim Submission Application

A modern full-stack TypeScript monorepo for handling claim submissions with a React frontend, NestJS backend, PostgreSQL database, and shared packages managed by TurboRepo.

## 🏗️ Architecture Overview

This application follows a monorepo architecture managed by TurboRepo with the following components:

- **Monorepo**: TurboRepo for build orchestration, dependency management, and intelligent caching
- **Package Manager**: pnpm with workspaces for efficient dependency management
- **Frontend**: Next.js 15 with React 19, TypeScript, and TailwindCSS
- **Backend**: NestJS with TypeORM and PostgreSQL
- **Shared Packages**: TypeScript types package for cross-workspace type sharing
- **Database**: PostgreSQL 16
- **Testing**: Vitest for unit and integration tests
- **Infrastructure**: Docker Compose for local development

## 📁 Project Structure

```
claim-submission-app/                 # TurboRepo monorepo root
├── packages/                        # Shared packages
│   └── types/                       # Shared TypeScript types
│       ├── src/                     # Type definitions and DTOs
│       ├── package.json             # @project/types package
│       └── tsconfig.json            # TypeScript configuration
│
├── frontend/                        # Next.js React application
│   ├── src/
│   │   ├── app/                     # Next.js App Router pages
│   │   │   ├── layout.tsx           # Root layout
│   │   │   ├── page.tsx             # Home page
│   │   │   └── globals.css          # Global styles
│   │   ├── components/              # Reusable UI components
│   │   │   ├── ui/                  # Base UI components (buttons, inputs)
│   │   │   ├── pages/               # Page-specific components
│   │   │   └── providers/           # React providers (Query, Theme)
│   │   ├── hooks/                   # Custom React hooks
│   │   │   └── queries/             # TanStack Query hooks
│   │   ├── lib/                     # Utility functions and configurations
│   │   ├── types/                   # Frontend-specific type definitions
│   │   └── constants/               # Application constants
│   ├── package.json                 # Frontend dependencies (uses @project/types)
│   └── tailwind.config.js           # TailwindCSS configuration
│
├── backend/                         # NestJS API server
│   ├── src/
│   │   ├── modules/                 # Feature modules
│   │   │   └── common/              # Shared utilities and base classes
│   │   ├── db/                      # Database related files
│   │   │   ├── migrations/          # TypeORM migrations
│   │   │   ├── seeders/             # Database seeders
│   │   │   └── entities/            # TypeORM entities
│   │   ├── config/                  # Application configuration
│   │   ├── app.module.ts            # Main application module
│   │   ├── main.ts                  # Application entry point
│   │   └── app.config.ts            # Configuration setup
│   └── package.json                 # Backend dependencies (uses @project/types)
│
├── api-test/                        # Integration/API tests
│   ├── src/                         # Test files
│   └── package.json                 # Test dependencies
│
├── docker/                          # Docker configuration
│   └── local/                       # Local development Dockerfiles
│       ├── Dockerfile.frontend
│       ├── Dockerfile.backend
│       └── Dockerfile.db-migration
│
├── scripts/                         # Utility scripts
│   └── reinstall.sh                 # Reinstall all dependencies
│
├── docs/                            # Documentation files
├── turbo.json                       # TurboRepo configuration
├── pnpm-workspace.yaml              # pnpm workspace configuration
├── package.json                     # Root package.json with TurboRepo scripts
├── docker-compose.yml               # Docker services configuration
├── Makefile                         # Development commands
├── .env.template                    # Environment variables template
└── README.md                       # This file
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v22 or higher) - Required by the monorepo
- **pnpm** (v9.0.0 or higher) - Package manager with workspace support
- **TurboRepo** - Automatically installed as dev dependency
- **Docker** and **Docker Compose** - For containerized development
- **Make** (for running Makefile commands)

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd claim-submission-app

# Copy environment variables
cp .env.template .env

# Install all dependencies
make install
```

### 2. Environment Configuration

Edit the `.env` file with your preferred settings.
Refer to `.env.template` for the required environment variables.

**Note**: The monorepo setup shares environment variables across all workspaces from the root `.env` file.

### 3. Start the Application

```bash
# Option 1: Start all services with Docker (Recommended)
make up/build

# Option 2: Start all services with TurboRepo (Development)
pnpm run dev     # Starts all workspaces in development mode

# Option 3: Start individual services
# Terminal 1 - Database
docker-compose up postgres

# Terminal 2 - Shared types (watch mode)
cd packages/types && pnpm run dev

# Terminal 3 - Backend (depends on types)
cd backend && pnpm run dev

# Terminal 4 - Frontend (depends on types)
cd frontend && pnpm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Database**: PostgreSQL on localhost:5432

## 🛠️ Development Workflow

### TurboRepo Commands (Recommended)

```bash
# Development (with intelligent caching)
pnpm run dev           # Start all workspaces in development mode
pnpm run build         # Build all workspaces with dependency management
pnpm run lint          # Lint all workspaces
pnpm run lint:fix      # Fix linting issues across workspaces
pnpm run format        # Format code in all workspaces

# Workspace-specific commands
pnpm run build --filter=frontend    # Build only frontend
pnpm run lint --filter=backend      # Lint only backend
pnpm run dev --filter=@project/types # Watch types package only
```

### Traditional Make Commands

```bash
# Docker Services
make up                # Start all services
make up/build          # Build and start all services
make down              # Stop all services

# Code Quality (delegates to TurboRepo)
make lint              # Lint all projects
make lint/fix          # Fix linting issues
make format            # Format all code
make build             # Build all projects

# Testing
make test/unit         # Run backend unit tests
make test/api          # Run API integration tests

# Database
make db/data/up        # Run database seeders
make db/data/reset     # Reset and reseed database
```

### Individual Service Commands

#### Frontend Development

```bash
cd frontend

# Development
pnpm run dev           # Start development server (with Turbopack)
pnpm run build         # Build for production (with Turbopack)
pnpm run start         # Start production server

# Code Quality
pnpm run lint          # Lint frontend code
pnpm run format        # Format code

# Dependencies (uses shared types)
# @project/types is automatically available as workspace dependency
```

#### Backend Development

```bash
cd backend

# Development
pnpm run dev           # Start development server with watch (includes types watching)
pnpm run build         # Build TypeScript to JavaScript
pnpm run start         # Start production server
pnpm run test          # Run unit tests

# Code Quality
pnpm run lint          # Lint backend code
pnpm run lint:fix      # Fix linting issues
pnpm run format        # Format code

# Database Operations
pnpm run migration:generate --name=MigrationName
pnpm run migration:run
pnpm run seed:run

# Dependencies (uses shared types)
# @project/types is automatically available as workspace dependency
```

#### API Testing

```bash
cd api-test

pnpm run test          # Run all API tests
pnpm run test:watch    # Run tests in watch mode
```

#### Shared Types Package

```bash
cd packages/types

pnpm run build         # Build types package
pnpm run dev           # Watch mode for development
pnpm run clean         # Clean build artifacts

# Types are automatically available in frontend/backend as @project/types
```

## 🗄️ Database Management

### Migrations

```bash
# Generate a new migration
cd backend
pnpm run migration:generate --name=CreateUserTable

# Run migrations
pnpm run migration:run

# Revert last migration
pnpm run typeorm -- migration:revert
```

### Seeders

```bash
# Create a new seeder
pnpm run seed:create --name=UserSeeder

# Run all seeders
make db/data/up

# Reset database
make db/data/reset
```

## 🧪 Testing Strategy

### Monorepo Testing Benefits

- **TurboRepo Caching**: Intelligent test caching based on file changes
- **Dependency Awareness**: Tests run automatically when dependencies change
- **Parallel Execution**: Tests can run across workspaces in parallel

### Backend Testing

- **Unit Tests**: Test individual services and utilities
- **Integration Tests**: Test database interactions
- Located in `backend/src/**/*.spec.ts`
- Run with `pnpm run test` from backend/ or `make test/unit`

### API Testing

- **End-to-End API Tests**: Test complete API workflows
- Located in `api-test/src/`
- Run with `make test/api` or from api-test workspace

### Frontend Testing

- Component testing setup ready for implementation
- Uses React Testing Library (to be configured)
- Will benefit from TurboRepo's intelligent caching

### Shared Types Testing

- Type checking across workspaces ensures consistency
- Changes to shared types trigger rebuilds in dependent workspaces

## 📦 Key Technologies

### Monorepo Architecture

- **TurboRepo**: Build system with intelligent caching and dependency management
- **pnpm Workspaces**: Efficient package management with workspace linking
- **Shared Packages**: `@project/types` for cross-workspace type sharing

### Frontend Stack

- **Next.js 15**: React framework with App Router and Turbopack
- **React 19**: UI library with latest features
- **TypeScript**: Type safety and developer experience
- **TailwindCSS v4**: Utility-first CSS framework
- **TanStack Query**: Server state management
- **Axios**: HTTP client for API requests

### Backend Stack

- **NestJS**: Progressive Node.js framework
- **TypeORM**: Object-relational mapping
- **PostgreSQL**: Primary database
- **Class Validator**: Request validation
- **Vitest**: Testing framework

### Development Tools

- **TurboRepo**: Monorepo build system with caching
- **pnpm**: Fast, disk space efficient package manager with workspace support
- **ESLint**: Code linting across workspaces
- **Prettier**: Code formatting across workspaces
- **Docker**: Containerization
- **Make**: Task automation that delegates to TurboRepo

## 🔧 Configuration

### Environment Variables

| Variable                                  | Description                                | Default              | Required |
| ----------------------------------------- | ------------------------------------------ | -------------------- | -------- |
| `NODE_ENV`                                | Application environment                    | `local`              | No       |
| `DATABASE_HOST`                           | PostgreSQL host                            | `localhost`          | No       |
| `DATABASE_PORT`                           | PostgreSQL port                            | `5433`               | No       |
| `DATABASE_USER`                           | Database username                          | `postgres`           | No       |
| `DATABASE_PASSWORD`                       | Database password                          | `Password1234`       | No       |
| `DATABASE_DB`                             | Database name                              | `project_db`         | No       |
| `FRONTEND_PORT`                           | Frontend application port                  | `3000`               | No       |
| `BACKEND_PORT`                            | Backend API port                           | `3001`               | No       |
| `BACKEND_COOKIE_SECRET`                   | Session cookie secret                      | `something_secret`   | No       |
| `BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME` | Root folder name for Google Drive claims   | `"Mavericks Claims"` | **Yes**  |
| `FRONTEND_BACKEND_BASE_URL`               | Backend URL for frontend                   | Auto-configured      | No       |

**Note on Required Variables:**
- `BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME`: Application crashes at startup if missing. See detailed configuration below.

#### BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME (Required)

This environment variable configures the root folder name in Google Drive where all claim folders are organized. Each environment (local, staging, production) should use a distinct folder name to prevent data mixing.

**Configuration Examples:**

```bash
# Production environment
BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME="Mavericks Claims"

# Staging environment
BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME="[staging] Mavericks Claims"

# Local development environment
BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME="[local] Mavericks Claims"

# Developer-specific environment
BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME="[dev-john] Mavericks Claims"
```

**Validation Requirements:**
- **Required**: System will crash at startup if not configured
- **Format**: String value representing folder name (Google Drive validates naming rules)
- **Environment-Specific**: Use prefixes like `[local]`, `[staging]` to separate environments
- **Startup Validation**: Application validates presence at startup via `ConfigService.getOrThrow()`

**Folder Structure Created:**
```
Google Drive Root
└── [Environment-Specific Folder Name]    ← Configured via this env var
    ├── claim-001/
    │   ├── receipt-1.pdf
    │   └── receipt-2.jpg
    └── claim-002/
        └── invoice.pdf
```

**Error Scenarios:**
```bash
# ❌ Missing - causes application crash at startup
# ConfigurationException: BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME is required

# ✅ Valid configurations
BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME="Mavericks Claims"
BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME="[staging] Mavericks Claims"
BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME="[local-dev] Mavericks Claims"
```

**Best Practices:**
- **Production**: Use clean name without prefixes (e.g., `"Mavericks Claims"`)
- **Non-Production**: Always use environment prefix (e.g., `"[staging] Mavericks Claims"`)
- **Local Development**: Include developer identifier (e.g., `"[local-john] Mavericks Claims"`)
- **Testing**: Use test-specific prefix (e.g., `"[test] Mavericks Claims"`)

### Docker Services

The application uses Docker Compose with the following services:

- **postgres**: PostgreSQL 16 database
- **server**: NestJS backend application (built from monorepo)
- **client**: Next.js frontend application (built from monorepo)
- **db-migration-service**: Database migration runner

### TurboRepo Configuration

- **turbo.json**: Defines build tasks, dependencies, and caching rules
- **Root scripts**: Orchestrate workspace commands with intelligent caching
- **Workspace filtering**: Target specific packages with `--filter` flag
- **Task dependencies**: Automatic dependency resolution and parallel execution

## 🤝 Contributing

1. **Create a feature branch**: `git checkout -b feature/your-feature`
2. **Update shared types**: Add/modify types in `packages/types` if needed
3. **Follow code standards**: Run `make lint` and `make format` (uses TurboRepo caching)
4. **Build dependencies**: Run `make build` to ensure all workspace dependencies are built
5. **Write tests**: Add unit tests for backend changes, update type usage across workspaces
6. **Test your changes**: Run `make test/unit` and `make test/api`
7. **Submit a PR**: Include description of changes and affected workspaces

### Code Standards

- **TypeScript**: Strict mode enabled, no `any` types across all workspaces
- **Shared Types**: Use `@project/types` for cross-workspace type sharing
- **ESLint**: Configured for all workspaces with consistent rules
- **Prettier**: Consistent code formatting across the monorepo
- **TurboRepo**: Follow caching-friendly patterns, avoid global state
- **Commit Messages**: Use conventional commit format, mention affected workspaces

## 🐛 Troubleshooting

### Common Issues

**Port Already in Use**

```bash
# Kill processes on specific ports
lsof -ti:3000 | xargs kill -9  # Frontend
lsof -ti:3001 | xargs kill -9  # Backend
lsof -ti:5432 | xargs kill -9  # Database
```

**Database Connection Issues**

```bash
# Reset Docker volumes
make down/clean
make up/build
```

**Dependencies Issues**

```bash
# Reinstall all workspace dependencies
make install

# Clear TurboRepo cache
pnpx turbo clean

# Rebuild all workspaces
pnpm run build
```

**Migration Errors**

```bash
# Reset database and run migrations
make db/data/reset
cd backend && pnpm run migration:run
```

**TurboRepo Cache Issues**

```bash
# Clear TurboRepo cache
pnpx turbo clean

# Force rebuild all workspaces
pnpm run build --force

# Reset workspace dependencies
pnpm install --frozen-lockfile
```

### Getting Help

- Review Docker logs: `docker-compose logs [service-name]`
- Check individual service logs in their respective directories
