# Profile Page - Follow-up Technical Clarifications

**Status**: [WARNING] Implementation blockers - 9 critical questions require answers before spec-workflow planning

**Context**: Initial clarification (001-clarification.md) is complete. These questions emerged during technical verification and data structure analysis.

---

## [CRITICAL] Database Schema Issues

### Q1: UserEmailPreferenceEntity Complete Definition

**Problem**: Your proposed schema in Q2 answer is missing TypeORM decorators:

```ts
@Index(['userId']) // [OK] Has decorator
class UserEmailPreference {
  @PrimaryGeneratedColumn('uuid') // [OK] Has decorator
  id: string;

  type: 'cc' | 'bcc'; // [MISSING] Missing @Column()
  emailAddress: string; // [MISSING] Missing @Column()
  user: Relation<UserEntity>; // [MISSING] Missing @ManyToOne() and @JoinColumn()

  // timestamps have decorators [OK]
}
```

**Proposed complete implementation**:

```ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  type Relation,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('user_email_preferences')
@Index(['userId'])
export class UserEmailPreferenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 3 })
  type: 'cc' | 'bcc';

  @Column({ type: 'varchar', length: 255 })
  emailAddress: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => UserEntity, (user) => user.emailPreferences, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: Relation<UserEntity>;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
  deletedAt?: Date | null;
}
```

**UserEntity changes**:

```ts
@Entity('users')
export class UserEntity {
  // ... existing fields ...

  @OneToMany(() => UserEmailPreferenceEntity, (pref) => pref.user, {
    cascade: true,
  })
  emailPreferences?: Relation<UserEmailPreferenceEntity>[];
}
```

**Question**: Confirm this complete implementation is correct?

#### Answer

Yes, it is correct.

---

### Q2: Duplicate Email Within Same Type

**Scenario**: User tries to add `personal@gmail.com` as CC twice (two separate rows with same type and email).

**Should we prevent this?**

**Option A**: Add unique constraint to prevent duplicates

```ts
@Entity('user_email_preferences')
@Index(['userId', 'type', 'emailAddress'], {
  unique: true,
  where: 'deleted_at IS NULL',
})
export class UserEmailPreferenceEntity {
  // ...
}
```

**Option B**: Allow duplicates (user's mistake, they'll see duplicates in the form list)

**Option C**: Frontend prevents duplicates, but no database constraint

**My recommendation**: Option A (prevent at database level). Having duplicates serves no purpose and indicates user error.

**Question**: Which option?

#### Answer

Option A. remove `type` from the composite key. Add `deleted_at` into the composite unique key. Ensure there is `null distinct` implemented.

---

### Q3: Cross-Type Email Validation Enforcement

**Your Q4B answer**: "Each email address can only be either CC or BCC" (cannot be both simultaneously).

**Scenario**:

- User has `personal@gmail.com` as CC
- User tries to add `personal@gmail.com` as BCC
- Should be blocked

**How to enforce this constraint?**

**Option A**: Database check constraint

```sql
-- Complex: PostgreSQL doesn't easily support cross-row constraints
-- Would require triggers or stored procedures
```

**Option B**: Backend application validation before save

```ts
// In service layer before saving new preference
const existing = await repo.findOne({
  where: {
    userId,
    emailAddress: newPreference.emailAddress,
    type: Not(newPreference.type),
    deletedAt: IsNull(),
  },
});

if (existing) {
  throw new ConflictException(
    `Email ${newPreference.emailAddress} already exists as ${existing.type.toUpperCase()}`
  );
}
```

**Option C**: Frontend validation only (check existing list before adding)

**My recommendation**: Option B (backend validation). Frontend can also validate for UX, but backend must enforce for data integrity.

**Question**: Confirm Option B? Or different approach?

#### Answer

Go with Option B. Note that the database can set email address and the user as composite unique key to make this happen.

---

## [CRITICAL] Test Email Logic Contradiction

### Q4: Test Email Failure = Block Save?

**Contradiction found between two answers**:

**Your Q11 answer (Test Email Workflow)**:

1. User adds email address as CC/BCC
2. User clicks save
3. Backend sends test email to confirm correctness
4. Backend saves email into DB <-- **Saves regardless of test result?**
5. Frontend UI prompts user to verify if received test email

**Your Q4C answer (Validation)**:

> "Invalid email should never being saved into DB."

**Question A**: If Gmail API **rejects test email send** (e.g., invalid format detected by Gmail), do we:

**Option A**: Still save to DB (user is warned via frontend prompt)
**Option B**: Block save and return error to user
**Option C**: Save but add `verified: false` status column

**Question B**: What exactly does "invalid email" mean?

