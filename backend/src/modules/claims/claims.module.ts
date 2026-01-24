import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClaimEntity } from './entities/claim.entity';
import { AttachmentEntity } from './entities/attachment.entity';
import { ClaimDBUtil } from './utils/claim-db.util';
import { AttachmentDBUtil } from './utils/attachment-db.util';
import { ClaimsController } from './claims.controller';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { ClaimCategoryModule } from '../claim-category/claim-category.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClaimEntity, AttachmentEntity]),
    AuthModule,
    forwardRef(() => EmailModule),
    ClaimCategoryModule,
  ],
  controllers: [ClaimsController],
  providers: [ClaimDBUtil, AttachmentDBUtil],
  exports: [ClaimDBUtil, AttachmentDBUtil],
})
export class ClaimsModule {}
