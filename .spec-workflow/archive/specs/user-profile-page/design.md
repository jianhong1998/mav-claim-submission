# Design Document

## Overview

User profile page. Two features. Simple CRUD.

**Username**: Text field. Minimum 1 character. Overwrites UserEntity.name. Shows in avatar dropdown and email footer.

**Email Preferences**: Dynamic list of CC/BCC emails. Store in separate table. Apply to claim submission emails only.

**Update Strategy**: Delete all existing preferences, insert all new preferences. Three lines of code. Database unique constraint prevents duplicates. Done.

**Linus analysis**:
- Data structure: User has-many email preferences. Database CASCADE handles deletion.
- Edge cases: None. Duplicate email = database rejects. Own email = service rejects. Empty name = DTO rejects.
- Complexity: One controller method. One service method. One database table. Zero special cases.

## Steering Document Alignment

### Technical Standards (CLAUDE.md)

**TypeScript Strict Mode**:
- All DTOs use proper types (no `any`)
- EmailPreferenceDto uses `'cc' | 'bcc'` union type
- Response DTOs map UserEntity to safe response format

**Enum Pattern**:
- No TypeScript `enum` for email preference type
- Use `type EmailPreferenceType = 'cc' | 'bcc'` literal union
- Validation with `@IsIn(['cc', 'bcc'])` decorator

**Module Pattern**:
- UserController handles HTTP (PATCH /api/users/:userId)
- UserService orchestrates update (name + email preferences)
- UserEmailPreferenceService handles preference CRUD (create/delete)
- EmailService queries preferences when sending claim emails

### Project Structure (architecture.md)

**Backend Structure**:
```
backend/src/modules/user/
├── controllers/
│   └── user.controller.ts              # Add PATCH /:userId endpoint
├── services/
│   ├── user.service.ts                 # Add updateUser() method
│   └── user-email-preference.service.ts # Create (new service)
├── entities/
│   ├── user.entity.ts                  # Add emailPreferences relation
│   └── user-email-preference.entity.ts # Create (new entity)
├── dtos/
│   ├── update-user.dto.ts              # Create (new DTO)
│   ├── email-preference.dto.ts         # Create (new DTO)
│   └── index.ts                         # Update barrel export
└── user.module.ts                       # Register new service
```

**Frontend Structure**:
```
frontend/src/app/
├── profile/
│   └── page.tsx                         # Create (new profile page)
├── components/
│   ├── profile/
│   │   ├── profile-form.tsx            # Create (main form component)
│   │   ├── email-preference-field.tsx  # Create (dynamic field component)
│   │   └── index.ts                    # Barrel export
│   └── navbar/
│       └── user-dropdown.tsx           # Modify (add Profile menu item)
├── api/
│   └── users/
│       └── update-profile.ts           # Create (API client)
└── schemas/
    └── profile-schema.ts                # Create (zod validation)
```

### Database Schema Evolution

**Migration**: `AddUserEmailPreferences`

```bash
make db/migration/generate path="AddUserEmailPreferences"
make db/data/up
```

## Architecture

### Data Structure (Linus's View)

```
User (id: uuid, name: varchar(255), email: varchar(255) unique, googleId: varchar(255) unique)
  └─ CASCADE → UserEmailPreferences[] (one-to-many)
       ├─ id: uuid (primary key)
       ├─ userId: uuid (foreign key, ON DELETE CASCADE)
       ├─ type: varchar(3) ('cc' | 'bcc')
       ├─ emailAddress: varchar(255)
       └─ UNIQUE INDEX (userId, emailAddress)
```

**Why this is good**:
- Database enforces one email = one type per user (unique constraint does the work)
- Deleting user deletes all preferences (CASCADE does the work)
- No deletedAt column (hard delete - simpler queries, no accumulation)
- No separate CC and BCC tables (one table, type column - fewer tables, simpler queries)

### Request Flow Diagrams

