# Tasks Document

## Phase 1: Database Schema

- [ ] 1.1 Create UserEmailPreferenceEntity
  - Files:
    - `backend/src/modules/user/entities/user-email-preference.entity.ts` (create)
  - Create entity with fields: id (uuid), userId (uuid), type (varchar(3)), emailAddress (varchar(255))
  - Add ManyToOne relationship to UserEntity with onDelete: 'CASCADE'
  - Add unique index on (userId, emailAddress)
  - Purpose: Database model for storing user email preferences (CC/BCC)
  - _Leverage: UserEntity from backend/src/modules/user/entities/user.entity.ts_
  - _Requirements: Requirement 7 (Database Schema Changes)_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer | Task: Create UserEmailPreferenceEntity in backend/src/modules/user/entities/user-email-preference.entity.ts with columns (id: uuid primary key, userId: uuid, type: varchar(3) for 'cc'|'bcc', emailAddress: varchar(255)), add unique composite index on (userId, emailAddress), add ManyToOne relation to UserEntity with onDelete CASCADE | Restrictions: Use TypeORM decorators, follow existing entity patterns from user.entity.ts, type field must use literal union 'cc' | 'bcc' (not enum), ensure cascade delete is configured, use @Index decorator for unique constraint | Success: Entity compiles without errors, has proper relationships, unique constraint prevents duplicate (userId, emailAddress), CASCADE delete configured | Instructions: After completing implementation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 1.2 Update UserEntity with emailPreferences relationship
  - Files:
    - `backend/src/modules/user/entities/user.entity.ts` (modify)
  - Add OneToMany relationship to UserEmailPreferenceEntity with cascade: true
  - Ensure name field exists and is properly typed (varchar(255))
  - Purpose: Establish bidirectional relationship for email preferences
  - _Leverage: UserEmailPreferenceEntity from task 1.1_
  - _Requirements: Requirement 7 (Database Schema Changes)_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer | Task: Update UserEntity in backend/src/modules/user/entities/user.entity.ts by adding OneToMany relationship to UserEmailPreferenceEntity with cascade: true, verify name field exists as varchar(255), import UserEmailPreferenceEntity and use Relation<UserEmailPreferenceEntity[]> type | Restrictions: Follow existing OneToMany patterns in user.entity.ts (check oauthTokens or claims relationships), use optional chaining for emailPreferences field (emailPreferences?: Relation<...>), do not modify existing fields except name type verification | Success: Relationship is properly configured, cascade enabled, entity compiles without errors, can query user with emailPreferences relations | Instructions: After completing implementation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 1.3 Generate and run database migration
  - Files:
    - `backend/src/migrations/TIMESTAMP-AddUserEmailPreferences.ts` (generate)
  - Command: `make db/migration/generate path="AddUserEmailPreferences"`
  - Run migration: `make db/data/up`
  - Purpose: Create user_email_preferences table with constraints
  - _Leverage: UserEmailPreferenceEntity from task 1.1, existing migration patterns_
  - _Requirements: Requirement 7 (Database Schema Changes)_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer | Task: From project root, run 'make db/migration/generate path="AddUserEmailPreferences"' to generate migration, review generated migration to ensure it creates user_email_preferences table with correct columns, unique index on (userId, emailAddress), and foreign key with CASCADE delete, then run 'make db/data/up' to apply migration | Restrictions: Verify migration creates unique index correctly, verify CASCADE delete on foreign key, do not manually edit migration unless TypeORM generated incorrect DDL, ensure database is running before migration | Success: Migration generates successfully, migration runs without errors, user_email_preferences table exists with correct schema, unique constraint works, foreign key CASCADE configured | Instructions: After migration completes successfully, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

## Phase 2: Backend DTOs

