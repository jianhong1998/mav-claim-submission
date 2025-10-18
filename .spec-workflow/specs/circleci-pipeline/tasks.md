# Tasks Document

## Task Breakdown

- [x] 1. Create CircleCI configuration with reusable commands
  - **File:** `.circleci/config.yml`
  - **Purpose:** Set up CircleCI config structure with reusable Docker commands (docker-login, setup-buildx, build-and-push-image)
  - **Leverage:** Existing Dockerfiles in `docker/deployment/Dockerfile.{backend,frontend,db-migration}`
  - **Requirements:** 6, 5, 4
  - **Success Criteria:**
    - CircleCI config.yml created with version 2.1
    - Command `docker-login` authenticates using DOCKERHUB_USERNAME and DOCKERHUB_PASSWORD
    - Command `setup-buildx` configures multi-platform builder with cache
    - Command `build-and-push-image` accepts parameters: service, tag, dockerfile, repository, environment
    - Commands are parameterized and reusable
    - YAML is valid (passes `circleci config validate`)
  - **_Prompt:** Implement the task for spec circleci-pipeline, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer with expertise in CircleCI configuration and Docker multi-platform builds | Task: Create the initial CircleCI configuration file at .circleci/config.yml following requirements 6, 5, and 4. Implement three reusable commands: (1) docker-login: Authenticate to Docker Hub using CircleCI environment variables DOCKERHUB_USERNAME and DOCKERHUB_PASSWORD (2) setup-buildx: Configure Docker buildx for multi-platform builds (linux/amd64, linux/arm64) with layer caching (3) build-and-push-image: Build and push Docker image with parameters (service, tag, dockerfile, repository, environment). The build-and-push-image command must: Use Docker buildx with --platform linux/amd64,linux/arm64, Tag images with both specific tag and latest-{environment} tag, Use registry cache (cache-from and cache-to with repository:buildcache), Push manifest after successful build, Build from monorepo root context (.) | Restrictions: Do NOT create jobs or workflows yet (tasks 2-6 will add those), Do NOT hardcode credentials in config file, Do NOT use outdated CircleCI 2.0 syntax, Must use CircleCI 2.1 with reusable commands, Follow Linus's principle: "If you need more than 3 levels of indentation, you're screwed" | Leverage: docker/deployment/Dockerfile.backend (multi-stage build pattern), docker/deployment/Dockerfile.frontend (Next.js standalone pattern), docker/deployment/Dockerfile.db-migration (migration runner pattern) | Success: .circleci/config.yml created with version 2.1, Three commands defined: docker-login, setup-buildx, build-and-push-image, build-and-push-image accepts 5 parameters: service, tag, dockerfile, repository, environment, YAML validates successfully with circleci config validate, No hardcoded credentials or secrets | Before starting: (1) Edit .spec-workflow/specs/circleci-pipeline/tasks.md (2) Change task 1 status from [ ] to [-] | After completing: (1) Run: circleci config validate (or skip if CLI not available) (2) Edit .spec-workflow/specs/circleci-pipeline/tasks.md (3) Change task 1 status from [-] to [x]

- [x] 2. Create parameterized build-and-push job
  - **File:** `.circleci/config.yml` (continue from task 1)
  - **Purpose:** Implement reusable job that builds and pushes one service image using commands from task 1
  - **Leverage:** Commands created in task 1 (docker-login, setup-buildx, build-and-push-image)
  - **Requirements:** 2, 3, 10
  - **Success Criteria:**
    - Job `build-and-push` defined with 3 parameters: service, environment, tag_strategy
    - Job uses CircleCI remote Docker executor (setup_remote_docker)
    - Job checks out code from git
    - Job determines tag based on tag_strategy (sha → CIRCLE_SHA1:0:7, tag → CIRCLE_TAG)
    - Job calls docker-login, setup-buildx, build-and-push-image commands
    - Job handles all 3 services: backend, frontend, db-migration
    - Job determines correct Dockerfile and repository based on service parameter
  - **_Prompt:** Implement the task for spec circleci-pipeline, first run spec-workflow-guide to get the workflow guide then implement the task: Role: CircleCI Engineer with expertise in parameterized jobs and Docker builds | Task: Add a reusable job named build-and-push to .circleci/config.yml following requirements 2, 3, and 10. The job must have Parameters: service (enum: backend, frontend, db-migration), environment (enum: dev, staging, production), tag_strategy (enum: sha, tag). Job steps: (1) Checkout code (2) Setup remote Docker (for docker buildx support) (3) Determine image tag: If tag_strategy == sha: use first 7 chars of CIRCLE_SHA1, If tag_strategy == tag: use CIRCLE_TAG (4) Run docker-login command (5) Run setup-buildx command (6) Run build-and-push-image command with correct parameters: service: parameter value, tag: determined from step 3, dockerfile: docker/deployment/Dockerfile.{service}, repository: jianhong1998/mav-claim-submission-{service}, environment: parameter value | Restrictions: Do NOT create workflows yet (tasks 3-5 will add those), Do NOT duplicate logic - use commands from task 1, Do NOT hardcode service-specific values - use parameters, Must use setup_remote_docker for buildx support, Follow Linus's principle: "ONE job definition for all 9 combinations" | Leverage: docker-login command (task 1), setup-buildx command (task 1), build-and-push-image command (task 1) | Success: Job build-and-push defined with 3 parameters, Job uses remote Docker executor, Tag determination logic handles both sha and tag strategies, Job calls all 3 commands in correct order, Dockerfile path and repository name determined from service parameter, YAML validates successfully | Before starting: (1) Edit .spec-workflow/specs/circleci-pipeline/tasks.md (2) Change task 2 status from [ ] to [-] | After completing: (1) Edit .spec-workflow/specs/circleci-pipeline/tasks.md (2) Change task 2 status from [-] to [x]

