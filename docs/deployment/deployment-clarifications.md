# 1. Build Scope: This is a TurboRepo monorepo with backend and frontend. Do you want:

```
- Separate images for backend and frontend?
- Single combined image?
- Both?
```

## Ans:

Seperate images:

1. Backend NestJS server
2. Frontend NextJS server
3. Database migration runner

# 2. Trigger Strategy: When should images build?

```
- On every push to main?
- Only on git tags (e.g., v1.0.0)?
- On release creation?
```

## Ans:

All required manual trigger. Based on the environment:

**Production**: Only able to trigger when a commit in `main` branch with tag.
**Staging**: Only able to trigger in `main` branch any commit.
**Dev**: Able to trigger in any branch any commit.

# 3. Image Tagging: How should images be tagged?

```
- Semantic versioning (v1.0.0)?
- Git commit SHA?
- Both (latest + version)?
```

## Ans:

For production, the image tagging should be using a git tag (with Semantic versioning).
For lower environment (`staging` and `dev`), the image tagging should be using git commit SHA

# 4. Multi-Architecture: Do you need multi-platform builds?

```
- linux/amd64 only?
- linux/amd64 + linux/arm64?
```

## Ans:

Should be multi-platform builds (linux/arm64 and linux/amd64)

# 5. Docker Hub Repository: What's the target?

```
- Your Docker Hub username/organization?
- Repository names (e.g., username/mav-backend, username/mav-frontend)?
```

## Ans:

**Backend**: jianhong1998/mav-claim-submission-backend
**Frontend**: jianhong1998/mav-claim-submission-frontend
**DB Migration**: jianhong1998/mav-claim-submission-db-migration

# Recommendation

## Separate workflows: Keep test.yml intact, create new docker-build.yml

Yes. Create separate workflow for each environment (dev, staging, production)

## Separate images: backend and frontend should be independent

Yes, make frontend, backend and DB migration be independent.

## Smart triggers: Build on tags (production) + main branch (staging)

Yes.

Based on environment:
**Production**: main branch commit with tag
**Staging**: main branch
**Dev**: any branch

## Multi-stage builds: Minimize image size using build stages

Yes, re-write docker files in @docker/local/ and place into @docker/deployment/ . Follow best practices when writing those new docker files.

## Layer caching: Use Docker buildx for faster builds

Yes.
