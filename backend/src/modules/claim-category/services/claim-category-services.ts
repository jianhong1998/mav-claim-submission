import { Injectable } from '@nestjs/common';
import { ClaimCategoryDBUtil } from '../utils/claim-category-db.util';
import { ClaimCategoryLimitDBUtil } from '../utils/claim-category-limit-db.util';

@Injectable()
export class ClaimCategoryService {
  constructor(
    private readonly claimCategoryDBUtil: ClaimCategoryDBUtil,
    private readonly claimCategoryLimitDBUtil: ClaimCategoryLimitDBUtil,
  ) {}
}
