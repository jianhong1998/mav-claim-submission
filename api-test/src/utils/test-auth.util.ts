import * as jwt from 'jsonwebtoken';
import { TEST_USER_DATA } from '@project/types';

/**
 * Test Authentication Utility
 *
 * Provides JWT token generation for API testing
 */

/**
 * Test user credentials for integration tests
 *
 * Re-exported from @project/types for backward compatibility
 */
export const TEST_USER = TEST_USER_DATA;

export interface JWTPayload extends jwt.JwtPayload {
  userId: string;
  email: string;
}

/**
 * Generate a valid JWT token for testing
 *
 * This creates a JWT token that matches the backend's token format
 * and uses the same BACKEND_JWT_SECRET from environment variables
 */
export function generateTestJWT(userId: string, email: string): string {
  const jwtSecret = process.env.BACKEND_JWT_SECRET;

  if (!jwtSecret) {
    throw new Error(
      'BACKEND_JWT_SECRET environment variable is required for test authentication',
    );
  }

  const payload: JWTPayload = {
    userId,
    email,
  };

  return jwt.sign(payload, jwtSecret, {
    expiresIn: '24h',
  });
}

/**
 * Get authentication headers for test requests
 */
export function getAuthHeaders(): Record<string, string> {
  const token = generateTestJWT(TEST_USER.id, TEST_USER.email);
  return {
    Cookie: `jwt=${token}`,
  };
}