- [ ] 2.1 Create EmailPreferenceDto
  - Files:
    - `backend/src/modules/user/dtos/email-preference.dto.ts` (create)
  - Create DTO with fields: type ('cc' | 'bcc'), emailAddress (string)
  - Add validation: @IsIn(['cc', 'bcc']) for type, @IsEmail() for emailAddress
  - Purpose: Validation for single email preference entry
  - _Leverage: class-validator decorators_
  - _Requirements: Requirement 4 (Email Preference Validation)_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer | Task: Create EmailPreferenceDto in backend/src/modules/user/dtos/email-preference.dto.ts with fields (type: 'cc' | 'bcc', emailAddress: string), add @IsIn(['cc', 'bcc']) decorator to type field with custom message, add @IsEmail() decorator to emailAddress field with custom message | Restrictions: Use class-validator decorators only, do not use TypeScript enum (use literal union type), follow existing DTO patterns from user module, include descriptive error messages | Success: DTO compiles without errors, validation decorators work correctly, proper type safety for 'cc' | 'bcc' union | Instructions: After completing implementation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 2.2 Create UpdateUserDto
  - Files:
    - `backend/src/modules/user/dtos/update-user.dto.ts` (create)
  - Create DTO with optional fields: name (string, min 1 char), emailPreferences (EmailPreferenceDto[])
  - Add validation: @IsString() @MinLength(1) @IsOptional() for name, @IsArray() @ValidateNested() @IsOptional() for emailPreferences
  - Purpose: Validation for profile update request
  - _Leverage: EmailPreferenceDto from task 2.1, class-validator and class-transformer_
  - _Requirements: Requirement 1 (User Profile Update Endpoint), Requirement 2 (Username Customization)_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer | Task: Create UpdateUserDto in backend/src/modules/user/dtos/update-user.dto.ts with optional fields (name: string with @IsString @MinLength(1) @IsOptional, emailPreferences: EmailPreferenceDto[] with @IsArray @ValidateNested @IsOptional), import EmailPreferenceDto and use @Type(() => EmailPreferenceDto) decorator for array transformation | Restrictions: Both fields must be optional (partial update support), use @Type decorator from class-transformer for nested validation, follow existing DTO patterns, include descriptive error messages for MinLength | Success: DTO compiles without errors, both fields optional, nested validation works for emailPreferences array, name validation enforces minimum 1 character | Instructions: After completing implementation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 2.3 Update DTO barrel export
  - Files:
    - `backend/src/modules/user/dtos/index.ts` (modify)
  - Add exports for EmailPreferenceDto and UpdateUserDto
  - Purpose: Centralized DTO exports for user module
  - _Leverage: EmailPreferenceDto from task 2.1, UpdateUserDto from task 2.2_
  - _Requirements: Code organization_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer | Task: Update backend/src/modules/user/dtos/index.ts to add exports for EmailPreferenceDto and UpdateUserDto, follow existing export pattern | Restrictions: Maintain alphabetical order if existing exports are ordered, use named exports (not default), do not modify existing exports | Success: Both DTOs can be imported from '@/modules/user/dtos', barrel export works correctly | Instructions: After completing implementation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

## Phase 3: Backend Services

