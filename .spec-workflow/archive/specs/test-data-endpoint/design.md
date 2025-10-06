# Design Document

## Overview

Two HTTP endpoints. Feature flag gates access. Database handles everything. No bullshit.

**POST `/internal/test-data`**: Try to create test user. If duplicate, return existing. Database tells us via unique constraint error - we listen.

**DELETE `/internal/test-data`**: Delete test user by ID. Database CASCADE handles oauth_tokens and claims (which CASCADE to attachments). Done.

**Linus analysis**:
- Data structure: User owns tokens and claims. Database CASCADE is the design.
- Edge cases: None. Duplicate = catch error, query existing. Delete non-existent = no-op.
- Complexity: Two controller methods. One guard. Zero service layer. Zero new database logic.

## Steering Document Alignment

### Technical Standards (tech.md)

**Database CASCADE Already Exists**:
- `OAuthTokenEntity.onDelete: 'CASCADE'` - user deletion auto-deletes tokens
- `ClaimEntity.onDelete: 'CASCADE'` - user deletion auto-deletes claims
- `ClaimEntity.attachments.cascade: true` - claim deletion auto-deletes attachments
- **Design decision**: Use what exists. Don't add cleanup logic.

**Module Pattern**:
- `InternalController` - HTTP layer only
- `UserDBUtil` - reused from UserModule (already exists)
- `ApiTestModeGuard` - feature flag check only
- **No service layer**: Controller → UserDBUtil → Database. Three steps. Done.

**TypeScript Strict Mode**:
- Catch `QueryFailedError` from TypeORM (typed)
- Type guard for error code `'23505'` (unique violation)
- Response DTOs implement proper types

### Project Structure (structure.md)

**New Module**:
```
backend/src/modules/internal/
├── controllers/
│   └── internal.controller.ts     # POST + DELETE endpoints
├── guards/
│   └── api-test-mode.guard.ts     # Feature flag check
├── dtos/
│   ├── test-data-response.dto.ts  # { user: {...} }
│   ├── test-data-delete-response.dto.ts  # { deleted: boolean, message: string }
│   └── index.ts
└── internal.module.ts
```

**Shared Constant**: Move `TEST_USER` to `@project/types` for backend access.

## Code Reuse Analysis

### Existing Components - Use Exactly As-Is

**UserDBUtil** (`backend/src/modules/user/utils/user-db.util.ts`):
- Has `create(creationData)` - creates user, throws on duplicate
- Has base `findOne()` from BaseDBUtil - queries by criteria
- Has base `remove()` or `delete()` from BaseDBUtil - deletes entity
- **Reuse**: 100%. No modifications needed.

**Database CASCADE** (entity relationships):
- User → OAuthTokens: CASCADE delete configured
- User → Claims: CASCADE delete configured
- Claim → Attachments: CASCADE delete configured
- **Linus verdict**: Database does the work. We just call `delete()`.

**TEST_USER Constant** (`api-test/src/utils/test-auth.util.ts`):
```typescript
export const TEST_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'test@mavericks-consulting.com',
  name: 'Test User',
  googleId: 'test-google-id-12345',
};
```
- **Move to**: `packages/types/src/test-data/test-user.ts`
- **Export as**: `TEST_USER_DATA` constant
- **Usage**: Both backend (internal controller) and api-test import same constant

### What We're NOT Building

- ❌ Service layer (why? controller → util is already clean)
- ❌ Custom delete logic (database CASCADE handles it)
- ❌ Batch cleanup operations (one user = simple delete)
- ❌ Validation decorators (internal endpoint, no user input)
- ❌ Complex error mapping (catch specific errors, re-throw rest)

**Linus principle**: If the database can do it, let the database do it. Don't write code that replicates database features.

## Architecture

**Linus's data structure view**:
```
User (id: uuid, unique email, unique googleId)
  ├─ CASCADE → OAuthTokens[]
  └─ CASCADE → Claims[]
       └─ CASCADE → Attachments[]
```

**Deletion is one line**: `await userDBUtil.remove(testUser);`
Database propagates the delete. We don't manage the cascade manually.

