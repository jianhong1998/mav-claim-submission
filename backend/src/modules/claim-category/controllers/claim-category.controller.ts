import { Controller } from '@nestjs/common';
import { ClaimCategoryService } from '../services/claim-category-services';

@Controller('/claim-category')
export class ClaimCategoryController {
  constructor(private readonly claimCategoryService: ClaimCategoryService) {}
}