- [ ] 3.1 Create UserEmailPreferenceService
  - Files:
    - `backend/src/modules/user/services/user-email-preference.service.ts` (create)
  - Implement validateEmailPreferences(userEmail, preferences) - check own email and duplicates
  - Implement updatePreferences(userId, preferences) - delete all + insert all strategy
  - Purpose: Service layer for email preference CRUD operations
  - _Leverage: UserEmailPreferenceEntity from task 1.1, EmailPreferenceDto from task 2.1_
  - _Requirements: Requirement 4 (Email Preference Validation), Requirement 5 (Email Preference Update Strategy)_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer | Task: Create UserEmailPreferenceService in backend/src/modules/user/services/user-email-preference.service.ts with two methods: (1) validateEmailPreferences(userEmail: string, preferences: EmailPreferenceDto[]) that throws BadRequestException if preferences contain userEmail or has duplicates, (2) updatePreferences(userId: string, preferences: EmailPreferenceDto[]) that deletes all existing preferences with DELETE WHERE userId = ? then batch inserts new preferences | Restrictions: Use simple replace strategy (delete all + insert all), no smart diff logic, inject UserEmailPreferenceEntity repository, follow service patterns from existing services, validation method must check: preferences.some(p => p.emailAddress === userEmail) and duplicate check using Set | Success: Service compiles without errors, validateEmailPreferences throws correct errors, updatePreferences deletes all then inserts (verified via tests), simple and maintainable code | Instructions: After completing implementation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 3.2 Update UserService with updateUser method
  - Files:
    - `backend/src/modules/user/services/user.service.ts` (modify)
  - Add updateUser(userId, updateDto) method
  - Orchestrate: query user, update name if provided, validate and update email preferences if provided, save and return
  - Purpose: Main service method for profile updates
  - _Leverage: UserEmailPreferenceService from task 3.1, UpdateUserDto from task 2.2, existing UserService structure_
  - _Requirements: Requirement 1 (User Profile Update Endpoint), Requirement 2 (Username Customization), Requirement 3 (Email Preferences Management)_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer | Task: Update UserService in backend/src/modules/user/services/user.service.ts by adding updateUser(userId: string, updateDto: UpdateUserDto) method that: (1) queries user with emailPreferences relations, throws NotFoundException if not found, (2) if updateDto.name provided, validates length >= 1 and updates user.name, (3) if updateDto.emailPreferences provided, calls userEmailPrefService.validateEmailPreferences then updatePreferences, (4) saves user entity, (5) returns fresh user with relations | Restrictions: Inject UserEmailPreferenceService in constructor, use existing userRepo, follow existing service method patterns, throw NotFoundException for user not found, throw BadRequestException for validation failures, ensure final return includes emailPreferences relation | Success: Method compiles without errors, orchestrates name update and email preferences update correctly, proper error handling, returns complete user with relations | Instructions: After completing implementation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 3.3 Register UserEmailPreferenceService in UserModule
  - Files:
    - `backend/src/modules/user/user.module.ts` (modify)
  - Add UserEmailPreferenceEntity to TypeOrmModule.forFeature imports
  - Add UserEmailPreferenceService to providers array
  - Purpose: Wire new service into dependency injection
  - _Leverage: UserEmailPreferenceService from task 3.1, UserEmailPreferenceEntity from task 1.1_
  - _Requirements: Module configuration_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer | Task: Update UserModule in backend/src/modules/user/user.module.ts by adding UserEmailPreferenceEntity to TypeOrmModule.forFeature array and UserEmailPreferenceService to providers array | Restrictions: Follow existing module patterns, add entity to forFeature imports for repository injection, ensure service is in providers for dependency injection, do not modify exports unless service needs to be used outside module | Success: Module compiles without errors, UserEmailPreferenceService can be injected, repository available in service, application starts successfully | Instructions: After completing implementation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

## Phase 4: Backend Controller

- [ ] 4.1 Add PATCH /:userId endpoint to UserController
  - Files:
    - `backend/src/modules/user/controllers/user.controller.ts` (modify)
  - Implement PATCH /:userId endpoint with JwtAuthGuard
  - Add authorization check: currentUser.id === userId (throw 403 if not)
  - Call userService.updateUser and return result
  - Purpose: HTTP endpoint for profile updates
  - _Leverage: UserService.updateUser from task 3.2, UpdateUserDto from task 2.2, existing JwtAuthGuard and GetUser decorator_
  - _Requirements: Requirement 1 (User Profile Update Endpoint)_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer | Task: Update UserController in backend/src/modules/user/controllers/user.controller.ts by adding PATCH /:userId endpoint decorated with @Patch(':userId') @UseGuards(JwtAuthGuard), extract userId from @Param, currentUser from @GetUser decorator, updateDto from @Body, check if currentUser.id !== userId throw ForbiddenException('Cannot update other users'), otherwise call userService.updateUser(userId, updateDto) and return result | Restrictions: Use existing JwtAuthGuard, use GetUser decorator for current user, authorization check before service call, follow existing controller patterns, let global exception filter handle errors | Success: Endpoint compiles without errors, authorization check works (403 for other users), calls service correctly, returns updated user data, proper HTTP status codes (200/400/403/404) | Instructions: After completing implementation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

## Phase 5: Email Integration

