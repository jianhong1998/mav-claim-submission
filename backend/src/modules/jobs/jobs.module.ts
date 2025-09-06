import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DelayedJobEntity } from './entities/delayed-job.entity';
import { DelayedJobDBUtil } from './utils/delayed-job-db.util';

@Module({
  imports: [TypeOrmModule.forFeature([DelayedJobEntity])],
  providers: [DelayedJobDBUtil],
  exports: [DelayedJobDBUtil],
})
export class JobsModule {}
