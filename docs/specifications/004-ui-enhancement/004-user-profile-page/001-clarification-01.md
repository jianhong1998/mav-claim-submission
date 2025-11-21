# Profile Page - Technical Clarification Questions

**Feature Request**: User profile page for username changes and CC/BCC email configuration (Feedback 005)

**Current Answer**: "Global user preference applied to all email sending after the address is added"

**Status**: ⚠️ Requires detailed technical clarification before implementation

---

## Layer 1: Data Structure Analysis

> "Bad programmers worry about the code. Good programmers worry about data structures."

### Q1: Username Storage & Relationship

**Context**: You have Google OAuth that provides:

- Email: `user@mavericks-consulting.com` (from OAuth)
- Profile name: User's Google account display name (from OAuth)

**Question**: What exactly is this "username that displays in app and email"?

**Option A**: Override display name (separate from OAuth name)

- Store custom display name in database
- Completely replace OAuth name in UI and emails
- Potential confusion: Google says "John Smith" but app shows "Johnny"

**Option B**: Nickname/alias for UI only

- Show in UI but emails still use OAuth name for authenticity
- Preserves email header integrity

**Option C**: Something else entirely?

**Follow-up**: Should we show BOTH names somewhere?

- Google account name (read-only, source of truth)
- Custom display name (user-editable)

#### Answer

Go with Option A.
When user update the username, the name in UserEntity (@backend/src/modules/user/entities/user.entity.ts ) should be overwritten.
Note that when frontend request for update username, backend must ensure the username is more than or equal to 1 character.

---

### Q2: CC/BCC Email Storage - Database Schema

**Question**: Where does CC/BCC email data live?

**Option A**: Simple columns in User entity

```typescript
// Single email address per field
class User {
  ccEmail?: string; // "personal@gmail.com"
  bccEmail?: string; // "backup@gmail.com"
}
```

**Option B**: Separate preferences table (extensible)

```typescript
class UserEmailPreference {
  userId: string;
  ccEmail?: string;
  bccEmail?: string;
  // Future: notificationPrefs, etc.
}
```

**Option C**: JSON array (multiple addresses)

```typescript
class User {
  ccEmails: string[]; // ["personal@gmail.com", "backup@gmail.com"]
  bccEmails: string[]; // ["archive@domain.com"]
}
```

**My concern**: Option A is simplest for MVP. Option C might be over-engineering. Option B is best for future extensibility.

**Decision needed**: Do you want to support:

- Single CC email only?
- Single CC + single BCC?
- Multiple CC/BCC addresses?

#### Answer

We should let user storing multiple CC and BCC email addresses.
I will prefer option B with the entity below:

```ts
@Index(['userId']) // double check if this indexing the foreign key in this table
class UserEmailPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  type: 'cc' | 'bcc';
  emailAddress: string;

  user: Relation<UserEntity>;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
  @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
  deletedAt?: Date | null;
}

class UserEntity {
  // other fields

  @OneToMany(
    () => UserEmailPreference,
    (userPreference) => userPreference.user,
    { cascade: true }
  )
  userEmailPreference?: Relation<UserEmailPreference>[];
}
```

---

### Q3: Email Field Semantics - Display Name in Email

**Question**: When you say "username that displays in email," do you mean:

**Option A**: The "From" name in email header

```
From: "Custom Username" <user@mavericks-consulting.com>
Subject: Expense Claim Submission
```

**Option B**: Username appearing IN the email body template

```
Hello,

[Custom Username] has submitted an expense claim...
```

**Option C**: Both?

**Current implementation**: Gmail API sends emails from OAuth user's account. The "From" address is determined by OAuth token owner.

**Technical constraint**: We CANNOT change the actual sending email address (must be user@mavericks-consulting.com). We can only change the display name.

#### Answer

Look at the email template in @backend/src/modules/email/templates/claim-submission.html . At the end of the email, there is an employeeName. This is the `username` the users mean.
After user udpated their username (mentioned in Q1), all emails is being sent out with the new username.
Observe the email sending flow in @backend/src/modules/email/services/email.service.ts

---

## Layer 2: Edge Case Identification

> "Good code has no special cases."

### Q4: Validation & Constraints