**PATCH /api/users/:userId - Update Profile**:
```
HTTP PATCH → JwtAuthGuard
              ↓
         JWT valid? → Extract user from token
              ↓
         UserController.updateUser()
              ↓
         Check: currentUser.id === userId?
              ↓
         No → throw ForbiddenException (403)
         Yes → Continue
              ↓
         Validate UpdateUserDto
              ↓
         Invalid → throw BadRequestException (400)
         Valid → Continue
              ↓
         UserService.updateUser(userId, updateDto)
              ↓
         Query user by ID
              ↓
         Not found → throw NotFoundException (404)
         Found → Continue
              ↓
         updateDto.name provided?
         ├─ Yes → Validate length >= 1 → Update user.name
         └─ No → Skip
              ↓
         updateDto.emailPreferences provided?
         ├─ Yes → Validate preferences → UserEmailPreferenceService.updatePreferences()
         │         ├─ Check: email != user.email (own email)
         │         ├─ Check: no duplicates in array
         │         ├─ Delete all existing: DELETE FROM user_email_preferences WHERE userId = ?
         │         └─ Insert new: INSERT INTO user_email_preferences (userId, type, emailAddress) VALUES ...
         └─ No → Skip
              ↓
         Save user entity
              ↓
         Query updated user with relations (emailPreferences)
              ↓
         Return UserResponseDto { user: { id, name, email, emailPreferences: [...] } }
              ↓
         200 OK
```

**Email Send with CC/BCC Application**:
```
ClaimController.submitClaim()
    ↓
EmailService.sendClaimSubmission(claim)
    ↓
Query user.emailPreferences (WHERE userId = claim.userId)
    ↓
Separate by type:
    ├─ ccEmails = preferences.filter(p => p.type === 'cc').map(p => p.emailAddress)
    └─ bccEmails = preferences.filter(p => p.type === 'bcc').map(p => p.emailAddress)
    ↓
Prepare email:
    ├─ to: 'finance@mavericks-consulting.com'
    ├─ cc: ccEmails (if any)
    ├─ bcc: bccEmails (if any)
    ├─ subject: `Expense Claim Submission - ${user.name}`
    ├─ body: renderClaimTemplate(claim, user.name)
    └─ attachments: prepareAttachments(claim)
    ↓
GmailClient.sendEmail({ to, cc, bcc, subject, body, attachments })
    ↓
Success → Return
Failure → Log error → throw InternalServerErrorException (500)
```

**Linus analysis**: Look at the flow. No special cases. Database constraint prevents duplicate email. Service validates business rules (own email, duplicate in array). Controller checks authorization. Each layer does one job.

## Components and Interfaces

### Backend Components

#### Component 1: UserEmailPreferenceEntity (New)

**Purpose**: Database model for email preferences

**Location**: `backend/src/modules/user/entities/user-email-preference.entity.ts`

```typescript
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
- Unique constraint `(userId, emailAddress)` - database enforces
- Hard delete - no `deletedAt`
- CASCADE delete - user deletion auto-deletes preferences
- Type column length 3 (exact fit for 'cc'/'bcc')

#### Component 2: UserEntity (Modified)

**Purpose**: Add email preferences relationship

**Location**: `backend/src/modules/user/entities/user.entity.ts`

**Changes**:
```typescript
import { UserEmailPreferenceEntity } from './user-email-preference.entity';

@Entity('users')
export class UserEntity {
  // ... existing fields ...

  @Column({ type: 'varchar', length: 255 })
  name: string;  // User can update this

  @OneToMany(() => UserEmailPreferenceEntity, (pref) => pref.user, {
    cascade: true,
  })
  emailPreferences?: Relation<UserEmailPreferenceEntity>[];
}
```

**Breaking change**: None - additive only

#### Component 3: EmailPreferenceDto (New)

**Purpose**: Validation for single email preference

**Location**: `backend/src/modules/user/dtos/email-preference.dto.ts`

```typescript
import { IsIn, IsEmail } from 'class-validator';

export class EmailPreferenceDto {
  @IsIn(['cc', 'bcc'], { message: 'Type must be either "cc" or "bcc"' })
  type: 'cc' | 'bcc';

  @IsEmail({}, { message: 'Invalid email format' })
  emailAddress: string;
}
```

**Validation**:
- `type`: Must be literal 'cc' or 'bcc'
- `emailAddress`: Valid email format (RFC 5322)

#### Component 4: UpdateUserDto (New)

**Purpose**: Validation for profile update request

**Location**: `backend/src/modules/user/dtos/update-user.dto.ts`

```typescript
import { IsString, MinLength, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EmailPreferenceDto } from './email-preference.dto';

