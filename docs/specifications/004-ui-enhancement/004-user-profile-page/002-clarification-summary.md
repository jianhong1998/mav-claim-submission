# Profile Page - Requirements Summary

**Feature**: User Profile Page for username customization and CC/BCC email preferences

**Status**: ✅ Ready for implementation

**Core Principle**: Simple CRUD operations. Store emails, validate them, add them to outgoing claim emails. That's it.

---

## Table of Contents

1. [Database Schema](#database-schema)
2. [API Design](#api-design)
3. [Business Logic](#business-logic)
4. [Email Integration](#email-integration)
5. [Frontend UX](#frontend-ux)
6. [Implementation Checklist](#implementation-checklist)

---

## Database Schema

### UserEntity Changes

**Location**: `backend/src/modules/user/entities/user.entity.ts`

```ts
@Entity('users')
export class UserEntity {
  // ... existing fields ...

  @Column({ type: 'varchar', length: 255 })
  name: string;  // User can update this (min 1 character)

  @OneToMany(() => UserEmailPreferenceEntity, (pref) => pref.user, {
    cascade: true,
  })
  emailPreferences?: Relation<UserEmailPreferenceEntity>[];
}
```

**Rules**:
- `name`: Minimum 1 character, required
- User updates overwrite the `name` field
- Ignore external Google account name changes

---

### UserEmailPreferenceEntity (New Table)

**Location**: `backend/src/modules/user/entities/user-email-preference.entity.ts`

```ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  type Relation,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('user_email_preferences')
@Index(['userId', 'emailAddress'], { unique: true })
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
}
```

**Key Points**:
- **Unique constraint**: `(userId, emailAddress)` - database enforces one email = one type
- **Hard delete**: No soft delete, no `deletedAt` column
- **Cascade delete**: User deletion deletes all preferences

**Migration**:
```bash
make db/migration/generate path="AddUserEmailPreferences"
make db/data/up
```

---

## API Design

### Endpoint: Update User Profile

**Route**: `PATCH /api/users/:userId`

**Authentication**: JWT required

**Authorization**: User can only update their own profile

```ts
@Patch(':userId')
@UseGuards(JwtAuthGuard)
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

**Request DTOs**:
```ts
class UpdateUserDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailPreferenceDto)
  @IsOptional()
  emailPreferences?: EmailPreferenceDto[];
}

class EmailPreferenceDto {
  @IsIn(['cc', 'bcc'])
  type: 'cc' | 'bcc';

  @IsEmail()
  emailAddress: string;
}
```

**Response**:
```json
{
  "id": "user-uuid",
  "name": "John Doe",
  "email": "john@mavericks-consulting.com",
  "emailPreferences": [
    { "id": "pref-uuid-1", "type": "cc", "emailAddress": "personal@gmail.com" },
    { "id": "pref-uuid-2", "type": "bcc", "emailAddress": "backup@archive.com" }
  ]
}
```

**Status Codes**:
- `200 OK`: Update successful
- `400 Bad Request`: Validation failed
- `403 Forbidden`: User trying to update another user
- `404 Not Found`: User not found

---

## Business Logic

### Username Update

**Implementation**:
```ts
// In UserService.updateUser()
if (updateDto.name !== undefined) {
  if (updateDto.name.length < 1) {
    throw new BadRequestException('Name must be at least 1 character');
  }
  user.name = updateDto.name;
}
```

**Effects**:
- Updates `UserEntity.name` field
- Shows in: Avatar dropdown, email footer
- Does NOT affect: Email "From" address (always OAuth email)

---

### Email Preference Validation

**Rules** (enforced in DTO and service):
1. Valid email format (`@IsEmail()` decorator)
2. Cannot be user's own email
3. No duplicates in submission
4. Database unique constraint prevents same email as both CC and BCC

**Implementation**:
```ts
async validateEmailPreferences(
  userEmail: string,
  preferences: EmailPreferenceDto[],
): Promise<void> {
  // Check for sender's own email
  if (preferences.some(p => p.emailAddress === userEmail)) {
    throw new BadRequestException('Cannot add your own email as CC/BCC');
  }

  // Check for duplicates
  const emails = preferences.map(p => p.emailAddress);
  if (emails.length !== new Set(emails).size) {
    throw new BadRequestException('Duplicate email addresses found');
  }
}
```

---

### Email Preference Update Strategy

**Simple Replace**: Delete all existing, insert all new

```ts
async updateEmailPreferences(
  userId: string,
  preferences: EmailPreferenceDto[],
): Promise<void> {
  // Delete all existing
  await this.repo.delete({ userId });

  // Insert new preferences
  if (preferences.length > 0) {
    await this.repo.insert(
      preferences.map(p => ({
        userId,
        type: p.type,
        emailAddress: p.emailAddress,
      }))
    );
  }
}
```

**Why this approach?**
- Simple: 3 lines of code
- Clear: Easy to understand and debug
- Correct: Achieves the desired end state
- Fast: Batch operations are efficient

**No smart diff needed**: Email preferences change infrequently. Preserving row IDs provides no value with hard delete.

---

## Email Integration

### Applying CC/BCC to Claim Submissions

**Scope**: CC/BCC applies ONLY to claim submission emails

```ts
// In EmailService.sendClaimSubmission()
async sendClaimSubmission(claim: ClaimEntity): Promise<void> {
  const user = claim.user;

  // Fetch email preferences
  const prefs = await this.userEmailPrefRepo.find({
    where: { userId: user.id },
  });

  const ccEmails = prefs
    .filter(p => p.type === 'cc')
    .map(p => p.emailAddress);

  const bccEmails = prefs
    .filter(p => p.type === 'bcc')
    .map(p => p.emailAddress);

  // Send email
  await this.gmailClient.sendEmail({
    to: 'finance@mavericks-consulting.com',
    cc: ccEmails,
    bcc: bccEmails,
    subject: `Expense Claim Submission - ${user.name}`,
    body: this.renderClaimTemplate(claim, user.name),
    attachments: await this.prepareAttachments(claim),
  });
}
```

**Email Template**: Use `user.name` for employee name in footer

---

### Error Handling

**If email send fails**: Return 500 error to user

```ts
async sendClaimSubmission(claim: ClaimEntity): Promise<void> {
  try {
    // ... send email with CC/BCC as shown above
  } catch (error) {
    this.logger.error(`Failed to send claim email: ${error.message}`, error);
    throw new InternalServerErrorException('Failed to send claim submission email');
  }
}
```

**No retry logic**: If CC/BCC causes failure, user needs to fix their email preferences. Don't silently drop data.

**No runtime validation**: Validation happens at save time. If invalid data exists in DB, that's a bug to fix, not work around.

---

## Frontend UX

### Profile Page Location

**Route**: `/profile`

**Navigation**: Add "Profile" link to avatar dropdown

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Avatar className="cursor-pointer">
      <AvatarImage src={user?.picture} alt={user?.name} />
      <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
    </Avatar>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuLabel>{user?.name}</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem asChild>
      <Link href="/profile">Profile</Link>
    </DropdownMenuItem>
    <DropdownMenuItem onClick={handleLogout}>
      Logout
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

### Profile Form Design

**Form Sections**:
1. Display Name (text input)
2. CC Email Addresses (dynamic list)
3. BCC Email Addresses (dynamic list)

**New user (no preferences)**:
```
Display Name
[John Doe                    ]

CC Email Addresses
[+ Add CC Email]

BCC Email Addresses
[+ Add BCC Email]

[Save Changes]
```

**Existing user (has preferences)**:
```
Display Name
[John Doe                    ]

CC Email Addresses
[personal@gmail.com    ] [Remove]
[work@other.com        ] [Remove]
[+ Add More]

BCC Email Addresses
[backup@archive.com    ] [Remove]
[+ Add More]

[Save Changes]
```

---

### Form Validation

**Frontend validation** (react-hook-form + zod):

```tsx
const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  emailPreferences: z.array(
    z.object({
      type: z.enum(['cc', 'bcc']),
      emailAddress: z.string().email('Invalid email format'),
    })
  ).refine(
    (prefs) => {
      // No duplicates
      const emails = prefs.map(p => p.emailAddress);
      return emails.length === new Set(emails).size;
    },
    { message: 'Duplicate email addresses found' }
  ).refine(
    (prefs) => {
      // Not user's own email
      return !prefs.some(p => p.emailAddress === user.email);
    },
    { message: 'Cannot add your own email as CC/BCC' }
  ),
});
```

---

## Implementation Checklist

### Backend Tasks

**Database**:
- [ ] Create `UserEmailPreferenceEntity`
- [ ] Add `emailPreferences` relationship to `UserEntity`
- [ ] Generate and run migration

**DTOs**:
- [ ] Create `UpdateUserDto` with validation
- [ ] Create `EmailPreferenceDto` with validation

**Service Layer**:
- [ ] Implement `UserService.updateUser()` (update name)
- [ ] Implement `UserService.updateEmailPreferences()` (delete all + insert all)
- [ ] Implement `UserService.validateEmailPreferences()` (check own email, duplicates)

**Controller**:
- [ ] Implement `PATCH /api/users/:userId`
- [ ] Add authorization check (user can only update own profile)

**Email Integration**:
- [ ] Update `EmailService.sendClaimSubmission()` to fetch and apply CC/BCC
- [ ] Update email template to use `user.name`

**Testing**:
- [ ] Unit tests for service methods
- [ ] Unit tests for validation
- [ ] API tests for endpoint
- [ ] Integration tests for email send

---

### Frontend Tasks

**Routing**:
- [ ] Create `/profile` page component
- [ ] Add route to app router

**Components**:
- [ ] Create `ProfileForm` with 3 sections
- [ ] Implement dynamic email field arrays
- [ ] Add form validation (react-hook-form + zod)

**UI/UX**:
- [ ] Add "Profile" link to navbar dropdown
- [ ] Implement "Add More" / "Remove" buttons
- [ ] Show success/error toast notifications

**API Integration**:
- [ ] Create `updateUserProfile` API function
- [ ] Handle form submission
- [ ] Handle error responses

**Testing**:
- [ ] Component tests
- [ ] Integration tests
- [ ] E2E tests

---

## Key Design Decisions

### 1. Hard Delete

**Decision**: Use hard delete (no soft delete, no `deletedAt`)

**Rationale**:
- Email preferences are not business-critical data
- User can re-add if deleted by mistake
- Simpler code, fewer edge cases
- No accumulation of deleted rows

---

### 2. Simple Replace Strategy

**Decision**: Delete all + insert all (no smart diff)

**Rationale**:
- Email preferences change infrequently (maybe once a month)
- 3 lines of code vs 50 lines of smart diff
- Easy to understand and debug
- Preserving row IDs provides no value with hard delete

---

### 3. Database Enforces Constraints

**Decision**: Unique constraint `(userId, emailAddress)` at database level

**Rationale**:
- Database automatically prevents same email as both CC and BCC
- Single source of truth
- No need for complex application logic

---

### 4. Single Validation Layer

**Decision**: DTO validation only (no service-layer duplication, no runtime validation)

**Rationale**:
- `@IsEmail()` decorator validates format
- Service validates business rules (own email, duplicates)
- No need to re-validate at send time
- If invalid data exists, that's a bug to fix

---

### 5. No Test Emails

**Decision**: Remove test email system

**Rationale**:
- Email format validation is sufficient
- User finds out if it works when submitting a claim
- Saves Gmail API quota
- Reduces code complexity

---

### 6. No Retry Logic

**Decision**: If email send fails, return error (don't retry without CC/BCC)

**Rationale**:
- User asked for CC/BCC, so deliver CC/BCC or report failure
- Silently dropping user data is worse than an error
- If validation passed, send should succeed
- If send fails, investigate and fix the root cause

---

## Summary

**Core Requirement**: Let users add CC/BCC emails to claim submission emails

**Implementation**:
1. Store emails in `user_email_preferences` table
2. Validate them when saved (format, not own email, no duplicates)
3. Add them to outgoing claim emails
4. If send fails, return error

**Complexity**: Low - straightforward CRUD operations

**Database Schema**: ✅ Correct
**Update Logic**: ✅ Simple (delete all + insert all)
**Validation**: ✅ Single layer (DTO + service)
**Email Integration**: ✅ Straightforward (fetch + apply)

**Ready for implementation**: Yes

---

**Next Steps**: Follow implementation checklist. Start with database migration, then backend API, then frontend form.