**Question A**: Can CC/BCC be the same as user's OAuth email?

- Would create duplicate recipients
- Should we block this or allow it?

**Question B**: Can CC and BCC be the same email address?

- Technically works but makes no sense
- Block or allow?

**Question C**: Email format validation

- Strict RFC 5322 validation?
- Simple regex check?
- What happens on invalid email?
  - Block save (show error)?
  - Warn user but allow save?
  - Silently fail on email send?

**Question D**: Empty values

- Can user remove CC/BCC after setting it? (set to null)
- Or once set, can only change to different address?

#### Answer

##### Question A

Should block. As it is no point to make CC/BCC the same with the sender.

##### Question B

Should block. Each email address can only be either CC or BCC.

##### Question C

Invalid email should never being saved into DB.
In case of having dirty data in DB, backend should do 2 things:

- Only send email to valid email address. Filter out invalid email addresses.

- Should log error before send email (specify the invalid email address and the UserEmailPreference UUID). But this should not block user from sending email.

##### Question D

Can remove the CC/BCC. Backend should `softRemove` the entity (as mentioned in Q2).

---

### Q5: Email Scope - Which Emails Get CC/BCC?

**Question**: Where do CC/BCC get applied?

**Option A**: ONLY claim submission emails

- When user clicks "Submit" and email is sent via Gmail API
- No other system emails affected

**Option B**: ALL system emails

- Future notifications
- Reminders
- Confirmations
- Any email sent by the system

**Option C**: User-configurable per email type

- Checkbox: "Include CC/BCC in claim submissions"
- Checkbox: "Include CC/BCC in notifications"
- (Over-engineering for MVP?)

**Current implementation**: Only claim submission emails exist. But this determines data model design.

#### Answer

Should go with Option A now. Currently no notification requirement yet. If there is notification feature in future, should add new field in entity `UserEmailPreferenceEntity`.

---

## Layer 3: Complexity Review

> "If the implementation requires more than 3 levels of indentation, redesign it."

### Q6: Profile Page Scope - What's the MVP?

**Current request**:

1. Change username that displays in app and email
2. Add CC/BCC email address

**Question**: Is this the COMPLETE profile page, or should we plan for extensibility?

**Minimal approach** (fastest implementation):

- Simple form with 3 fields
- Save to User entity
- Done

**Extensible approach** (future-proof):

- Settings/preferences framework
- Tabs or sections for different setting categories
- Current: Account settings (username, CC/BCC)
- Future: Notification settings, claim defaults, etc.

**My recommendation**: Start minimal. Add sections when needed. Don't over-engineer.

**Decision needed**: Build simple form now, or design for future expansion?

#### Answer

Go with minimal approach. Just simple form with 3 fields:

- Display name
- CC email addresses (a list of input fields, user can choose to add more input fields)
- BCC email addresses (a list of input fields, user can choose to add more input fields)

---

### Q7: Username Change Scope

**Question**: What does "username" control?

Potential places where username appears:

1. **Navbar**: "Welcome, [Username]"
2. **Email subject**: "Expense Claim from [Username]"
3. **Email body**: "[Username] has submitted..."
4. **Claim history**: "Created by [Username]"
5. **Database audit trail**: `created_by` field

**Clarification needed**:

- Does username change affect ALL these places?
- Or only specific UI elements?
- What about historical data?

#### Answer

Username should only affect 2 place:

- UI display of the name: After clicking of Avatar, should see the username (look at @docs/specifications/004-ui-enhancement/004-user-profile-page/attachments/001-screenshot-avatar-click-effect.png )
- At the end of email body. Refer to previous question.

---

## Layer 4: Destructive Analysis

> "Never break userspace."

### Q8: Backward Compatibility with OAuth

**Current flow**:

1. User logs in via Google OAuth
2. System stores: `email`, `googleId`, OAuth tokens
3. User entity created with email as identifier

**Question**: If user changes "username" in profile:

**Scenario A**: User's Google account name is "John Smith"

- User changes display name to "Johnny"
- What shows in navbar: "Johnny" or "John Smith"?
- What shows in email: "Johnny" or "John Smith"?
- Is there any place we should show the ORIGINAL Google name?

**Scenario B**: User changes Google account name externally

