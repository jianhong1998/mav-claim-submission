# Profile Page - Critical Conflict Resolution Required

**Status**: [BLOCKER] 3 conflicts found between clarification-01 and clarification-02 answers

**Context**: Cross-analysis of both clarification documents revealed contradictions in database schema design and business logic that will cause implementation bugs if not resolved.

---

## CONFLICT #1: Database Index Definitions

**Conflict between**:

- **Doc 01, Q2 Answer**: Shows `@Index(['userId'])` for performance
- **Doc 02, Q2 Answer**: Requires unique index on `(userId, emailAddress, deletedAt)` for constraint

**Problem**: Entity needs BOTH indexes but this wasn't explicitly confirmed.

**Required schema clarification**:

```ts
@Entity('user_email_preferences')
@Index(['userId']) // ← Performance index for foreign key lookups
@Index(['userId', 'emailAddress', 'deletedAt'], {
  // ← Uniqueness constraint
  unique: true,
  nulls: 'distinct', // PostgreSQL: treat NULL values as distinct
})
export class UserEmailPreferenceEntity {
  // ...
}
```

**Question**: Confirm both indexes should exist?

- Index 1: `userId` (non-unique, for JOIN performance)
- Index 2: `(userId, emailAddress, deletedAt)` (unique, for duplicate prevention)

### Answer

Yes, use both indexes (one for performance, one for uniqueness)

---

## CONFLICT #2: Restore Logic vs Type Switching

**Conflict between**:

- **Doc 01, Q4B Answer**: "Each email address can only be either CC or BCC" (cannot be both)
- **Doc 02, Q7 Answer**: "Option B - Restore old row (undelete)"

**Problem**: What happens when user changes their mind about type?

**Scenario**:

1. Day 1: User adds `personal@gmail.com` as **CC**
   - DB: `id=abc-123, type='cc', email='personal@gmail.com', deletedAt=null`
2. Day 2: User removes it from profile form
   - DB: `id=abc-123, type='cc', email='personal@gmail.com', deletedAt='2025-11-12'`
3. Day 3: User re-adds `personal@gmail.com` but as **BCC** this time

**Question A**: Should backend allow this type switch?

**Option A**: Allow type switch (restore + update type field)

```ts
// Find soft-deleted row with matching email (regardless of type)
const deleted = await repo.findOne({
  where: {
    userId,
    emailAddress: 'personal@gmail.com',
    deletedAt: Not(IsNull()),
  },
});

if (deleted) {
  // Restore and UPDATE type field
  deleted.type = 'bcc'; // Changed from 'cc' to 'bcc'
  deleted.deletedAt = null;
  await repo.save(deleted);
}
```

- Reuses row ID (preserves createdAt history)
- Type field can change over time
- Violates "email can only be CC or BCC" rule during its lifetime

**Option B**: Treat type as immutable (create new row if type differs)

```ts
const deleted = await repo.findOne({
  where: {
    userId,
    emailAddress: 'personal@gmail.com',
    type: 'bcc', // Must match the NEW type
    deletedAt: Not(IsNull()),
  },
});

if (deleted) {
  // Restore ONLY if type matches
  deleted.deletedAt = null;
  await repo.save(deleted);
} else {
  // Create new row because type is different
  await repo.save({ userId, emailAddress: 'personal@gmail.com', type: 'bcc' });
}
```

- Each `(email, type)` combination has its own row ID
- Type is immutable once row is created
- Adheres to "email can only be CC or BCC at any given time"

**Question B**: If Option B (immutable type), does this mean unique constraint should include `type`?

Current constraint: `(userId, emailAddress, deletedAt)` - allows same email with different types if one is deleted
Alternative: `(userId, emailAddress, type, deletedAt)` - allows email to have BOTH cc and bcc rows (if one is deleted)

**My recommendation**: Option B (immutable type) + keep current constraint. This allows:

- `personal@gmail.com` as active CC, with deleted BCC row in history = OK
- `personal@gmail.com` as active BCC, with deleted CC row in history = OK
- `personal@gmail.com` as BOTH active CC and active BCC simultaneously = BLOCKED ✓

### Answer

Proceed with Option A. Allow type switch (CC <-> BCC).

Take note, should always use the typeorm native restore method to manage the `deleted_at` instead of hard coded to `null`.

When a request of update email address comes in, backend should fetch the `UserEmailPreference` (including deleted).
Then check if it is deleted. If it is deleted, then should restore first before proceed to update the other details.
Remember wrap all the db operation into a transaction.

Should Follow the backend structure design, use a DBUtil to perform the restore and CRUD.

---

## CONFLICT #3: Cross-Type Validation Scope

