import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerGuard } from '@nestjs/throttler';
import { TokenDBUtil } from './utils/token-db.util';
import { UserEntity } from '../user/entities/user.entity';
import { OAuthTokenEntity } from './entities/oauth-token.entity';
import { UserModule } from '../user/user.module';
import { GoogleOAuthStrategy } from './strategies/google-oauth.strategy';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { AuthController } from './controllers/auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtOptionalGuard } from './guards/jwt-optional.guard';
import { TestModeThrottlerGuard } from './guards/test-mode-throttler.guard';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, OAuthTokenEntity]),
    PassportModule.register({ defaultStrategy: 'google' }),
    UserModule,
    CommonModule,
  ],
  controllers: [AuthController],
  providers: [
    TokenDBUtil,
    GoogleOAuthStrategy,
    AuthService,
    TokenService,
    JwtAuthGuard,
    JwtOptionalGuard,
    ThrottlerGuard,
    TestModeThrottlerGuard,
  ],
  exports: [
    AuthService,
    TokenService,
    JwtAuthGuard,
    JwtOptionalGuard,
    TokenDBUtil,
    ThrottlerGuard,
    TestModeThrottlerGuard,
  ],
})
export class AuthModule {}
