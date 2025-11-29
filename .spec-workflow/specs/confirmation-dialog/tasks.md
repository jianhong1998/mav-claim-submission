# Tasks Document

## Implementation Tasks for Confirmation Dialog

### Phase 1: Core Component Infrastructure

- [x] 1. Add AlertDialog UI primitives using shadcn CLI
  - **File**: `frontend/src/components/ui/alert-dialog.tsx` (new)
  - **Action**: Run `npx shadcn@latest add alert-dialog` from frontend directory
  - **Purpose**: Install shadcn/ui AlertDialog component with Radix UI primitives
  - **Verification**: Verify AlertDialog primitives export correctly
  - **_Leverage**: Existing shadcn/ui setup, `frontend/src/components/ui/dialog.tsx` as reference
  - **_Requirements**: 1 (Replace window.confirm), 5 (Visual design consistency)
  - **_Prompt**:
    ```
    Implement the task for spec confirmation-dialog. First run spec-workflow-guide to get the workflow guide, then implement the task:

    Role: Frontend Developer with expertise in shadcn/ui and component library setup

    Task: Install shadcn/ui AlertDialog component by running `npx shadcn@latest add alert-dialog` in the frontend workspace. Verify that the component is properly installed in `frontend/src/components/ui/alert-dialog.tsx` and exports all required primitives (AlertDialog, AlertDialogPortal, AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel). Review the generated code to ensure it follows the same patterns as the existing Dialog component.

    Context: This is the foundation for our custom confirmation dialog system. The AlertDialog component from shadcn/ui uses Radix UI primitives underneath, providing built-in accessibility features (ARIA attributes, focus management, keyboard navigation) that satisfy Requirement 4 (Accessibility Compliance).

    Restrictions:
    - Do not manually create the component - use the shadcn CLI tool
    - Do not modify the generated component code unless necessary for dark mode compatibility
    - Do not add custom business logic to this UI primitive
    - Ensure the component uses existing design tokens (colors, spacing) from the theme

    _Leverage:
    - Existing shadcn/ui setup in frontend workspace
    - `frontend/src/components/ui/dialog.tsx` as reference for expected patterns
    - `frontend/src/lib/utils.ts` (cn utility for className merging)

    Success Criteria:
    - AlertDialog component successfully installed at `frontend/src/components/ui/alert-dialog.tsx`
    - All required primitives are exported (AlertDialog, AlertDialogContent, AlertDialogAction, etc.)
    - Component styling uses dark mode compatible classes
    - No TypeScript compilation errors
    - Component follows same patterns as existing Dialog component

    After Completion:
    1. Mark this task as in-progress in tasks.md: Change `- [ ] 1.` to `- [-] 1.`
    2. Implement the task following the instructions above
    3. Test that the component exports are accessible
    4. Use log-implementation tool to record what was created with detailed artifacts
    5. Mark task as complete in tasks.md: Change `- [-] 1.` to `- [x] 1.`
    ```

- [x] 2. Create TypeScript interfaces for confirmation system
  - **File**: `frontend/src/types/confirmation.ts` (new)
  - **Purpose**: Define type-safe interfaces for confirmation options and context
  - **Rationale**: Separate types file for reusability - both provider and hook need these interfaces
  - **Interfaces**: ConfirmOptions, ConfirmationContextValue, DialogState
  - **_Leverage**: Existing type patterns, React.ReactNode for rich content support
  - **_Requirements**: 2 (Promise-based API), 6 (Reusable architecture)
  - **_Prompt**:
    ```
    Implement the task for spec confirmation-dialog. First run spec-workflow-guide to get the workflow guide, then implement the task:

    Role: TypeScript Developer specializing in type systems and interfaces

    Task: Create comprehensive TypeScript interfaces for the confirmation dialog system in `frontend/src/types/confirmation.ts`. Define three main interfaces:

    1. ConfirmOptions - Configuration for confirmation dialogs:
       ```typescript
       interface ConfirmOptions {
         title: string;
         description: string | React.ReactNode;
         confirmText?: string;
         cancelText?: string;
         variant?: 'default' | 'destructive';
       }
       ```

    2. ConfirmationContextValue - Context API shape:
       ```typescript
       interface ConfirmationContextValue {
         confirm: (options: ConfirmOptions) => Promise<boolean>;
         isOpen: boolean;
       }
       ```

    3. DialogState (internal) - Provider state management:
       ```typescript
       interface DialogState {
         isOpen: boolean;
         options: ConfirmOptions | null;
         resolver: ((value: boolean) => void) | null;
       }
       ```

    Context: These interfaces are the foundation for type safety across the confirmation system. The ConfirmOptions interface supports both string and React.ReactNode for the description field, enabling rich content like bullet lists (Requirement 5). The Promise<boolean> return type provides the async/await API specified in Requirement 2.

    Restrictions:
    - No `any` types allowed (strict TypeScript mode)
    - All interfaces must be exported
    - Do not include implementation code in this file
    - Follow existing type naming conventions (PascalCase interfaces)

    _Leverage:
    - React type definitions (React.ReactNode)
    - Existing type patterns from project
    - Design document specification for exact interface shapes

    Success Criteria:
    - File created at `frontend/src/types/confirmation.ts`
    - All three interfaces defined and exported
    - Full TypeScript type safety (no `any` types)
    - Interfaces match design document specifications exactly
    - No compilation errors

    After Completion:
    1. Mark this task as in-progress in tasks.md: Change `- [ ] 2.` to `- [-] 2.`
    2. Implement the interfaces as specified
    3. Verify TypeScript compilation passes
    4. Use log-implementation tool to record the interfaces created
    5. Mark task as complete in tasks.md: Change `- [-] 2.` to `- [x] 2.`
    ```

