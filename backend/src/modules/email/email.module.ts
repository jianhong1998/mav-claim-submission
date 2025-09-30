import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ClaimsModule } from '../claims/claims.module';
import { UserModule } from '../user/user.module';
import { AttachmentModule } from '../attachments/attachment.module';
import { EmailController } from './controllers/email.controller';
import { EmailService } from './services/email.service';
import { GmailClient } from './services/gmail-client.service';
import { EmailTemplateService } from './services/email-template.service';
import { AttachmentProcessorService } from './services/attachment-processor.service';

@Module({
  imports: [AuthModule, ClaimsModule, UserModule, AttachmentModule],
  controllers: [EmailController],
  providers: [
    EmailService,
    GmailClient,
    EmailTemplateService,
    AttachmentProcessorService,
  ],
  exports: [EmailService, GmailClient, EmailTemplateService],
})
export class EmailModule {}
