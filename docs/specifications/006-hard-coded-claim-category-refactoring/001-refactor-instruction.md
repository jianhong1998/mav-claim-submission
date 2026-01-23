We are going to have admin module in the near future.

Realised that the backend and frontend are hard coded for the claim categories. Refer to @backend/src/modules/claims/enums/claim-category.enum.ts

To store the claim category code, category name, limit type and limit amount into database, the ClaimCategory entity and ClaimCategoryLimit entity are implemented. Refer to the migration files (@backend/src/db/migrations/1768785189297-create-category-entity.ts and @backend/src/db/migrations/1768785189300-seed-category-to-claim.ts ) and models created in @backend/src/modules/claim-category module.

Analyse the current codebase and clarify with me for the requirement. Do Not assume anything.

After analysing the codebase, you are required to create a implement plan with spec-workflow tool for the refactoring of the frontend and backend. Keep Linus in mind when planning for the implementation.