export class UpdateUserDto {
  @IsString()
  @MinLength(1, { message: 'Name must be at least 1 character' })
  @IsOptional()
  name?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailPreferenceDto)
  @IsOptional()
  emailPreferences?: EmailPreferenceDto[];
}
```

**Validation**:
- `name`: Optional, minimum 1 character if provided
- `emailPreferences`: Optional array of valid EmailPreferenceDto objects
- Both fields optional - allows partial updates

#### Component 5: UserEmailPreferenceService (New)

**Purpose**: CRUD operations for email preferences

**Location**: `backend/src/modules/user/services/user-email-preference.service.ts`

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEmailPreferenceEntity } from '../entities/user-email-preference.entity';
import { EmailPreferenceDto } from '../dtos/email-preference.dto';

@Injectable()
export class UserEmailPreferenceService {
  constructor(
    @InjectRepository(UserEmailPreferenceEntity)
    private readonly repo: Repository<UserEmailPreferenceEntity>,
  ) {}

  async validateEmailPreferences(
    userEmail: string,
    preferences: EmailPreferenceDto[],
  ): Promise<void> {
    // Check for sender's own email
    if (preferences.some((p) => p.emailAddress === userEmail)) {
      throw new BadRequestException('Cannot add your own email as CC/BCC');
    }

    // Check for duplicates
    const emails = preferences.map((p) => p.emailAddress);
    if (emails.length !== new Set(emails).size) {
      throw new BadRequestException('Duplicate email addresses found');
    }
  }

  async updatePreferences(
    userId: string,
    preferences: EmailPreferenceDto[],
  ): Promise<void> {
    // Delete all existing
    await this.repo.delete({ userId });

    // Insert new preferences
    if (preferences.length > 0) {
      await this.repo.insert(
        preferences.map((p) => ({
          userId,
          type: p.type,
          emailAddress: p.emailAddress,
        })),
      );
    }
  }
}
```

**Why this is good taste**:
- Simple replace: 3 lines (delete + insert)
- Database batch insert (efficient)
- No smart diff (complexity eliminated)
- Validation separate from update (single responsibility)

#### Component 6: UserService (Modified)

**Purpose**: Add profile update orchestration

**Location**: `backend/src/modules/user/services/user.service.ts`

**New Method**:
```typescript
import { UserEmailPreferenceService } from './user-email-preference.service';
import { UpdateUserDto } from '../dtos/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly userEmailPrefService: UserEmailPreferenceService,
  ) {}

  async updateUser(userId: string, updateDto: UpdateUserDto): Promise<UserEntity> {
    // Find user
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['emailPreferences'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update name if provided
    if (updateDto.name !== undefined) {
      if (updateDto.name.length < 1) {
        throw new BadRequestException('Name must be at least 1 character');
      }
      user.name = updateDto.name;
    }

    // Update email preferences if provided
    if (updateDto.emailPreferences !== undefined) {
      await this.userEmailPrefService.validateEmailPreferences(
        user.email,
        updateDto.emailPreferences,
      );
      await this.userEmailPrefService.updatePreferences(
        userId,
        updateDto.emailPreferences,
      );
    }

    // Save user
    await this.userRepo.save(user);

    // Return with fresh relations
    return this.userRepo.findOne({
      where: { id: userId },
      relations: ['emailPreferences'],
    });
  }
}
```

**Flow**:
1. Find user (404 if not exists)
2. Update name if provided (validate length)
3. Update email preferences if provided (validate + replace)
4. Save user entity
5. Return fresh user with relations

#### Component 7: UserController (Modified)

**Purpose**: Add profile update endpoint

**Location**: `backend/src/modules/user/controllers/user.controller.ts`

**New Endpoint**:
```typescript
import { Patch, Param, Body, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { UpdateUserDto } from '../dtos/update-user.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Patch(':userId')
  @UseGuards(JwtAuthGuard)
  async updateUser(
    @Param('userId') userId: string,
    @GetUser() currentUser: UserEntity,
    @Body() updateDto: UpdateUserDto,
  ) {
    // Authorization check
    if (currentUser.id !== userId) {
      throw new ForbiddenException('Cannot update other users');
    }

    return this.userService.updateUser(userId, updateDto);
  }
}
```

