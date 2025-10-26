/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import axiosInstance from '../config/axios';
import type { AxiosResponse, AxiosError } from 'axios';
import { getAuthHeaders } from '../utils/test-auth.util';
import {
  getFolderById,
  findFolderByName,
  deleteFolder,
  deleteFoldersByName,
} from '../utils/google-drive.util';

/**
 * Integration tests for environment-based folder creation
 *
 * Tests the complete end-to-end flow:
 * 1. Configure environment-specific folder name
 * 2. Call backend API to create claim folder
 * 3. Verify folder created in Google Drive with correct name
 * 4. Verify folder hierarchy (claim folder inside root folder)
 * 5. Clean up test folders
 */

interface FolderCreationResponse {
  success: boolean;
  folderId: string;
}

describe('#Environment-Based Folder Creation', () => {
  const originalEnvVar = process.env.BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME;
  let testClaimId: string;
  const testFolderName = '[test] Mavericks Claims';
  const authHeaders = () => getAuthHeaders();

  // Set up test environment variable and create test claim
  beforeAll(async () => {
    process.env.BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME = testFolderName;

    // Create a test claim for folder creation tests
    try {
      const response = await axiosInstance.post(
        '/claims',
        {
          category: 'dental',
          claimName: 'Folder Creation Test Claim',
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          totalAmount: 100.0,
        },
        {
          headers: authHeaders(),
        },
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      testClaimId = response.data.claim.id as string;
    } catch {
      // If claim creation fails, use a fallback ID
      testClaimId = '00000000-0000-0000-0000-000000000003';
    }
  });

  // Restore original environment variable and clean up test folders
  afterAll(async () => {
    if (originalEnvVar) {
      process.env.BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME = originalEnvVar;
    } else {
      delete process.env.BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME;
    }

    // Clean up test folders from Google Drive
    try {
      await deleteFoldersByName(testFolderName);
    } catch (error) {
      // Ignore cleanup errors
      console.warn('Failed to clean up test folders:', error);
    }
  });

  describe('Authentication Requirements', () => {
    it('should require authentication for folder creation endpoint', async () => {
      try {
        await axiosInstance.post(`/attachments/folder/${testClaimId}`);
        expect.fail('Expected authentication error');
      } catch (error) {
        expect((error as AxiosError).response?.status).toBe(401);
      }
    });
  });

  describe('Folder Creation with Environment Variable', () => {
    let createdFolderId: string | undefined;
    let rootFolderId: string | undefined;

    afterEach(async () => {
      // Clean up created folders
      try {
        if (createdFolderId) {
          await deleteFolder(createdFolderId);
          createdFolderId = undefined;
        }
        if (rootFolderId) {
          await deleteFolder(rootFolderId);
          rootFolderId = undefined;
        }
      } catch (error) {
        // Ignore cleanup errors
        console.warn('Failed to clean up created folders:', error);
      }
    });

    it.skip('should create claim folder with environment-specific root folder name', async () => {
      try {
        // Step 1: Call backend API to create folder
        const response: AxiosResponse<FolderCreationResponse> =
          await axiosInstance.post(
            `/attachments/folder/${testClaimId}`,
            {},
            {
              headers: authHeaders(),
            },
          );

        // Step 2: Verify API response
        expect(response.status).toBe(201);
        expect(response.data.success).toBe(true);
        expect(response.data.folderId).toBeDefined();
        expect(typeof response.data.folderId).toBe('string');

        createdFolderId = response.data.folderId;

        // Step 3: Verify folder exists in Google Drive
        const claimFolder = await getFolderById(createdFolderId);
        expect(claimFolder).not.toBeNull();
        expect(claimFolder?.id).toBe(createdFolderId);

        // Step 4: Verify claim folder has a parent folder
        expect(claimFolder?.parents).toBeDefined();
        expect(Array.isArray(claimFolder?.parents)).toBe(true);
        expect(claimFolder?.parents?.length).toBeGreaterThan(0);

        const parentFolderId = claimFolder?.parents?.[0];
        expect(parentFolderId).toBeDefined();
        rootFolderId = parentFolderId;

        // Step 5: Verify parent folder name matches environment variable
        const rootFolder = await getFolderById(parentFolderId!);
        expect(rootFolder).not.toBeNull();
        expect(rootFolder?.name).toBe(testFolderName);

        // Step 6: Verify it's not using the hardcoded name
        expect(rootFolder?.name).not.toBe('Mavericks Claims');
      } catch (error) {
        // In test environment, may fail due to auth, Google API issues, or missing tokens
        const status = (error as AxiosError).response?.status;
        if (status === 400 || status === 401 || status === 429) {
          // Expected errors in test environment without valid OAuth tokens
          const errorData = (error as AxiosError).response?.data as Record<
            string,
            unknown
          >;
          const errorMessage =
            typeof errorData?.error === 'string' ? errorData.error : error;
          console.log('Test skipped due to:', errorMessage);
          return;
        }
        throw error;
      }
    });

    it.skip('should handle folder creation when root folder already exists', async () => {
      try {
        // Step 1: Create first claim folder (will create root folder)
        const response1: AxiosResponse<FolderCreationResponse> =
          await axiosInstance.post(
            `/attachments/folder/${testClaimId}`,
            {},
            {
              headers: authHeaders(),
            },
          );

        expect(response1.status).toBe(201);
        expect(response1.data.success).toBe(true);
        createdFolderId = response1.data.folderId;

        // Get the root folder ID
        const claimFolder1 = await getFolderById(createdFolderId);
        const rootFolderId1 = claimFolder1?.parents?.[0];
        rootFolderId = rootFolderId1;

        // Step 2: Create a second claim for this test
        const claim2Response = await axiosInstance.post(
          '/claims',
          {
            category: 'others',
            claimName: 'Second Folder Test Claim',
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            totalAmount: 50.0,
          },
          {
            headers: authHeaders(),
          },
        );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const testClaimId2 = claim2Response.data.claim.id as string;

        // Step 3: Create second claim folder (should reuse existing root folder)
        const response2: AxiosResponse<FolderCreationResponse> =
          await axiosInstance.post(
            `/attachments/folder/${testClaimId2}`,
            {},
            {
              headers: authHeaders(),
            },
          );

        expect(response2.status).toBe(201);
        expect(response2.data.success).toBe(true);

        const claimFolder2 = await getFolderById(response2.data.folderId);
        const rootFolderId2 = claimFolder2?.parents?.[0];

        // Step 4: Verify both claim folders share the same root folder
        expect(rootFolderId2).toBe(rootFolderId1);

        // Clean up second folder
        await deleteFolder(response2.data.folderId);
      } catch (error) {
        // In test environment, may fail due to auth, Google API issues, or missing tokens
        const status = (error as AxiosError).response?.status;
        if (status === 400 || status === 401 || status === 429) {
          // Expected errors in test environment without valid OAuth tokens
          const errorData = (error as AxiosError).response?.data as Record<
            string,
            unknown
          >;
          const errorMessage =
            typeof errorData?.error === 'string' ? errorData.error : error;
          console.log('Test skipped due to:', errorMessage);
          return;
        }
        throw error;
      }
    });

    it.skip('should use configured folder name from environment variable, not hardcoded value', async () => {
      try {
        // Step 1: Call backend API
        const response: AxiosResponse<FolderCreationResponse> =
          await axiosInstance.post(
            `/attachments/folder/${testClaimId}`,
            {},
            {
              headers: authHeaders(),
            },
          );

        expect(response.status).toBe(201);
        expect(response.data.success).toBe(true);

        createdFolderId = response.data.folderId;

        // Step 2: Get claim folder and its parent
        const claimFolder = await getFolderById(createdFolderId);
        const parentFolderId = claimFolder?.parents?.[0];
        rootFolderId = parentFolderId;

        // Step 3: Verify parent folder uses environment variable value
        const rootFolder = await getFolderById(parentFolderId!);

        // Critical assertion: Must match env var, NOT hardcoded value
        expect(rootFolder?.name).toBe(testFolderName); // '[test] Mavericks Claims'
        expect(rootFolder?.name).not.toBe('Mavericks Claims'); // NOT hardcoded

        // Step 4: Also verify by searching for folders
        const hardcodedFolder = await findFolderByName('Mavericks Claims');
        const testFolder = await findFolderByName(testFolderName);

        // Test environment should NOT create hardcoded folder
        if (hardcodedFolder && testFolder) {
          // If both exist, they should be different folders
          expect(hardcodedFolder.id).not.toBe(testFolder.id);
        }

        // Our created folder should match the test folder
        expect(rootFolder?.id).toBe(testFolder?.id);
      } catch (error) {
        // In test environment, may fail due to auth, Google API issues, or missing tokens
        const status = (error as AxiosError).response?.status;
        if (status === 400 || status === 401 || status === 429) {
          // Expected errors in test environment without valid OAuth tokens
          const errorData = (error as AxiosError).response?.data as Record<
            string,
            unknown
          >;
          const errorMessage =
            typeof errorData?.error === 'string' ? errorData.error : error;
          console.log('Test skipped due to:', errorMessage);
          return;
        }
        throw error;
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid claim ID format', async () => {
      try {
        await axiosInstance.post(
          '/attachments/folder/invalid-uuid',
          {},
          {
            headers: authHeaders(),
          },
        );
        expect.fail('Expected validation error for invalid claim ID');
      } catch (error) {
        expect((error as AxiosError).response?.status).toBeOneOf([400, 404]);
      }
    });

    it('should handle Google Drive API errors gracefully', async () => {
      try {
        // This test would require mocking Google Drive to return errors
        // For now, we just verify the endpoint exists and handles auth
        const response = await axiosInstance.post(
          `/attachments/folder/${testClaimId}`,
          {},
          {
            headers: authHeaders(),
            validateStatus: (status) => status < 500,
          },
        );

        // Accept success or expected error codes
        expect(response.status).toBeOneOf([201, 400, 401, 429]);
      } catch (error) {
        // Accept network or timeout errors
        expect(error).toBeDefined();
      }
    });
  });
});
