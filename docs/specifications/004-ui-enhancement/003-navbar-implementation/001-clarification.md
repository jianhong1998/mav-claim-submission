# 1. Route Structure (Most Critical)

- What's the URL path for "New Claim"? (/claims/new, /new-claim, other?)
- What's the URL path for "Claim History"? (/claims, /history, other?)
- Do these pages exist yet or do we need to create them too?

## Answer

URL paths:

- "New Claim": `/`
- "Claim History": `/claims`

# 2. Mobile Menu Behavior

- Which side should the menu slide from? (Left is standard, but confirm)
- Mobile breakpoint? (Typically 768px, but your project might differ)
- Should there be a backdrop overlay when menu is open?

## Answer

- Menu should slide from the left.
- Mobile breakpoint follow tailwind configuration.
- Yes, should have a backdrop overlay. Click on the backdrop overlay should close the menu.

# 3. Authentication Integration

- Should nav be visible to unauthenticated users?
- Or hide nav until user logs in?

## Answer

Should hide the nav bar until user logs in.

# 4. Active State

- Should the current page be visually highlighted in the nav?

## Answer

Yes, current page should be highligthed in the nav bar.

# 5. Component Location

- Create as components/navigation/navbar.tsx or different location?
- Any existing nav components I should be aware of?

## Answer

Yes, the path is correct.
