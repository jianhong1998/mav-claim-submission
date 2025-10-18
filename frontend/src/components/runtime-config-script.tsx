import { getRuntimeConfig } from '@/types/runtime-config';

/**
 * Injects runtime configuration into the client-side window object.
 * Must be rendered in a Server Component (e.g., root layout).
 */
export function RuntimeConfigScript() {
  const config = getRuntimeConfig();

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.__RUNTIME_CONFIG__ = ${JSON.stringify(config)};`,
      }}
    />
  );
}
