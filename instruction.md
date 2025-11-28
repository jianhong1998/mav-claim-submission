Look at these components:
@frontend/src/hooks/claims/useMarkClaimsReady.ts
@frontend/src/components/claims/DraftClaimsList.tsx
@frontend/src/components/attachments/AttachmentList.tsx

Realised that currently the application is using `window.confirm` instead of modal popup.

Users feedback that is bad design for UX when looking at the message in `confirm` window. Ultrathink for implementing modal popup to replace the `window.confirm` from the current confirmation workflow.

Use `spec-workflow` for planning.