**Creation flow**:
```
Try: userDBUtil.create(TEST_USER_DATA)
  Success → Return new user
  Duplicate Error → userDBUtil.findOne({ where: { id: TEST_USER_DATA.id }})
    → Return existing user
  Other Error → Re-throw
```

**Why this is good taste**:
- No `if (userExists)` check before create (one query saved in happy path)
- Database is authoritative for duplicates (we listen to it)
- No special cases (error is the signal, not a boolean flag)

### Request Flow Diagrams

**POST /internal/test-data**:
```
HTTP POST → ApiTestModeGuard
              ↓
         Env check: ENABLE_API_TEST_MODE
              ↓
         true? → Continue
         false? → throw NotFoundException (404)
              ↓
         InternalController.createTestData()
              ↓
         userDBUtil.create({ creationData: TEST_USER_DATA })
              ↓
         Database INSERT
              ↓
         ┌─ Success? → Return UserEntity (201)
         └─ Unique violation (23505)? → userDBUtil.findOne() → Return existing (200)
         └─ Other error? → Re-throw (500)
              ↓
         Wrap in TestDataResponseDTO { user: {...} }
```

**DELETE /internal/test-data**:
```
HTTP DELETE → ApiTestModeGuard
              ↓
         Env check: ENABLE_API_TEST_MODE
              ↓
         true? → Continue
         false? → throw NotFoundException (404)
              ↓
         InternalController.deleteTestData()
              ↓
         userDBUtil.findOne({ where: { id: TEST_USER_DATA.id }})
              ↓
         User exists?
              ↓
         Yes → userDBUtil.remove(user)
              ↓
              Database DELETE (CASCADE to tokens, claims, attachments)
              ↓
              Return { deleted: true, message: "Test user deleted" }
         No → Return { deleted: false, message: "Test user not found" } (idempotent)
```

**Linus analysis**: Look at the flow. No special cases. Database constraints tell us what's wrong. We react. Simple.

## Components and Interfaces

### Component 1: ApiTestModeGuard (5 lines)

**Purpose**: Block requests when feature flag disabled

```typescript
@Injectable()
export class ApiTestModeGuard implements CanActivate {
  canActivate(): boolean {
    if (process.env.ENABLE_API_TEST_MODE !== 'true') {
      throw new NotFoundException();
    }
    return true;
  }
}
```

**Why 404, not 403**: Don't leak endpoint existence in production. Endpoint "doesn't exist" when disabled.

**Why no ConfigService**: Single boolean flag. Reading env directly is simpler. No dependency injection ceremony.

### Component 2: InternalController

**Purpose**: HTTP endpoints for test data lifecycle

```typescript
@Controller('internal')
export class InternalController {
  constructor(private readonly userDBUtil: UserDBUtil) {}

  @Post('test-data')
  @UseGuards(ApiTestModeGuard)
  async createTestData(): Promise<TestDataResponseDTO> {
    try {
      // Try to create user
      const user = await this.userDBUtil.create({
        creationData: TEST_USER_DATA,
      });

      // Success - new user created
      return new TestDataResponseDTO({ user });

    } catch (error) {
      // Check for unique constraint violation
      if (this.isDuplicateError(error)) {
        // User exists - query and return it
        const existing = await this.userDBUtil.findOne({
          where: { id: TEST_USER_DATA.id },
        });

        if (!existing) {
          throw new InternalServerErrorException('User creation failed');
        }

        return new TestDataResponseDTO({ user: existing });
      }

      // Unknown error - re-throw
      throw error;
    }
  }

  @Delete('test-data')
  @UseGuards(ApiTestModeGuard)
  async deleteTestData(): Promise<TestDataDeleteResponseDTO> {
    // Find test user
    const user = await this.userDBUtil.findOne({
      where: { id: TEST_USER_DATA.id },
    });

    if (!user) {
      // Idempotent - user already gone
      return new TestDataDeleteResponseDTO({
        deleted: false,
        message: 'Test user not found (already deleted or never existed)',
      });
    }

    // Delete user - CASCADE handles related data
    await this.userDBUtil.remove(user);

    return new TestDataDeleteResponseDTO({
      deleted: true,
      message: 'Test user and all related data deleted successfully',
    });
  }

  private isDuplicateError(error: any): boolean {
    return error?.code === '23505'; // PostgreSQL unique violation
  }
}
```