### Phase 2: State Management and Provider

- [x] 3. Implement ConfirmationProvider with Context and state management
  - **Files**: `frontend/src/providers/confirmation-provider.tsx` (new)
  - **Purpose**: Global dialog state management with React Context and Promise-based API
  - **Components**: ConfirmationContext, ConfirmationProvider, dialog rendering logic
  - **_Leverage**: `@/components/ui/alert-dialog`, `@/components/ui/button`, `@/types/confirmation`
  - **_Requirements**: 2 (Promise-based API), 3 (Maintain workflows), 4 (Accessibility), 5 (Visual consistency), 6 (Reusable architecture)
  - **_Prompt**:
    ```
    Implement the task for spec confirmation-dialog. First run spec-workflow-guide to get the workflow guide, then implement the task:

    Role: React Developer with expertise in Context API, state management, and Promise-based architectures

    Task: Implement the ConfirmationProvider component that manages global confirmation dialog state using React Context. This is the core of the confirmation system.

    Implementation Requirements:

    1. Add 'use client' directive at the top of the file (required for React hooks and UI rendering)

    2. Create ConfirmationContext with createContext<ConfirmationContextValue | null>(null)

    3. Implement ConfirmationProvider component with:
       - useState<DialogState> for managing dialog state
       - confirm() function that returns Promise<boolean>
       - handleConfirm() and handleCancel() Promise resolvers
       - Cleanup useEffect to prevent memory leaks

    4. Single active dialog enforcement:
       ```typescript
       if (state.isOpen) {
         console.warn('[ConfirmationDialog] Dialog already open');
         return false;
       }
       ```

    5. Render AlertDialog with:
       - AlertDialogContent with title and description
       - AlertDialogCancel (variant="outline", resolves to false)
       - AlertDialogAction (variant based on options.variant, resolves to true)
       - Support for both string and React.ReactNode descriptions

    6. ESC key and outside click handling (automatic via AlertDialog)

    Context: This provider implements Requirements 2 (Promise-based API), 3 (maintains existing workflow patterns), 4 (accessibility via AlertDialog primitives), and 6 (reusable architecture). The Promise-based confirm() method allows clean async/await usage matching window.confirm()'s simplicity.

    IMPORTANT: This must be a client component - add 'use client' directive at the top of the file.

    Restrictions:
    - Must use existing AlertDialog primitives (do not create custom dialog)
    - Must use existing Button component with proper variants
    - Do not allow multiple simultaneous dialogs (reject new requests if one is open)
    - Must resolve Promise to false on cleanup to prevent memory leaks
    - Do not add business logic specific to claims/attachments
    - Follow React best practices (useCallback for handlers, proper cleanup)

    _Leverage:
    - `@/components/ui/alert-dialog` (AlertDialog primitives)
    - `@/components/ui/button` (Button component with variants)
    - `@/types/confirmation` (ConfirmOptions, ConfirmationContextValue, DialogState)
    - Design document sections: "Component 2: ConfirmationProvider" and "Data Flow"

    Success Criteria:
    - ConfirmationProvider component created and exports ConfirmationContext
    - confirm() method returns Promise<boolean>
    - Dialog opens with provided options (title, description, button text)
    - Confirm button resolves Promise to true
    - Cancel button and ESC key resolve Promise to false
    - Only one dialog can be open at a time (new requests rejected with warning)
    - Cleanup on unmount resolves any pending Promise to false
    - Component uses destructive variant for dangerous actions
    - No TypeScript errors, all types properly defined

    After Completion:
    1. Mark this task as in-progress in tasks.md: Change `- [ ] 3.` to `- [-] 3.`
    2. Implement the ConfirmationProvider following the specifications
    3. Test that confirm() returns a Promise that resolves correctly
    4. Use log-implementation tool to record implementation with artifacts (component, functions, integration patterns)
    5. Mark task as complete in tasks.md: Change `- [-] 3.` to `- [x] 3.`
    ```

