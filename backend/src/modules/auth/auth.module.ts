import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { TokenDBUtil } from './utils/token-db.util';
import { UserEntity } from '../user/entities/user.entity';
import { OAuthTokenEntity } from './entities/oauth-token.entity';
import { UserModule } from '../user/user.module';
import { GoogleOAuthStrategy } from './strategies/google-oauth.strategy';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { AuthController } from './controllers/auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, OAuthTokenEntity]),
    PassportModule.register({ defaultStrategy: 'google' }),
    UserModule,
  ],
  controllers: [AuthController],
  providers: [
    TokenDBUtil,
    GoogleOAuthStrategy,
    AuthService,
    TokenService,
    JwtAuthGuard,
  ],
  exports: [AuthService, TokenService, JwtAuthGuard],
})
export class AuthModule {}