**Interpretation 1**: Invalid **format only** (caught by validation regex before test send)
**Interpretation 2**: Invalid format **OR** test send failed (Gmail API rejected it)

**My interpretation**:

- Frontend/backend validation catches **format errors** -> block save
- Test email send is **delivery verification** (not validity check) -> save anyway, user warned

**Clarification needed**: Confirm my interpretation? Or different logic?

#### Answer

##### Question A

Go with option A. If user never receive the test email, he/she can verify from the UI.

##### Question B

Interpretation 1, invalid formatted email address only.

---

## [IMPORTANT] API Design & Security

### Q5: PATCH /api/users/:userId Authorization Pattern

**Your Q14 answer**: "Proceed with Option C: `PATCH /api/users/:userId`"

**Security concern**: User could manipulate request to edit other users:

```bash
# User A (id=123) is logged in
# User A tries to update User B (id=456)
PATCH /api/users/456
Authorization: Bearer <user-A-token>
Body: { "name": "Hacked" }
```

**How to prevent this?**

**Option A**: Validate `:userId` matches JWT user ID

```ts
@Patch(':userId')
async updateUser(
  @Param('userId') userId: string,
  @GetUser() currentUser: UserEntity,
  @Body() updateDto: UpdateUserDto,
) {
  if (currentUser.id !== userId) {
    throw new ForbiddenException('Cannot update other users');
  }
  return this.userService.updateUser(userId, updateDto);
}
```

**Option B**: Ignore `:userId` param, always use JWT user (safer)

```ts
@Patch('me')  // or keep ':userId' but ignore param value
async updateUser(
  @GetUser() currentUser: UserEntity,
  @Body() updateDto: UpdateUserDto,
) {
  // Always use currentUser.id from JWT token
  return this.userService.updateUser(currentUser.id, updateDto);
}
```

**My recommendation**: Option B with `PATCH /api/users/me` endpoint. Simpler, impossible to manipulate, clearer intent.

**Alternative**: Keep `PATCH /api/users/:userId` route for consistency with RESTful conventions, but implement Option A validation.

**Question**: Which approach? `/me` endpoint or `:userId` with validation?

#### Answer

Proceed with option A.

---

## [IMPORTANT] Database Operations

### Q6: Email Preferences Update Strategy

**Context**: User submits profile form with updated CC/BCC list.

**Backend receives**:

```json
{
  "name": "John Doe",
  "emailPreferences": [
    { "type": "cc", "emailAddress": "personal@gmail.com" },
    { "type": "cc", "emailAddress": "work@other.com" },
    { "type": "bcc", "emailAddress": "backup@archive.com" }
  ]
}
```

**Current state in DB**:

```
User has:
- cc: old-email@example.com (will be removed)
- cc: personal@gmail.com (unchanged)
- bcc: backup@archive.com (unchanged)
```

**How should backend update the database?**

**Option A**: Delete all existing -> Insert new (simple, clean)

```ts
// Pseudo-code
await emailPrefRepo.softDelete({ userId });
await emailPrefRepo.save(newPreferences.map((p) => ({ ...p, userId })));
```

**Pros**: Simple logic, no diff calculation
**Cons**: Loses individual record history (all get new UUIDs), updates all `updatedAt` timestamps

**Option B**: Smart diff (preserve unchanged, add new, delete removed)

```ts
// Pseudo-code
const existing = await emailPrefRepo.find({ where: { userId } });
const toDelete = existing.filter((e) => !newPreferences.includes(e));
const toAdd = newPreferences.filter((n) => !existing.includes(n));
await emailPrefRepo.softDelete(toDelete.map((d) => d.id));
await emailPrefRepo.save(toAdd.map((p) => ({ ...p, userId })));
```

**Pros**: Preserves unchanged records, accurate `updatedAt` timestamps
**Cons**: More complex logic, requires comparison algorithm

**Option C**: Frontend manages diff, sends only additions/deletions

```json
{
  "name": "John Doe",
  "emailPreferences": {
    "add": [{ "type": "cc", "emailAddress": "work@other.com" }],
    "remove": ["old-email-pref-uuid-123"]
  }
}
```

**Pros**: Backend logic simple, frontend has full control
**Cons**: More complex API contract, frontend complexity

**My recommendation**: Option A for MVP (simplest). Soft delete history is preserved anyway. Can optimize to Option B later if needed.

**Question**: Which option?

#### Answer

Option B.

---

### Q7: Soft Delete Reuse - Restore or Create New?

**Scenario**:

1. Day 1: User adds `personal@gmail.com` as CC
   - Row created: `id=abc-123, type=cc, email=personal@gmail.com, deletedAt=null`
2. Day 2: User removes it
   - Row soft deleted: `deletedAt=2025-11-12 10:00:00`
3. Day 3: User re-adds `personal@gmail.com` as CC again