- [x] 4. Create useConfirmation hook with fallback logic
  - **File**: `frontend/src/hooks/use-confirmation.ts` (new)
  - **Purpose**: Consumer-facing hook API with graceful fallback to window.confirm
  - **Exports**: useConfirmation hook returning { confirm, isOpen }
  - **_Leverage**: ConfirmationContext, React useContext
  - **_Requirements**: 2 (Promise-based API), 6 (Reusable architecture)
  - **_Prompt**:
    ```
    Implement the task for spec confirmation-dialog. First run spec-workflow-guide to get the workflow guide, then implement the task:

    Role: React Hooks Specialist with expertise in Context API and error handling

    Task: Create the useConfirmation hook that provides the public API for accessing the confirmation dialog. This hook must include graceful fallback logic for cases where the ConfirmationProvider is missing from the component tree.

    Implementation Requirements:

    1. Import ConfirmationContext and use React's useContext

    2. If context is null (provider not found):
       - Log console.error with helpful message
       - Return fallback object with:
         ```typescript
         {
           confirm: async (options) => window.confirm(`${options.title}\n\n${description}`),
           isOpen: false
         }
         ```

    3. If context exists, return it directly

    4. Full TypeScript types (UseConfirmationReturn interface)

    Context: This hook is the developer-facing API that components will use to show confirmations. The fallback to window.confirm ensures the app never breaks even if the provider is misconfigured (Requirement 6 - Reliability). This satisfies the non-functional requirement for graceful degradation.

    Restrictions:
    - Must check for null context and provide fallback
    - Do not throw errors (graceful degradation required)
    - Fallback must handle both string and React.ReactNode descriptions (convert ReactNode to placeholder text)
    - Must log errors to console for debugging
    - Keep the hook simple (no complex logic)

    _Leverage:
    - React useContext hook
    - ConfirmationContext from confirmation-provider
    - ConfirmOptions type from @/types/confirmation
    - Design document section: "Component 3: useConfirmation Hook"

    Success Criteria:
    - Hook created at `frontend/src/hooks/use-confirmation.ts`
    - Returns { confirm, isOpen } matching ConfirmationContextValue interface
    - Falls back to window.confirm if provider missing
    - Logs helpful error message when fallback is used
    - Handles both string and ReactNode descriptions in fallback
    - Full TypeScript type safety
    - No compilation errors

    After Completion:
    1. Mark this task as in-progress in tasks.md: Change `- [ ] 4.` to `- [-] 4.`
    2. Implement the hook with fallback logic
    3. Test both the normal path (with provider) and fallback path (without provider)
    4. Use log-implementation tool to record the hook implementation
    5. Mark task as complete in tasks.md: Change `- [-] 4.` to `- [x] 4.`
    ```

### Phase 3: App Integration

- [x] 5. Integrate ConfirmationProvider in app root layout
  - **File**: `frontend/src/app/layout.tsx` (modify)
  - **Purpose**: Wrap application with ConfirmationProvider for global access
  - **Change**: Add ConfirmationProvider wrapper around app children
  - **_Leverage**: Existing layout structure, ConfirmationProvider component
  - **_Requirements**: 6 (Reusable architecture)
  - **_Prompt**:
    ```
    Implement the task for spec confirmation-dialog. First run spec-workflow-guide to get the workflow guide, then implement the task:

    Role: Next.js Developer with expertise in App Router and provider integration

    Task: Integrate the ConfirmationProvider into the root layout to make the confirmation dialog globally accessible throughout the application. This is a critical step that enables all components to use the useConfirmation hook.

    Implementation Requirements:

    1. Read the current `frontend/src/app/layout.tsx` file to understand the existing provider structure

    2. Import ConfirmationProvider from '@/providers/confirmation-provider'

    3. Wrap the existing children with ConfirmationProvider:
       ```tsx
       <ConfirmationProvider>
         {/* existing children */}
       </ConfirmationProvider>
       ```

    4. Ensure the provider is placed at the appropriate level in the provider hierarchy (typically near the root, but inside any theme providers if they exist)

    Context: This integration makes the confirmation dialog accessible from any component in the application tree via the useConfirmation hook. Following the React Context pattern established by other providers in the app (like AuthProvider), this ensures consistency with existing architecture (Requirement 6).

    Restrictions:
    - Do not remove or modify existing providers
    - Maintain the existing provider hierarchy
    - Ensure ConfirmationProvider wraps all application content
    - Do not add client-side only logic (layout is a Server Component in Next.js App Router)
    - Make ConfirmationProvider a client component ('use client' directive)

    _Leverage:
    - Existing layout structure in `frontend/src/app/layout.tsx`
    - ConfirmationProvider from `@/providers/confirmation-provider`
    - Pattern from existing providers (AuthProvider precedent)

    Success Criteria:
    - ConfirmationProvider imported and added to layout
    - Provider wraps all application children
    - No compilation errors
    - Application still renders correctly
    - useConfirmation hook now works from any component
    - No console errors about missing provider when using the hook

    After Completion:
    1. Mark this task as in-progress in tasks.md: Change `- [ ] 5.` to `- [-] 5.`
    2. Read layout.tsx and add ConfirmationProvider wrapper
    3. Test that the app still renders without errors
    4. Use log-implementation tool to record the integration
    5. Mark task as complete in tasks.md: Change `- [-] 5.` to `- [x] 5.`
    ```

