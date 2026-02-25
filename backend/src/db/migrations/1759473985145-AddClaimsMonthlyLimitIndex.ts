import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClaimsMonthlyLimitIndex1759473985145 implements MigrationInterface {
  name = 'AddClaimsMonthlyLimitIndex1759473985145';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE INDEX "idx_claims_user_category_month_year" ON "claims" ("userId", "category", "month", "year")
            WHERE "deletedAt" IS NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX "public"."idx_claims_user_category_month_year"
        `);
  }
}
