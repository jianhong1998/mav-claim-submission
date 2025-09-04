import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { UserEntity } from '../models/user.entity';
import { OAuthTokenEntity } from '../models/oauth-token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, OAuthTokenEntity]),
    PassportModule.register({ defaultStrategy: 'google' }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, GoogleStrategy],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
