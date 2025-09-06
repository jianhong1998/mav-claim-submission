import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClaimEntity } from './entities/claim.entity';
import { AttachmentEntity } from './entities/attachment.entity';
import { ClaimDBUtil } from './utils/claim-db.util';
import { AttachmentDBUtil } from './utils/attachment-db.util';

@Module({
  imports: [TypeOrmModule.forFeature([ClaimEntity, AttachmentEntity])],
  providers: [ClaimDBUtil, AttachmentDBUtil],
  exports: [ClaimDBUtil, AttachmentDBUtil],
})
export class ClaimsModule {}
