import { Injectable } from '@nestjs/common';
import { ClaimCategoryDBUtil } from '../utils/claim-category-db.util';
import { ClaimCategoryLimitDBUtil } from '../utils/claim-category-limit-db.util';
import { ClaimCategoryEntity } from '../entities/claim-category.entity';

export interface IGetAllCategoriesParams {
  includeDisabled?: boolean;
  includeDeleted?: boolean;
}

@Injectable()
export class ClaimCategoryService {
  constructor(
    private readonly claimCategoryDBUtil: ClaimCategoryDBUtil,
    private readonly claimCategoryLimitDBUtil: ClaimCategoryLimitDBUtil,
  ) {}

  async getByCode(code: string): Promise<ClaimCategoryEntity | null> {
    return await this.claimCategoryDBUtil.getOne({
      criteria: { code, isEnabled: true },
      relation: { limit: true },
    });
  }

  async getAllCategories(
    params?: IGetAllCategoriesParams,
  ): Promise<ClaimCategoryEntity[]> {
    return this.claimCategoryDBUtil.getAll({
      criteria: params?.includeDisabled ? {} : { isEnabled: true },
      relation: { limit: true },
      withDeleted: params?.includeDeleted ?? false,
    });
  }
}
