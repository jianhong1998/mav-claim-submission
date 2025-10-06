import { Module } from '@nestjs/common';
import { InternalController } from './controllers/internal.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  controllers: [InternalController],
})
export class InternalModule {}
