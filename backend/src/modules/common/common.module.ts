import { Global, Module } from '@nestjs/common';
import { EnvironmentVariableUtil } from './utils/environment-variable.util';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [EnvironmentVariableUtil],
  exports: [EnvironmentVariableUtil],
})
export class CommonModule {}
