# Profile Page - Fundamental Design Conflict Discovered

**Status**: [CRITICAL] Logical impossibility found in Issue #2 + Issue #3 answers

**Context**: After ultrathinking through clarification-04 answers, I identified a fundamental incompatibility between three requirements that makes implementation impossible without choosing a different approach.

---

## The Impossible Triangle

**Your three requirements (from different clarification docs)**:

1. **From Clarification-02, Q4D**: "Can remove the CC/BCC. Backend should `softRemove` the entity."
   - → Requires SOFT DELETE (set deletedAt, keep row in DB)

2. **From Clarification-04, Issue #2**: "Actually if we just want to ensure the same email address only have 1 record per user in the db. Then we can actually remove `deleted_at` from the unique key."
   - → Unique constraint: `(userId, emailAddress)` only
   - → At most ONE row per email address per user (regardless of deletedAt)

3. **From Clarification-04, Issue #3**: "Considering the complexity of the restoring, should ignore the idea of restoring of data."
   - → NO restore logic

**The logical conflict**:

```
Soft Delete + Unique(userId, emailAddress) + No Restore = IMPOSSIBLE
```

**Why this is impossible**:

**Scenario**:

1. User adds `personal@gmail.com` as CC
   - DB: `Row 1: (userId, personal@gmail.com, type=cc, deletedAt=null)`
   - ✓ Unique constraint satisfied

2. User deletes `personal@gmail.com` (soft delete)
   - DB: `Row 1: (userId, personal@gmail.com, type=cc, deletedAt='2025-11-13')`
   - ✓ Row still exists (soft delete), unique constraint still applies

3. User re-adds `personal@gmail.com` as BCC (no restore logic)
   - Backend tries to: `INSERT (userId, personal@gmail.com, type=bcc, deletedAt=null)`
   - ❌ **ERROR: duplicate key value violates unique constraint "unique_user_email"**
   - Constraint `(userId, emailAddress)` already has Row 1!

**You CANNOT create a new row because the unique constraint blocks it!**

