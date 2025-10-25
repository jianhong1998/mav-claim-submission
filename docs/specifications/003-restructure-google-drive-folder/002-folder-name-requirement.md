# Change Requirement of Folder Name

## Requirement

Currently, all environments (local, dev, staging, production) are using the same folder on Google Drive. This mix the actual attachments and the test attachments in the same folder. User complained this is hard for them to manage test data.

## Potential Solution

When `NODE_ENV` is not `prod`, add the environment name to the folder name prefix.

Examples:

- If `NODE_ENV` is `local`, then the folder name should be `[local] Mavericks Claims`.
- If `NODE_ENV` is `dev`, then the folder name should be `[dev] Mavericks Claims`.
- If `NODE_ENV` is `staging`, then the folder name should be `[staging] Mavericks Claims`.
- If `NODE_ENV` is `prod`, then the folder name should be `Mavericks Claims`.

## Clarification Questions

### 1. Migration Strategy for Existing Data

What happens to files already uploaded to the current "Mavericks Claims" folder?

- **Option A**: Create new environment-specific folders and leave old data untouched (read-only)?
- **Option B**: Move existing files to new folders based on environment?
- **Option C**: Delete old test data and start fresh with new folders?

**Risk**: Without a clear migration path, we could orphan existing file references or break user workflows.

#### Answer

Currently there is no user yet. So the migration can be ignore for now.

### 2. Folder Reference Storage

Does the codebase currently store Google Drive folder IDs anywhere (database, config, cache)?

- If folder IDs are stored, how do we migrate these references to new folders?
- Are folder IDs stored per-user (since each user has their own Google Drive)?

**Risk**: Hardcoded or stored folder IDs will point to wrong locations after folder name changes.

#### Answer

According to `backend/src/modules/attachments/services/google-drive-client.service.ts`, the folder ID is not being stored to DB. When requiring the folder ID in the operation (storing an attachment), then it call the Google SDK to fetch the folder ID.

### 3. Code Audit - Current Folder Name References

Where is "Mavericks Claims" currently referenced in the codebase?

- Is it hardcoded or configurable?
- Which services/modules interact with this folder name?
- How many places need updating?

**Risk**: Missing even one hardcoded reference will cause silent failures.

Looks like it is only being hardcoded in `backend/src/modules/attachments/services/google-drive-client.service.ts`. Please double verify.

### 4. Multi-User Folder Architecture

Clarify the Google Drive folder ownership model:

- Does each user create "[env] Mavericks Claims" in their **personal** Google Drive?
- Or is there a **shared** Google Drive that all users access?

**Impact**: This affects how folder creation logic needs to be implemented.

#### Answer

According to the project design, each user will have a specific named folder in their own Google Drive. Only used by the user himself/herself. Note that the folder can be created by the backend application.

### 5. Environment Value Validation

What are ALL possible values of `NODE_ENV` in this system?

- Spec shows: `local`, `dev`, `staging`, `prod`
- Are there others like `test`, `production`, `development`, `qa`?
- What if `NODE_ENV` is undefined or has an unexpected value?

**Risk**: Unexpected environment values could create incorrectly named folders or fail silently.

#### Answer

Good catch. After thinking twice, should create a environment variable to specify the full folder name instead. Maybe name the environment variable `BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME`. If this environment variable is not defined, the backend should throw error when starting the NestJS application.

### 6. Backward Compatibility During Transition

Do we need to support **reading from both old and new folder names** during a transition period?

- Example: Code checks both "Mavericks Claims" and "[staging] Mavericks Claims"
- Or is this a hard cutover (all or nothing)?

**Risk**: Hard cutover could break in-flight claims or orphan recent uploads.

#### Answer

No, since there is no user yet. No transition period required.

### 7. Default/Fallback Behavior

What should happen if `NODE_ENV` is not set or has an unexpected value?

- **Option A**: Fail loudly (throw error) to prevent data mixing?
- **Option B**: Default to production behavior (no prefix)?
- **Option C**: Use a safe default like `[unknown]` prefix?

**Risk**: Silent fallback to production could mix test data with real data again.

#### Answer

Go with `Option A`. Should throw error when starting the NestJS app.
