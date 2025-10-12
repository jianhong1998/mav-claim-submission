import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1757430589970 implements MigrationInterface {
  name = 'Init1757430589970';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."oauth_tokens_provider_enum" AS ENUM('google')
        `);
    await queryRunner.query(`
            CREATE TABLE "oauth_tokens" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "provider" "public"."oauth_tokens_provider_enum" NOT NULL,
                "accessToken" text NOT NULL,
                "refreshToken" text NOT NULL,
                "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
                "scope" text NOT NULL,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "PK_71c8b8060826696206f973554fd" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_ef112026a02b7a65fbd2a33209" ON "oauth_tokens" ("userId", "provider")
        `);
    await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying(255) NOT NULL,
                "name" character varying(255) NOT NULL,
                "picture" character varying(500),
                "googleId" character varying(255) NOT NULL,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_f382af58ab36057334fb262efd" ON "users" ("googleId")
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email")
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."attachments_status_enum" AS ENUM('pending', 'uploaded', 'failed')
        `);
    await queryRunner.query(`
            CREATE TABLE "attachments" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "claimId" uuid NOT NULL,
                "originalFilename" character varying(255) NOT NULL,
                "storedFilename" character varying(255) NOT NULL,
                "googleDriveFileId" character varying(255),
                "googleDriveUrl" text,
                "fileSize" bigint NOT NULL,
                "mimeType" character varying(100) NOT NULL,
                "status" "public"."attachments_status_enum" NOT NULL DEFAULT 'pending',
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "PK_5e1f050bcff31e3084a1d662412" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_e8cc99b26b14533500b7a6ffaa" ON "attachments" ("status")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_3011e4956fc43cc5bee18e167a" ON "attachments" ("claimId")
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."claims_category_enum" AS ENUM(
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
            CREATE TYPE "public"."claims_status_enum" AS ENUM('draft', 'sent', 'failed', 'paid')
        `);
    await queryRunner.query(`
            CREATE TABLE "claims" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "category" "public"."claims_category_enum" NOT NULL,
                "claimName" character varying(255),
                "month" integer NOT NULL,
                "year" integer NOT NULL,
                "totalAmount" numeric(10, 2) NOT NULL,
                "status" "public"."claims_status_enum" NOT NULL DEFAULT 'draft',
                "submissionDate" TIMESTAMP WITH TIME ZONE,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "CHK_ced98ae4be085770fb69fe25db" CHECK (
                    "year" >= 2020
                    AND "year" <= 2100
                ),
                CONSTRAINT "CHK_103caec26994bc7b30d8b5c0f4" CHECK (
                    "month" >= 1
                    AND "month" <= 12
                ),
                CONSTRAINT "CHK_6093b6793325be4d112dbbc9bc" CHECK ("totalAmount" > 0),
                CONSTRAINT "PK_96c91970c0dcb2f69fdccd0a698" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_5bdd25f3c6aab8d5d3373eb183" ON "claims" ("submissionDate")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_b97d384ef21347eff1a236e1b4" ON "claims" ("month", "year")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_aebfc49ed79b06a2500ad4ab05" ON "claims" ("category")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_78214f7ed47cfd76fb8bf6bb28" ON "claims" ("status")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_299a3ed5259cccd5cf541512e7" ON "claims" ("userId")
        `);
    await queryRunner.query(`
            ALTER TABLE "oauth_tokens"
            ADD CONSTRAINT "FK_a8c200cc4c90d24e832caf0a180" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "attachments"
            ADD CONSTRAINT "FK_3011e4956fc43cc5bee18e167a2" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "claims"
            ADD CONSTRAINT "FK_299a3ed5259cccd5cf541512e73" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "claims" DROP CONSTRAINT "FK_299a3ed5259cccd5cf541512e73"
        `);
    await queryRunner.query(`
            ALTER TABLE "attachments" DROP CONSTRAINT "FK_3011e4956fc43cc5bee18e167a2"
        `);
    await queryRunner.query(`
            ALTER TABLE "oauth_tokens" DROP CONSTRAINT "FK_a8c200cc4c90d24e832caf0a180"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_299a3ed5259cccd5cf541512e7"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_78214f7ed47cfd76fb8bf6bb28"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_aebfc49ed79b06a2500ad4ab05"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_b97d384ef21347eff1a236e1b4"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_5bdd25f3c6aab8d5d3373eb183"
        `);
    await queryRunner.query(`
            DROP TABLE "claims"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."claims_status_enum"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."claims_category_enum"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_3011e4956fc43cc5bee18e167a"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_e8cc99b26b14533500b7a6ffaa"
        `);
    await queryRunner.query(`
            DROP TABLE "attachments"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."attachments_status_enum"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_f382af58ab36057334fb262efd"
        `);
    await queryRunner.query(`
            DROP TABLE "users"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_ef112026a02b7a65fbd2a33209"
        `);
    await queryRunner.query(`
            DROP TABLE "oauth_tokens"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."oauth_tokens_provider_enum"
        `);
    await queryRunner.query(`
            DROP EXTENSION IF EXISTS "uuid-ossp"
        `);
  }
}
