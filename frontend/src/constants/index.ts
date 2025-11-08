export * from './error-message';
export * from './nav-item';

import { getRuntimeConfig } from '@/types/runtime-config';

export const getBackendBaseUrl = (): string => {
  return getRuntimeConfig().BACKEND_BASE_URL;
};