**What should happen?**

**Option A**: Create new row (keep deleted row as history)

- Result: Two rows with same email
  - `id=abc-123, deletedAt=2025-11-12` (historical)
  - `id=def-456, deletedAt=null` (current)
- **Pros**: Complete audit trail, simple insert logic
- **Cons**: Database grows with duplicate data

**Option B**: Restore old row (undelete)

- Result: One row reused
  - `id=abc-123, deletedAt=null, updatedAt=2025-11-13` (restored)
- **Pros**: Clean data, no duplicates
- **Cons**: Loses deletion history, complex logic (check for deleted matches before insert)

**My recommendation**: Option A for MVP (simpler). Option B requires checking for soft-deleted matches every insert, adds complexity.

**Question**: Which option?

#### Answer

Option B.

---

## [IMPORTANT] User Experience

### Q8: CC/BCC Failure User Notification

**Context from Q12 Scenario 1**:

> "If API rejects, auto retry with no CC/BCC first. Log an error.
> If in the retry, API still rejects, then show reject reason to user."

**Question**: When first attempt fails (with CC/BCC) but retry succeeds (without CC/BCC):

**Does user see a visible warning/notification?**

**Option A**: Show warning message to user

```
[SUCCESS] Claim submitted successfully
[WARNING] CC/BCC recipients could not be included due to email delivery issues.
          Please check your email preferences in your profile.
```

**Option B**: Silent success (only logged on backend)

- User sees "[SUCCESS] Claim submitted successfully"
- No indication that CC/BCC failed
- User doesn't receive personal copy, wonders why

**My recommendation**: Option A. User should know their personal copy didn't send.

**Question**: Confirm Option A? Or silent (Option B)?

#### Answer

Option A.

---

### Q9: Profile Form Initial State - CC/BCC Input Fields

**Context from Q6 answer**:

> "CC email addresses (a list of input fields, user can choose to add more input fields)
> BCC email addresses (a list of input fields, user can choose to add more input fields)"

**Question**: What does the form show on initial render?

**Scenario A**: User has NO saved CC/BCC emails yet (new user)

**Option A1**: Show 0 fields initially

```
Display Name: [John Doe          ]

CC Emails:
  [+ Add CC Email]

BCC Emails:
  [+ Add BCC Email]
```

**Option A2**: Show 1 empty field for each type

```
Display Name: [John Doe          ]

CC Emails:
  [                    ] [Remove]
  [+ Add More]

BCC Emails:
  [                    ] [Remove]
  [+ Add More]
```

**Scenario B**: User has existing emails (e.g., 2 CC, 1 BCC)

**Option B1**: Show existing only, button to add more

```
CC Emails:
  [personal@gmail.com  ] [Remove]
  [work@other.com      ] [Remove]
  [+ Add More]

BCC Emails:
  [backup@archive.com  ] [Remove]
  [+ Add More]
```

**Option B2**: Show existing + 1 empty field for quick add

```
CC Emails:
  [personal@gmail.com  ] [Remove]
  [work@other.com      ] [Remove]
  [                    ] [Remove]  <-- Empty field always available
  [+ Add More]
```

**My recommendation**:

- **New user**: Option A1 (clean, show fields on demand)
- **Existing emails**: Option B1 (show saved, add on demand)

**Question**: Confirm this UX pattern? Or different approach?

#### Answer

Option A1 and B1.

---

## Summary

**9 Questions Organized by Priority**:

**Must answer before database design (Blocks everything)**:

1. Q1: Complete UserEmailPreferenceEntity definition
2. Q2: Prevent duplicate emails within same type?
3. Q3: Enforce cross-type email constraint (can't be both CC and BCC)?

**Must answer before API implementation**: 4. Q4: Test email failure = block save or save anyway? 5. Q5: API endpoint security pattern (`/me` vs `/:userId` validation)?

**Must answer before service layer implementation**: 6. Q6: Update strategy (delete-all-insert-new vs. smart-diff)? 7. Q7: Soft delete reuse (restore old row vs. create new)?

**Must answer before frontend implementation**: 8. Q8: Show warning when CC/BCC fails? 9. Q9: Form initial state (how many empty fields)?

**Recommended answer order**: 1-5 are critical, 6-9 can have defaults if you don't have preference.

---

## My Proposed Defaults (If You Have No Strong Preference)

If you want to proceed quickly, I can use these defaults for Q6-Q9:

- **Q6**: Option A (delete all + insert new) - simplest
- **Q7**: Option A (create new row) - simplest
- **Q8**: Option A (show warning) - better UX
- **Q9**: A1 + B1 pattern - clean UI

**But Q1-Q5 MUST have explicit answers** - they affect database schema and core business logic.
