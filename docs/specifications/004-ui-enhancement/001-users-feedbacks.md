# Users feedbacks

## [x] 001 - The home page should be `create claim page` instead

Users feedback about the home page at `/` should be `create claim page` instead of the `list claim page`.

## [x] 002 - PhaseIndicator in `frontend/src/app/new/page.tsx` should be clickable

Users feedback that the design of `PhaseIndicator` in @frontend/src/app/new/page.tsx looks like a clickable button. Should make it clickable to redirect in between all phases.

## [x] 003 - Not obvious about what to do

Users feedback that they don't know what to do after create the draft submission at `/new` page (in phase 1 - create claims).
Hard to see the button to phase 2 (upload files) because it is at the bottom of the page that require user to scroll.

### Suggestion

- Combine phase 1 and phase 2. Move file upload action to the `add new claim` form.
- Replace the `DraftClaimCard` in phase 1 with the `BulkUploadClaimCard` in phase 2, and combine the functionality of the both claim card component.
- The `BulkUploadClaimCard` should default to `expanded` instead of `collapsed`.

## [x] 004 - Edit button in the `DraftClaimCard` (or new `BulkUploadClaimCard` mentioned in 003) should work

Users feedback that the edit button should work in case they key in a wrong info or typo in the input.

## [ ] 005 - Profile page missing

User request to have profile page for below operations:

- Change username that display in the app and email.
- Add a cc or bcc email address in the email that is being sent for their personal email address.
