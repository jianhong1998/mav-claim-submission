import { Injectable, ExecutionContext, CanActivate } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { EnvironmentVariableUtil } from 'src/modules/common/utils/environment-variable.util';

/**
 * Test Mode Throttler Guard
 *
 * Conditionally applies throttling based on the BACKEND_ENABLE_API_TEST_MODE flag.
 * When test mode is enabled, bypasses rate limiting entirely.
 * When test mode is disabled, delegates to the standard ThrottlerGuard.
 *
 * This allows integration tests to run without hitting rate limits
 * while maintaining full rate limiting protection in production.
 *
 * Requirements: 4.1 - API Test Support for Integration Testing
 */
@Injectable()
export class TestModeThrottlerGuard implements CanActivate {
  constructor(
    private readonly throttlerGuard: ThrottlerGuard,
    private readonly environmentUtil: EnvironmentVariableUtil,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureFlags = this.environmentUtil.getFeatureFlags();

    // Bypass rate limiting entirely in test mode
    if (featureFlags.enableApiTestMode) {
      return true;
    }

    // Otherwise, apply normal throttling behavior
    return this.throttlerGuard.canActivate(context);
  }
}