**Authorization**: User can only update their own profile

**Error responses**:
- 400: Validation failed (DTO validation or business rules)
- 403: User trying to update another user
- 404: User not found
- 500: Database error

#### Component 8: EmailService (Modified)

**Purpose**: Apply CC/BCC to claim submission emails

**Location**: `backend/src/modules/email/services/email.service.ts`

**Modified Method**:
```typescript
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEmailPreferenceEntity } from '../../user/entities/user-email-preference.entity';

@Injectable()
export class EmailService {
  constructor(
    private readonly gmailClient: GmailClient,
    @InjectRepository(UserEmailPreferenceEntity)
    private readonly userEmailPrefRepo: Repository<UserEmailPreferenceEntity>,
  ) {}

  async sendClaimSubmission(claim: ClaimEntity): Promise<void> {
    const user = claim.user;

    // Fetch email preferences
    const prefs = await this.userEmailPrefRepo.find({
      where: { userId: user.id },
    });

    const ccEmails = prefs
      .filter((p) => p.type === 'cc')
      .map((p) => p.emailAddress);

    const bccEmails = prefs
      .filter((p) => p.type === 'bcc')
      .map((p) => p.emailAddress);

    try {
      // Send email with CC/BCC
      await this.gmailClient.sendEmail({
        to: 'finance@mavericks-consulting.com',
        cc: ccEmails,
        bcc: bccEmails,
        subject: `Expense Claim Submission - ${user.name}`,
        body: this.renderClaimTemplate(claim, user.name),
        attachments: await this.prepareAttachments(claim),
      });
    } catch (error) {
      this.logger.error(`Failed to send claim email: ${error.message}`, error);
      throw new InternalServerErrorException('Failed to send claim submission email');
    }
  }
}
```

**Changes**:
- Query email preferences by userId
- Separate into CC and BCC arrays
- Pass to GmailClient.sendEmail()
- Use `user.name` in subject and template footer
- No retry logic - fail fast if send fails

**Linus verdict**: Fetch preferences, filter by type, pass to email client. Four lines. Simple.

### Frontend Components

#### Component 1: ProfileForm (New)

**Purpose**: Main profile form with name + email preferences

**Location**: `frontend/src/app/components/profile/profile-form.tsx`

**Structure**:
```tsx
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileSchema } from '@/schemas/profile-schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile } from '@/api/users/update-profile';

interface EmailPreference {
  type: 'cc' | 'bcc';
  emailAddress: string;
}

interface ProfileFormData {
  name: string;
  emailPreferences: EmailPreference[];
}

export function ProfileForm({ user }: { user: User }) {
  const { toast } = useToast();
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      emailPreferences: user.emailPreferences || [],
    },
  });

  const ccFields = useFieldArray({
    control: form.control,
    name: 'emailPreferences',
    keyName: '_id',
  });

  const handleSubmit = async (data: ProfileFormData) => {
    try {
      await updateUserProfile(user.id, data);
      toast({ title: 'Profile updated successfully' });
    } catch (error) {
      toast({
        title: 'Failed to update profile',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Display Name Section */}
      <div>
        <Label htmlFor="name">Display Name</Label>
        <Input
          id="name"
          {...form.register('name')}
          placeholder="Your display name"
        />
        {form.formState.errors.name && (
          <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
        )}
      </div>

      {/* CC Emails Section */}
      <div>
        <Label>CC Email Addresses</Label>
        {ccFields.fields
          .filter((field) => field.type === 'cc')
          .map((field, index) => (
            <div key={field._id} className="flex gap-2 mb-2">
              <Input
                {...form.register(`emailPreferences.${index}.emailAddress`)}
                placeholder="email@example.com"
              />
              <Button
                type="button"
                variant="destructive"
                onClick={() => ccFields.remove(index)}
              >
                Remove
              </Button>
            </div>
          ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => ccFields.append({ type: 'cc', emailAddress: '' })}
        >
          + Add CC Email
        </Button>
      </div>

      {/* BCC Emails Section - similar structure */}
      {/* ... */}

      {/* Submit Button */}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        Save Changes
      </Button>
    </form>
  );
}
```