**The only way to re-add the email is to RESTORE Row 1** (which you said to avoid in Issue #3).

---

## The Solution Space

**You must choose ONE of the following 4 options:**

### Option 1: Hard Delete (Simplest, No History)

**Design**:

- Unique constraint: `(userId, emailAddress)` only
- Delete operation: **HARD DELETE** (remove row from database entirely)
- Add operation: Insert new row
- No restore logic needed

**Example**:

```ts
// Delete
await repo.delete({ userId, emailAddress: 'personal@gmail.com' });
// Row is GONE from database

// Re-add later
await repo.save({ userId, emailAddress: 'personal@gmail.com', type: 'bcc' });
// New row created, no conflict
```

**Pros**:

- ✅ Dead simple, no restore logic
- ✅ No edge cases with multiple deleted rows
- ✅ Database stays clean (no accumulation)

**Cons**:

- ❌ No audit trail (can't see what user deleted or when)
- ❌ Can't recover accidentally deleted preferences
- ❌ Violates Clarification-02 Q4D requirement (soft delete)

**Database changes**:

- Remove `deletedAt` column entirely (not needed)
- Unique constraint: `(userId, emailAddress)`

---

### Option 2: Soft Delete + Forced Restore (Simple Restore, Preserves History)

**Design**:

- Unique constraint: `(userId, emailAddress)` only
- Delete operation: Soft delete (set deletedAt timestamp)
- Add operation:
  - **MUST** check if soft-deleted row exists
  - If exists: **RESTORE it** (no choice!) and update type
  - If not exists: Create new row
- Simplified restore logic (only ever ONE row per email)

**Example**:

```ts
// Add email
const existing = await repo.findOne({
  where: { userId, emailAddress: 'personal@gmail.com' },
  withDeleted: true, // Include soft-deleted
});

if (existing) {
  if (existing.deletedAt !== null) {
    // Restore the soft-deleted row
    await repo.restore(existing.id);
  }
  // Update type if different
  if (existing.type !== newType) {
    existing.type = newType;
    await repo.save(existing);
  }
} else {
  // Create new row
  await repo.save({ userId, emailAddress, type });
}
```

**Pros**:

- ✅ Simple restore logic (only one row to check)
- ✅ Preserves audit trail (deletedAt timestamp shows when deleted)
- ✅ Satisfies soft delete requirement
- ✅ Database stays clean (max 1 row per email)

**Cons**:

- ⚠️ Still needs restore logic (but MUCH simpler than multi-row restore)
- ⚠️ Row history limited (can't see type changes over time, only latest)

**Database changes**:

- Keep `deletedAt` column for soft delete
- Unique constraint: `(userId, emailAddress)` only (no deletedAt in constraint)

---

### Option 3: Soft Delete + No Restore + Accumulating Rows (No Restore, History Grows)

**Design**:

- Unique constraint: `(userId, emailAddress, deletedAt)` with NULLS NOT DISTINCT
- Delete operation: Soft delete (set deletedAt timestamp)
- Add operation: **Always create NEW row** (never restore)
- No restore logic
- Deleted rows accumulate over time

**Example**:

```ts
// User adds email as CC
await repo.save({ userId, emailAddress, type: 'cc' });
// Row 1: (userId, email, cc, deletedAt=null)

// User deletes
await repo.softRemove(row1);
// Row 1: (userId, email, cc, deletedAt='2025-11-13')

// User re-adds as BCC
await repo.save({ userId, emailAddress, type: 'bcc' });
// Row 2: (userId, email, bcc, deletedAt=null)
// Row 1 still exists with deletedAt set
```

**Pros**:

- ✅ No restore logic needed
- ✅ Full history preserved (every add/delete/type-change creates new row)
- ✅ Satisfies soft delete requirement

**Cons**:

- ❌ Database grows over time (deleted rows accumulate)
- ❌ Need cleanup process to purge old deleted rows
- ❌ Violates Issue #2 requirement (NOT "only 1 record per user")

**Database changes**:

- Keep `deletedAt` column
- Unique constraint: `(userId, emailAddress, deletedAt)` NULLS NOT DISTINCT

---

### Option 4: Soft Delete + Multi-Row Restore (Complex, Full History)

**Design**:

- Unique constraint: `(userId, emailAddress, deletedAt)` with NULLS NOT DISTINCT
- Delete operation: Soft delete
- Add operation: Check for soft-deleted rows, restore most recent, update type
- Complex restore logic with edge case handling
- Multiple deleted rows can exist (history)

**This is what you REJECTED in Issue #3** due to complexity.

---

## Comparison Table

| Option                       | Unique Constraint            | Delete Type | Restore Logic  | History Preserved | DB Growth   | Complexity       |
| ---------------------------- | ---------------------------- | ----------- | -------------- | ----------------- | ----------- | ---------------- |
| **1: Hard Delete**           | `(userId, email)`            | Hard        | None           | ❌ No             | ✅ Clean    | ⭐ Simplest      |
| **2: Soft + Forced Restore** | `(userId, email)`            | Soft        | Simple (1 row) | ⚠️ Limited        | ✅ Clean    | ⭐⭐ Simple      |
| **3: Soft + No Restore**     | `(userId, email, deletedAt)` | Soft        | None           | ✅ Full           | ❌ Grows    | ⭐⭐ Simple      |
| **4: Soft + Multi Restore**  | `(userId, email, deletedAt)` | Soft        | Complex        | ✅ Full           | ⚠️ Moderate | ⭐⭐⭐⭐ Complex |

---

## My Recommendation

Based on your stated preferences:

- Issue #2: "only have 1 record per user in the db"
- Issue #3: "ignore the idea of restoring of data"

**I recommend Option 1 (Hard Delete)** because it's the ONLY option that satisfies both requirements.

**However**, this violates Clarification-02 Q4D (soft delete requirement).

**Alternative: If you want to keep audit trail, choose Option 2 (Soft Delete + Forced Restore)**:

- Satisfies "1 record per user" (Issue #2) ✓
- Still needs restore logic, but it's MUCH simpler than Option 4:
  - Only one row can exist per email (no "which row to restore" question)
  - No edge cases with multiple deleted rows
  - Simple `findOne` + `restore` + `update type`
- Preserves audit trail (when deleted) ✓

**Option 2 restore logic is 10 lines, not 50+ lines like Option 4.**

---

## Decision Required

**Question**: Which option do you want to proceed with?

1. **Option 1** (Hard Delete) - Simplest, no history
2. **Option 2** (Soft Delete + Simple Restore) - Simple, limited history
3. **Option 3** (Soft Delete + No Restore) - Rows accumulate
4. **Revise requirements** - Keep Option 4 (complex restore)?

**Or provide alternative approach** if none of these work for your use case.

**Note**: You cannot have "soft delete + unique(userId, email) + no restore" - it's logically impossible.

### Answer

Option 1 - Hard delete.

Since there are extra complexity to implement soft delete solution. Plus, there are not much benifits doing soft delete. Should go with Option 1 hard delete approach.
