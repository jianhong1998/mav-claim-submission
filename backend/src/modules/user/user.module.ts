import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { UserDBUtil } from './utils/user-db.util';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [UserDBUtil],
  exports: [UserDBUtil],
})
export class UserModule {}
