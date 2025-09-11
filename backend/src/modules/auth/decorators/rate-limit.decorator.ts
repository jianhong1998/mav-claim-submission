import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

/**
 * OAuth Rate Limiting Configuration
 *
 * These rate limits are designed to prevent abuse and brute force attacks
 * while allowing legitimate users to authenticate without friction.
 */
export const OAuthRateLimits = Object.freeze({
  // OAuth initiation - More permissive as users may need to retry
  OAUTH_INITIATE: {
    ttl: 60, // 1 minute window
    limit: 10, // 10 attempts per minute
  },

  // OAuth callback - Stricter as this should only happen once per auth flow
  OAUTH_CALLBACK: {
    ttl: 60, // 1 minute window
    limit: 5, // 5 attempts per minute
  },

  // General auth endpoints - Balanced for normal usage
  AUTH_GENERAL: {
    ttl: 60, // 1 minute window
    limit: 20, // 20 requests per minute
  },
} as const);

/**
 * Rate limit decorator for OAuth initiation endpoint
 *
 * Applied to /auth/google endpoint to prevent rapid-fire OAuth initiation.
 * Allows 10 attempts per minute, which should accommodate legitimate users
 * who might need to retry due to browser issues or multiple tabs.
 *
 * Requirements: Security requirements - Prevent OAuth endpoint abuse
 */
export const OAuthInitiateRateLimit = () =>
  applyDecorators(
    UseGuards(ThrottlerGuard),
    Throttle({
      default: {
        ttl: OAuthRateLimits.OAUTH_INITIATE.ttl * 1000, // Convert to milliseconds
        limit: OAuthRateLimits.OAUTH_INITIATE.limit,
      },
    }),
    SetMetadata('throttle_context', 'oauth_initiate'),
  );

/**
 * Rate limit decorator for OAuth callback endpoint
 *
 * Applied to /auth/google/callback endpoint with stricter limits.
 * Allows 5 attempts per minute as callbacks should be less frequent
 * and are typically automated by Google's OAuth flow.
 *
 * Requirements: Security requirements - Prevent OAuth callback abuse
 */
export const OAuthCallbackRateLimit = () =>
  applyDecorators(
    UseGuards(ThrottlerGuard),
    Throttle({
      default: {
        ttl: OAuthRateLimits.OAUTH_CALLBACK.ttl * 1000, // Convert to milliseconds
        limit: OAuthRateLimits.OAUTH_CALLBACK.limit,
      },
    }),
    SetMetadata('throttle_context', 'oauth_callback'),
  );

/**
 * Rate limit decorator for general authentication endpoints
 *
 * Applied to other auth endpoints like status, profile, logout.
 * More permissive limits (20 requests/minute) for normal app usage.
 *
 * Requirements: Security requirements - General API protection
 */
export const AuthGeneralRateLimit = () =>
  applyDecorators(
    UseGuards(ThrottlerGuard),
    Throttle({
      default: {
        ttl: OAuthRateLimits.AUTH_GENERAL.ttl * 1000, // Convert to milliseconds
        limit: OAuthRateLimits.AUTH_GENERAL.limit,
      },
    }),
    SetMetadata('throttle_context', 'auth_general'),
  );

/**
 * Combined OAuth rate limiting decorator
 *
 * Applies both OAuth-specific rate limiting and general protection.
 * Use this on OAuth endpoints that need extra security.
 *
 * Requirements: Security requirements - Comprehensive OAuth protection
 */
export const OAuthProtected = (type: 'initiate' | 'callback' = 'initiate') => {
  if (type === 'callback') {
    return OAuthCallbackRateLimit();
  }
  return OAuthInitiateRateLimit();
};