- [ ] 5.1 Update EmailService to apply CC/BCC preferences
  - Files:
    - `backend/src/modules/email/services/email.service.ts` (modify)
  - Inject UserEmailPreferenceEntity repository
  - Update sendClaimSubmission method to query and apply email preferences
  - Separate preferences by type (cc/bcc) and pass to GmailClient
  - Update email subject and template to use user.name
  - Purpose: Apply user email preferences to claim submission emails
  - _Leverage: UserEmailPreferenceEntity from task 1.1, existing EmailService and GmailClient_
  - _Requirements: Requirement 6 (Apply Email Preferences to Claim Submissions)_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer | Task: Update EmailService in backend/src/modules/email/services/email.service.ts by: (1) injecting UserEmailPreferenceEntity repository in constructor, (2) modifying sendClaimSubmission method to query preferences with find({ where: { userId: user.id }}), (3) separating preferences into ccEmails and bccEmails arrays by filtering on type, (4) passing cc and bcc arrays to gmailClient.sendEmail(), (5) updating email subject to use user.name instead of hardcoded name, (6) updating email template footer to use user.name | Restrictions: Add email preference query before sending email, filter preferences by type ('cc' vs 'bcc'), ensure empty arrays are passed if no preferences exist, wrap send in try-catch and throw InternalServerErrorException on failure, do not add retry logic | Success: Email preferences are queried correctly, CC/BCC emails applied to outgoing claim emails, user.name appears in subject and template, email sends successfully with preferences, error handling works | Instructions: After completing implementation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 5.2 Register UserEmailPreferenceEntity in EmailModule
  - Files:
    - `backend/src/modules/email/email.module.ts` (modify)
  - Add UserEmailPreferenceEntity to TypeOrmModule.forFeature imports
  - Purpose: Make repository available for EmailService injection
  - _Leverage: UserEmailPreferenceEntity from task 1.1_
  - _Requirements: Module configuration for email integration_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer | Task: Update EmailModule in backend/src/modules/email/email.module.ts by adding UserEmailPreferenceEntity to TypeOrmModule.forFeature array (if TypeOrmModule.forFeature is used in this module) | Restrictions: Only add entity import if EmailService needs repository injection, check if module already has TypeOrmModule.forFeature or if it needs to be added, follow existing module patterns | Success: EmailService can inject UserEmailPreferenceEntity repository, module compiles without errors, application starts successfully | Instructions: After completing implementation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

## Phase 6: Frontend Profile Page

