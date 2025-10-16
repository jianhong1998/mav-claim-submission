export interface RuntimeConfig {
  BACKEND_BASE_URL: string;
}

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: RuntimeConfig;
  }
}

export const getRuntimeConfig = (): RuntimeConfig => {
  // TODO: Remove this after debugging
  // eslint-disable-next-line no-console
  console.log({
    // window,
    url: process.env.FRONTEND_BACKEND_BASE_URL,
  });

  // Server-side: read from environment
  if (typeof window === 'undefined') {
    return {
      BACKEND_BASE_URL:
        process.env.FRONTEND_BACKEND_BASE_URL || 'http://localhost:3001',
    };
  }

  // Client-side: read from window object
  return (
    window.__RUNTIME_CONFIG__ || {
      BACKEND_BASE_URL: 'http://localhost:3001',
    }
  );
};
