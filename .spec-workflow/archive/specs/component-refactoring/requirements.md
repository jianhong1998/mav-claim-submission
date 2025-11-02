# Requirements Document: Frontend Component Refactoring

## Introduction

This specification addresses the need to refactor frontend React components to improve code quality, maintainability, and adherence to SOLID principles. The current codebase suffers from code duplication, large components with multiple responsibilities, and poor separation of concerns. This refactoring will break down monolithic components into smaller, focused, reusable components while maintaining 100% backward compatibility with existing functionality.

**Value Proposition**: Improved developer productivity through better code organization, reduced technical debt, easier testing, and simplified maintenance for future feature development.

## Alignment with Product Vision

This refactoring aligns with the project's technical excellence goals by:
- **Maintainability**: Creating a codebase that's easier to understand, modify, and extend
- **Code Quality**: Following SOLID principles and React best practices
- **Developer Experience**: Reducing cognitive load when working with components
- **Future-Proofing**: Establishing patterns that scale as the application grows

## Requirements

### Requirement 1: Extract Shared Utility Functions

**User Story:** As a developer, I want utility functions (formatting, validation, display logic) consolidated in shared modules, so that I can reuse code and avoid duplication.

#### Acceptance Criteria

1. WHEN a utility function is used in 2+ components THEN it SHALL be extracted to a shared utility module
2. IF a utility function handles claim formatting THEN it SHALL be placed in `@frontend/src/lib/claim-utils.ts`
3. IF a utility function handles file operations THEN it SHALL be placed in `@frontend/src/lib/file-utils.ts`
4. IF a utility function handles date/currency formatting THEN it SHALL be placed in `@frontend/src/lib/format-utils.ts`
5. WHEN utility functions are extracted THEN all importing components SHALL use the shared version
6. WHEN running the codebase linter THEN no duplicate utility functions SHALL be detected

**Affected Components:**
- All components with `getCategoryDisplayName()` (7 files)
- All components with `formatAmount()` (5 files)
- All components with `formatFileSize()` (3 files)
- All components with `formatMonthYear()` (4 files)
- All components with `getStatusInfo()` / `getStatusDisplay()` (3 files)

### Requirement 2: Break Down Large Monolithic Components

**User Story:** As a developer, I want large components (>300 lines) split into smaller focused components, so that each component has a single clear responsibility.

#### Acceptance Criteria

1. WHEN a component exceeds 300 lines THEN it SHALL be analyzed for extraction opportunities
2. IF a component contains nested sub-components THEN those sub-components SHALL be extracted to separate files
3. WHEN extracting a component THEN it SHALL receive only the props it needs (no prop drilling)
4. IF a component renders different UI states THEN each state SHALL be a separate component
5. WHEN components are extracted THEN the original component SHALL compose them together
6. WHEN tests run THEN all existing functionality SHALL pass without modification

**Target Components for Breakdown:**
- `FileUploadComponent.tsx` (645 lines) → Extract: UploadZone, FilePreviewList, UploadedFilesList, CurrentUploadProgress
- `ClaimReviewComponent.tsx` (542 lines) → Extract: ClaimReviewItem, ReviewSummaryStats, ReviewActions
- `ClaimForm.tsx` (455 lines) → Extract: ClaimFormFields, AttachmentSection, ClaimStatusIndicator
- `BulkFileUploadComponent.tsx` (429 lines) → Extract: UploadStatsCard, BulkUploadClaimCard
- `MultiClaimForm.tsx` (430 lines) → Extract: CategorySelect, MonthYearPicker, FormActions
- `ClaimsListComponent.tsx` (371 lines) → Extract: ClaimCard, ClaimStatusBadge, EmptyState
- `DraftClaimsList.tsx` (278 lines) → Extract: DraftClaimCard

### Requirement 3: Extract Repeating UI Patterns as Reusable Components

**User Story:** As a developer, I want common UI patterns (status badges, file icons, loading states) extracted as reusable components, so that UI is consistent and changes propagate automatically.

#### Acceptance Criteria

1. WHEN status display logic appears in 2+ places THEN it SHALL be a `ClaimStatusBadge` component
2. WHEN file type icons are displayed THEN they SHALL use a shared `FileTypeIcon` component
3. WHEN loading states are rendered THEN they SHALL use a shared `LoadingSkeleton` component
4. WHEN empty states are shown THEN they SHALL use a shared `EmptyState` component
5. WHEN error states are displayed THEN they SHALL use a shared `ErrorDisplay` component
6. WHEN these components are created THEN they SHALL be placed in `@frontend/src/components/ui/`