- [ ] 6.1 Create profile schema (zod validation)
  - Files:
    - `frontend/src/schemas/profile-schema.ts` (create)
  - Create zod schema with name (min 1 char), emailPreferences array (type + emailAddress)
  - Add custom refinements for: no duplicate emails, valid email format
  - Export ProfileFormData type
  - Purpose: Frontend validation schema for profile form
  - _Leverage: zod library_
  - _Requirements: Requirement 9 (Frontend Form Validation)_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer | Task: Create profile schema in frontend/src/schemas/profile-schema.ts using zod with fields (name: string min 1 char, emailPreferences: array of objects with type enum ['cc', 'bcc'] and emailAddress email format), add refine for duplicate email check (emails.length === new Set(emails).size), export ProfileFormData type using z.infer | Restrictions: Use zod schema syntax, validation must match backend DTOs (name min 1, email format, no duplicates), own email check can be skipped in schema (backend will validate), follow existing schema patterns if any exist in frontend | Success: Schema compiles without errors, validates name length, validates email format, catches duplicate emails, type inference works correctly | Instructions: After completing implementation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 6.2 Create API client for profile update
  - Files:
    - `frontend/src/api/users/update-profile.ts` (create)
  - Implement updateUserProfile(userId, data) function using axios
  - Define TypeScript interfaces for request/response
  - Purpose: Type-safe HTTP client for profile updates
  - _Leverage: axios instance from frontend/src/lib/axios.ts or similar_
  - _Requirements: Requirement 1 (User Profile Update Endpoint)_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer | Task: Create API client in frontend/src/api/users/update-profile.ts with updateUserProfile(userId: string, data: UpdateUserRequest) function that calls axios.patch(\`/users/\${userId}\`, data), define UpdateUserRequest interface (name?: string, emailPreferences?: array), define UpdateUserResponse interface matching backend response (id, email, name, emailPreferences array with id/type/emailAddress), return typed response | Restrictions: Use existing axios instance, follow existing API client patterns from frontend, ensure proper TypeScript typing, handle errors via axios interceptors (don't catch in client) | Success: API client compiles without errors, properly typed interfaces, axios call configured correctly, returns expected response type | Instructions: After completing implementation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 6.3 Create ProfileForm component
  - Files:
    - `frontend/src/app/components/profile/profile-form.tsx` (create)
  - Implement form with react-hook-form + zod resolver
  - Create three sections: Display Name, CC Emails, BCC Emails
  - Use useFieldArray for dynamic email fields
  - Add [+ Add More] / [Remove] buttons for email fields
  - Show success/error toast notifications
  - Purpose: Main profile form component
  - _Leverage: profile schema from task 6.1, updateUserProfile API from task 6.2, react-hook-form, shadcn/ui components_
  - _Requirements: Requirement 8 (Frontend Profile Page), Requirement 9 (Frontend Form Validation)_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer | Task: Create ProfileForm component in frontend/src/app/components/profile/profile-form.tsx using react-hook-form with zodResolver(profileSchema), implement sections for Display Name (Input), CC Emails (dynamic useFieldArray), BCC Emails (dynamic useFieldArray), each email field has [Remove] button, each section has [+ Add More] button, submit calls updateUserProfile API, show success toast on success and error toast on failure | Restrictions: Use shadcn/ui components (Button, Input, Label), follow dark mode styling, use useToast hook for notifications, disable submit button while submitting, handle API errors gracefully, filter fields by type ('cc' vs 'bcc') for separate sections | Success: Form renders correctly, dynamic fields work (add/remove), validation shows errors in real-time, submit calls API with correct data, toast notifications appear, form is accessible and mobile responsive | Instructions: After completing implementation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 6.4 Create profile page route
  - Files:
    - `frontend/src/app/profile/page.tsx` (create)
  - Create profile page component that renders ProfileForm
  - Fetch current user data and pass to form
  - Show loading state while fetching user
  - Purpose: Profile page route at /profile
  - _Leverage: ProfileForm from task 6.3, useUser hook for current user data_
  - _Requirements: Requirement 8 (Frontend Profile Page)_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer | Task: Create profile page in frontend/src/app/profile/page.tsx that uses useUser hook to fetch current user, shows loading state while fetching, renders ProfileForm component with user prop when loaded, wraps form in Card component with title "Profile Settings" | Restrictions: Use existing useUser hook, handle loading and unauthenticated states, use shadcn/ui Card component, follow dark mode styling, ensure page is mobile responsive | Success: Page renders correctly, loading state works, ProfileForm receives user data, page follows app styling, accessible and responsive | Instructions: After completing implementation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 6.5 Add Profile menu item to navbar dropdown
  - Files:
    - `frontend/src/app/components/navbar/user-dropdown.tsx` (modify)
  - Add "Profile" menu item with link to /profile
  - Place between user name label and Logout item
  - Purpose: Navigation to profile page
  - _Leverage: Existing navbar dropdown component, Next.js Link_
  - _Requirements: Requirement 8 (Frontend Profile Page)_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer | Task: Update user dropdown component in frontend/src/app/components/navbar/user-dropdown.tsx (or similar location) by adding DropdownMenuItem with Link to /profile, text "Profile", placed after DropdownMenuLabel and before Logout item, add DropdownMenuSeparator after user name if not exists | Restrictions: Use shadcn/ui DropdownMenuItem with asChild pattern for Link, follow existing dropdown styling, maintain dark mode compatibility, ensure menu item is keyboard accessible | Success: Profile menu item appears in dropdown, clicking navigates to /profile, styling matches existing menu items, keyboard navigation works | Instructions: After completing implementation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

## Phase 7: Backend Testing

- [ ] 7.1 Create unit tests for UserEmailPreferenceService
  - Files:
    - `backend/src/modules/user/services/user-email-preference.service.spec.ts` (create)
  - Test validateEmailPreferences: rejects own email, rejects duplicates, accepts valid
  - Test updatePreferences: deletes all then inserts new
  - Purpose: Verify email preference service logic
  - _Leverage: UserEmailPreferenceService from task 3.1_
  - _Requirements: All validation and update logic requirements_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer | Task: Create unit tests for UserEmailPreferenceService in backend/src/modules/user/services/user-email-preference.service.spec.ts covering: (1) validateEmailPreferences throws BadRequestException when preferences contain user's own email, (2) throws when duplicate emails in array, (3) passes for valid preferences, (4) updatePreferences calls repo.delete then repo.insert with correct data, (5) handles empty preferences array (delete only, no insert) | Restrictions: Mock UserEmailPreferenceEntity repository, use Jest framework, follow existing test patterns from user module, verify mock calls with toHaveBeenCalledWith, test error messages match service implementation | Success: All test cases pass, service validation logic verified, update strategy verified (delete + insert), proper mocking and assertions | Instructions: After completing tests and verification, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 7.2 Create unit tests for UserService.updateUser
  - Files:
    - `backend/src/modules/user/services/user.service.spec.ts` (modify or create)
  - Test updateUser: updates name, updates email preferences, throws on validation errors, throws 404 for non-existent user
  - Purpose: Verify profile update orchestration
  - _Leverage: UserService.updateUser from task 3.2_
  - _Requirements: Requirement 1 (User Profile Update Endpoint), Requirement 2 (Username Customization)_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer | Task: Create or update UserService test file backend/src/modules/user/services/user.service.spec.ts with tests for updateUser method covering: (1) updates user name when provided, (2) updates email preferences when provided via userEmailPrefService, (3) throws BadRequestException for empty name, (4) throws NotFoundException when user not found, (5) returns user with emailPreferences relation | Restrictions: Mock userRepo and userEmailPrefService, use Jest, verify service calls both validate and update on email preference service, verify repo.save called, verify final query includes relations | Success: All test cases pass, orchestration logic verified, proper error handling tested, mocks configured correctly | Instructions: After completing tests and verification, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 7.3 Create unit tests for UserController PATCH endpoint
  - Files:
    - `backend/src/modules/user/controllers/user.controller.spec.ts` (modify or create)
  - Test PATCH /:userId: authorization check (403 for other users), successful update, proper delegation to service
  - Purpose: Verify endpoint authorization and delegation
  - _Leverage: UserController PATCH endpoint from task 4.1_
  - _Requirements: Requirement 1 (User Profile Update Endpoint)_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer | Task: Create or update UserController test file backend/src/modules/user/controllers/user.controller.spec.ts with tests for PATCH /:userId endpoint covering: (1) calls userService.updateUser with correct params when userId matches currentUser.id, (2) throws ForbiddenException when userId does not match currentUser.id, (3) returns updated user data from service | Restrictions: Mock UserService, mock JwtAuthGuard to return test user, use Jest, test authorization check happens before service call, follow existing controller test patterns | Success: All test cases pass, authorization logic verified (403 for mismatch), service delegation verified, proper return values | Instructions: After completing tests and verification, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 7.4 Run backend unit tests
  - Command: `make test/unit` (from project root)
  - Verify all unit tests pass including new profile-related tests
  - Purpose: Ensure no regressions and new tests pass
  - _Leverage: Existing test infrastructure_
  - _Requirements: All backend testing requirements_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer | Task: From project root, run 'make test/unit' to execute backend unit test suite, verify all tests pass including newly created tests for UserEmailPreferenceService, UserService.updateUser, and UserController PATCH endpoint, investigate and fix any failures | Restrictions: Do not skip failing tests, ensure new tests are discovered by test runner, check coverage if possible, all tests must pass before marking complete | Success: All backend unit tests pass, new tests execute successfully, no regressions in existing tests, test coverage maintained or improved | Instructions: After all tests pass, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

## Phase 8: Integration Testing

- [ ] 8.1 Create API integration tests for profile update endpoint
  - Files:
    - `api-test/src/tests/user-profile.test.ts` (create)
  - Test PATCH /api/users/:userId: update name, update email preferences, validation errors, authorization
  - Purpose: Verify end-to-end profile update flow
  - _Leverage: axios from api-test config, test user setup_
  - _Requirements: All profile update requirements_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Integration Engineer | Task: Create integration tests in api-test/src/tests/user-profile.test.ts covering: (1) PATCH /users/:userId with name updates user name, (2) PATCH with emailPreferences stores preferences correctly, (3) PATCH with own email returns 400, (4) PATCH with duplicate emails returns 400, (5) PATCH with different userId returns 403, (6) PATCH with empty name returns 400, (7) response includes updated user with emailPreferences array | Restrictions: Use existing axios instance with auth headers, use test user from setup, verify response status codes and data structure, test actual HTTP calls (not mocked), ensure test cleanup (delete preferences after tests if needed) | Success: 7+ integration tests pass, profile update flow verified end-to-end, validation works, authorization enforced, response format correct | Instructions: After completing tests and verification, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 8.2 Verify email preferences applied to claim submissions
  - Files:
    - `api-test/src/tests/claim-submission-with-preferences.test.ts` (create or add to existing claim tests)
  - Test claim submission with CC/BCC preferences applies them to email
  - Purpose: Verify email integration works end-to-end
  - _Leverage: Existing claim submission tests, email service_
  - _Requirements: Requirement 6 (Apply Email Preferences to Claim Submissions)_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Integration Engineer | Task: Create or update claim submission integration test that: (1) sets up test user with email preferences via PATCH /users/:userId, (2) creates and submits claim via existing claim endpoints, (3) verifies email was sent (check logs or mock email service if possible), (4) verifies CC/BCC were applied (may require email service spy or log inspection) | Restrictions: Use existing claim submission flow, add email preference setup before claim submission, verification method depends on email service implementation (may need to check logs or use test email service), focus on integration not unit testing | Success: Test verifies email preferences are applied when claim is submitted, CC/BCC emails passed to email service, integration between profile and email service works | Instructions: After completing test and verification, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 8.3 Run API integration tests
  - Command: `make test/api` (from project root)
  - Verify all API tests pass including new profile tests
  - Purpose: Ensure API layer works correctly end-to-end
  - _Leverage: Existing test infrastructure_
  - _Requirements: All integration testing requirements_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer | Task: From project root, run 'make test/api' to execute API integration test suite, verify all tests pass including new user-profile.test.ts and claim submission with preferences test, investigate and fix any failures, ensure ENABLE_API_TEST_MODE=true in .env and database is running | Restrictions: All tests must pass, fix failures before marking complete, ensure test isolation (each test should clean up), verify test user has correct state before each test | Success: All API integration tests pass, new profile tests execute successfully, claim submission with preferences verified, no regressions | Instructions: After all tests pass, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

## Phase 9: Frontend Testing

- [ ] 9.1 Create ProfileForm component tests
  - Files:
    - `frontend/src/app/components/profile/profile-form.test.tsx` (create)
  - Test form renders, validation works, dynamic fields add/remove, submission calls API
  - Purpose: Verify profile form component behavior
  - _Leverage: ProfileForm from task 6.3_
  - _Requirements: Requirement 8 (Frontend Profile Page), Requirement 9 (Frontend Form Validation)_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend QA Engineer | Task: Create component tests for ProfileForm in frontend/src/app/components/profile/profile-form.test.tsx covering: (1) renders display name input and email sections, (2) shows validation error for empty name, (3) shows validation error for invalid email format, (4) adds CC email field on [+ Add CC Email] click, (5) removes email field on [Remove] click, (6) calls updateUserProfile API on form submit with correct data, (7) shows success toast on API success, (8) shows error toast on API failure | Restrictions: Use React Testing Library and Jest, mock API client, mock toast hook, follow existing component test patterns, test user interactions with fireEvent or userEvent, use async/await for async operations | Success: 8+ component tests pass, form behavior verified, validation tested, API integration tested with mocks, toast notifications verified | Instructions: After completing tests and verification, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 9.2 Create E2E test for profile page flow
  - Files:
    - `frontend/e2e/profile.spec.ts` (create, if E2E tests exist)
  - Test complete user flow: navigate to profile, update name, add CC email, submit, verify success
  - Purpose: Verify complete profile update user journey
  - _Leverage: Existing E2E test infrastructure (Playwright/Cypress)_
  - _Requirements: All frontend requirements end-to-end_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA E2E Engineer | Task: Create E2E test for profile page in appropriate E2E test directory (e.g., frontend/e2e/profile.spec.ts) covering: (1) user logs in and navigates to /profile, (2) updates display name and submits, (3) adds CC email address and submits, (4) sees success toast notification, (5) refreshes page and sees updated values persisted | Restrictions: Use existing E2E framework (Playwright/Cypress), use test user credentials, ensure test cleanup (reset preferences after test), follow existing E2E patterns, handle async operations with proper waits | Success: E2E test passes, complete user flow verified including persistence, test is stable and doesn't flake | Instructions: After completing test and verification, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 9.3 Run frontend tests
  - Command: `pnpm test` (from frontend directory) or appropriate test command
  - Verify all frontend tests pass including new profile tests
  - Purpose: Ensure frontend components work correctly
  - _Leverage: Existing test infrastructure_
  - _Requirements: All frontend testing requirements_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer | Task: From frontend directory or project root, run appropriate test command (e.g., 'pnpm test' or 'npm test') to execute frontend test suite, verify all tests pass including new ProfileForm tests, investigate and fix any failures | Restrictions: All tests must pass, ensure new tests are discovered, check if E2E tests need separate command, fix failures before marking complete | Success: All frontend tests pass, new component tests execute successfully, no regressions in existing tests | Instructions: After all tests pass, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

## Phase 10: Documentation & Cleanup

- [ ] 10.1 Update API documentation
  - Files:
    - `docs/project-info/api-endpoints.md` (modify, if exists)
  - Document PATCH /api/users/:userId endpoint with request/response examples
  - Purpose: Keep API documentation current
  - _Leverage: Endpoint implementation from task 4.1_
  - _Requirements: Documentation requirements_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical Writer | Task: Update docs/project-info/api-endpoints.md (if exists) by adding documentation for PATCH /api/users/:userId endpoint including: authentication requirement (JWT), authorization rule (own profile only), request body schema (UpdateUserDto), response format, status codes (200/400/403/404/500), example request/response | Restrictions: Follow existing documentation format and style, include clear examples, document all status codes, note authorization requirement, keep concise | Success: Endpoint is properly documented, examples are accurate, format matches existing docs | Instructions: After completing documentation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 10.2 Update project status in CLAUDE.md
  - Files:
    - `CLAUDE.md` (modify)
  - Mark user profile page feature as implemented in status section
  - Purpose: Keep project status documentation current
  - _Leverage: Complete implementation_
  - _Requirements: Documentation requirements_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical Writer | Task: Update CLAUDE.md status section to mark user profile page feature as implemented, add bullet point under "Implemented" section describing: user profile page with username customization and CC/BCC email preferences for claim submissions, note database schema changes (user_email_preferences table), mention email integration | Restrictions: Follow existing status format in CLAUDE.md, keep description concise (2-3 lines), place in appropriate section (likely under Frontend or User Features), maintain markdown formatting | Success: Status section updated correctly, feature marked as implemented, description is clear and accurate | Instructions: After updating documentation, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 10.3 Run code quality checks
  - Commands: `make format` and `make lint` (from project root)
  - Fix any linting or formatting issues
  - Purpose: Ensure code meets project quality standards
  - _Leverage: Existing lint and format tools_
  - _Requirements: Code quality standards_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Code Quality Engineer | Task: Execute code quality checks from project root: (1) run 'make format' to format all new and modified code, (2) run 'make lint' to check for linting errors, (3) fix any issues found in new code (backend entities, DTOs, services, controller, frontend components), (4) search for console.log, TODO, FIXME in new code and remove/resolve | Restrictions: Fix all linting errors in new code, format all files, remove debug code, follow TypeScript strict mode, ensure no 'any' types in new code | Success: make format completes without additional changes, make lint passes with no errors in new code, no debug statements remain, code follows project standards | Instructions: After all quality checks pass, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`_

- [ ] 10.4 Final verification and spec completion
  - Verify complete user flow: update profile via UI, submit claim, verify CC/BCC applied
  - Confirm all acceptance criteria met from requirements.md
  - Validate implementation matches design.md
  - Purpose: Final sanity check before closing spec
  - _Leverage: Complete implementation_
  - _Requirements: All requirements_
  - _Prompt: Implement the task for spec user-profile-page, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Tech Lead | Task: Perform final verification: (1) manually test profile page - update name, add CC/BCC emails, submit and verify success, (2) manually test claim submission - verify email includes CC/BCC from preferences, (3) review all acceptance criteria in requirements.md and verify each is met, (4) review implementation against design.md checklist and confirm all components created, (5) verify database migration ran successfully and table exists, (6) verify authorization works (cannot update other user's profile) | Restrictions: Test complete user flow end-to-end, verify every acceptance criterion, ensure no shortcuts or incomplete features, test edge cases (empty preferences, own email rejection, duplicates), confirm database constraints work | Success: Complete user flow works, all acceptance criteria verified, implementation matches design completely, no bugs found, ready for production, spec is ready to close | Instructions: After all verifications pass, mark this task as completed in tasks.md by changing `- [ ]` to `- [x]`. Spec implementation is complete._

---

**Implementation Notes**:

- **Estimated Total Time**: ~4-6 hours for experienced full-stack developer
- **Critical Path**: Phase 1 (Database) → Phase 2-5 (Backend) → Phase 6 (Frontend) → Phase 7-9 (Testing) → Phase 10 (Documentation)
- **Dependencies**: Database schema must be complete before backend services, backend API must be complete before frontend integration
- **Testing Strategy**: Unit tests in parallel with integration tests, E2E tests after all integration tests pass

**Linus's Checklist Summary**:
- Total new files: ~20 (entities, DTOs, services, controller modifications, frontend components, tests)
- Total modified files: ~8
- Database tables added: 1 (user_email_preferences)
- Net complexity: Low (simple CRUD with database-enforced constraints)
- Lines of new code: ~1200 total (implementation + tests)
