export const JobType = Object.freeze({
  SEND_EMAIL: 'send_email',
  PROCESS_CLAIM: 'process_claim',
} as const);
export type JobType = (typeof JobType)[keyof typeof JobType];
