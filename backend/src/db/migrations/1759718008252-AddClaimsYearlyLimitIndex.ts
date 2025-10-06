import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClaimsYearlyLimitIndex1759718008252
  implements MigrationInterface
{
  name = 'AddClaimsYearlyLimitIndex1759718008252';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE INDEX "idx_claims_user_category_year" ON "claims" ("userId", "category", "year")
            WHERE "deletedAt" IS NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX "public"."idx_claims_user_category_year"
        `);
  }
}
