import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { TokenDBUtil } from './utils/token-db.util';
import { UserEntity } from '../user/entities/user.entity';
import { OAuthTokenEntity } from './entities/oauth-token.entity';
import { UserModule } from '../user/user.module';
import { GoogleOAuthStrategy } from './strategies/google-oauth.strategy';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { AuthController } from './controllers/auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { EnvironmentVariableUtil } from '../common/utils/environment-variable.util';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, OAuthTokenEntity]),
    PassportModule.register({ defaultStrategy: 'google' }),
    ThrottlerModule.forRootAsync({
      inject: [EnvironmentVariableUtil],
      useFactory: (envUtil: EnvironmentVariableUtil) => {
        const { nodeEnv } = envUtil.getVariables();
        const { enableApiTestMode } = envUtil.getFeatureFlags();

        // Disable throttling in test environment or when API test mode is enabled
        if (nodeEnv === 'test' || enableApiTestMode) {
          return [
            {
              name: 'default',
              ttl: 1, // Minimal TTL
              limit: 999999, // Effectively unlimited
            },
          ];
        }

        // Production/development throttling - more permissive for integration tests
        return [
          {
            name: 'default',
            ttl: 60 * 1000, // 1 minute in milliseconds
            limit: 100, // Increased limit to handle integration tests
          },
        ];
      },
    }),
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
  ],
  exports: [AuthService, TokenService, JwtAuthGuard],
})
export class AuthModule {}
