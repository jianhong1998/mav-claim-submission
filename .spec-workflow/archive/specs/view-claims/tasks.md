# Tasks Document

- [x] 1. Create ClaimsListComponent with basic structure and API integration
  - File: frontend/src/components/claims/ClaimsListComponent.tsx
  - Create React component using TanStack Query to fetch all user claims
  - Implement loading states with skeleton UI following existing DraftClaimsList patterns
  - Purpose: Establish the core claims listing component with proper data fetching
  - _Leverage: frontend/src/components/claims/DraftClaimsList.tsx, frontend/src/lib/api-client.ts, @project/types_
  - _Requirements: 1.1, 1.3_
  - _Prompt: Implement the task for spec view-claims, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React Developer with expertise in TanStack Query and component architecture | Task: Create ClaimsListComponent.tsx that fetches all user claims using existing patterns from DraftClaimsList.tsx, implementing proper loading states and API integration with apiClient.get<IClaimListResponse>('/claims') | Restrictions: Must use existing DraftClaimsList.tsx as pattern reference, do not modify API endpoints, use existing IClaimListResponse and IClaimMetadata types, follow mobile-first responsive design | _Leverage: DraftClaimsList.tsx for query patterns, api-client.ts for HTTP calls, existing UI components (Card, CardHeader, CardContent) | _Requirements: Requirements 1.1 (authenticated user can view all claims at /claims), 1.3 (claims display newest first) | Success: Component renders with skeleton loading state, successfully fetches claims via GET /claims endpoint, handles loading and basic error states, follows existing DraftClaimsList patterns exactly | Instructions: First mark this task as in-progress in tasks.md by changing [ ] to [-], then implement the component, then mark as complete [x] when done_

- [x] 2. Add status-specific styling and visual indicators to ClaimsListComponent
  - File: frontend/src/components/claims/ClaimsListComponent.tsx (continue from task 1)
  - Implement status badges with appropriate colors for draft, sent, paid, failed statuses
  - Add visual hierarchy and styling following design requirements
  - Purpose: Provide clear visual feedback for different claim states
  - _Leverage: frontend/src/components/claims/DraftClaimsList.tsx styling patterns, frontend/src/components/ui/button.tsx for variant patterns_
  - _Requirements: 3.1_
  - _Prompt: Implement the task for spec view-claims, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer specializing in UI/UX and responsive design | Task: Add status badges and visual styling to ClaimsListComponent.tsx following requirement 3.1, implementing draft (gray/neutral), sent (blue/info), paid (green/success), and failed (red/error) styling with mobile-responsive design | Restrictions: Must maintain dark mode exclusively as per product requirements, use existing Tailwind classes and component patterns, ensure 44px minimum touch targets on mobile, do not create new UI components | _Leverage: DraftClaimsList.tsx for mobile responsive patterns, Button component variant styles for color schemes | _Requirements: Requirement 3.1 (clear status visual indicators for each claim state) | Success: Status badges display correctly with appropriate colors, mobile-responsive layout works properly, dark mode styling is consistent, touch targets meet 44px minimum | Instructions: Mark task as in-progress [-] in tasks.md, implement status styling, mark complete [x] when done_

- [x] 3. Add error handling and empty state to ClaimsListComponent
  - File: frontend/src/components/claims/ClaimsListComponent.tsx (continue from task 2)
  - Implement comprehensive error handling for API failures and empty claims list
  - Add retry functionality and user-friendly error messages
  - Purpose: Ensure robust user experience with clear feedback for all scenarios
  - _Leverage: frontend/src/components/claims/DraftClaimsList.tsx error patterns, frontend/src/components/ui/alert.tsx_
  - _Requirements: 1.4, 1.5_
  - _Prompt: Implement the task for spec view-claims, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with expertise in error handling and user experience | Task: Implement comprehensive error handling and empty states in ClaimsListComponent.tsx following requirements 1.4 and 1.5, using patterns from DraftClaimsList.tsx for network errors, authentication failures, and empty claims scenarios | Restrictions: Must handle network failures gracefully with retry button, redirect auth failures to login (handled by auth provider), show encouraging empty state message, do not bypass existing auth provider error handling | _Leverage: DraftClaimsList.tsx for error UI patterns, auth provider for authentication error handling | _Requirements: Requirements 1.4 (graceful error handling), 1.5 (empty state when no claims exist) | Success: Network errors show retry button, authentication errors redirect properly, empty state displays encouraging message with CTA, all error scenarios provide clear user guidance | Instructions: Mark task as in-progress [-] in tasks.md, implement error handling, mark complete [x] when done_

