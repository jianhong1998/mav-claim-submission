# Requirements Document

## Introduction

CircleCI pipeline automation for building and pushing multi-architecture Docker images to Docker Hub. Replaces manual builds with automated, environment-specific workflows for backend, frontend, and database migration services.

**Problem:** Manual Docker builds don't scale for production deployments.
**Solution:** Automated CI/CD pipeline with environment-based triggers and tagging strategies.

## Alignment with Product Vision

Supports production-ready deployment infrastructure for the Mavericks Claim Submission System. Enables consistent, reproducible builds across dev, staging, and production environments with proper security and efficiency practices.

## Requirements

### Requirement 1: Multi-Environment Workflow Separation

**User Story:** As a DevOps engineer, I want separate CircleCI workflows for dev, staging, and production environments, so that each environment has appropriate trigger rules and safety controls.

#### Acceptance Criteria

1. WHEN code is pushed to any branch THEN dev workflow SHALL be available for manual trigger
2. WHEN code is pushed to main branch THEN staging workflow SHALL be available for manual trigger
3. WHEN code is pushed to main branch with a semantic version tag THEN production workflow SHALL be available for manual trigger
4. IF workflow is for production THEN system SHALL validate git tag exists before proceeding
5. IF workflow is for staging THEN system SHALL validate branch is main before proceeding

### Requirement 2: Three Independent Service Images

**User Story:** As a deployment engineer, I want backend, frontend, and database migration images built independently, so that each service can be deployed separately without coupling.

#### Acceptance Criteria

1. WHEN workflow runs THEN system SHALL build three separate Docker images: backend, frontend, db-migration
2. WHEN building images THEN system SHALL use Dockerfiles from docker/deployment/ directory
3. WHEN building images THEN system SHALL tag with repository names: jianhong1998/mav-claim-submission-backend, jianhong1998/mav-claim-submission-frontend, jianhong1998/mav-claim-submission-db-migration
4. IF any service build fails THEN system SHALL NOT push other service images

### Requirement 3: Environment-Based Image Tagging

**User Story:** As a deployment engineer, I want different tagging strategies per environment, so that production uses semantic versions while lower environments use commit SHAs for traceability.

#### Acceptance Criteria

1. WHEN environment is production THEN system SHALL tag images with git tag (semantic version format: v1.0.0)
2. WHEN environment is staging or dev THEN system SHALL tag images with git commit SHA (short format: 7 characters)
3. WHEN tagging images THEN system SHALL also apply 'latest' tag for the respective environment (e.g., latest-staging, latest-dev, latest for production)
4. IF git tag format is invalid for production THEN system SHALL fail build with clear error message

### Requirement 4: Multi-Architecture Build Support

**User Story:** As a platform engineer, I want Docker images built for both linux/amd64 and linux/arm64 architectures, so that deployments work on AWS (amd64) and Apple Silicon (arm64) infrastructure.

#### Acceptance Criteria

1. WHEN building images THEN system SHALL use Docker buildx for multi-platform builds
2. WHEN building images THEN system SHALL target platforms: linux/amd64, linux/arm64
3. WHEN building images THEN system SHALL push manifests supporting both architectures
4. IF buildx is not available THEN system SHALL fail with setup error

### Requirement 5: Docker Build Optimization

**User Story:** As a developer, I want fast Docker builds using layer caching, so that CI/CD pipelines complete in reasonable time (<10 minutes per service).

#### Acceptance Criteria

1. WHEN building images THEN system SHALL use Docker buildx with cache-from and cache-to configuration
2. WHEN building images THEN system SHALL leverage CircleCI's remote Docker caching
3. WHEN building images THEN system SHALL use multi-stage Dockerfiles for layer optimization
4. IF cache is unavailable THEN system SHALL complete build without cache (slower but functional)

### Requirement 6: Docker Hub Authentication

**User Story:** As a security engineer, I want Docker Hub credentials stored securely in CircleCI secrets, so that image pushes are authenticated without exposing credentials in code.

#### Acceptance Criteria

1. WHEN authenticating to Docker Hub THEN system SHALL use CircleCI environment variables: DOCKERHUB_USERNAME, DOCKERHUB_PASSWORD
2. WHEN pushing images THEN system SHALL authenticate before push operations
3. IF credentials are missing THEN system SHALL fail build with clear error message
4. IF authentication fails THEN system SHALL NOT proceed with image push

### Requirement 7: Manual Trigger with Approval Gates

**User Story:** As a release manager, I want all workflows to require manual trigger, so that accidental deployments are prevented and releases are intentional.

#### Acceptance Criteria

1. WHEN workflow is triggered THEN system SHALL require manual approval via CircleCI UI
2. WHEN workflow runs THEN system SHALL display environment name clearly in CircleCI dashboard
3. IF workflow is for production THEN system SHALL require explicit manual approval before build starts
4. IF workflow is cancelled THEN system SHALL NOT push any images

### Requirement 8: TurboRepo Monorepo Integration

**User Story:** As a developer, I want Docker builds to respect TurboRepo workspace structure, so that builds use correct paths and dependencies.

#### Acceptance Criteria

1. WHEN building images THEN system SHALL copy workspace files from monorepo root
2. WHEN building images THEN system SHALL build packages/types before backend/frontend
3. WHEN building images THEN system SHALL use pnpm workspace configuration from root
4. IF workspace dependencies are missing THEN system SHALL fail with clear error

### Requirement 9: Build Status and Error Reporting

**User Story:** As a developer, I want clear build status and error messages, so that I can quickly identify and fix build failures.

#### Acceptance Criteria

1. WHEN build succeeds THEN system SHALL report image names, tags, and sizes
2. WHEN build fails THEN system SHALL display clear error messages with context
3. WHEN push completes THEN system SHALL display Docker Hub URLs for verification
4. IF build fails THEN system SHALL exit with non-zero status code

### Requirement 10: Reusable Workflow Components

**User Story:** As a maintainer, I want reusable CircleCI jobs and commands, so that workflow configuration is DRY and maintainable.

#### Acceptance Criteria

1. WHEN defining workflows THEN system SHALL use reusable jobs for build operations
2. WHEN defining jobs THEN system SHALL parameterize service name, environment, and tag strategy
3. WHEN updating build logic THEN changes SHALL apply to all environments automatically
4. IF parameters are invalid THEN system SHALL fail with validation error

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: Each CircleCI job handles one service build
- **Modular Design**: Reusable commands for Docker login, buildx setup, and image push
- **Dependency Management**: Explicit job dependencies with requires: directive
- **Clear Interfaces**: Parameterized jobs with documented inputs and outputs

### Performance
- Multi-platform builds complete in <10 minutes per service using layer caching
- Parallel builds for backend, frontend, and db-migration services
- Docker buildx cache reuse across workflow runs

### Security
- Docker Hub credentials stored in CircleCI environment variables (DOCKERHUB_USERNAME, DOCKERHUB_PASSWORD)
- No credentials in git repository or workflow configuration
- Manual trigger requirement prevents unauthorized deployments
- Non-root user execution in Docker images (already implemented in Dockerfiles)

### Reliability
- Build failures do not push partial images
- Atomic push operations (multi-arch manifest push only after all platforms succeed)
- Clear error messages for common failure modes (missing credentials, invalid tags, network errors)
- Idempotent builds (same inputs produce same outputs)

### Usability
- Clear workflow names: "Dev Build", "Staging Build", "Production Build"
- Descriptive job names with service and environment context
- Build output includes image tags and Docker Hub URLs
- CircleCI UI shows environment and service being built
