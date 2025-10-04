declare module 'vitest' {
  interface Assertion<T = unknown> {
    toBeOneOf(expected: unknown[]): T;
  }

  interface AsymmetricMatchersContaining {
    toBeOneOf(expected: unknown[]): unknown;
  }
}