### Phase 4: Replace window.confirm() Calls

- [x] 6. Replace window.confirm in useMarkClaimsReady hook
  - **File**: `frontend/src/hooks/claims/useMarkClaimsReady.ts` (modify)
  - **Purpose**: Replace window.confirm with custom dialog for batch claim submission
  - **Change**: Import useConfirmation, make callback async, replace window.confirm at line 83
  - **_Leverage**: useConfirmation hook, existing mutation logic
  - **_Requirements**: 1 (Replace window.confirm), 3 (Maintain workflows)
  - **_Prompt**:
    ```
    Implement the task for spec confirmation-dialog. First run spec-workflow-guide to get the workflow guide, then implement the task:

    Role: React Developer with expertise in hooks and async/await patterns

    Task: Replace the window.confirm call in useMarkClaimsReady hook (line 83) with the custom confirmation dialog while maintaining exact same functionality and user experience.

    ⚠️ CRITICAL: The callback function MUST be marked `async` to use `await confirm()`.

    Implementation Requirements:

    1. Import useConfirmation from '@/hooks/use-confirmation'

    2. Call useConfirmation() hook at the component level:
       ```typescript
       const { confirm } = useConfirmation();
       ```

    3. Make the handleMarkAllReady callback async and replace window.confirm:
       ```typescript
       const handleMarkAllReady = useCallback(async (draftClaims: IClaimMetadata[]) => {
         // ^^^^^ ADD 'async' keyword here
         if (draftClaims.length === 0) return;

         // ... existing confirmMessage construction (lines 73-81) ...

         const confirmed = await confirm({
           title: 'Submit All Claims',
           description: confirmMessage,
           confirmText: 'Submit All',
           cancelText: 'Cancel',
           variant: 'default',
         });

         if (confirmed) {
           const claimIds = draftClaims.map((claim) => claim.id);
           markReadyAndEmailMutation.mutate(claimIds);
         }
       }, [confirm, markReadyAndEmailMutation]);
       //  ^^^^^^^ ADD 'confirm' to dependencies
       ```

    4. Keep the existing confirmMessage construction logic unchanged (lines 73-81)

    5. Update useCallback dependencies to include 'confirm'

    Context: This is one of three window.confirm replacements. The batch claim submission is a critical workflow where users confirm submitting multiple claims at once. The existing message includes warnings about missing attachments, which should be preserved exactly (Requirement 3 - Maintain workflows).

    Restrictions:
    - Do not modify the confirmMessage construction logic
    - Do not change the mutation logic (markReadyAndEmailMutation.mutate)
    - Keep the same user experience (confirmation before action)
    - Maintain existing error handling and success flows
    - Preserve useCallback dependencies
    - Do not add new business logic

    _Leverage:
    - useConfirmation hook from '@/hooks/use-confirmation'
    - Existing confirmMessage variable (lines 73-81)
    - Existing mutation logic (markReadyAndEmailMutation)

    Success Criteria:
    - useConfirmation imported and used correctly
    - window.confirm replaced with await confirm()
    - Confirmation message displays exactly as before
    - Submit All button triggers same mutation when confirmed
    - Cancel button prevents mutation when cancelled
    - No TypeScript errors
    - Existing functionality preserved (no regressions)

    After Completion:
    1. Mark this task as in-progress in tasks.md: Change `- [ ] 6.` to `- [-] 6.`
    2. Make the code changes as specified
    3. Test the batch claim submission flow (open dialog, confirm, cancel)
    4. Use log-implementation tool to record the changes
    5. Mark task as complete in tasks.md: Change `- [-] 6.` to `- [x] 6.`
    ```

