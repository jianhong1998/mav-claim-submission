import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEmailPreferenceEntity } from '../user/entities/user-email-preference.entity';
import { AuthModule } from '../auth/auth.module';
import { ClaimsModule } from '../claims/claims.module';
import { UserModule } from '../user/user.module';
import { AttachmentModule } from '../attachments/attachment.module';
import { EmailController } from './controllers/email.controller';
import { EmailService } from './services/email.service';
import { EmailPreviewService } from './services/email-preview.service';
import { GmailClient } from './services/gmail-client.service';
import { EmailTemplateService } from './services/email-template.service';
import { AttachmentProcessorService } from './services/attachment-processor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEmailPreferenceEntity]),
    AuthModule,
    ClaimsModule,
    UserModule,
    AttachmentModule,
  ],
  controllers: [EmailController],
  providers: [
    EmailService,
    EmailPreviewService,
    GmailClient,
    EmailTemplateService,
    AttachmentProcessorService,
  ],
  exports: [
    EmailService,
    EmailPreviewService,
    GmailClient,
    EmailTemplateService,
  ],
})
export class EmailModule {}
