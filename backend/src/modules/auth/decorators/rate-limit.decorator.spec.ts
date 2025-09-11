import { describe, it, expect } from 'vitest';
import {
  OAuthRateLimits,
  OAuthInitiateRateLimit,
  OAuthCallbackRateLimit,
  AuthGeneralRateLimit,
  OAuthProtected,
} from './rate-limit.decorator';

describe('RateLimitDecorator', () => {
  describe('OAuthRateLimits', () => {
    it('should have correct rate limit configurations', () => {
      expect(OAuthRateLimits.OAUTH_INITIATE.ttl).toBe(60);
      expect(OAuthRateLimits.OAUTH_INITIATE.limit).toBe(10);

      expect(OAuthRateLimits.OAUTH_CALLBACK.ttl).toBe(60);
      expect(OAuthRateLimits.OAUTH_CALLBACK.limit).toBe(5);

      expect(OAuthRateLimits.AUTH_GENERAL.ttl).toBe(60);
      expect(OAuthRateLimits.AUTH_GENERAL.limit).toBe(20);
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(OAuthRateLimits)).toBe(true);
    });
  });

  describe('OAuthInitiateRateLimit', () => {
    it('should return a function (decorator)', () => {
      const decorator = OAuthInitiateRateLimit();
      expect(typeof decorator).toBe('function');
    });
  });

  describe('OAuthCallbackRateLimit', () => {
    it('should return a function (decorator)', () => {
      const decorator = OAuthCallbackRateLimit();
      expect(typeof decorator).toBe('function');
    });
  });

  describe('AuthGeneralRateLimit', () => {
    it('should return a function (decorator)', () => {
      const decorator = AuthGeneralRateLimit();
      expect(typeof decorator).toBe('function');
    });
  });

  describe('OAuthProtected', () => {
    it('should return initiate decorator by default', () => {
      const decorator = OAuthProtected();
      expect(typeof decorator).toBe('function');
    });

    it('should return callback decorator when type is callback', () => {
      const decorator = OAuthProtected('callback');
      expect(typeof decorator).toBe('function');
    });

    it('should return initiate decorator when type is initiate', () => {
      const decorator = OAuthProtected('initiate');
      expect(typeof decorator).toBe('function');
    });
  });
});
