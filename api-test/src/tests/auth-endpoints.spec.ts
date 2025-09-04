import axiosInstance from '../config/axios';
import { IAuthResponse } from '@project/types';
import { AxiosError } from 'axios';

describe('#Auth Endpoints', () => {
  describe('GET /auth/google', () => {
    it('should redirect to Google OAuth consent screen', async () => {
      try {
        await axiosInstance.get('/auth/google', {
          maxRedirects: 0, // Don't follow redirects
        });
      } catch (error) {
        // Expecting a redirect response (302)
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(302);
        expect(axiosError.response?.headers?.location).toContain(
          'accounts.google.com',
        );
      }
    });
  });

  describe('GET /auth/status', () => {
    it('should return unauthenticated status when no session', async () => {
      const result = await axiosInstance.get('/auth/status');

      expect(result.status).toBe(200);
      expect(result.data).toMatchObject({
        isAuthenticated: false,
      });
    });
  });

  describe('GET /auth/profile', () => {
    it('should return 401 when not authenticated', async () => {
      try {
        await axiosInstance.get('/auth/profile');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
        expect(axiosError.response?.data).toMatchObject({
          user: null,
          isAuthenticated: false,
          message: 'Not authenticated',
        } as IAuthResponse);
      }
    });
  });

  describe('POST /auth/logout', () => {
    it('should return 401 when not authenticated', async () => {
      try {
        await axiosInstance.post('/auth/logout');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
        expect(axiosError.response?.data).toMatchObject({
          success: false,
          message: 'Not authenticated',
        });
      }
    });
  });

  describe('POST /auth/refresh', () => {
    it('should return 401 when not authenticated', async () => {
      try {
        await axiosInstance.post('/auth/refresh');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
        expect(axiosError.response?.data).toMatchObject({
          success: false,
          message: 'Not authenticated',
        });
      }
    });
  });

  // Note: Full OAuth flow testing would require:
  // 1. Mock Google OAuth service or test credentials
  // 2. Session management setup
  // 3. Database cleanup between tests
  // 4. More complex test setup for authenticated scenarios

  // These tests focus on basic endpoint accessibility and error handling
  // without requiring a full OAuth integration setup
});
