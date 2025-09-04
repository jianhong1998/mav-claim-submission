import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthTables1756710930231 implements MigrationInterface {
  name = 'CreateAuthTables1756710930231';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
            ALTER TABLE "oauth_tokens"
            ADD CONSTRAINT "FK_a8c200cc4c90d24e832caf0a180" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "oauth_tokens" DROP CONSTRAINT "FK_a8c200cc4c90d24e832caf0a180"
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
  }
}