**UI Patterns to Extract:**
- Status badges (Draft, Sent, Paid, Failed) - used in 4 components
- File type icons with colors - used in 3 components
- Loading skeletons - used in 5 components
- Empty states with icons - used in 6 components
- Error alerts - used in 4 components

### Requirement 4: Apply Single Responsibility Principle to Component Logic

**User Story:** As a developer, I want components to have a single clear responsibility, so that I can understand, test, and modify them easily.

#### Acceptance Criteria

1. WHEN a component fetches data AND renders UI THEN data fetching SHALL be in a custom hook
2. IF a component has complex state management THEN state logic SHALL be extracted to a custom hook
3. WHEN a component performs validation THEN validation SHALL be in a separate function/hook
4. IF a component handles multiple user actions THEN action handlers SHALL be organized in a hook
5. WHEN component logic is extracted THEN the component SHALL focus only on rendering UI

**Custom Hooks to Create:**
- `useClaimValidation` - for form validation logic
- `useMonthlyLimits` - for monthly limit validation
- `useFileUploadState` - for file upload state management
- `useClaimActions` - for claim CRUD operations

### Requirement 5: Maintain 100% Backward Compatibility

**User Story:** As a developer, I want the refactoring to maintain all existing functionality, so that users experience no disruption and tests continue to pass.

#### Acceptance Criteria

1. WHEN refactoring is complete THEN all existing unit tests SHALL pass without modification
2. IF integration tests exist THEN they SHALL pass without modification
3. WHEN components are extracted THEN external API/props SHALL remain unchanged
4. IF internal implementation changes THEN external behavior SHALL remain identical
5. WHEN running the application THEN no visual or functional regressions SHALL occur
6. WHEN TypeScript compiles THEN there SHALL be zero new type errors

## Non-Functional Requirements

### Code Architecture and Modularity

- **Single Responsibility Principle**: Each component/utility SHALL have exactly one reason to change
- **Modular Design**: Components SHALL be composable and reusable across different contexts
- **Dependency Management**: Components SHALL depend on abstractions (hooks/utilities), not concrete implementations
- **Clear Interfaces**: Component props SHALL be well-typed with TypeScript interfaces
- **File Organization**:
  - Shared utilities: `@frontend/src/lib/`
  - Reusable UI components: `@frontend/src/components/ui/`
  - Feature-specific components: `@frontend/src/components/{feature}/`
  - Custom hooks: `@frontend/src/hooks/{feature}/`

### Performance

- Refactored components SHALL NOT introduce performance regressions
- Component re-renders SHALL be minimized through proper memoization (React.memo, useMemo, useCallback)
- Bundle size SHALL NOT increase by more than 5% (acceptable for improved architecture)
- Lazy loading SHALL be considered for large feature components

### Maintainability

- Component files SHALL NOT exceed 250 lines (except documented exceptions)
- Cyclomatic complexity per function SHALL be ≤ 10
- Code duplication SHALL be reduced by at least 70%
- Each component SHALL have a clear, descriptive JSDoc comment
- Components SHALL follow existing naming conventions (PascalCase for components, camelCase for utilities)

### Testability

- Extracted components SHALL be easier to unit test in isolation
- Custom hooks SHALL be testable independently from components
- Utility functions SHALL be pure functions where possible
- Mock requirements for tests SHALL be reduced through better separation of concerns

### Developer Experience

- Component responsibilities SHALL be immediately clear from file/component names
- Import statements SHALL clearly indicate dependencies
- Prop interfaces SHALL be self-documenting
- Code SHALL follow existing ESLint and Prettier configurations
- No new linting errors SHALL be introduced

## Success Metrics

- **Code Duplication**: Reduce duplicated code from ~40% to <10%
- **Component Size**: All components under 300 lines (target: under 250)
- **Test Coverage**: Maintain current coverage, enable easier testing for future additions
- **Build Time**: No increase in build time
- **Developer Velocity**: Reduce time to add new features by ~30% (measured after implementation)

## Out of Scope

- **UI/UX Changes**: No visual changes to user interface
- **Feature Additions**: No new features, only refactoring
- **Backend Changes**: No changes to API contracts or backend code
- **Testing Framework Changes**: No changes to Vitest or testing approach
- **State Management Changes**: No introduction of Redux/Zustand (continue using React Query + local state)
- **Component Library Changes**: No changes to shadcn/ui components
