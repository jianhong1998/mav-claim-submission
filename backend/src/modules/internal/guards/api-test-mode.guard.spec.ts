import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ApiTestModeGuard } from './api-test-mode.guard';

describe('ApiTestModeGuard', () => {
  let guard: ApiTestModeGuard;
  let originalEnvValue: string | undefined;

  beforeEach(() => {
    guard = new ApiTestModeGuard();
    originalEnvValue = process.env.BACKEND_ENABLE_API_TEST_MODE;
  });

  afterEach(() => {
    // Restore original value
    if (originalEnvValue === undefined) {
      delete process.env.BACKEND_ENABLE_API_TEST_MODE;
    } else {
      process.env.BACKEND_ENABLE_API_TEST_MODE = originalEnvValue;
    }
  });

  it('should return true when BACKEND_ENABLE_API_TEST_MODE is "true"', () => {
    process.env.BACKEND_ENABLE_API_TEST_MODE = 'true';

    const result = guard.canActivate();

    expect(result).toBe(true);
  });

  it('should throw NotFoundException when BACKEND_ENABLE_API_TEST_MODE is "false"', () => {
    process.env.BACKEND_ENABLE_API_TEST_MODE = 'false';

    expect(() => guard.canActivate()).toThrow(NotFoundException);
  });

  it('should throw NotFoundException when BACKEND_ENABLE_API_TEST_MODE is undefined', () => {
    delete process.env.BACKEND_ENABLE_API_TEST_MODE;

    expect(() => guard.canActivate()).toThrow(NotFoundException);
  });
});
