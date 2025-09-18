import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ClaimsModule } from '../claims/claims.module';
import { EmailController } from './controllers/email.controller';
import { EmailService } from './services/email.service';
import { GmailClient } from './services/gmail-client.service';
import { EmailTemplateService } from './services/email-template.service';

@Module({
  imports: [AuthModule, ClaimsModule],
  controllers: [EmailController],
  providers: [EmailService, GmailClient, EmailTemplateService],
  exports: [EmailService, GmailClient, EmailTemplateService],
})
export class EmailModule {}