- [x] 7. Replace window.confirm in DraftClaimsList component
  - **File**: `frontend/src/components/claims/DraftClaimsList.tsx` (modify)
  - **Purpose**: Replace window.confirm with custom dialog for claim deletion
  - **Change**: Import useConfirmation, make callback async, replace window.confirm at line 85
  - **_Leverage**: useConfirmation hook, existing mutation logic
  - **_Requirements**: 1 (Replace window.confirm), 3 (Maintain workflows), 5 (Visual design - destructive variant)
  - **_Prompt**:
    ```
    Implement the task for spec confirmation-dialog. First run spec-workflow-guide to get the workflow guide, then implement the task:

    Role: React Developer with expertise in component refactoring and mutation patterns

    Task: Replace the window.confirm call in DraftClaimsList component (line 85) with the custom confirmation dialog, using the destructive variant for the dangerous delete action.

    ⚠️ CRITICAL: The callback function MUST be marked `async` to use `await confirm()`.

    Implementation Requirements:

    1. Import useConfirmation from '@/hooks/use-confirmation'

    2. Call useConfirmation() hook at the component level:
       ```typescript
       const { confirm } = useConfirmation();
       ```

    3. Make the handleDeleteClaim callback async and replace window.confirm:
       ```typescript
       const handleDeleteClaim = useCallback(async (claim: IClaimMetadata) => {
         // ^^^^^ ADD 'async' keyword here

         // ... existing confirmMessage construction (lines 78-83) ...

         const confirmed = await confirm({
           title: 'Delete Claim',
           description: confirmMessage,
           confirmText: 'Delete',
           cancelText: 'Cancel',
           variant: 'destructive',
         });

         if (confirmed) {
           setDeletingClaim(claim.id);
           deleteMutation.mutate(claim.id);
         }
       }, [confirm, deleteMutation]);
       //  ^^^^^^^ ADD 'confirm' to dependencies
       ```

    4. Keep the existing confirmMessage construction logic unchanged (lines 78-83)

    5. Update useCallback dependencies to include 'confirm'

    Context: Claim deletion is a destructive action, so we use variant='destructive' to show a red confirm button (Requirement 5 - Visual design consistency). The existing message warns users about Google Drive files remaining, which must be preserved (Requirement 3).

    Restrictions:
    - Do not modify the confirmMessage construction logic
    - Do not change the mutation logic (deleteMutation.mutate)
    - Must use variant='destructive' for the dangerous delete action
    - Keep the same user experience (confirmation before deletion)
    - Maintain existing error handling and success flows
    - Preserve useCallback dependencies
    - Do not modify the DraftClaimCard component

    _Leverage:
    - useConfirmation hook from '@/hooks/use-confirmation'
    - Existing confirmMessage variable (lines 78-83)
    - Existing mutation logic (deleteMutation)
    - Button variant='destructive' for dangerous actions

    Success Criteria:
    - useConfirmation imported and used correctly
    - window.confirm replaced with await confirm()
    - Confirmation uses variant='destructive' (red button)
    - Confirmation message displays Google Drive warning exactly as before
    - Delete button triggers same mutation when confirmed
    - Cancel button prevents deletion when cancelled
    - No TypeScript errors
    - Existing functionality preserved (no regressions)

    After Completion:
    1. Mark this task as in-progress in tasks.md: Change `- [ ] 7.` to `- [-] 7.`
    2. Make the code changes as specified
    3. Test the claim deletion flow (open dialog, verify red button, confirm, cancel)
    4. Use log-implementation tool to record the changes
    5. Mark task as complete in tasks.md: Change `- [-] 7.` to `- [x] 7.`
    ```

