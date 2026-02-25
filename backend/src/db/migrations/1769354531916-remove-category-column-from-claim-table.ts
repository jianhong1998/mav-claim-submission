import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveCategoryColumnFromClaimTable1769354531916 implements MigrationInterface {
  name = 'RemoveCategoryColumnFromClaimTable1769354531916';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "claim_category_limits" DROP CONSTRAINT "FK_e7945aad1b89034da78c384e8a7"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_aebfc49ed79b06a2500ad4ab05"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."idx_claims_user_category_month_year"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."idx_claims_user_category_year"
        `);
    await queryRunner.query(`
            ALTER TABLE "claims" DROP COLUMN "category"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."claims_category_enum"
        `);
    await queryRunner.query(`
            CREATE INDEX "idx_claims_user_category_year" ON "claims" ("userId", "category_id", "year")
            WHERE "deletedAt" IS NULL
        `);
    await queryRunner.query(`
            CREATE INDEX "idx_claims_user_category_month_year" ON "claims" ("userId", "category_id", "month", "year")
            WHERE "deletedAt" IS NULL
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_9212a33081ed87c86905194b1c" ON "claims" ("category_id")
        `);
    await queryRunner.query(`
            ALTER TABLE "claim_category_limits"
            ADD CONSTRAINT "FK_ad4e0fe6b2ed97022602aebeabe" FOREIGN KEY ("category_id") REFERENCES "claim_categories"("uuid") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "claim_category_limits" DROP CONSTRAINT "FK_ad4e0fe6b2ed97022602aebeabe"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_9212a33081ed87c86905194b1c"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."idx_claims_user_category_month_year"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."idx_claims_user_category_year"
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."claims_category_enum" AS ENUM(
                'telco',
                'fitness',
                'dental',
                'skill-enhancement',
                'company-event',
                'company-lunch',
                'company-dinner',
                'others'
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "claims"
            ADD "category" "public"."claims_category_enum" NOT NULL
        `);
    await queryRunner.query(`
            CREATE INDEX "idx_claims_user_category_year" ON "claims" ("userId", "category", "year")
            WHERE ("deletedAt" IS NULL)
        `);
    await queryRunner.query(`
            CREATE INDEX "idx_claims_user_category_month_year" ON "claims" ("userId", "category", "month", "year")
            WHERE ("deletedAt" IS NULL)
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_aebfc49ed79b06a2500ad4ab05" ON "claims" ("category")
        `);
    await queryRunner.query(`
            ALTER TABLE "claim_category_limits"
            ADD CONSTRAINT "FK_e7945aad1b89034da78c384e8a7" FOREIGN KEY ("category_id") REFERENCES "claim_categories"("uuid") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }
}
