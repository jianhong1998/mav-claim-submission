import * as jwt from 'jsonwebtoken';

/**
 * Test Authentication Utility
 *
 * Provides JWT token generation for API testing
 */

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
 * Test user credentials for integration tests
 *
 * These correspond to seeded test data in the database
 */
export const TEST_USER = {
  id: '00000000-0000-0000-0000-000000000001', // Valid UUID for test user
  email: 'test@mavericks-consulting.com',
  name: 'Test User',
  googleId: 'test-google-id-12345',
};

/**
 * Get authentication headers for test requests
 */
export function getAuthHeaders(): Record<string, string> {
  const token = generateTestJWT(TEST_USER.id, TEST_USER.email);
  return {
    Cookie: `jwt=${token}`,
  };
}
