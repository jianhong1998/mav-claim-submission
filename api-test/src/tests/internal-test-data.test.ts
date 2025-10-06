/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import axiosInstance from '../config/axios';
import type { AxiosError } from 'axios';
import { TEST_USER_DATA } from '@project/types';
import { getAuthHeaders } from '../utils/test-auth.util';

/**
 * Integration tests for internal test-data endpoints
 *
 * Tests the complete end-to-end flow:
 * 1. POST /internal/test-data creates user on first call
 * 2. POST /internal/test-data returns same user on second call (idempotent)
 * 3. DELETE /internal/test-data removes user when exists
 * 4. DELETE /internal/test-data succeeds when user not found (idempotent)
 * 5. Both endpoints return 404 when ENABLE_API_TEST_MODE=false
 *
 * Note: Test 5 requires ENABLE_API_TEST_MODE=false in backend .env
 * Run separately: ENABLE_API_TEST_MODE=false in .env, restart backend, run this test file only
 */
describe('Internal Test Data Endpoints', () => {
  // Helper to call POST endpoint
  const createTestUser = async () => {
    return axiosInstance.post('/internal/test-data');
  };

  // Helper to call DELETE endpoint
  const deleteTestUser = async () => {
    return axiosInstance.delete('/internal/test-data');
  };

  /**
   * Ensure test user exists after each test
   * This is critical for other test files that depend on the test user existing
   */
  afterEach(async () => {
    try {
      // Recreate test user if it was deleted during the test
      await createTestUser();
    } catch {
      // Ignore errors - user might already exist
    }
  });

  describe('POST /internal/test-data', () => {
    beforeEach(async () => {
      // Ensure clean state - delete test user if exists
      try {
        await deleteTestUser();
      } catch {
        // Ignore errors - user might not exist
      }
    });

    it('should create test user on first call', async () => {
      const response = await createTestUser();

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('user');
      expect(response.data.user).toEqual({
        id: TEST_USER_DATA.id,
        email: TEST_USER_DATA.email,
        name: TEST_USER_DATA.name,
        googleId: TEST_USER_DATA.googleId,
      });
    });

    it('should return same user on second call (idempotent)', async () => {
      // First call - create user
      const response1 = await createTestUser();
      expect(response1.status).toBe(201);
      const firstUser = response1.data.user;

      // Second call - should return existing user
      const response2 = await createTestUser();
      expect(response2.status).toBe(201);
      expect(response2.data.user).toEqual(firstUser);

      // Verify all fields match
      expect(response2.data.user.id).toBe(TEST_USER_DATA.id);
      expect(response2.data.user.email).toBe(TEST_USER_DATA.email);
      expect(response2.data.user.name).toBe(TEST_USER_DATA.name);
      expect(response2.data.user.googleId).toBe(TEST_USER_DATA.googleId);
    });
  });

  describe('DELETE /internal/test-data', () => {
    it('should remove user when exists', async () => {
      // First create the user
      await createTestUser();

      // Delete the user
      const response = await deleteTestUser();

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('deleted');
      expect(response.data).toHaveProperty('message');
      expect(response.data.deleted).toBe(true);
      expect(response.data.message).toContain('deleted successfully');
    });

    it('should succeed when user not found (idempotent)', async () => {
      // Ensure user doesn't exist
      await deleteTestUser();

      // Delete again - should still succeed
      const response = await deleteTestUser();

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('deleted');
      expect(response.data).toHaveProperty('message');
      expect(response.data.deleted).toBe(false);
      expect(response.data.message).toContain('Test user not found');
    });

    it('should successfully delete after multiple creates (idempotency chain)', async () => {
      // Create user multiple times
      await createTestUser();
      await createTestUser();
      await createTestUser();

      // Delete should work
      const response = await deleteTestUser();
      expect(response.status).toBe(200);
      expect(response.data.deleted).toBe(true);

      // Delete again should be idempotent
      const response2 = await deleteTestUser();
      expect(response2.status).toBe(200);
      expect(response2.data.deleted).toBe(false);
    });
  });

  describe('Feature Flag Behavior', () => {
    /**
     * Note: This test suite requires manual verification
     *
     * To test feature flag behavior:
     * 1. Set ENABLE_API_TEST_MODE=false in root .env file
     * 2. Restart backend server
     * 3. Run: pnpm --filter api-test test internal-test-data.test.ts
     * 4. Verify both endpoints return 404
     * 5. Set ENABLE_API_TEST_MODE=true and restart to resume normal testing
     */
    it.skip('should return 404 for POST when ENABLE_API_TEST_MODE=false', async () => {
      try {
        await createTestUser();
        expect.fail('Expected 404 error when feature flag is disabled');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(404);
      }
    });

    it.skip('should return 404 for DELETE when ENABLE_API_TEST_MODE=false', async () => {
      try {
        await deleteTestUser();
        expect.fail('Expected 404 error when feature flag is disabled');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(404);
      }
    });
  });

  describe('Response Format Validation', () => {
    it('should return correct response format for POST', async () => {
      // Clean state
      await deleteTestUser();

      const response = await createTestUser();

      // Validate response structure
      expect(response.data).toHaveProperty('user');
      expect(response.data.user).toHaveProperty('id');
      expect(response.data.user).toHaveProperty('email');
      expect(response.data.user).toHaveProperty('name');
      expect(response.data.user).toHaveProperty('googleId');

      // Validate types
      expect(typeof response.data.user.id).toBe('string');
      expect(typeof response.data.user.email).toBe('string');
      expect(typeof response.data.user.name).toBe('string');
      expect(typeof response.data.user.googleId).toBe('string');
    });

    it('should return correct response format for DELETE', async () => {
      // Create then delete
      await createTestUser();
      const response = await deleteTestUser();

      // Validate response structure
      expect(response.data).toHaveProperty('deleted');
      expect(response.data).toHaveProperty('message');

      // Validate types
      expect(typeof response.data.deleted).toBe('boolean');
      expect(typeof response.data.message).toBe('string');
    });
  });

  describe('Database CASCADE Delete Verification', () => {
    beforeEach(async () => {
      // Ensure clean state for CASCADE tests
      try {
        await deleteTestUser();
      } catch {
        // Ignore - user might not exist
      }
    });

    it('should CASCADE delete related claims when user is deleted', async () => {
      /**
       * This test verifies database CASCADE configuration works correctly
       * CASCADE chain: User → Claims → Attachments
       * When user is deleted, all related claims should be auto-deleted
       */

      // Step 1: Create test user
      const createUserResponse = await createTestUser();
      expect(createUserResponse.status).toBe(201);

      // Step 2: Create a claim for the test user
      const claimData = {
        category: 'telco' as const,
        claimName: 'CASCADE Test Claim',
        month: 10,
        year: 2025,
        totalAmount: 50,
      };

      const createClaimResponse = await axiosInstance.post(
        '/claims',
        claimData,
        {
          headers: getAuthHeaders(),
        },
      );

      expect(createClaimResponse.status).toBe(201);
      const createdClaimId = createClaimResponse.data.claim.id;

      // Step 3: Verify claim exists
      const getClaimsBefore = await axiosInstance.get('/claims', {
        headers: getAuthHeaders(),
      });

      expect(getClaimsBefore.status).toBe(200);
      expect(getClaimsBefore.data.success).toBe(true);
      const claimsBefore = getClaimsBefore.data.claims;
      expect(claimsBefore.length).toBeGreaterThan(0);

      // Verify our specific claim exists
      const ourClaim = claimsBefore.find((c: any) => c.id === createdClaimId);
      expect(ourClaim).toBeDefined();
      expect(ourClaim.claimName).toBe('CASCADE Test Claim');

      // Step 4: Delete the user (CASCADE should delete claims)
      const deleteUserResponse = await deleteTestUser();

      expect(deleteUserResponse.status).toBe(200);
      expect(deleteUserResponse.data.deleted).toBe(true);

      // Step 5: Verify CASCADE deletion - recreate user and check claims
      await createTestUser();

      const getClaimsAfter = await axiosInstance.get('/claims', {
        headers: getAuthHeaders(),
      });

      expect(getClaimsAfter.status).toBe(200);
      expect(getClaimsAfter.data.success).toBe(true);

      // New user should have no claims
      expect(getClaimsAfter.data.claims.length).toBe(0);
    });

    it('should CASCADE delete multiple claims when user is deleted', async () => {
      /**
       * Verify CASCADE works with multiple related entities
       */

      // Create test user
      await createTestUser();

      // Create multiple claims
      const claim1Data = {
        category: 'telco' as const,
        claimName: 'Claim 1',
        month: 10,
        year: 2025,
        totalAmount: 30,
      };

      const claim2Data = {
        category: 'fitness' as const,
        claimName: 'Claim 2',
        month: 10,
        year: 2025,
        totalAmount: 40,
      };

      await axiosInstance.post('/claims', claim1Data, {
        headers: getAuthHeaders(),
      });

      await axiosInstance.post('/claims', claim2Data, {
        headers: getAuthHeaders(),
      });

      // Verify 2 claims exist
      const getClaimsBefore = await axiosInstance.get('/claims', {
        headers: getAuthHeaders(),
      });

      expect(getClaimsBefore.data.claims.length).toBe(2);

      // Delete user (CASCADE should delete both claims)
      const deleteResponse = await deleteTestUser();
      expect(deleteResponse.data.deleted).toBe(true);

      // Recreate user and verify no claims
      await createTestUser();

      const getClaimsAfter = await axiosInstance.get('/claims', {
        headers: getAuthHeaders(),
      });

      expect(getClaimsAfter.data.claims.length).toBe(0);
    });
  });
});
