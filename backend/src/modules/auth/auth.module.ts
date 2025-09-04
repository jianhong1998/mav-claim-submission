import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { TokenDBUtil } from './utils/token-db.util';
import { GoogleStrategy } from './strategies/google.strategy';
import { UserEntity } from '../user/entities/user.entity';
import { OAuthTokenEntity } from './entities/oauth-token.entity';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, OAuthTokenEntity]),
    PassportModule.register({ defaultStrategy: 'google' }),
    UserModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, TokenDBUtil, GoogleStrategy],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
