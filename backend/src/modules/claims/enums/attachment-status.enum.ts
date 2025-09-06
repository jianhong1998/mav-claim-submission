export const AttachmentStatus = Object.freeze({
  PENDING: 'pending',
  UPLOADED: 'uploaded',
  FAILED: 'failed',
} as const);
export type AttachmentStatus =
  (typeof AttachmentStatus)[keyof typeof AttachmentStatus];
