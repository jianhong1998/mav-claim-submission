import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCategoryEntity1768785189297 implements MigrationInterface {
  name = 'CreateCategoryEntity1768785189297';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."claim_category_limits_type_enum" AS ENUM('monthly', 'yearly')
            `);
    await queryRunner.query(`
                    CREATE TABLE "claim_categories" (
                        "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
                        "code" character varying(50) NOT NULL,
                        "name" character varying(100) NOT NULL,
                        "isEnabled" boolean NOT NULL DEFAULT true,
                        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                        "deletedAt" TIMESTAMP WITH TIME ZONE,
                        CONSTRAINT "UQ_8cb3f925558a65c095cda69d3c6" UNIQUE ("code"),
                        CONSTRAINT "PK_8a1c0e179b7f8e05033a749b8c1" PRIMARY KEY ("uuid")
                    )
                `);
    await queryRunner.query(`
            CREATE TABLE "claim_category_limits" (
                "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "type" "public"."claim_category_limits_type_enum" NOT NULL,
                "amount" integer NOT NULL DEFAULT '0',
                "category_id" uuid NOT NULL,
                CONSTRAINT "REL_e7945aad1b89034da78c384e8a" UNIQUE ("category_id"),
                CONSTRAINT "PK_5ffba08fbb4b7b2c1d1f9a508c2" PRIMARY KEY ("uuid"),
                CONSTRAINT "FK_e7945aad1b89034da78c384e8a7" FOREIGN KEY ("category_id") REFERENCES "claim_categories"("uuid") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "claim_category_limits"
        `);
    await queryRunner.query(`
            DROP TABLE "claim_categories"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."claim_category_limits_type_enum"
        `);
  }
}