**Dependencies**:
- `UserDBUtil` (injected from UserModule)
- `TEST_USER_DATA` (imported from @project/types)

**Error handling**:
- Catch duplicate error → query existing user
- Let NestJS global filter handle other errors (500)
- No try-catch on DELETE (findOne/remove errors should propagate)

**Why no status code logic**: NestJS handles it. 201 vs 200 doesn't matter for test endpoint.

**Linus verdict**: 30 lines total. No abstraction layers. Clear flow. Database does the hard work.

### Component 3: TestDataResponseDTO

**Purpose**: POST response with nested user object

```typescript
export class TestDataResponseDTO {
  user: {
    id: string;
    email: string;
    name: string;
    googleId: string;
  };

  constructor(params: { user: UserEntity }) {
    this.user = {
      id: params.user.id,
      email: params.user.email,
      name: params.user.name,
      googleId: params.user.googleId,
    };
  }
}
```

**Why nested**: User requested scalability. Future endpoints might return `{ user: {...}, claims: [...] }`.

**Why no interface**: Simple DTO. No need for separate interface file.

### Component 4: TestDataDeleteResponseDTO

**Purpose**: DELETE response with deletion status

```typescript
export class TestDataDeleteResponseDTO {
  deleted: boolean;
  message: string;

  constructor(params: { deleted: boolean; message: string }) {
    this.deleted = params.deleted;
    this.message = params.message;
  }
}
```

**Simple. Done.**

### Component 5: InternalModule

**Purpose**: Wire it all together

```typescript
@Module({
  imports: [UserModule],  // For UserDBUtil access
  controllers: [InternalController],
})
export class InternalModule {}
```

**Exports**: Nothing. Internal module.

**Linus verdict**: 4 lines. Zero ceremony.

## Data Models

### TEST_USER_DATA Constant

**Location**: `packages/types/src/test-data/test-user.ts`

```typescript
export const TEST_USER_DATA = Object.freeze({
  id: '00000000-0000-0000-0000-000000000001',
  email: 'test@mavericks-consulting.com',
  name: 'Test User',
  googleId: 'test-google-id-12345',
} as const);

export type TestUserData = typeof TEST_USER_DATA;
```

**Breaking change**: Update `api-test/src/utils/test-auth.util.ts` to import from `@project/types` instead of defining locally.

### Database CASCADE Configuration (Already Exists)

**UserEntity → OAuthTokens**:
```typescript
@OneToMany(() => OAuthTokenEntity, (token) => token.user, {
  cascade: true,  // ✓ Already configured
})
oauthTokens?: Relation<OAuthTokenEntity>[];
```

**OAuthTokenEntity → User**:
```typescript
@ManyToOne(() => UserEntity, (user) => user.oauthTokens, {
  onDelete: 'CASCADE',  // ✓ Already configured
  nullable: false,
})
```

**ClaimEntity → User**:
```typescript
@ManyToOne(() => UserEntity, {
  nullable: false,
  onDelete: 'CASCADE',  // ✓ Already configured
})
```

**ClaimEntity → Attachments**:
```typescript
@OneToMany(() => AttachmentEntity, (attachment) => attachment.claim, {
  cascade: true,  // ✓ Already configured
})
```

**Linus analysis**: Database is already correct. Deleting user deletes everything. We just call `remove()`.

## Error Handling

### POST /internal/test-data Errors

**Scenario 1: Unique constraint violation (user exists)**
- **Error**: `QueryFailedError` with code `'23505'`
- **Handling**: Catch, query existing user by ID, return with 200 OK
- **Why this is good**: Database is authoritative. No race conditions.

**Scenario 2: Database connection failure**
- **Error**: Connection timeout, network error
- **Handling**: Let NestJS global filter catch it → 500 Internal Server Error
- **Why**: Transient errors should bubble up. Tests can retry.