- [x] 8. Replace window.confirm in AttachmentList component
  - **File**: `frontend/src/components/attachments/AttachmentList.tsx` (modify)
  - **Purpose**: Replace window.confirm with custom dialog for attachment deletion
  - **Change**: Import useConfirmation, make callback async, replace window.confirm at line 93
  - **_Leverage**: useConfirmation hook, existing deletion logic
  - **_Requirements**: 1 (Replace window.confirm), 3 (Maintain workflows), 5 (Visual design - destructive variant)
  - **_Prompt**:
    ```
    Implement the task for spec confirmation-dialog. First run spec-workflow-guide to get the workflow guide, then implement the task:

    Role: React Developer with expertise in component patterns and async operations

    Task: Replace the window.confirm call in AttachmentItem component (line 93-95) with the custom confirmation dialog, using the destructive variant for the dangerous delete action.

    ⚠️ CRITICAL: The callback function MUST be marked `async` to use `await confirm()`.

    Implementation Requirements:

    1. Import useConfirmation from '@/hooks/use-confirmation' at the top of the file

    2. In the AttachmentItem component, call useConfirmation():
       ```typescript
       const { confirm } = useConfirmation();
       ```

    3. Make the handleDelete callback async and replace window.confirm:
       ```typescript
       const handleDelete = useCallback(async () => {
         // ^^^^^ ADD 'async' keyword here
         if (isDeleting) return;

         const confirmed = await confirm({
           title: 'Delete Attachment',
           description: `Are you sure you want to delete "${attachment.originalFilename}"? This action cannot be undone.`,
           confirmText: 'Delete',
           cancelText: 'Cancel',
           variant: 'destructive',
         });

         if (!confirmed) return;

         // ... rest of deletion logic (lines 99-107) ...
       }, [confirm, attachment.id, attachment.originalFilename, onDelete, isDeleting]);
       //  ^^^^^^^ ADD 'confirm' to dependencies
       ```

    4. Keep the rest of the handleDelete logic unchanged (lines 99-107)

    5. Update useCallback dependencies to include 'confirm'

    Context: Attachment deletion is a destructive action that cannot be undone, so we use variant='destructive' to show a red confirm button (Requirement 5). The message clearly states the action is irreversible (Requirement 3 - Maintain workflows).

    Restrictions:
    - Do not modify the deletion logic after confirmation (onDelete call)
    - Do not change the isDeleting state management
    - Must use variant='destructive' for the dangerous delete action
    - Keep the same user experience (confirmation before deletion)
    - Maintain existing error handling
    - Do not modify the parent AttachmentList component

    _Leverage:
    - useConfirmation hook from '@/hooks/use-confirmation'
    - Existing handleDelete callback logic
    - attachment.originalFilename for personalized message
    - Button variant='destructive' for dangerous actions

    Success Criteria:
    - useConfirmation imported and used in AttachmentItem component
    - window.confirm replaced with await confirm()
    - Confirmation uses variant='destructive' (red button)
    - Confirmation message displays filename and warning
    - Delete button triggers deletion when confirmed
    - Cancel button prevents deletion when cancelled
    - No TypeScript errors
    - Existing functionality preserved (no regressions)

    After Completion:
    1. Mark this task as in-progress in tasks.md: Change `- [ ] 8.` to `- [-] 8.`
    2. Make the code changes in AttachmentItem component
    3. Test the attachment deletion flow (open dialog, verify red button, confirm, cancel)
    4. Use log-implementation tool to record the changes
    5. Mark task as complete in tasks.md: Change `- [-] 8.` to `- [x] 8.`
    ```

### Phase 5: Testing

- [x] 9. Write unit tests for useConfirmation hook
  - **File**: `frontend/src/hooks/__tests__/use-confirmation.test.ts` (new)
  - **Purpose**: Test hook behavior and fallback logic
  - **Tests**: Provider present, provider missing, fallback to window.confirm
  - **_Leverage**: Vitest, @testing-library/react, @testing-library/react-hooks
  - **_Requirements**: All (validation of implementation)
  - **_Prompt**:
    ```
    Implement the task for spec confirmation-dialog. First run spec-workflow-guide to get the workflow guide, then implement the task:

    Role: QA Engineer with expertise in React hooks testing and Vitest

    Task: Create comprehensive unit tests for the useConfirmation hook to verify correct behavior both with and without the ConfirmationProvider in the component tree.

    Test Cases to Implement:

    1. **Hook with provider present:**
       - Should return confirm function from context
       - Should return isOpen boolean from context
       - confirm function should be callable

    2. **Hook without provider (fallback):**
       - Should log console.error when provider is missing
       - Should return fallback confirm function
       - Fallback confirm should call window.confirm
       - Fallback should handle string descriptions
       - Fallback should handle ReactNode descriptions (convert to placeholder)
       - Should return isOpen: false in fallback mode

    3. **Type safety:**
       - Return type matches UseConfirmationReturn interface
       - confirm function accepts ConfirmOptions
       - confirm function returns Promise<boolean>

    Context: These tests validate the hook's reliability and graceful degradation behavior. The fallback mechanism ensures the app never breaks even if the provider is misconfigured (Requirement 6 - Reliability NFR).

    Restrictions:
    - Use Vitest as the test framework (existing project standard)
    - Use @testing-library/react for rendering
    - Mock window.confirm for fallback tests
    - Test both success paths and error paths
    - Do not test implementation details (internal state)
    - Focus on public API behavior

    _Leverage:
    - Vitest (existing test framework)
    - @testing-library/react (component testing)
    - @testing-library/react-hooks (hook testing utilities)
    - Design document section: "Testing Strategy - Unit Testing"

    Success Criteria:
    - Test file created at `frontend/src/hooks/__tests__/use-confirmation.test.ts`
    - All test cases pass
    - Tests cover both normal and fallback paths
    - window.confirm mocked and verified in fallback tests
    - Console.error mocked and verified when provider missing
    - 100% code coverage of useConfirmation hook
    - No flaky tests (deterministic results)

    After Completion:
    1. Mark this task as in-progress in tasks.md: Change `- [ ] 9.` to `- [-] 9.`
    2. Implement all test cases
    3. Run tests and verify they pass: `pnpm test use-confirmation`
    4. Use log-implementation tool to record test implementation
    5. Mark task as complete in tasks.md: Change `- [-] 9.` to `- [x] 9.`
    ```

