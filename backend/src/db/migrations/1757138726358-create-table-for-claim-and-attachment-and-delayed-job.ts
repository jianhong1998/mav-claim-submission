import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableForClaimAndAttachmentAndDelayedJob1757138726358
  implements MigrationInterface
{
  name = 'CreateTableForClaimAndAttachmentAndDelayedJob1757138726358';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."delayed_jobs_status_enum" AS ENUM(
                'pending',
                'processing',
                'completed',
                'failed',
                'dead'
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "delayed_jobs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "type" character varying(100) NOT NULL,
                "status" "public"."delayed_jobs_status_enum" NOT NULL DEFAULT 'pending',
                "payload" jsonb NOT NULL,
                "priority" integer NOT NULL DEFAULT '0',
                "retryCount" integer NOT NULL DEFAULT '0',
                "maxRetries" integer NOT NULL DEFAULT '3',
                "scheduledAt" TIMESTAMP WITH TIME ZONE,
                "startedAt" TIMESTAMP WITH TIME ZONE,
                "completedAt" TIMESTAMP WITH TIME ZONE,
                "failedAt" TIMESTAMP WITH TIME ZONE,
                "errorMessage" text,
                "result" jsonb,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_d5f2e1ac3bb7970b2db391021f5" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_a70c10c771d5fae48f134faa56" ON "delayed_jobs" ("priority")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_f12e0c4b84afd7bd5bf9dc9d99" ON "delayed_jobs" ("scheduledAt")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_d36bb7f7f4f79a6be4f59582bb" ON "delayed_jobs" ("type")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_17e1d93794fe56e3e87e59d87f" ON "delayed_jobs" ("status")
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
            ALTER TABLE "claims"
            ADD CONSTRAINT "FK_299a3ed5259cccd5cf541512e73" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "attachments"
            ADD CONSTRAINT "FK_3011e4956fc43cc5bee18e167a2" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "attachments" DROP CONSTRAINT "FK_3011e4956fc43cc5bee18e167a2"
        `);
    await queryRunner.query(`
            ALTER TABLE "claims" DROP CONSTRAINT "FK_299a3ed5259cccd5cf541512e73"
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
            DROP TABLE "claims"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."claims_status_enum"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."claims_category_enum"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_17e1d93794fe56e3e87e59d87f"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_d36bb7f7f4f79a6be4f59582bb"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_f12e0c4b84afd7bd5bf9dc9d99"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_a70c10c771d5fae48f134faa56"
        `);
    await queryRunner.query(`
            DROP TABLE "delayed_jobs"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."delayed_jobs_status_enum"
        `);
  }
}
