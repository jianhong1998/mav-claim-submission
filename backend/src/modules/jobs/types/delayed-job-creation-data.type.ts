import { JobType } from '../enums/job-type.enum';

export interface IDelayedJobCreationData {
  type: JobType;
  payload: Record<string, unknown>;
  priority?: number;
  maxRetries?: number;
  scheduledAt?: Date;
}
