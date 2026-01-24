import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ClaimCategoryService } from '../services/claim-category-services';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { IClaimCategoryListResponse, IClaimCategory } from '@project/types';
import { ClaimCategoryEntity } from '../entities/claim-category.entity';

@Controller('/claim-categories')
@UseGuards(JwtAuthGuard)
export class ClaimCategoryController {
  constructor(private readonly claimCategoryService: ClaimCategoryService) {}

  @Get()
  async getCategories(
    @Query('includeDisabled') includeDisabled?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ): Promise<IClaimCategoryListResponse> {
    const categories = await this.claimCategoryService.getAllCategories({
      includeDisabled: includeDisabled === 'true',
      includeDeleted: includeDeleted === 'true',
    });

    return {
      success: true,
      categories: categories.map((cat) => this.mapToDTO(cat)),
    };
  }

  private mapToDTO(entity: ClaimCategoryEntity): IClaimCategory {
    return {
      uuid: entity.uuid,
      code: entity.code,
      name: entity.name,
      limit: entity.limit
        ? {
            type: entity.limit.type,
            amount: entity.limit.amount / 100, // Convert cents to dollars
          }
        : null,
    };
  }
}