- Google account changes from "John Smith" to "John Doe"
- Next time user logs in, OAuth returns new name
- Do we:
  - Override with stored custom username? (ignore OAuth update)
  - Update stored username? (lose custom name)
  - Keep both and show custom name but store OAuth name?

#### Answer

After user update the username in app, the new `username` should overwrite the `name` in UserEntity.
If user update the username outside of app (eg. change name in Google Account), should ignore the changes and do NOT overwrite the current name in UserEntity.

---

### Q9: Existing Claims & Historical Data

**Question**: If user changes username today, what happens to past data?

**Scenario**: User "John Smith" submitted 10 claims last month

**Today**: User changes username to "Johnny"

**Question A**: Claim list page (`/claims`)

- Old claims: Show "John Smith" or "Johnny"?
- Option 1: Always show current username (data updated retroactively)
- Option 2: Show username at time of creation (historical accuracy)

**Question B**: Sent emails

- Emails already sent to finance team reference "John Smith"
- New username is "Johnny"
- This creates inconsistency in recipient's inbox
- Is this acceptable?

**Question C**: Database relationship

- Claim entity has foreign key to User entity
- Username stored in User table (single source of truth)
- Changing it affects all claims automatically
- Is this desired behavior?

**My concern**: Historical accuracy vs. current state. No special cases means ONE rule. Which rule?

#### Answer

##### Question A

In the current claim page, it does not show any name.
In future, if needed to show the user's name, then will always show the current username instead of historical username. Because user can always refer back to the email that being sent for the sent username.

##### Question B

Yes, this is acceptable.

##### Question C

Yes, this is desired behaviour.

---

## Layer 5: Practicality Validation

> "Theory and practice sometimes clash. Theory loses. Every single time."

### Q10: UI/UX Placement

**Question A**: Where does profile link appear in UI?

**Option 1**: Navbar (always visible)

```
[Logo] [Home] [Claims] [Profile] [Logout]
```

**Option 2**: User dropdown menu (cleaner)

```
[Logo] [Home] [Claims] [User Avatar ▼]
                        ├─ Profile
                        └─ Logout
```

**Option 3**: Both

- Avatar dropdown in navbar
- "Profile" link in dropdown

**Current navbar implementation**: Check existing design pattern in codebase

**Question B**: Route naming

- `/profile` (more personal, user-focused)
- `/settings` (more technical, broader scope)
- `/account` (somewhere in between)

**Recommendation**: `/profile` for MVP (matches user mental model)

#### Answer

Follow current implementation.

##### Question A

The link appear in the avatar dropdown. The avatar is shown in the nav bar.

##### Question B

Current route name is `/profile`

---

### Q11: Testing & Validation - Email Address Correctness

**Question**: How do users validate CC/BCC email addresses?

**Option A**: Trust user input

- User enters email
- Save immediately
- If wrong, emails fail silently or bounce

**Option B**: Send test email

- "Send Test Email" button
- Sends sample email to verify CC/BCC works
- User confirms before saving

**Option C**: Email verification link

- Send verification email to CC/BCC address
- Must click link to confirm
- (Over-engineering for internal tool?)

**My concern**: Finance team receives wrong/bounced emails = bad user experience

**Practical question**: What happens if CC email is invalid?

- Gmail API returns error → show to user?
- Email bounces later → user never knows?
- Silently drop invalid recipients?

#### Answer

Proceed with Option B. But the workflow as below:

1. User add email address as CC/BCC
2. User click save.
3. Backend send a test email to confirm the email correctness.
4. Backend save the email into DB.
5. Frontend UI prompt user to verify if received a test email.

System should not care about user received the test email or not.

---

### Q12: Error Handling - Email Send Failures

**Question**: What if email send fails because of invalid CC/BCC?

**Current flow**: User submits claim → Email sent via Gmail API → Success/failure

**New flow**: User submits claim → Email sent with CC/BCC → Gmail API rejects invalid recipient

**Scenarios**:

1. **Invalid CC/BCC format**: API rejects before sending
   - What error message shows to user?
   - "Email failed: Invalid CC address 'xyz'"?

2. **Valid format but non-existent email**: Email sends but bounces later
   - User won't see bounce (sent from their account)
   - Finance team won't get email
   - How do we handle this?

