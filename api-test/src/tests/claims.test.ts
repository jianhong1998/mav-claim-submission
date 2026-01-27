/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import axiosInstance from '../config/axios';
import type { AxiosError } from 'axios';
import { IClaimCreateRequest, IClaimUpdateRequest } from '@project/types';
import { getAuthHeaders } from '../utils/test-auth.util';

/**
 * Integration tests for monthly claim limit validation
 *
 * Tests the complete end-to-end flow:
 * 1. Claim creation with limit enforcement
 * 2. Sequential claims affecting monthly limits
 * 3. Update revalidation logic
 * 4. Deleted claims exclusion
 * 5. Category change revalidation
 */
describe('Monthly Limit Validation', () => {
  const authHeaders = () => getAuthHeaders();

  beforeEach(async () => {
    // Clean database state before each test
    // Delete all claims for the test user to ensure clean state
    try {
      // Get all claims for the user
      const response = await axiosInstance.get('/claims', {
        headers: authHeaders(),
      });

      if (response.data?.success && response.data?.claims) {
        // Delete each claim (skip paid claims as they can't be deleted)
        for (const claim of response.data.claims) {
          if (claim.status !== 'paid') {
            try {
              await axiosInstance.delete(`/claims/${claim.id}`, {
                headers: authHeaders(),
              });
            } catch (deleteError) {
              // Log but continue with other claims
              console.log(
                `Failed to delete claim ${claim.id}:`,
                (deleteError as Error).message,
              );
            }
          }
        }
      }
    } catch (error) {
      // If we can't get claims, log and continue
      // Tests will fail if this is a real problem
      console.log('Cleanup error:', (error as Error).message);
    }
  });

  describe('Test 1: Sequential claim limits', () => {
    it('should enforce sequential claim limits', async () => {
      // First claim: Telco $100 (should succeed)
      const claim1: IClaimCreateRequest = {
        category: 'telco',
        claimName: 'Phone bill 1',
        month: 10,
        year: 2025,
        totalAmount: 100,
      };

      const response1 = await axiosInstance.post('/claims', claim1, {
        headers: authHeaders(),
      });

      expect(response1.status).toBe(201);
      expect(response1.data.success).toBe(true);

      // Second claim: Telco $60 same month (should fail - total $160 > $150 limit)
      const claim2: IClaimCreateRequest = {
        category: 'telco',
        claimName: 'Phone bill 2',
        month: 10,
        year: 2025,
        totalAmount: 60,
      };

      try {
        await axiosInstance.post('/claims', claim2, {
          headers: authHeaders(),
        });
        expect.fail('Expected 422 error for exceeding Telco monthly limit');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(422);

        // Verify error message format
        const errorData = axiosError.response?.data as any;
        expect(errorData.message).toContain('Telecommunications');
        expect(errorData.message).toContain('monthly limit');
        expect(errorData.message).toContain('SGD 150.00');
        expect(errorData.message).toContain('Proposed');
      }
    });
  });

  describe('Test 2: Different categories independently', () => {
    it('should treat different categories independently', async () => {
      // Telco at limit: $150
      const telcoClaim: IClaimCreateRequest = {
        category: 'telco',
        claimName: 'Phone bill',
        month: 10,
        year: 2025,
        totalAmount: 150,
      };

      const telcoResponse = await axiosInstance.post('/claims', telcoClaim, {
        headers: authHeaders(),
      });

      expect(telcoResponse.status).toBe(201);
      expect(telcoResponse.data.success).toBe(true);

      // Fitness at limit: $50 (should succeed - different category)
      const fitnessClaim: IClaimCreateRequest = {
        category: 'fitness',
        claimName: 'Gym membership',
        month: 10,
        year: 2025,
        totalAmount: 50,
      };

      const fitnessResponse = await axiosInstance.post(
        '/claims',
        fitnessClaim,
        {
          headers: authHeaders(),
        },
      );

      expect(fitnessResponse.status).toBe(201);
      expect(fitnessResponse.data.success).toBe(true);
    });
  });

  describe('Test 3: Different months independently', () => {
    it('should treat different months independently', async () => {
      // September Telco: $150
      const septemberClaim: IClaimCreateRequest = {
        category: 'telco',
        claimName: 'Phone bill September',
        month: 9,
        year: 2025,
        totalAmount: 150,
      };

      const septemberResponse = await axiosInstance.post(
        '/claims',
        septemberClaim,
        {
          headers: authHeaders(),
        },
      );

      expect(septemberResponse.status).toBe(201);
      expect(septemberResponse.data.success).toBe(true);

      // October Telco: $150 (should succeed - different month)
      const octoberClaim: IClaimCreateRequest = {
        category: 'telco',
        claimName: 'Phone bill October',
        month: 10,
        year: 2025,
        totalAmount: 150,
      };

      const octoberResponse = await axiosInstance.post(
        '/claims',
        octoberClaim,
        {
          headers: authHeaders(),
        },
      );

      expect(octoberResponse.status).toBe(201);
      expect(octoberResponse.data.success).toBe(true);
    });
  });

  describe('Test 4: Update revalidation', () => {
    it('should revalidate on update', async () => {
      // Create first claim: Telco $80
      const claim1: IClaimCreateRequest = {
        category: 'telco',
        claimName: 'Phone bill 1',
        month: 10,
        year: 2025,
        totalAmount: 80,
      };

      const response1 = await axiosInstance.post('/claims', claim1, {
        headers: authHeaders(),
      });

      expect(response1.status).toBe(201);

      // Create second claim: Telco $60
      const claim2: IClaimCreateRequest = {
        category: 'telco',
        claimName: 'Phone bill 2',
        month: 10,
        year: 2025,
        totalAmount: 60,
      };

      const response2 = await axiosInstance.post('/claims', claim2, {
        headers: authHeaders(),
      });

      expect(response2.status).toBe(201);
      const claim2Id = response2.data.claim.id;

      // Update second claim to $80 (total would be $160 > $150 limit)
      const updateClaim2: IClaimUpdateRequest = {
        totalAmount: 80,
      };

      try {
        await axiosInstance.put(`/claims/${claim2Id}`, updateClaim2, {
          headers: authHeaders(),
        });
        expect.fail('Expected 422 error when update exceeds monthly limit');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(422);

        // Verify error message format
        const errorData = axiosError.response?.data as any;
        expect(errorData.message).toContain('Telecommunications');
        expect(errorData.message).toContain('SGD 150.00');
        expect(errorData.message).toContain('Proposed');
      }
    });
  });

  describe('Test 5: Deleted claims exclusion', () => {
    it('should exclude deleted claims from totals', async () => {
      // Create first claim: Telco $100
      const claim1: IClaimCreateRequest = {
        category: 'telco',
        claimName: 'Phone bill 1',
        month: 10,
        year: 2025,
        totalAmount: 100,
      };

      const response1 = await axiosInstance.post('/claims', claim1, {
        headers: authHeaders(),
      });

      expect(response1.status).toBe(201);
      const claim1Id = response1.data.claim.id;

      // Delete the first claim
      const deleteResponse = await axiosInstance.delete(`/claims/${claim1Id}`, {
        headers: authHeaders(),
      });

      expect(deleteResponse.status).toBe(204);

      // Create new claim: Telco $150 (should succeed - deleted claim doesn't count)
      const claim2: IClaimCreateRequest = {
        category: 'telco',
        claimName: 'Phone bill 2',
        month: 10,
        year: 2025,
        totalAmount: 150,
      };

      const response2 = await axiosInstance.post('/claims', claim2, {
        headers: authHeaders(),
      });

      expect(response2.status).toBe(201);
      expect(response2.data.success).toBe(true);
    });
  });

  describe('Test 6: Category change revalidation', () => {
    it('should revalidate on category change', async () => {
      // Create Dental claim: $200 (unlimited category)
      const dentalClaim: IClaimCreateRequest = {
        category: 'dental',
        claimName: 'Dental treatment',
        month: 10,
        year: 2025,
        totalAmount: 200,
      };

      const dentalResponse = await axiosInstance.post('/claims', dentalClaim, {
        headers: authHeaders(),
      });

      expect(dentalResponse.status).toBe(201);
      const dentalClaimId = dentalResponse.data.claim.id;

      // Update category to Fitness with same amount $200 (exceeds $50 Fitness limit)
      const updateToFitness: IClaimUpdateRequest = {
        category: 'fitness',
      };

      try {
        await axiosInstance.put(`/claims/${dentalClaimId}`, updateToFitness, {
          headers: authHeaders(),
        });
        expect.fail(
          'Expected 422 error when category change exceeds new category limit',
        );
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(422);

        // Verify error message format
        const errorData = axiosError.response?.data as any;
        expect(errorData.message).toContain('Fitness & Wellness');
        expect(errorData.message).toContain('SGD 50.00');
        expect(errorData.message).toContain('Proposed');
      }
    });
  });
});

