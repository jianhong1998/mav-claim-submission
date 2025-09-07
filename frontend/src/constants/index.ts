export * from './error-message';
export * from './drive-config';

export const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:3001';
