import { expect } from 'vitest';

/**
 * Custom Vitest matcher: toBeOneOf
 * Checks if a value is one of the expected values
 */
expect.extend({
  toBeOneOf(received: unknown, expected: unknown[]) {
    const pass = expected.includes(received);
    const receivedStr = String(received);
    const expectedStr = expected.join(', ');

    if (pass) {
      return {
        message: () =>
          `expected ${receivedStr} not to be one of [${expectedStr}]`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${receivedStr} to be one of [${expectedStr}]`,
        pass: false,
      };
    }
  },
});