**Conflict between**:

- **Doc 01, Q4B Answer**: "Each email address can only be either CC or BCC"
- **Doc 02, Q2 Answer**: Unique constraint `(userId, emailAddress, deletedAt)` without `type`

**Problem**: Current constraint allows historical type switching.

**Database state after type switch** (using scenario from Conflict #2):

```
user_email_preferences table:
┌──────────┬──────┬──────────────────────┬─────────────────────┐
│ id       │ type │ emailAddress         │ deletedAt           │
├──────────┼──────┼──────────────────────┼─────────────────────┤
│ abc-123  │ cc   │ personal@gmail.com   │ 2025-11-12 10:00:00 │ ← Old (deleted)
│ def-456  │ bcc  │ personal@gmail.com   │ null                │ ← New (active)
└──────────┴──────┴──────────────────────┴─────────────────────┘
```

**Question**: Is this database state acceptable?

**Interpretation A**: "Email can only be CC or BCC" means **at any given time** (not lifetime)

- Same email CAN exist as both types in history
- Only constraint: cannot be BOTH types while active (deletedAt=null)
- Current unique constraint `(userId, emailAddress, deletedAt)` enforces this ✓

**Interpretation B**: "Email can only be CC or BCC" means **across entire lifetime**

- Once email is saved as CC, it can NEVER become BCC (even after deletion)
- Would require additional business logic validation
- Or stricter constraint that prevents type switching even in history

**My interpretation**: Interpretation A makes more sense. Users should be able to change preferences over time.

**Clarification needed**: Confirm Interpretation A is correct? Or enforce stricter lifetime rule?

### Answer

Should allow user to switch type.

#### Case 1 - Email address deleted when user do email address type switch

As mentioned in `CONFLICT #2`, if an emailAddress is deleted, then the row should be restored then update the type.

#### Case 2 - Email address actived when user do email address type switch

Type in the data should be able to change.

---

## Additional Ambiguity: Test Email Error Handling

**Not a conflict, but ambiguous flow from Doc 02, Q4**:

**Clarified flow**:

1. User adds `newuser@gmail.com` as CC
2. User clicks Save button
3. Frontend validates format (basic regex)
4. Backend validates format (email-validator library)
5. **If format invalid**: Return 400 error, do NOT save, do NOT send test email
6. **If format valid**: Send test email via Gmail API
7. **If Gmail API rejects test email**: Still save to DB (?), show warning to user
8. **If Gmail API sends test email successfully**: Save to DB, show success message

**Question**: In step 7, if Gmail API rejects the test email (e.g., Gmail detects invalid domain), do we:

**Option A**: Still save to database (your Q11 answer suggests this)

- User sees: "Email preference saved. Test email could not be sent. Please verify if your email address is correct."
- Email is in DB but might not work during actual claim submission

**Option B**: Block save and return error

- User sees: "Email could not be verified. Please check the address."
- Email is NOT saved to DB

**From Doc 02, Q4A answer**: "Go with option A. If user never receive the test email, he/she can verify from the UI."

This confirms: **Format validation blocks save. Test email failure does NOT block save.**

**Just confirming this is intentional** - no question needed, just documenting for clarity.

### Answer

Yes, proceed with Option A. Even the data is set, but user should see the warning from the frontend.

---

## Summary

**3 questions requiring answers**:

1. **Conflict #1**: Confirm both indexes should exist (performance + uniqueness)?
2. **Conflict #2**: Allow type switching when restoring deleted emails (Option A or B)?
3. **Conflict #3**: Is historical type switching acceptable (Interpretation A or B)?

**Impact if not resolved**:

- Conflict #1: Missing index = performance issues or missing constraint
- Conflict #2: Wrong restore logic = duplicate rows or data loss
- Conflict #3: Wrong validation = business logic violations

**Recommended resolution priority**: Answer in order (1 → 2 → 3), as each answer affects the next.

---

## My Recommendations (For Quick Resolution)

If you want to proceed with minimal complexity:

**Conflict #1**: Yes, use both indexes (one for performance, one for uniqueness)

**Conflict #2**: Option B (immutable type) - simpler logic, clearer semantics

- When restoring, only match if type is the same
- If type differs, create new row

**Conflict #3**: Interpretation A (allow historical type switching)

- User can change email from CC to BCC over time
- Only constraint: cannot be both simultaneously while active

This combination gives:

- Simple validation rules (no special cases)
- Clear database semantics (type is immutable per row)
- Flexible user experience (can change preferences over time)
- Predictable behavior (restore works only for same type)

**Confirm these recommendations or provide different answers for each conflict.**
