import { Module } from '@nestjs/common';
import { AppController } from './controllers/app.controller';
import { AppService } from './services/app.service';
import { AppConfig } from 'src/configs/app.config';
import { CommonModule } from '../common/common.module';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { DriveModule } from '../drive/drive.module';
import { ClaimsModule } from '../claims/claims.module';
import { AttachmentModule } from '../attachments/attachment.module';
import { InternalModule } from '../internal/internal.module';

@Module({
  imports: [
    AppConfig.configModule,
    AppConfig.typeormModule,
    AppConfig.throttleModule,
    CommonModule,
    AuthModule,
    EmailModule,
    DriveModule,
    ClaimsModule,
    AttachmentModule,
    InternalModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
