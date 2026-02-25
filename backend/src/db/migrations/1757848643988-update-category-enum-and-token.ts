import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateCategoryEnumAndToken1757848643988 implements MigrationInterface {
  name = 'UpdateCategoryEnumAndToken1757848643988';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "oauth_tokens" DROP COLUMN "accessToken"
        `);
    await queryRunner.query(`
            ALTER TABLE "oauth_tokens"
            ADD "accessToken" jsonb NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "oauth_tokens" DROP COLUMN "refreshToken"
        `);
    await queryRunner.query(`
            ALTER TABLE "oauth_tokens"
            ADD "refreshToken" jsonb NOT NULL
        `);
    await queryRunner.query(`
            ALTER TYPE "public"."claims_category_enum"
            RENAME TO "claims_category_enum_old"
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
            ALTER COLUMN "category" TYPE "public"."claims_category_enum" USING "category"::"text"::"public"."claims_category_enum"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."claims_category_enum_old"
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."claims_category_enum_old" AS ENUM(
                'telco',
                'fitness',
                'dental',
                'company-event',
                'company-lunch',
                'company-dinner',
                'others'
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "claims"
            ALTER COLUMN "category" TYPE "public"."claims_category_enum_old" USING "category"::"text"::"public"."claims_category_enum_old"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."claims_category_enum"
        `);
    await queryRunner.query(`
            ALTER TYPE "public"."claims_category_enum_old"
            RENAME TO "claims_category_enum"
        `);
    await queryRunner.query(`
            ALTER TABLE "oauth_tokens" DROP COLUMN "refreshToken"
        `);
    await queryRunner.query(`
            ALTER TABLE "oauth_tokens"
            ADD "refreshToken" text NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "oauth_tokens" DROP COLUMN "accessToken"
        `);
    await queryRunner.query(`
            ALTER TABLE "oauth_tokens"
            ADD "accessToken" text NOT NULL
        `);
  }
}