/**
 * Integration tests for yearly claim limit validation
 *
 * Tests the complete end-to-end flow:
 * 1. Yearly limit enforcement across multiple months
 * 2. Sequential claims affecting yearly limits
 * 3. Update revalidation with yearly limits
 * 4. Deleted claims exclusion from yearly totals
 */
describe('Yearly Limit Validation', () => {
  const authHeaders = () => getAuthHeaders();

  beforeEach(async () => {
    // Clean database state before each test
    // Delete all claims for the test user to ensure clean state
    try {
      // Get all claims for the user
      const response = await axiosInstance.get('/claims', {
        headers: authHeaders(),
      });

      if (response.data?.success && response.data?.claims) {
        // Delete each claim (skip paid claims as they can't be deleted)
        for (const claim of response.data.claims) {
          if (claim.status !== 'paid') {
            try {
              await axiosInstance.delete(`/claims/${claim.id}`, {
                headers: authHeaders(),
              });
            } catch (deleteError) {
              // Log but continue with other claims
              console.log(
                `Failed to delete claim ${claim.id}:`,
                (deleteError as Error).message,
              );
            }
          }
        }
      }
    } catch (error) {
      // If we can't get claims, log and continue
      // Tests will fail if this is a real problem
      console.log('Cleanup error:', (error as Error).message);
    }
  });

  describe('Test 1: Yearly limit across multiple months', () => {
    it('should enforce yearly limit across different months', async () => {
      // Create dental claims across 3 different months totaling $300
      const months = [1, 2, 3];
      const amountPerMonth = 100;

      for (const month of months) {
        const dentalClaim: IClaimCreateRequest = {
          category: 'dental',
          claimName: `Dental treatment month ${month}`,
          month,
          year: 2025,
          totalAmount: amountPerMonth,
        };

        const response = await axiosInstance.post('/claims', dentalClaim, {
          headers: authHeaders(),
        });

        expect(response.status).toBe(201);
        expect(response.data.success).toBe(true);
      }

      // Now try to add another dental claim for month 4 ($50)
      // This should fail as total would be $350 > $300 yearly limit
      const month4Claim: IClaimCreateRequest = {
        category: 'dental',
        claimName: 'Dental treatment month 4',
        month: 4,
        year: 2025,
        totalAmount: 50,
      };

      try {
        await axiosInstance.post('/claims', month4Claim, {
          headers: authHeaders(),
        });
        expect.fail('Expected 422 error for exceeding Dental yearly limit');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(422);

        // Verify error message format
        const errorData = axiosError.response?.data as any;
        expect(errorData.message).toContain('Dental');
        expect(errorData.message).toContain('yearly limit');
        expect(errorData.message).toContain('SGD 300.00');
        expect(errorData.message).toContain('Current: SGD 300.00');
        expect(errorData.message).toContain('Proposed: SGD 50.00');
        expect(errorData.message).toContain('Total: SGD 350.00');
      }
    });
  });

  describe('Test 2: Yearly limit at exact threshold', () => {
    it('should allow claims up to the exact yearly limit', async () => {
      // Create dental claims totaling exactly $300
      const claim1: IClaimCreateRequest = {
        category: 'dental',
        claimName: 'Dental treatment 1',
        month: 1,
        year: 2025,
        totalAmount: 150,
      };

      const response1 = await axiosInstance.post('/claims', claim1, {
        headers: authHeaders(),
      });

      expect(response1.status).toBe(201);

      const claim2: IClaimCreateRequest = {
        category: 'dental',
        claimName: 'Dental treatment 2',
        month: 2,
        year: 2025,
        totalAmount: 150,
      };

      const response2 = await axiosInstance.post('/claims', claim2, {
        headers: authHeaders(),
      });

      expect(response2.status).toBe(201);
      expect(response2.data.success).toBe(true);
    });
  });

  describe('Test 3: Update revalidation with yearly limits', () => {
    it('should revalidate yearly limits on update', async () => {
      // Create dental claims across 2 months: $150 + $100 = $250
      const claim1: IClaimCreateRequest = {
        category: 'dental',
        claimName: 'Dental treatment 1',
        month: 1,
        year: 2025,
        totalAmount: 150,
      };

      const response1 = await axiosInstance.post('/claims', claim1, {
        headers: authHeaders(),
      });

      expect(response1.status).toBe(201);

      const claim2: IClaimCreateRequest = {
        category: 'dental',
        claimName: 'Dental treatment 2',
        month: 2,
        year: 2025,
        totalAmount: 100,
      };

      const response2 = await axiosInstance.post('/claims', claim2, {
        headers: authHeaders(),
      });

      expect(response2.status).toBe(201);
      const claim2Id = response2.data.claim.id;

      // Try to update claim2 to $200 (total would be $350 > $300 limit)
      const updateClaim2: IClaimUpdateRequest = {
        totalAmount: 200,
      };

      try {
        await axiosInstance.put(`/claims/${claim2Id}`, updateClaim2, {
          headers: authHeaders(),
        });
        expect.fail('Expected 422 error when update exceeds yearly limit');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(422);

        // Verify error message format
        const errorData = axiosError.response?.data as any;
        expect(errorData.message).toContain('Dental');
        expect(errorData.message).toContain('yearly limit');
        expect(errorData.message).toContain('SGD 300.00');
      }
    });
  });

  describe('Test 4: Deleted claims exclusion from yearly totals', () => {
    it('should exclude deleted claims from yearly totals', async () => {
      // Create dental claim: $200
      const claim1: IClaimCreateRequest = {
        category: 'dental',
        claimName: 'Dental treatment 1',
        month: 1,
        year: 2025,
        totalAmount: 200,
      };

      const response1 = await axiosInstance.post('/claims', claim1, {
        headers: authHeaders(),
      });

      expect(response1.status).toBe(201);
      const claim1Id = response1.data.claim.id;

      // Delete the first claim
      const deleteResponse = await axiosInstance.delete(`/claims/${claim1Id}`, {
        headers: authHeaders(),
      });

      expect(deleteResponse.status).toBe(204);

      // Create new dental claim: $300 in month 2
      // Should succeed - deleted claim doesn't count towards yearly total
      const claim2: IClaimCreateRequest = {
        category: 'dental',
        claimName: 'Dental treatment 2',
        month: 2,
        year: 2025,
        totalAmount: 300,
      };

      const response2 = await axiosInstance.post('/claims', claim2, {
        headers: authHeaders(),
      });

      expect(response2.status).toBe(201);
      expect(response2.data.success).toBe(true);
    });
  });

  describe('Test 5: Different years independent', () => {
    it('should treat different years independently for yearly limits', async () => {
      // Create dental claim for 2024: $300 (at limit for 2024)
      const claim2024: IClaimCreateRequest = {
        category: 'dental',
        claimName: 'Dental treatment 2024',
        month: 12,
        year: 2024,
        totalAmount: 300,
      };

      const response2024 = await axiosInstance.post('/claims', claim2024, {
        headers: authHeaders(),
      });

      expect(response2024.status).toBe(201);

      // Create dental claim for 2025: $300
      // Should succeed - different year, independent limit
      const claim2025: IClaimCreateRequest = {
        category: 'dental',
        claimName: 'Dental treatment 2025',
        month: 1,
        year: 2025,
        totalAmount: 300,
      };

      const response2025 = await axiosInstance.post('/claims', claim2025, {
        headers: authHeaders(),
      });

      expect(response2025.status).toBe(201);
      expect(response2025.data.success).toBe(true);
    });
  });
});