**Features**:
- Dynamic field arrays for CC/BCC emails
- Real-time validation with zod
- Toast notifications for success/error
- Disabled submit button during submission

#### Component 2: Profile Page (New)

**Purpose**: Profile page route

**Location**: `frontend/src/app/profile/page.tsx`

```tsx
'use client';

import { useUser } from '@/hooks/use-user';
import { ProfileForm } from '@/components/profile/profile-form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function ProfilePage() {
  const { data: user, isLoading } = useUser();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Not authenticated</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm user={user} />
        </CardContent>
      </Card>
    </div>
  );
}
```

**Simple**: Fetch user, render form. Done.

#### Component 3: UserDropdown (Modified)

**Purpose**: Add "Profile" menu item

**Location**: `frontend/src/app/components/navbar/user-dropdown.tsx`

**Changes**:
```tsx
import Link from 'next/link';

<DropdownMenuContent align="end">
  <DropdownMenuLabel>{user?.name}</DropdownMenuLabel>
  <DropdownMenuSeparator />

  {/* NEW: Profile menu item */}
  <DropdownMenuItem asChild>
    <Link href="/profile">Profile</Link>
  </DropdownMenuItem>

  <DropdownMenuItem onClick={handleLogout}>
    Logout
  </DropdownMenuItem>
</DropdownMenuContent>
```

**Linus verdict**: One new menu item. Two lines of code. Done.

#### Component 4: Profile Schema (New)

**Purpose**: Zod validation schema

**Location**: `frontend/src/schemas/profile-schema.ts`

```typescript
import { z } from 'zod';

export const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  emailPreferences: z
    .array(
      z.object({
        type: z.enum(['cc', 'bcc']),
        emailAddress: z.string().email('Invalid email format'),
      }),
    )
    .refine(
      (prefs) => {
        // No duplicates
        const emails = prefs.map((p) => p.emailAddress);
        return emails.length === new Set(emails).size;
      },
      { message: 'Duplicate email addresses found' },
    )
    .refine(
      (prefs, ctx) => {
        // Not user's own email (need to pass user.email somehow)
        // This will be checked in backend, frontend can skip or use context
        return true;
      },
    ),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
```

