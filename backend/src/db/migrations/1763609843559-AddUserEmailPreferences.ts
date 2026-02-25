import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserEmailPreferences1763609843559 implements MigrationInterface {
  name = 'AddUserEmailPreferences1763609843559';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "user_email_preferences" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "type" character varying(3) NOT NULL,
                "emailAddress" character varying(255) NOT NULL,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "PK_2cea8b67cd81bd8fbe0b3b0fa32" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_4ced54ca6152ab68f990aeb589" ON "user_email_preferences" ("userId", "emailAddress")
        `);
    await queryRunner.query(`
            ALTER TABLE "user_email_preferences"
            ADD CONSTRAINT "FK_3af9347cf415f0ae75f96ec1e79" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "user_email_preferences" DROP CONSTRAINT "FK_3af9347cf415f0ae75f96ec1e79"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_4ced54ca6152ab68f990aeb589"
        `);
    await queryRunner.query(`
            DROP TABLE "user_email_preferences"
        `);
  }
}
