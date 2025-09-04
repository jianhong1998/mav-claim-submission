import { Module } from '@nestjs/common';
import { EmailController } from './controllers/email.controller';
import { EmailService } from './services/email.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [EmailController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
