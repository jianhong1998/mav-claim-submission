import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { UserEntity } from 'src/db/entities/user.entity';
import { OAuthTokenEntity } from 'src/db/entities/oauth-token.entity';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { GoogleStrategy } from './strategies/google.strategy';

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
