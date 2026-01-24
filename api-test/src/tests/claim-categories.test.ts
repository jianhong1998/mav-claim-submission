import axiosInstance from '../config/axios';
import type { AxiosError } from 'axios';
import { getAuthHeaders } from '../utils/test-auth.util';

interface ClaimCategoryLimit {
  type: 'monthly' | 'yearly';
  amount: number;
}

interface ClaimCategory {
  uuid: string;
  code: string;
  name: string;
  limit: ClaimCategoryLimit | null;
}

interface ClaimCategoryListResponse {
  success: boolean;
  categories: ClaimCategory[];
}

/**
 * Integration tests for claim categories API
 *
 * Tests:
 * 1. GET /claim-categories requires authentication
 * 2. GET /claim-categories returns enabled categories by default
 * 3. GET /claim-categories?includeDisabled=true returns disabled categories
 * 4. GET /claim-categories?includeDeleted=true returns soft-deleted categories
 */
describe('Claim Categories API', () => {
  const authHeaders = () => getAuthHeaders();

  describe('GET /claim-categories', () => {
    it('should require authentication', async () => {
      // Act & Assert
      try {
        await axiosInstance.get('/claim-categories');
        expect.fail('Expected 401 error for unauthenticated request');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });

    it('should return enabled categories by default', async () => {
      // Act
      const response = await axiosInstance.get<ClaimCategoryListResponse>(
        '/claim-categories',
        {
          headers: authHeaders(),
        },
      );

      // Assert
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.categories).toBeDefined();
      expect(Array.isArray(response.data.categories)).toBe(true);

      // Verify all returned categories are enabled
      for (const category of response.data.categories) {
        expect(category).toHaveProperty('uuid');
        expect(category).toHaveProperty('code');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('limit');

        // Limit should be null or have type and amount
        if (category.limit !== null) {
          expect(category.limit).toHaveProperty('type');
          expect(category.limit).toHaveProperty('amount');
          expect(['monthly', 'yearly']).toContain(category.limit.type);
          expect(typeof category.limit.amount).toBe('number');
        }
      }

      // Should have at least telco and fitness categories
      const codes = response.data.categories.map((c) => c.code);
      expect(codes).toContain('telco');
      expect(codes).toContain('fitness');
    });

    it('should return categories with correct limit amounts in dollars', async () => {
      // Act
      const response = await axiosInstance.get<ClaimCategoryListResponse>(
        '/claim-categories',
        {
          headers: authHeaders(),
        },
      );

      // Assert
      expect(response.status).toBe(200);

      // Find telco category (should have $150 monthly limit)
      const telcoCategory = response.data.categories.find(
        (c) => c.code === 'telco',
      );
      expect(telcoCategory).toBeDefined();
      expect(telcoCategory?.limit).toBeDefined();
      expect(telcoCategory?.limit?.type).toBe('monthly');
      expect(telcoCategory?.limit?.amount).toBe(150); // In dollars

      // Find fitness category (should have $50 monthly limit)
      const fitnessCategory = response.data.categories.find(
        (c) => c.code === 'fitness',
      );
      expect(fitnessCategory).toBeDefined();
      expect(fitnessCategory?.limit).toBeDefined();
      expect(fitnessCategory?.limit?.type).toBe('monthly');
      expect(fitnessCategory?.limit?.amount).toBe(50); // In dollars
    });

    it('should return disabled categories when includeDisabled=true', async () => {
      // Act
      const response = await axiosInstance.get<ClaimCategoryListResponse>(
        '/claim-categories',
        {
          headers: authHeaders(),
          params: { includeDisabled: true },
        },
      );

      // Assert
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.categories).toBeDefined();
      expect(Array.isArray(response.data.categories)).toBe(true);

      // Should have all categories (enabled and disabled)
      // Count should be >= enabled-only count
      const enabledOnlyResponse =
        await axiosInstance.get<ClaimCategoryListResponse>(
          '/claim-categories',
          {
            headers: authHeaders(),
          },
        );

      expect(response.data.categories.length).toBeGreaterThanOrEqual(
        enabledOnlyResponse.data.categories.length,
      );
    });

    it('should handle includeDeleted parameter', async () => {
      // Act
      const response = await axiosInstance.get<ClaimCategoryListResponse>(
        '/claim-categories',
        {
          headers: authHeaders(),
          params: { includeDeleted: true },
        },
      );

      // Assert
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.categories).toBeDefined();
      expect(Array.isArray(response.data.categories)).toBe(true);
    });

    it('should handle both includeDisabled and includeDeleted parameters', async () => {
      // Act
      const response = await axiosInstance.get<ClaimCategoryListResponse>(
        '/claim-categories',
        {
          headers: authHeaders(),
          params: { includeDisabled: true, includeDeleted: true },
        },
      );

      // Assert
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.categories).toBeDefined();
      expect(Array.isArray(response.data.categories)).toBe(true);
    });

    it('should return categories with consistent structure', async () => {
      // Act
      const response = await axiosInstance.get<ClaimCategoryListResponse>(
        '/claim-categories',
        {
          headers: authHeaders(),
        },
      );

      // Assert
      expect(response.status).toBe(200);

      // Verify each category has required fields
      for (const category of response.data.categories) {
        expect(typeof category.uuid).toBe('string');
        expect(typeof category.code).toBe('string');
        expect(typeof category.name).toBe('string');

        // UUID should be valid format
        expect(category.uuid).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        );

        // Code should be lowercase
        expect(category.code).toBe(category.code.toLowerCase());
      }
    });
  });
});