- [x] 10. Write tests for ConfirmationProvider component
  - **File**: `frontend/src/providers/__tests__/confirmation-provider.test.tsx` (new)
  - **Purpose**: Test state management, Promise resolution, and dialog behavior
  - **Tests**: Open/close, confirm/cancel, Promise resolution, single dialog enforcement
  - **_Leverage**: Vitest, @testing-library/react, @testing-library/user-event
  - **_Requirements**: All (validation of implementation)
  - **_Prompt**:
    ```
    Implement the task for spec confirmation-dialog. First run spec-workflow-guide to get the workflow guide, then implement the task:

    Role: QA Engineer with expertise in React component testing and user event simulation

    Task: Create comprehensive tests for the ConfirmationProvider component to verify state management, Promise resolution, and dialog behavior.

    Test Cases to Implement:

    1. **Dialog opens with correct options:**
       - Dialog displays provided title
       - Dialog displays provided description (string)
       - Dialog displays provided description (ReactNode)
       - Confirm button shows custom confirmText
       - Cancel button shows custom cancelText
       - Destructive variant shows red button

    2. **Promise resolution on confirm:**
       - confirm() resolves to true when user clicks confirm button
       - Dialog closes after confirmation
       - Promise resolves before dialog closes

    3. **Promise resolution on cancel:**
       - confirm() resolves to false when user clicks cancel button
       - confirm() resolves to false when user presses ESC key
       - Dialog closes after cancellation

    4. **Single active dialog enforcement:**
       - Second confirm() call returns false immediately if dialog already open
       - Console warning logged when rejecting new request
       - First dialog remains open and functional

    5. **Cleanup and memory leak prevention:**
       - Unmounting provider resolves pending Promise to false
       - No memory leaks from uncleaned Promise resolvers

    6. **Button variants:**
       - variant='destructive' renders destructive button
       - variant='default' renders default button

    Context: These tests validate the core state management and Promise-based API that makes the confirmation system work (Requirement 2). They ensure reliability and prevent edge cases like simultaneous dialogs or memory leaks.

    Restrictions:
    - Use Vitest as the test framework
    - Use @testing-library/react for rendering
    - Use @testing-library/user-event for interactions
    - Mock console.warn for multiple dialog tests
    - Test user interactions, not implementation details
    - Ensure tests are isolated (no shared state)
    - Tests must be deterministic (no race conditions)

    _Leverage:
    - Vitest (existing test framework)
    - @testing-library/react (component testing)
    - @testing-library/user-event (user interactions)
    - Design document section: "Testing Strategy - Unit Testing - Provider Tests"

    Success Criteria:
    - Test file created at `frontend/src/providers/__tests__/confirmation-provider.test.tsx`
    - All test cases pass
    - Tests verify Promise resolution behavior
    - Tests verify single dialog enforcement
    - Tests verify cleanup on unmount
    - Tests verify button variants
    - High code coverage of ConfirmationProvider (>90%)
    - No flaky tests

    After Completion:
    1. Mark this task as in-progress in tasks.md: Change `- [ ] 10.` to `- [-] 10.`
    2. Implement all test cases
    3. Run tests and verify they pass: `pnpm test confirmation-provider`
    4. Use log-implementation tool to record test implementation
    5. Mark task as complete in tasks.md: Change `- [-] 10.` to `- [x] 10.`
    ```

### Phase 6: Quality Assurance

