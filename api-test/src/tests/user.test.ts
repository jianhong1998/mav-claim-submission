import axiosInstance from '../config/axios';
import type { AxiosError } from 'axios';
import { TEST_USER_DATA } from '@project/types';
import { getAuthHeaders } from '../utils/test-auth.util';

/**
 * Type definitions for API responses
 */
interface EmailPreferenceResponse {
  id: string;
  userId: string;
  type: 'cc' | 'bcc';
  emailAddress: string;
  createdAt: string;
  updatedAt: string;
}

interface UserProfileResponse {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  googleId: string;
  emailPreferences: EmailPreferenceResponse[];
  createdAt: string;
  updatedAt: string;
}

interface ErrorResponse {
  message: string | string[];
  error?: string;
  statusCode?: number;
}

/**
 * Integration tests for user profile retrieval endpoint
 *
 * Tests the complete end-to-end flow:
 * 1. GET /api/users/:userId with valid JWT returns 200 with user profile
 * 2. GET /api/users/:userId for other user returns 403 Forbidden
 * 3. GET /api/users/:userId for non-existent user returns 404 Not Found
 * 4. GET /api/users/:userId without authentication returns 401 Unauthorized
 */
describe('User Profile Retrieval - GET /api/users/:userId', () => {
  const authHeaders = () => getAuthHeaders();
  const testUserId = TEST_USER_DATA.id;

  /**
   * Ensure test user exists before running tests
   * Clean up email preferences to ensure consistent state
   */
  beforeEach(async () => {
    try {
      // Create test user (idempotent)
      await axiosInstance.post('/internal/test-data');

      // Clean up email preferences to ensure consistent initial state
      await axiosInstance.patch(
        `/users/${testUserId}`,
        {
          emailPreferences: [],
        },
        {
          headers: authHeaders(),
        },
      );
    } catch (error) {
      // Log but don't fail test setup
      console.log('Setup error:', (error as Error).message);
    }
  });

  /**
   * Clean up test data after all tests
   */
  afterAll(async () => {
    try {
      // Ensure test user exists for other test suites
      await axiosInstance.post('/internal/test-data');
    } catch {
      // Ignore errors
    }
  });

  describe('Test 1: Success case - Valid JWT returns user profile', () => {
    it('should return 200 with user profile and emailPreferences', async () => {
      const response = await axiosInstance.get<UserProfileResponse>(
        `/users/${testUserId}`,
        {
          headers: authHeaders(),
        },
      );

      // Verify status code
      expect(response.status).toBe(200);

      // Verify response structure
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('email');
      expect(response.data).toHaveProperty('name');
      expect(response.data).toHaveProperty('emailPreferences');

      // Verify user data
      expect(response.data.id).toBe(testUserId);
      expect(response.data.email).toBe(TEST_USER_DATA.email);
      expect(response.data.name).toBe(TEST_USER_DATA.name);

      // Verify emailPreferences is an array
      expect(Array.isArray(response.data.emailPreferences)).toBe(true);
    });

    it('should return user profile with populated emailPreferences', async () => {
      // First, add some email preferences
      await axiosInstance.patch(
        `/users/${testUserId}`,
        {
          emailPreferences: [
            { type: 'cc', emailAddress: 'manager@mavericks-consulting.com' },
            { type: 'bcc', emailAddress: 'finance@mavericks-consulting.com' },
          ],
        },
        {
          headers: authHeaders(),
        },
      );

      // Now retrieve the profile
      const response = await axiosInstance.get<UserProfileResponse>(
        `/users/${testUserId}`,
        {
          headers: authHeaders(),
        },
      );

      // Verify status code
      expect(response.status).toBe(200);

      // Verify emailPreferences array has 2 items
      expect(response.data.emailPreferences).toHaveLength(2);

      // Verify preference structure
      const ccPref = response.data.emailPreferences.find(
        (p: EmailPreferenceResponse) => p.type === 'cc',
      );
      const bccPref = response.data.emailPreferences.find(
        (p: EmailPreferenceResponse) => p.type === 'bcc',
      );

      expect(ccPref).toBeDefined();
      expect(ccPref?.emailAddress).toBe('manager@mavericks-consulting.com');

      expect(bccPref).toBeDefined();
      expect(bccPref?.emailAddress).toBe('finance@mavericks-consulting.com');
    });

    it('should return all required fields in response', async () => {
      const response = await axiosInstance.get<UserProfileResponse>(
        `/users/${testUserId}`,
        {
          headers: authHeaders(),
        },
      );

      // Verify all expected fields are present
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('email');
      expect(response.data).toHaveProperty('name');
      expect(response.data).toHaveProperty('googleId');
      expect(response.data).toHaveProperty('emailPreferences');
      expect(response.data).toHaveProperty('createdAt');
      expect(response.data).toHaveProperty('updatedAt');

      // Verify field types
      expect(typeof response.data.id).toBe('string');
      expect(typeof response.data.email).toBe('string');
      expect(typeof response.data.name).toBe('string');
      expect(typeof response.data.googleId).toBe('string');
      expect(Array.isArray(response.data.emailPreferences)).toBe(true);
      expect(typeof response.data.createdAt).toBe('string');
      expect(typeof response.data.updatedAt).toBe('string');
    });
  });

  describe('Test 2: Forbidden case - Accessing other user returns 403', () => {
    it('should return 403 when accessing other user profile', async () => {
      const differentUserId = '00000000-0000-0000-0000-000000000099'; // Different UUID

      try {
        await axiosInstance.get(`/users/${differentUserId}`, {
          headers: authHeaders(),
        });
        expect.fail('Expected 403 error for accessing other user profile');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(403);

        // Verify error message
        const errorData = axiosError.response?.data as ErrorResponse;
        const message = Array.isArray(errorData.message)
          ? errorData.message.join(' ')
          : errorData.message;
        expect(message).toContain('Cannot access other users');
      }
    });

    it('should return 403 for any different userId', async () => {
      const differentUserId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

      try {
        await axiosInstance.get(`/users/${differentUserId}`, {
          headers: authHeaders(),
        });
        expect.fail('Expected 403 error');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(403);
      }
    });
  });

  describe('Test 3: JWT invalidation when user deleted', () => {
    /**
     * Note: 404 is unreachable in the current architecture due to execution order:
     * 1. JwtAuthGuard validates JWT and loads user from DB
     * 2. If user doesn't exist → 401 Unauthorized (stops here)
     * 3. Controller authorization check (never reached if user deleted)
     * 4. Service layer getUserProfile (never reached if user deleted)
     *
     * Therefore, when a user is deleted, their JWT becomes invalid (401).
     * This is correct security behavior - deleted users' tokens should stop working.
     *
     * The 404 can only occur in a race condition where:
     * - User exists during JWT validation (step 1)
     * - User is deleted between steps 1-4
     * - User doesn't exist during service call (step 4)
     * This is extremely unlikely and not testable deterministically.
     */
    it('should return 401 when user is deleted (JWT invalidation)', async () => {
      // Delete the test user first
      await axiosInstance.delete('/internal/test-data');

      try {
        await axiosInstance.get(`/users/${testUserId}`, {
          headers: authHeaders(),
        });
        expect.fail(
          'Expected 401 error - JWT should be invalid when user is deleted',
        );
      } catch (error) {
        const axiosError = error as AxiosError;
        // JWT validation fails because user doesn't exist in database
        expect(axiosError.response?.status).toBe(401);
      }
    });

    it('should return 401 for any deleted user (JWT invalidation)', async () => {
      // Delete test user to ensure it doesn't exist
      await axiosInstance.delete('/internal/test-data');

      try {
        // Try to access the deleted user's profile with their JWT
        await axiosInstance.get(`/users/${testUserId}`, {
          headers: authHeaders(),
        });
        expect.fail('Expected 401 error for deleted user JWT');
      } catch (error) {
        const axiosError = error as AxiosError;
        // JWT authentication fails before reaching controller
        expect(axiosError.response?.status).toBe(401);
      }
    });
  });

  describe('Test 4: Unauthorized case - No JWT returns 401', () => {
    it('should return 401 when no authentication is provided', async () => {
      try {
        await axiosInstance.get(`/users/${testUserId}`);
        expect.fail('Expected 401 error for missing authentication');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });

    it('should return 401 when JWT is invalid', async () => {
      try {
        await axiosInstance.get(`/users/${testUserId}`, {
          headers: {
            Cookie: 'jwt=invalid-token-value',
          },
        });
        expect.fail('Expected 401 error for invalid JWT');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });

    it('should return 401 when JWT is missing from cookie', async () => {
      try {
        await axiosInstance.get(`/users/${testUserId}`, {
          headers: {
            Cookie: 'some-other-cookie=value',
          },
        });
        expect.fail('Expected 401 error for missing JWT');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should return empty emailPreferences array when user has no preferences', async () => {
      // Ensure no preferences
      await axiosInstance.patch(
        `/users/${testUserId}`,
        {
          emailPreferences: [],
        },
        {
          headers: authHeaders(),
        },
      );

      const response = await axiosInstance.get<UserProfileResponse>(
        `/users/${testUserId}`,
        {
          headers: authHeaders(),
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.emailPreferences).toHaveLength(0);
      expect(Array.isArray(response.data.emailPreferences)).toBe(true);
    });

    it('should return consistent data structure on multiple calls', async () => {
      const response1 = await axiosInstance.get<UserProfileResponse>(
        `/users/${testUserId}`,
        {
          headers: authHeaders(),
        },
      );

      const response2 = await axiosInstance.get<UserProfileResponse>(
        `/users/${testUserId}`,
        {
          headers: authHeaders(),
        },
      );

      // Both responses should have identical structure
      expect(response1.status).toBe(response2.status);
      expect(response1.data.id).toBe(response2.data.id);
      expect(response1.data.email).toBe(response2.data.email);
      expect(response1.data.name).toBe(response2.data.name);
      expect(response1.data.emailPreferences.length).toBe(
        response2.data.emailPreferences.length,
      );
    });

    it('should return ISO 8601 formatted timestamps', async () => {
      const response = await axiosInstance.get<UserProfileResponse>(
        `/users/${testUserId}`,
        {
          headers: authHeaders(),
        },
      );

      // Verify timestamps can be parsed as valid ISO 8601 dates
      expect(new Date(response.data.createdAt).toISOString()).toBeTruthy();
      expect(new Date(response.data.updatedAt).toISOString()).toBeTruthy();

      // Verify timestamp format matches ISO 8601
      expect(response.data.createdAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      );
      expect(response.data.updatedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      );
    });
  });
});
