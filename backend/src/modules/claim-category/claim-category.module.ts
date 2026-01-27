import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClaimCategoryEntity } from './entities/claim-category.entity';
import { ClaimCategoryLimitEntity } from './entities/claim-category-limit.entity';
import { ClaimCategoryController } from './controllers/claim-category.controller';
import { ClaimCategoryDBUtil } from './utils/claim-category-db.util';
import { ClaimCategoryLimitDBUtil } from './utils/claim-category-limit-db.util';
import { ClaimCategoryService } from './services/claim-category-services';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClaimCategoryEntity, ClaimCategoryLimitEntity]),
  ],
  providers: [
    ClaimCategoryDBUtil,
    ClaimCategoryLimitDBUtil,
    ClaimCategoryService,
  ],
  controllers: [ClaimCategoryController],
  exports: [ClaimCategoryService],
})
export class ClaimCategoryModule {}