- [x] 11. Manual QA: Accessibility and mobile testing
  - **Files**: None (manual testing task)
  - **Purpose**: Verify accessibility compliance and mobile responsiveness
  - **Tests**: Keyboard navigation, screen reader, mobile touch targets, dark mode
  - **_Leverage**: Browser DevTools, VoiceOver/NVDA, mobile device simulators
  - **_Requirements**: 4 (Accessibility), 5 (Visual design), Non-functional requirements
  - **_Prompt**:
    ```
    Implement the task for spec confirmation-dialog. First run spec-workflow-guide to get the workflow guide, then implement the task:

    Role: QA Engineer with expertise in accessibility testing and mobile UX validation

    Task: Perform comprehensive manual QA testing to verify accessibility compliance, keyboard navigation, screen reader compatibility, and mobile responsiveness of the confirmation dialog.

    Testing Checklist:

    **Accessibility Testing (Requirement 4):**
    1. Keyboard Navigation:
       - [ ] Tab key cycles between Cancel and Confirm buttons
       - [ ] Shift+Tab moves backwards
       - [ ] ESC key closes dialog and returns focus to trigger
       - [ ] Enter/Space activates focused button
       - [ ] Focus is trapped inside dialog (can't tab to background)
       - [ ] Focus returns to trigger element on close

    2. Screen Reader Testing (VoiceOver on macOS or NVDA on Windows):
       - [ ] Dialog announced as "alert dialog"
       - [ ] Title is read correctly
       - [ ] Description is read correctly
       - [ ] Button labels are clear and descriptive
       - [ ] aria-modal="true" prevents background navigation
       - [ ] role="alertdialog" causes assertive announcement

    3. ARIA Attributes:
       - [ ] Inspect with DevTools: role="alertdialog" present
       - [ ] aria-labelledby points to title element
       - [ ] aria-describedby points to description element
       - [ ] Buttons have clear accessible names

    **Mobile Responsiveness (Requirement 5 - Usability NFR):**
    1. Mobile Viewport Testing (iPhone SE 375px, iPhone 12 Pro 390px, iPad 768px):
       - [ ] Dialog renders without horizontal scroll
       - [ ] Text is readable (minimum 16px font size)
       - [ ] Touch targets are minimum 44x44 pixels
       - [ ] Buttons are easily tappable
       - [ ] Dialog content fits viewport height
       - [ ] Overlay darkens background appropriately

    2. Touch Interactions:
       - [ ] Tap on Cancel button works
       - [ ] Tap on Confirm button works
       - [ ] Tap outside dialog does NOT close it (AlertDialog behavior)
       - [ ] No accidental double-taps

    **Visual Design Testing (Requirement 5):**
    1. Dark Mode Consistency:
       - [ ] Dialog background uses dark theme colors
       - [ ] Text is readable on dark background
       - [ ] Destructive button is clearly red
       - [ ] Cancel button matches app's secondary button style
       - [ ] Focus rings are visible in dark mode

    2. Content Rendering:
       - [ ] Long messages wrap correctly
       - [ ] Bullet lists render with proper spacing
       - [ ] Line breaks in messages display as paragraphs
       - [ ] Multi-line descriptions are readable

    **Functional Testing:**
    1. Test all three window.confirm replacements:
       - [ ] Batch claim submission (useMarkClaimsReady)
       - [ ] Individual claim deletion (DraftClaimsList)
       - [ ] Attachment deletion (AttachmentList)

    2. For each location:
       - [ ] Dialog opens with correct message
       - [ ] Confirm button executes action
       - [ ] Cancel button prevents action
       - [ ] ESC key prevents action
       - [ ] No regressions in existing functionality

    Context: This manual QA validates that the implementation meets all accessibility requirements (Requirement 4) and non-functional requirements for usability and mobile responsiveness. Automated tests can't fully verify screen reader behavior or mobile touch interactions.

    Restrictions:
    - Test on real mobile devices if possible (not just simulators)
    - Use actual screen readers (VoiceOver, NVDA, not just DevTools)
    - Document any issues found with screenshots
    - Do not skip any checklist items
    - Test in both light and dark mode (though app is dark-only, verify no light mode leaks)

    _Leverage:
    - Browser DevTools accessibility inspector
    - VoiceOver (macOS) or NVDA (Windows)
    - Chrome DevTools device emulation
    - Real mobile devices (iOS Safari, Chrome Mobile)
    - Design document section: "Accessibility Compliance" and "Usability NFR"

    Success Criteria:
    - All checklist items pass
    - Keyboard navigation works perfectly
    - Screen reader announces dialog correctly
    - Mobile touch targets meet 44x44px minimum
    - Dialog is fully responsive on all viewport sizes
    - Dark mode styling is consistent
    - No regressions in any of the three replaced window.confirm locations
    - Any issues found are documented and fixed before marking complete

    After Completion:
    1. Mark this task as in-progress in tasks.md: Change `- [ ] 11.` to `- [-] 11.`
    2. Perform all testing checklist items
    3. Document results (pass/fail for each item)
    4. Fix any issues found before proceeding
    5. Use log-implementation tool to record QA results (no code artifacts, but document testing performed)
    6. Mark task as complete in tasks.md: Change `- [-] 11.` to `- [x] 11.`
    ```

## Task Completion Summary

**Total Tasks**: 11
**Estimated Complexity**:
- Low complexity: Tasks 1, 2, 4, 5
- Medium complexity: Tasks 3, 6, 7, 8
- High complexity: Tasks 9, 10, 11 (testing)

**Dependencies**:
- Tasks 1-2: Can be done in parallel (no dependencies)
- Task 3: Depends on tasks 1, 2
- Task 4: Depends on task 3
- Task 5: Depends on task 3
- Tasks 6-8: Depend on tasks 4, 5 (can be done in parallel after)
- Tasks 9-10: Can be done in parallel, depend on tasks 3-4
- Task 11: Depends on all previous tasks (final validation)

**Critical Path**: 1 → 2 → 3 → 4 → 5 → 6 → 11

**File Impact**:
- **New files**: 6 (alert-dialog.tsx, confirmation.ts, confirmation-provider.tsx, use-confirmation.ts, 2 test files)
- **Modified files**: 4 (layout.tsx, useMarkClaimsReady.ts, DraftClaimsList.tsx, AttachmentList.tsx)
- **Total files affected**: 10
