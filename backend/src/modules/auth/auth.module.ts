import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { TokenDBUtil } from './utils/token-db.util';
import { UserEntity } from '../user/entities/user.entity';
import { OAuthTokenEntity } from './entities/oauth-token.entity';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, OAuthTokenEntity]),
    PassportModule.register({ defaultStrategy: 'google' }),
    UserModule,
  ],
  controllers: [],
  providers: [TokenDBUtil],
  exports: [],
})
export class AuthModule {}