- [x] 3. Create dev-build workflow
  - **File:** `.circleci/config.yml` (continue from task 2)
  - **Purpose:** Add workflow for dev environment (any branch, SHA tagging, manual trigger)
  - **Leverage:** build-and-push job from task 2
  - **Requirements:** 1, 7
  - **Success Criteria:**
    - Workflow `dev-build` defined
    - Workflow triggers on all branches (no branch filter restrictions)
    - Workflow does NOT trigger on tags (ignore tags filter)
    - Workflow calls build-and-push job 3 times in parallel (backend, frontend, db-migration)
    - All jobs use tag_strategy: sha and environment: dev
    - Workflow requires manual approval before running (type: approval)
  - **_Prompt:** Implement the task for spec circleci-pipeline, first run spec-workflow-guide to get the workflow guide then implement the task: Role: CircleCI Workflow Engineer with expertise in workflow orchestration and filters | Task: Add dev-build workflow to .circleci/config.yml following requirements 1 and 7. The workflow must have configuration: Name: dev-build, Triggers: Any branch (no branch filter restrictions), Tag filter: Ignore tags (tags: { ignore: /.*/ }), Manual approval: Required before build starts (add approval job). Jobs to run (in parallel after approval): (1) build-backend-dev: Uses build-and-push job with Parameters service=backend, environment=dev, tag_strategy=sha (2) build-frontend-dev: Uses build-and-push job with Parameters service=frontend, environment=dev, tag_strategy=sha (3) build-db-migration-dev: Uses build-and-push job with Parameters service=db-migration, environment=dev, tag_strategy=sha | Restrictions: Do NOT create staging/production workflows yet (tasks 4-5), Do NOT duplicate job definitions - call build-and-push with parameters, Must require manual approval to prevent accidental builds, Must use tag_strategy=sha for dev environment, Follow Linus's principle: "Eliminate all special cases" | Leverage: build-and-push job (task 2) | Success: Workflow dev-build defined under workflows: section, Workflow has manual approval gate before build jobs, All 3 service builds run in parallel after approval, Workflow ignores git tags (only triggers on branch pushes), Each job correctly calls build-and-push with dev parameters, YAML validates successfully | Before starting: (1) Edit .spec-workflow/specs/circleci-pipeline/tasks.md (2) Change task 3 status from [ ] to [-] | After completing: (1) Edit .spec-workflow/specs/circleci-pipeline/tasks.md (2) Change task 3 status from [-] to [x]