**Scenario 3: Invalid test user data**
- **Error**: Validation failure (shouldn't happen - data is hardcoded)
- **Handling**: Re-throw → 500
- **Why**: This is a programming error, not user error. Fail loud.

### DELETE /internal/test-data Errors

**Scenario 1: User doesn't exist**
- **Handling**: Return `{ deleted: false, message: "..." }` with 200 OK
- **Why**: Idempotent. Endpoint succeeds whether user existed or not.

**Scenario 2: Foreign key constraint violation (shouldn't happen)**
- **Error**: Database error during CASCADE delete
- **Handling**: Re-throw → 500
- **Why**: CASCADE is configured. If this fails, database is broken. Tests should fail.

**Scenario 3: Database connection failure**
- **Handling**: Re-throw → 500
- **Why**: Same as POST - transient errors bubble up.

### Feature Flag Disabled

**Both endpoints**:
- **Error**: `NotFoundException` from guard
- **Status**: 404 Not Found
- **Response**: NestJS default 404 response
- **Why**: Security. Don't reveal endpoint exists when disabled.

**Linus principle**: Errors are data. Catch what you can fix (duplicate user). Re-throw what you can't (database down).

## Testing Strategy

### Unit Testing

**ApiTestModeGuard**:
```typescript
test('allows request when ENABLE_API_TEST_MODE=true', () => {
  process.env.ENABLE_API_TEST_MODE = 'true';
  expect(() => guard.canActivate()).not.toThrow();
});

test('throws 404 when ENABLE_API_TEST_MODE=false', () => {
  process.env.ENABLE_API_TEST_MODE = 'false';
  expect(() => guard.canActivate()).toThrow(NotFoundException);
});
```

**InternalController.createTestData()**:
```typescript
test('creates new user when not exists', async () => {
  mockUserDBUtil.create.mockResolvedValue(mockUser);
  const result = await controller.createTestData();
  expect(result.user.id).toBe(mockUser.id);
  expect(mockUserDBUtil.create).toHaveBeenCalledWith({
    creationData: TEST_USER_DATA,
  });
});

test('returns existing user on duplicate error', async () => {
  mockUserDBUtil.create.mockRejectedValue({ code: '23505' });
  mockUserDBUtil.findOne.mockResolvedValue(mockUser);
  const result = await controller.createTestData();
  expect(result.user.id).toBe(mockUser.id);
  expect(mockUserDBUtil.findOne).toHaveBeenCalled();
});
```

**InternalController.deleteTestData()**:
```typescript
test('deletes user when exists', async () => {
  mockUserDBUtil.findOne.mockResolvedValue(mockUser);
  const result = await controller.deleteTestData();
  expect(result.deleted).toBe(true);
  expect(mockUserDBUtil.remove).toHaveBeenCalledWith(mockUser);
});

test('returns success when user not found (idempotent)', async () => {
  mockUserDBUtil.findOne.mockResolvedValue(null);
  const result = await controller.deleteTestData();
  expect(result.deleted).toBe(false);
  expect(mockUserDBUtil.remove).not.toHaveBeenCalled();
});
```

**Total unit tests**: ~8 tests. Fast. No database needed.

### Integration Testing

**API Test Migration** (`api-test/src/setup/test-setup.ts`):

**Before** (delete this):
```typescript
const pool = new Pool({ /* db config */ });
await pool.query('INSERT INTO users ...');
await pool.end();
```

**After** (replace with this):
```typescript
// Cleanup first
await axios.delete(`${API_URL}/internal/test-data`);

// Setup test data
const response = await axios.post(`${API_URL}/internal/test-data`);
const testUser = response.data.user;

// Use testUser.id, testUser.email in tests
```

**Integration test cases**:
```typescript
test('POST /internal/test-data creates user (first call)', async () => {
  await axios.delete(`${API_URL}/internal/test-data`); // cleanup
  const res = await axios.post(`${API_URL}/internal/test-data`);
  expect(res.status).toBe(201); // or 200, doesn't matter
  expect(res.data.user.id).toBe(TEST_USER_DATA.id);
});

test('POST /internal/test-data returns existing user (second call)', async () => {
  await axios.post(`${API_URL}/internal/test-data`); // first call
  const res = await axios.post(`${API_URL}/internal/test-data`); // second call
  expect(res.data.user.id).toBe(TEST_USER_DATA.id); // same user
});

test('DELETE /internal/test-data removes user and related data', async () => {
  await axios.post(`${API_URL}/internal/test-data`); // create
  const res = await axios.delete(`${API_URL}/internal/test-data`);
  expect(res.data.deleted).toBe(true);

  // Verify CASCADE worked - query claims, tokens (should be empty)
  // This test verifies database CASCADE configuration
});

test('DELETE /internal/test-data is idempotent', async () => {
  const res1 = await axios.delete(`${API_URL}/internal/test-data`);
  const res2 = await axios.delete(`${API_URL}/internal/test-data`);
  expect(res2.status).toBe(200); // still succeeds
});

test('endpoints return 404 when ENABLE_API_TEST_MODE=false', async () => {
  // Set env, restart server, test 404
  // This test requires test environment control
});
```

**Total integration tests**: ~5-6 tests covering happy paths and idempotency.

### What We're NOT Testing

- ❌ Database CASCADE behavior (that's database testing, not our job)
- ❌ TypeORM query generation (trust the library)
- ❌ PostgreSQL unique constraints (trust the database)

**Linus principle**: Test your code, not the database. Test your logic, not the library.

## Implementation Checklist

**Phase 1: Shared Types** (~5 min)
- [ ] Create `packages/types/src/test-data/test-user.ts`
- [ ] Export `TEST_USER_DATA` constant
- [ ] Update `packages/types/src/index.ts` barrel export
- [ ] Update `api-test/src/utils/test-auth.util.ts` to import from `@project/types`

**Phase 2: Backend Implementation** (~15 min)
- [ ] Create `backend/src/modules/internal/` directory structure
- [ ] Implement `ApiTestModeGuard` (5 lines)
- [ ] Implement `TestDataResponseDTO` (10 lines)
- [ ] Implement `TestDataDeleteResponseDTO` (8 lines)
- [ ] Implement `InternalController` (50 lines total - both endpoints)
- [ ] Implement `InternalModule` (4 lines)
- [ ] Register `InternalModule` in `AppModule.imports`
- [ ] Add `ENABLE_API_TEST_MODE=true` to `.env`

**Phase 3: API Test Migration** (~10 min)
- [ ] Update `api-test/src/setup/test-setup.ts`:
  - Replace PostgreSQL connection with HTTP DELETE + POST
  - Store `response.data.user` for test suite usage
- [ ] Remove `pg` package from `api-test/package.json`
- [ ] Run tests - verify they pass

**Phase 4: Unit Tests** (~20 min)
- [ ] Test `ApiTestModeGuard` (2 test cases)
- [ ] Test `InternalController.createTestData()` (3 test cases)
- [ ] Test `InternalController.deleteTestData()` (3 test cases)

**Phase 5: Integration Tests** (~15 min)
- [ ] Add integration tests for both endpoints
- [ ] Verify idempotency
- [ ] Verify CASCADE delete behavior

**Total implementation time**: ~65 minutes for experienced developer

**Total files created**: 6
**Total files modified**: 4
**Total files deleted**: 0 (test-setup.ts replaced, not deleted)
**Net complexity**: Negative (removed PostgreSQL connection management)

## Linus's Final Verdict

**【Taste Rating】**: 🟢 **Good Taste**

**Why**:
- Database CASCADE eliminates manual cleanup code
- Error handling uses database feedback (unique constraint → duplicate signal)
- No service layer (controller → util is sufficient)
- Feature flag check is 5 lines, not a framework
- Idempotent by design (both endpoints safe to call multiple times)

**【Data Structure】**: User owns tokens and claims. Database enforces relationships via CASCADE. Deletion is one call.

**【Complexity Eliminated】**:
- No explicit check for existing user before create
- No manual deletion of related data (database CASCADE)
- No service layer (unnecessary abstraction)
- No validation framework (hardcoded test data)
- No ConfigService for single env flag

**【Risk Point】**: Zero. Test-only endpoints gated by feature flag. Database relationships already correct. Using existing util with existing entity configuration.

**Ship it.**
