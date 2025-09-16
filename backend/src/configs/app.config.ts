import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import DatabaseConfig from '../db/database.config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EnvironmentVariableUtil } from 'src/modules/common/utils/environment-variable.util';

export class AppConfig {
  private constructor() {}

  public static configModule = ConfigModule.forRoot({
    envFilePath: ['../.env', '.env'],
    cache: false,
    isGlobal: true,
  });

  public static typeormModule = TypeOrmModule.forRootAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (configService: ConfigService) =>
      DatabaseConfig.getConfig(configService),
    dataSourceFactory: async (options) => {
      if (!options)
        throw new Error('Undefined option when initialize database');

      return await new DataSource(options).initialize();
    },
  });

  public static throttleModule = ThrottlerModule.forRootAsync({
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
  });
}