3. **CC/BCC domain blocked**: Some email servers block external domains
   - personal@gmail.com might get filtered
   - User's personal email never receives copy
   - Silent failure?

**Decision needed**: How much validation do we do upfront vs. handling failures gracefully?

#### Answer

##### Scenario 1

Backend is the one calling the Google Gmail API to send email.

- If API rejects, auto retry with no CC/BCC first. Log an error.
- If in the retry, API still rejects, then show reject reason to user.

##### Scenario 2

User should be able to see the bounce right? As the user's Mavericks email will be the sender in all scenario.

##### Scenario 3

Just silent failure and log the error enough. Verify if this will work.

---

## Additional Technical Considerations

### Q13: Database Migration Impact

**If we add columns to User entity**:

```sql
ALTER TABLE users
ADD COLUMN display_name VARCHAR(255),
ADD COLUMN cc_email VARCHAR(255),
ADD COLUMN bcc_email VARCHAR(255);
```

**Question**: What are default values for existing users?

- `display_name`: Copy from OAuth name? Or null?
- `cc_email`: null (empty until user sets it)
- `bcc_email`: null (empty until user sets it)

#### Answer

Look at the previous question (Q2), follow the database design. Note that generating of db migration script should be handled by TypeORM.

---

### Q14: API Endpoint Design

**Profile page needs API endpoint(s)**:

**Option A**: Single endpoint

```
PATCH /api/profile
Body: { displayName, ccEmail, bccEmail }
```

**Option B**: Separate endpoints

```
PATCH /api/profile/display-name
PATCH /api/profile/email-preferences
```

**Option C**: RESTful user resource

```
PATCH /api/users/:userId
Body: { displayName, ccEmail, bccEmail }
```

**Current pattern**: Check existing API conventions in codebase

#### Answer

Proceed with Option C. Note that user only allowed to edit their own resources.

---

### Q15: Form Validation - Frontend vs Backend

**Question**: Where does validation happen?

**Frontend validation**:

- Email format regex
- Required fields
- Real-time feedback

**Backend validation**:

- Duplicate checking (CC = user email?)
- Email format (RFC 5322)
- Rate limiting (prevent spam changes?)

**Both?** (Recommended: Client-side for UX, server-side for security)

#### Answer

Yes, proceed with both frontend and backend validation.
Backend should use NestJS approach (handle request body validation) to validate email.

---

## Summary of Critical Questions Requiring Answers

**Before proceeding, I need clarity on**:

1. **Data Model** (Q1, Q2, Q3): What exactly is "username"? Single or multiple CC/BCC? Where does it appear?
2. **Validation Rules** (Q4, Q11): What email addresses are valid? How do we verify?
3. **Historical Data** (Q9): Do username changes apply retroactively to old claims?
4. **Email Scope** (Q5): Which emails get CC/BCC applied?
5. **UI Placement** (Q10): Where does profile link go? What's the route?
6. **MVP Scope** (Q6, Q7): Simple form or extensible settings framework?
7. **Error Handling** (Q12): What happens when email send fails due to invalid CC/BCC?

**My recommendation**: Answer these in order listed. First 4 determine database schema. Last 3 determine implementation complexity.

---

## Linus's Three Questions Applied to This Feature

**Q1: "Is this a real problem or an imaginary one?"**

- ✅ **Real problem**: Users want personal email copies of submissions (CC/BCC)
- ✅ **Real problem**: Users want to control display name in emails
- ⚠️ **Potential over-engineering**: Multiple CC/BCC, complex validation, test emails

**Q2: "Is there a simpler way?"**

- **Current request**: Full profile page with username + CC/BCC
- **Simpler alternative**: Just add CC/BCC fields to claim submission form (no profile page needed)
- **Trade-off**: Simpler but less user-friendly (must set per claim vs. set once globally)

**Q3: "Will this break anything?"**

- ⚠️ **Risk**: Username changes might break historical claim display
- ⚠️ **Risk**: Invalid CC/BCC might break email sending
- ⚠️ **Risk**: OAuth name sync issues if user changes name externally
- ✅ **Mitigation needed**: Clear data model decisions + validation

**Verdict**: Worth doing, but needs careful data structure design to avoid special cases.