- [x] 4. Create staging-build workflow
  - **File:** `.circleci/config.yml` (continue from task 3)
  - **Purpose:** Add workflow for staging environment (main branch only, SHA tagging, manual trigger)
  - **Leverage:** build-and-push job from task 2
  - **Requirements:** 1, 7
  - **Success Criteria:**
    - Workflow `staging-build` defined
    - Workflow triggers only on main branch (branch filter: only: main)
    - Workflow does NOT trigger on tags (ignore tags filter)
    - Workflow calls build-and-push job 3 times in parallel (backend, frontend, db-migration)
    - All jobs use tag_strategy: sha and environment: staging
    - Workflow requires manual approval before running
  - **_Prompt:** Implement the task for spec circleci-pipeline, first run spec-workflow-guide to get the workflow guide then implement the task: Role: CircleCI Workflow Engineer with expertise in branch filtering and environment-specific builds | Task: Add staging-build workflow to .circleci/config.yml following requirements 1 and 7. The workflow must have configuration: Name: staging-build, Branch filter: Only main (branches: { only: main }), Tag filter: Ignore tags (tags: { ignore: /.*/ }), Manual approval: Required before build starts. Jobs to run (in parallel after approval): (1) build-backend-staging: Uses build-and-push job with Parameters service=backend, environment=staging, tag_strategy=sha (2) build-frontend-staging: Uses build-and-push job with Parameters service=frontend, environment=staging, tag_strategy=sha (3) build-db-migration-staging: Uses build-and-push job with Parameters service=db-migration, environment=staging, tag_strategy=sha | Restrictions: Do NOT create production workflow yet (task 5), Do NOT allow staging builds on non-main branches, Must require manual approval to prevent accidental staging deployments, Must use tag_strategy=sha for staging environment, Follow existing workflow pattern from dev-build (task 3) | Leverage: build-and-push job (task 2), dev-build workflow pattern (task 3) | Success: Workflow staging-build defined, Workflow only triggers on main branch, Workflow ignores git tags, Manual approval gate before builds, All 3 service builds run in parallel after approval, Each job correctly calls build-and-push with staging parameters, YAML validates successfully | Before starting: (1) Edit .spec-workflow/specs/circleci-pipeline/tasks.md (2) Change task 4 status from [ ] to [-] | After completing: (1) Edit .spec-workflow/specs/circleci-pipeline/tasks.md (2) Change task 4 status from [-] to [x]

- [x] 5. Create production-build workflow
  - **File:** `.circleci/config.yml` (continue from task 4)
  - **Purpose:** Add workflow for production environment (main branch + semantic version tag, tag tagging, manual trigger)
  - **Leverage:** build-and-push job from task 2
  - **Requirements:** 1, 3, 7
  - **Success Criteria:**
    - Workflow `production-build` defined
    - Workflow triggers only on main branch (branch filter: only: main)
    - Workflow triggers only on semantic version tags (tag filter: only: /^v\d+\.\d+\.\d+$/)
    - Workflow calls build-and-push job 3 times in parallel (backend, frontend, db-migration)
    - All jobs use tag_strategy: tag and environment: production
    - Workflow requires manual approval before running
  - **_Prompt:** Implement the task for spec circleci-pipeline, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Release Engineer with expertise in production deployment pipelines and semantic versioning | Task: Add production-build workflow to .circleci/config.yml following requirements 1, 3, and 7. The workflow must have configuration: Name: production-build, Branch filter: Only main (branches: { only: main }), Tag filter: Only semantic versions (tags: { only: /^v\d+\.\d+\.\d+$/ }), Manual approval: Required before build starts (CRITICAL for production). Jobs to run (in parallel after approval): (1) build-backend-production: Uses build-and-push job with Parameters service=backend, environment=production, tag_strategy=tag (2) build-frontend-production: Uses build-and-push job with Parameters service=frontend, environment=production, tag_strategy=tag (3) build-db-migration-production: Uses build-and-push job with Parameters service=db-migration, environment=production, tag_strategy=tag | Restrictions: MUST only trigger on semantic version tags (v1.0.0, v2.3.4 format), MUST require manual approval for production builds, Must use tag_strategy=tag (uses CIRCLE_TAG, not CIRCLE_SHA1), Do NOT allow production builds without git tags, Follow existing workflow pattern from dev/staging (tasks 3-4) | Leverage: build-and-push job (task 2), dev-build and staging-build workflow patterns (tasks 3-4) | Success: Workflow production-build defined, Workflow only triggers on main branch with semantic version tags, Tag regex /^v\d+\.\d+\.\d+$/ correctly matches v1.0.0 format, Manual approval gate before builds (most critical for production), All 3 service builds run in parallel after approval, Each job uses tag_strategy=tag (not sha), YAML validates successfully | Before starting: (1) Edit .spec-workflow/specs/circleci-pipeline/tasks.md (2) Change task 5 status from [ ] to [-] | After completing: (1) Edit .spec-workflow/specs/circleci-pipeline/tasks.md (2) Change task 5 status from [-] to [x]

