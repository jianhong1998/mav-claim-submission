import { MigrationInterface, QueryRunner } from 'typeorm';

type ICategoryData = {
  code: string;
  name: string;
  limit: {
    type: 'monthly' | 'yearly';
    amount: number;
  } | null;
};

export class SeedCategoryToClaim1768785189300 implements MigrationInterface {
  name = 'SeedCategoryToClaim1768785189300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.startTransaction();
      const categories =
        await DataSeedingUtil.insertClaimCategories(queryRunner);
      await DataSeedingUtil.insertClaimLimit(queryRunner, categories);
      /* STEP - Update table to create column `category_id` */
      await queryRunner.query(`
              ALTER TABLE "claims"
              ADD "category_id" uuid
          `);
      await queryRunner.query(`
              ALTER TABLE "claims"
              ADD CONSTRAINT "FK_9212a33081ed87c86905194b1c0" FOREIGN KEY ("category_id") REFERENCES "claim_categories"("uuid") ON DELETE NO ACTION ON UPDATE NO ACTION
          `);

      /* STEP - fill up `category_id` according to the current category */
      await DataSeedingUtil.fillUpClaimCategory(queryRunner, categories);

      /* STEP - Update `category_id` be `NOT NULL` */
      await queryRunner.query(`
              ALTER TABLE "claims"
              ALTER COLUMN "category_id" SET NOT NULL
          `);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "claims" DROP CONSTRAINT "FK_9212a33081ed87c86905194b1c0"
        `);
    await queryRunner.query(`
            ALTER TABLE "claims" DROP COLUMN "category_id"
        `);
  }
}

class DataSeedingUtil {
  private constructor() {}

  private static categoryDataArray: ICategoryData[] = [
    {
      code: 'telco',
      name: 'Telecommunications',
      limit: { type: 'monthly', amount: 150 },
    },
    {
      code: 'fitness',
      name: 'Fitness & Wellness',
      limit: { type: 'monthly', amount: 50 },
    },
    {
      code: 'dental',
      name: 'Dental Care',
      limit: { type: 'yearly', amount: 300 },
    },
    { code: 'skill-enhancement', name: 'Skill Enhancement', limit: null },
    { code: 'company-event', name: 'Company Event', limit: null },
    { code: 'company-lunch', name: 'Company Lunch', limit: null },
    { code: 'company-dinner', name: 'Company Dinner', limit: null },
    { code: 'others', name: 'Others', limit: null },
  ];

  public static async insertClaimCategories(queryRunner: QueryRunner) {
    const insertCategoryQueries = this.categoryDataArray.map((category) => {
      const { code, name } = category;

      return `
        INSERT INTO "claim_categories"(code, name)
        VALUES ('${code}', '${name}')
        ON CONFLICT (code)
        DO UPDATE SET
          "name" = EXCLUDED.name,
          "updatedAt" = NOW();
      `;
    });

    await queryRunner.query(insertCategoryQueries.join(' '));

    const categories = (await queryRunner.query(`
        SELECT uuid, code
        FROM "claim_categories";
      `)) as { code: string; uuid: string }[];

    return categories;
  }

  public static async insertClaimLimit(
    queryRunner: QueryRunner,
    categories: { code: string; uuid: string }[],
  ): Promise<
    { uuid: string; type: string; amount: number; categoryId: string }[]
  > {
    /**
     * Key: `code`
     *
     * Value `uuid`
     */
    const categoryMap = new Map(
      categories.map((category) => [category.code, category.uuid]),
    );

    const insertQueries = this.categoryDataArray.map<string | null>(
      (category) => {
        const { code, limit } = category;

        if (!limit) {
          return null;
        }

        const uuid = categoryMap.get(code);

        if (!uuid) throw new Error(`Code "${code}" is not inserted.`);

        return `
            INSERT INTO "claim_category_limits"(type, amount, category_id)
            VALUES ('${limit.type}', ${limit.amount * 100}, '${uuid}')
            ON CONFLICT (category_id)
            DO UPDATE SET
              "type" = EXCLUDED.type,
              "amount" = EXCLUDED.amount;
        `;
      },
    );

    await queryRunner.query(insertQueries.join(' '));
    return (await queryRunner.query(`
          SELECT uuid, type, amount, category_id AS "categoryId"
          FROM "claim_category_limits";
      `)) as {
      uuid: string;
      type: string;
      amount: number;
      categoryId: string;
    }[];
  }

  public static async fillUpClaimCategory(
    queryRunner: QueryRunner,
    categories: { uuid: string; code: string }[],
  ): Promise<
    {
      id: string;
      category: string;
      categoryId: string;
    }[]
  > {
    /**
     * Key: `code`
     *
     * Value `uuid`
     */
    const categoryMap = new Map(
      categories.map((category) => [category.code, category.uuid]),
    );

    const claims = (await queryRunner.query(`
          SELECT id, category
          FROM claims;
      `)) as Array<{
      id: string;
      category: string;
    }>;

    const updateQueries = claims.map<string>((claim) => {
      const { category: categoryEnum, id } = claim;
      const categoryId = categoryMap.get(categoryEnum);

      if (!categoryId) {
        // eslint-disable-next-line no-console
        console.log(`Inserted categories: `, categories);

        throw new Error(
          `Category "${categoryEnum}" is not found in category map.`,
        );
      }

      return `
        UPDATE "claims"
        SET "category_id" = '${categoryId}'
        WHERE "id" = '${id}';
      `;
    });

    await queryRunner.query(updateQueries.join(' '));

    const updatedClaims = (await queryRunner.query(`
          SELECT id, category, category_id AS "categoryId"
          FROM claims;
      `)) as Array<{
      id: string;
      category: string;
      categoryId: string;
    }>;

    return updatedClaims;
  }
}
