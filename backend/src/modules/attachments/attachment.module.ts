import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttachmentEntity } from '../claims/entities/attachment.entity';
import { ClaimEntity } from '../claims/entities/claim.entity';
import { AttachmentDBUtil } from '../claims/utils/attachment-db.util';
import { ClaimDBUtil } from '../claims/utils/claim-db.util';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { GoogleDriveClient } from './services/google-drive-client.service';
import { AttachmentService } from './services/attachment.service';
import { AttachmentController } from './controllers/attachment.controller';

/**
 * AttachmentModule - Attachment Upload and Management Module
 *
 * Responsibilities:
 * - Package all attachment-related functionality
 * - Configure dependency injection for attachment services
 * - Import required modules and entities
 * - Export services for use by other modules
 *
 * Requirements: All backend requirements - Module Architecture and DI
 *
 * Design: Clean NestJS module following established patterns with
 * proper dependency injection and modular architecture
 */
@Module({
  imports: [
    // TypeORM entities for attachment operations
    TypeOrmModule.forFeature([AttachmentEntity, ClaimEntity]),

    // Auth module for Google OAuth and token management
    AuthModule,

    // Common utilities and base classes
    CommonModule,
  ],
  controllers: [AttachmentController],
  providers: [
    // Database utilities
    AttachmentDBUtil,
    ClaimDBUtil,

    // Google Drive integration
    GoogleDriveClient,

    // Business logic service
    AttachmentService,
  ],
  exports: [
    // Export services for use by other modules (e.g., ClaimsModule)
    AttachmentService,
    GoogleDriveClient,
    AttachmentDBUtil,
  ],
})
export class AttachmentModule {}