- [x] 6. Validate and test CircleCI configuration
  - **File:** `.circleci/config.yml` (validate from tasks 1-5)
  - **Purpose:** Ensure complete CircleCI config is valid and ready for production use
  - **Leverage:** Complete config from tasks 1-5
  - **Requirements:** 9, 10
  - **Success Criteria:**
    - Config validates successfully with `circleci config validate`
    - All workflows defined: dev-build, staging-build, production-build
    - All commands and jobs use correct YAML syntax
    - No hardcoded credentials or secrets in config
    - Documentation added as comments explaining key sections
    - Config follows CircleCI 2.1 best practices
  - **_Prompt:** Implement the task for spec circleci-pipeline, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer with expertise in CircleCI configuration validation and CI/CD testing | Task: Validate the complete CircleCI configuration following requirements 9 and 10. Perform the following checks: Validation steps: (1) Run circleci config validate (if CLI available) or manually verify YAML syntax (2) Verify all 3 workflows exist: dev-build, staging-build, production-build (3) Verify all 3 commands exist: docker-login, setup-buildx, build-and-push-image (4) Verify build-and-push job accepts 3 parameters: service, environment, tag_strategy (5) Check no hardcoded credentials (search for passwords, tokens, secrets) (6) Verify branch filters correct: dev=all, staging=main, production=main (7) Verify tag filters correct: dev=ignore, staging=ignore, production=semver regex (8) Verify all jobs use correct tag_strategy: dev=sha, staging=sha, production=tag (9) Add documentation comments explaining: Purpose of each command, Parameters for build-and-push job, Trigger rules for each workflow, Environment-specific differences (10) Check config follows best practices: Uses CircleCI 2.1 (not 2.0), Commands are reusable and parameterized, No duplication across workflows, Clear naming conventions | Restrictions: Do NOT modify functionality - only add comments and fix validation errors, Do NOT change parameter names or structure, Must ensure config is production-ready, All validation errors must be fixed before completion | Leverage: Complete config from tasks 1-5, CircleCI CLI (circleci config validate) | Success: circleci config validate passes (or manual YAML validation confirms correctness), All workflows, jobs, and commands present and correct, No hardcoded secrets found, Documentation comments added explaining key sections, Config follows CircleCI 2.1 best practices, Ready for production use | Before starting: (1) Edit .spec-workflow/specs/circleci-pipeline/tasks.md (2) Change task 6 status from [ ] to [-] | After completing: (1) Verify circleci config validate passes (or YAML is valid) (2) Edit .spec-workflow/specs/circleci-pipeline/tasks.md (3) Change task 6 status from [-] to [x] (4) Announce: "CircleCI pipeline configuration complete and validated!"

## Requirements Coverage

- **Requirement 1 (Multi-Environment Workflows):** Tasks 3, 4, 5 - Separate workflows for dev, staging, production with correct branch/tag filters
- **Requirement 2 (Independent Service Images):** Tasks 1, 2 - build-and-push-image command handles all 3 services independently
- **Requirement 3 (Environment-Based Tagging):** Tasks 2, 3, 4, 5 - tag_strategy parameter (sha vs tag) per environment
- **Requirement 4 (Multi-Architecture Builds):** Task 1 - setup-buildx and build-and-push-image with linux/amd64,linux/arm64
- **Requirement 5 (Build Optimization):** Task 1 - Docker buildx with registry cache (cache-from/cache-to)
- **Requirement 6 (Docker Hub Auth):** Task 1 - docker-login command using DOCKERHUB_USERNAME/PASSWORD from CircleCI secrets
- **Requirement 7 (Manual Triggers):** Tasks 3, 4, 5 - All workflows require manual approval before builds
- **Requirement 8 (TurboRepo Integration):** Tasks 1, 2 - Build context set to monorepo root (.), Dockerfiles handle workspace structure
- **Requirement 9 (Error Reporting):** Task 6 - Validation ensures clear error messages and proper status codes
- **Requirement 10 (Reusable Components):** Tasks 1, 2 - Commands and parameterized job eliminate duplication

## Implementation Notes

**Linus's Wisdom Applied:**

1. **"Good programmers worry about data structures"**
   - Data structure: Environment → Parameters → Job
   - ONE job handles 9 combinations through parameters
   - No special cases, no duplication

2. **"If you need more than 3 levels of indentation, you're screwed"**
   - CircleCI YAML is inherently nested, but logic stays flat
   - Tag determination: simple ternary (sha ? CIRCLE_SHA1 : CIRCLE_TAG)
   - No complex conditionals in job definitions

3. **"Eliminate all special cases"**
   - Dev, staging, production: SAME job, different parameters
   - Backend, frontend, db-migration: SAME command, different inputs
   - No per-service or per-environment code duplication

4. **"Never break userspace"**
   - New CI/CD infrastructure, no existing workflows to break
   - Dockerfiles already exist and work - pipeline just orchestrates them
   - Manual approval gates prevent accidental deployments

## Task Execution Order

**Sequential (must complete in order):**
1. Task 1 → Task 2 (job depends on commands)
2. Task 2 → Tasks 3, 4, 5 (workflows depend on job)
3. Tasks 1-5 → Task 6 (validation requires complete config)

**Parallel (tasks 3, 4, 5 can be done in any order):**
- Task 3, Task 4, Task 5 are independent workflows
- However, sequential execution is recommended for consistency