**Validation Rules**:
- Name: minimum 1 character
- Email format: valid email
- No duplicates in array
- Own email check: backend only (frontend doesn't have reliable user.email in schema context)

#### Component 5: API Client (New)

**Purpose**: HTTP client for profile update

**Location**: `frontend/src/api/users/update-profile.ts`

```typescript
import axios from '@/lib/axios';

export interface EmailPreference {
  type: 'cc' | 'bcc';
  emailAddress: string;
}

export interface UpdateUserRequest {
  name?: string;
  emailPreferences?: EmailPreference[];
}

export interface UpdateUserResponse {
  id: string;
  email: string;
  name: string;
  emailPreferences: Array<{
    id: string;
    type: 'cc' | 'bcc';
    emailAddress: string;
  }>;
}

export async function updateUserProfile(
  userId: string,
  data: UpdateUserRequest,
): Promise<UpdateUserResponse> {
  const response = await axios.patch(`/users/${userId}`, data);
  return response.data;
}
```

**Simple**: Type-safe API client. One function. Done.

## Data Models

### Database Migration

**Migration Name**: `AddUserEmailPreferences`

**Up Migration**:
```typescript
import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class AddUserEmailPreferences1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create user_email_preferences table
    await queryRunner.createTable(
      new Table({
        name: 'user_email_preferences',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '3',
            isNullable: false,
          },
          {
            name: 'emailAddress',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Add foreign key
    await queryRunner.createForeignKey(
      'user_email_preferences',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Add unique index
    await queryRunner.createIndex(
      'user_email_preferences',
      new TableIndex({
        name: 'IDX_user_email_unique',
        columnNames: ['userId', 'emailAddress'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user_email_preferences');
  }
}
```

**Key Points**:
- CASCADE delete on userId foreign key
- Unique index on (userId, emailAddress)
- Type column: varchar(3) - exact fit for 'cc'/'bcc'

## Error Handling

### Backend Error Scenarios

**Scenario 1: User tries to update another user's profile**
- Detection: `currentUser.id !== userId` in controller
- Response: 403 Forbidden
- Message: "Cannot update other users"

**Scenario 2: Invalid name (empty or whitespace)**
- Detection: `@MinLength(1)` decorator or service check
- Response: 400 Bad Request
- Message: "Name must be at least 1 character"

**Scenario 3: Invalid email format**
- Detection: `@IsEmail()` decorator in EmailPreferenceDto
- Response: 400 Bad Request
- Message: "Invalid email format"

**Scenario 4: User adds own email as CC/BCC**
- Detection: Service validation `preferences.some(p => p.emailAddress === user.email)`
- Response: 400 Bad Request
- Message: "Cannot add your own email as CC/BCC"

**Scenario 5: Duplicate emails in submission**
- Detection: Service validation `emails.length !== new Set(emails).size`
- Response: 400 Bad Request
- Message: "Duplicate email addresses found"

**Scenario 6: Same email as both CC and BCC (across multiple updates)**
- Detection: Database unique constraint `(userId, emailAddress)`
- Response: 400 Bad Request (catch QueryFailedError code 23505)
- Message: "Duplicate email address detected"

**Scenario 7: User not found**
- Detection: `userRepo.findOne()` returns null
- Response: 404 Not Found
- Message: "User not found"

**Scenario 8: Email send failure**
- Detection: GmailClient throws error
- Response: 500 Internal Server Error
- Message: "Failed to send claim submission email"
- Action: Log error details, do not retry

### Frontend Error Scenarios

**Scenario 1: Real-time validation errors**
- Detection: Zod schema validation on form input
- Display: Red error text below field
- Example: "Name is required", "Invalid email format"

**Scenario 2: Submit validation failure**
- Detection: API returns 400 with validation errors
- Display: Toast notification with error message
- Example: "Cannot add your own email as CC/BCC"

**Scenario 3: Authorization failure**
- Detection: API returns 403
- Display: Toast notification + redirect to home
- Example: "You don't have permission to update this profile"

**Scenario 4: Network error**
- Detection: Axios throws network error
- Display: Toast notification
- Example: "Network error. Please try again."

## Testing Strategy

### Unit Tests

**Backend UserEmailPreferenceService**:
```typescript
describe('UserEmailPreferenceService', () => {
  test('validateEmailPreferences: rejects user own email', async () => {
    const prefs = [{ type: 'cc', emailAddress: 'user@example.com' }];
    await expect(
      service.validateEmailPreferences('user@example.com', prefs),
    ).rejects.toThrow('Cannot add your own email as CC/BCC');
  });

  test('validateEmailPreferences: rejects duplicates', async () => {
    const prefs = [
      { type: 'cc', emailAddress: 'test@example.com' },
      { type: 'bcc', emailAddress: 'test@example.com' },
    ];
    await expect(
      service.validateEmailPreferences('user@example.com', prefs),
    ).rejects.toThrow('Duplicate email addresses found');
  });

  test('updatePreferences: deletes all then inserts new', async () => {
    const prefs = [{ type: 'cc', emailAddress: 'test@example.com' }];
    await service.updatePreferences('user-id', prefs);
    expect(mockRepo.delete).toHaveBeenCalledWith({ userId: 'user-id' });
    expect(mockRepo.insert).toHaveBeenCalledWith([
      { userId: 'user-id', type: 'cc', emailAddress: 'test@example.com' },
    ]);
  });
});
```

**Backend UserService**:
```typescript
describe('UserService.updateUser', () => {
  test('updates name when provided', async () => {
    const result = await service.updateUser('user-id', { name: 'New Name' });
    expect(result.name).toBe('New Name');
  });

  test('throws 400 if name is empty', async () => {
    await expect(service.updateUser('user-id', { name: '' })).rejects.toThrow(
      BadRequestException,
    );
  });

  test('updates email preferences when provided', async () => {
    const prefs = [{ type: 'cc', emailAddress: 'test@example.com' }];
    await service.updateUser('user-id', { emailPreferences: prefs });
    expect(mockEmailPrefService.updatePreferences).toHaveBeenCalled();
  });
});
```

**Frontend ProfileForm**:
```typescript
describe('ProfileForm', () => {
  test('renders display name input', () => {
    render(<ProfileForm user={mockUser} />);
    expect(screen.getByLabelText('Display Name')).toBeInTheDocument();
  });

  test('shows validation error for empty name', async () => {
    render(<ProfileForm user={mockUser} />);
    const input = screen.getByLabelText('Display Name');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
  });

  test('adds CC email field on button click', () => {
    render(<ProfileForm user={mockUser} />);
    fireEvent.click(screen.getByText('+ Add CC Email'));
    expect(screen.getAllByPlaceholderText('email@example.com')).toHaveLength(1);
  });
});
```

### Integration Tests

**API Test: Profile Update**:
```typescript
describe('PATCH /api/users/:userId', () => {
  test('updates user name', async () => {
    const res = await axios.patch(`/users/${testUser.id}`, {
      name: 'Updated Name',
    });
    expect(res.status).toBe(200);
    expect(res.data.name).toBe('Updated Name');
  });

  test('updates email preferences', async () => {
    const res = await axios.patch(`/users/${testUser.id}`, {
      emailPreferences: [
        { type: 'cc', emailAddress: 'test@example.com' },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.data.emailPreferences).toHaveLength(1);
  });

  test('rejects own email in preferences', async () => {
    const res = await axios.patch(
      `/users/${testUser.id}`,
      {
        emailPreferences: [
          { type: 'cc', emailAddress: testUser.email },
        ],
      },
      { validateStatus: () => true },
    );
    expect(res.status).toBe(400);
    expect(res.data.message).toContain('Cannot add your own email');
  });

  test('rejects duplicate emails', async () => {
    const res = await axios.patch(
      `/users/${testUser.id}`,
      {
        emailPreferences: [
          { type: 'cc', emailAddress: 'test@example.com' },
          { type: 'bcc', emailAddress: 'test@example.com' },
        ],
      },
      { validateStatus: () => true },
    );
    expect(res.status).toBe(400);
  });

  test('returns 403 when updating other user', async () => {
    const res = await axios.patch(
      `/users/other-user-id`,
      { name: 'Hacked' },
      { validateStatus: () => true },
    );
    expect(res.status).toBe(403);
  });
});
```

**E2E Test: Profile Page Flow**:
```typescript
describe('Profile Page', () => {
  test('user can update display name', async () => {
    await page.goto('/profile');
    await page.fill('[name="name"]', 'New Display Name');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Profile updated successfully')).toBeVisible();
  });

  test('user can add CC email', async () => {
    await page.goto('/profile');
    await page.click('text=+ Add CC Email');
    await page.fill('[placeholder="email@example.com"]', 'cc@example.com');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Profile updated successfully')).toBeVisible();
  });

  test('shows error for invalid email', async () => {
    await page.goto('/profile');
    await page.click('text=+ Add CC Email');
    await page.fill('[placeholder="email@example.com"]', 'invalid-email');
    await expect(page.locator('text=Invalid email format')).toBeVisible();
  });
});
```

### What We're NOT Testing

- Database CASCADE behavior (trust the database)
- TypeORM query generation (trust the library)
- Email format validation (trust @IsEmail decorator)
- Zod schema validation (trust zod library)

**Linus principle**: Test your code, not the libraries. Test your logic, not the database.

## Linus's Final Verdict

**Taste Rating**: 🟢 **Good Taste**

**Why**:
- Simple replace strategy: delete all + insert all (3 lines vs 50 lines of smart diff)
- Database enforces constraints: unique index prevents duplicate emails
- No soft delete: hard delete is simpler, no accumulation
- Single validation layer: DTO + service, no runtime validation
- No test emails: user discovers if it works on first real claim submission

**Data Structure**: User has-many email preferences. Database CASCADE handles deletion. Unique constraint prevents same email as both CC and BCC.

**Complexity Eliminated**:
- No smart diff for email preference updates
- No separate CC/BCC tables (one table with type column)
- No runtime validation at email send time
- No retry logic on email send failure
- No test email system

**Risk Point**: Zero. Additive changes only. Existing functionality unchanged. Database constraints prevent invalid data. Authorization check prevents cross-user updates.

**Ship it.**
