export const JobStatus = Object.freeze({
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DEAD: 'dead',
} as const);
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];
