import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { UserEmailPreferenceEntity } from './entities/user-email-preference.entity';
import { UserDBUtil } from './utils/user-db.util';
import { UserService } from './services/user.service';
import { UserEmailPreferenceService } from './services/user-email-preference.service';
import { UserController } from './controllers/user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, UserEmailPreferenceEntity])],
  controllers: [UserController],
  providers: [UserDBUtil, UserService, UserEmailPreferenceService],
  exports: [UserDBUtil],
})
export class UserModule {}