- [x] 4. Add date formatting and mobile-responsive layout to ClaimsListComponent
  - File: frontend/src/components/claims/ClaimsListComponent.tsx (continue from task 3)
  - Implement proper date formatting and ensure mobile-responsive card layout
  - Add accessibility features and proper semantic HTML structure
  - Purpose: Complete the component with production-ready formatting and accessibility
  - _Leverage: frontend/src/components/claims/DraftClaimsList.tsx formatting utilities, frontend/src/lib/utils.ts_
  - _Requirements: 1.2, 1.3_
  - _Prompt: Implement the task for spec view-claims, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with expertise in responsive design and accessibility | Task: Complete ClaimsListComponent.tsx with proper date formatting, mobile-responsive layout, and accessibility features following requirements 1.2 and 1.3, using date formatting patterns from DraftClaimsList.tsx | Restrictions: Must display claims ordered by creation date (newest first), use proper semantic HTML, ensure accessibility with ARIA labels, maintain mobile-first responsive design exclusively dark mode | _Leverage: DraftClaimsList.tsx for date formatting functions (formatMonthYear, formatAmount), existing responsive layout patterns | _Requirements: Requirements 1.2 (proper date and amount formatting), 1.3 (newest claims first ordering) | Success: Dates display in readable format, claims ordered newest first, mobile layout works properly, accessibility standards met, component is fully production-ready | Instructions: Mark task as in-progress [-] in tasks.md, implement formatting and responsive design, mark complete [x] when done_

- [x] 5. Replace demo content in /claims page with ClaimsListComponent
  - File: frontend/src/app/claims/page.tsx (replace existing content)
  - Remove demo ClaimForm and replace with ClaimsListComponent
  - Ensure proper authentication guard and page structure
  - Purpose: Complete the /claims route with production-ready claims listing functionality
  - _Leverage: frontend/src/app/claim/new/page.tsx for page structure patterns, frontend/src/components/providers/auth-provider.tsx_
  - _Requirements: 1.1_
  - _Prompt: Implement the task for spec view-claims, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Next.js Developer with expertise in App Router and authentication | Task: Replace demo content in /claims page.tsx with ClaimsListComponent following requirement 1.1, maintaining existing authentication patterns and page layout structure | Restrictions: Must preserve existing authentication context, maintain page layout consistency with other pages, do not modify authentication guards, ensure proper imports and TypeScript types | _Leverage: Existing /claim/new/page.tsx for Next.js page patterns, auth-provider.tsx for authentication context | _Requirements: Requirement 1.1 (authenticated users can view all claims at /claims route) | Success: Page loads ClaimsListComponent correctly, authentication is preserved, page layout is consistent, TypeScript compiles without errors, route functions as intended | Instructions: Mark task as in-progress [-] in tasks.md, replace page content, mark complete [x] when done_

- [x] 6. Create comprehensive unit tests for ClaimsListComponent
  - File: frontend/src/components/claims/__tests__/ClaimsListComponent.test.tsx
  - Write tests covering loading, success, error, and empty states
  - Test status styling, responsive behavior, and accessibility
  - Purpose: Ensure component reliability and catch regressions
  - _Leverage: frontend/src/components/claims/__tests__/DraftClaimsList.test.tsx, @testing-library/react_
  - _Requirements: All requirements (comprehensive coverage)_
  - _Prompt: Implement the task for spec view-claims, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer with expertise in React Testing Library and component testing | Task: Create comprehensive unit tests for ClaimsListComponent covering all requirements, using patterns from DraftClaimsList.test.tsx for API mocking, loading states, error handling, and responsive behavior testing | Restrictions: Must mock apiClient.get calls, test all claim statuses and their styling, verify responsive layout behavior, test accessibility features, do not test external dependencies directly | _Leverage: DraftClaimsList.test.tsx for testing patterns, @testing-library/react for component testing, existing test utilities | _Requirements: All requirements - comprehensive test coverage for loading states, error handling, status display, mobile responsiveness, and accessibility | Success: All component states tested with good coverage, status styling verified, responsive behavior tested, accessibility features validated, tests run independently and consistently | Instructions: Mark task as in-progress [-] in tasks.md, create test file, mark complete [x] when done_

- [x] 7. Manual testing and final integration validation
  - File: No specific file (testing activity)
  - Perform end-to-end testing of /claims route with real authentication
  - Test mobile responsiveness across different screen sizes and claim statuses
  - Purpose: Validate complete user experience and catch integration issues
  - _Leverage: existing authentication flow, actual backend API endpoints_
  - _Requirements: All requirements (end-to-end validation)_
  - _Prompt: Implement the task for spec view-claims, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer with expertise in manual testing and user experience validation | Task: Perform comprehensive manual testing of the view-claims feature covering all requirements, testing authentication flow, claims display across all statuses, mobile responsiveness, error scenarios, and empty states | Restrictions: Must test with real authentication, verify actual API integration, test on multiple screen sizes, validate dark mode exclusively, do not skip edge cases or error scenarios | _Leverage: Existing authentication system, actual backend claims endpoints, browser dev tools for responsive testing | _Requirements: All requirements - complete end-to-end validation of user authentication, claims listing, status display, error handling, and mobile responsiveness | Success: All user scenarios work correctly, mobile experience is smooth, authentication works properly, error states are handled gracefully, feature meets all requirements | Instructions: Mark task as in-progress [-] in tasks.md, perform manual testing, document any issues found, mark complete [x] when all tests pass_