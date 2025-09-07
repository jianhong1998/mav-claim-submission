import { Module } from '@nestjs/common';
import { DriveService } from './services/drive.service';
import { DriveController } from './controllers/drive.controller';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [AuthModule, CommonModule],
  controllers: [DriveController],
  providers: [DriveService],
  exports: [DriveService],
})
export class DriveModule {}
