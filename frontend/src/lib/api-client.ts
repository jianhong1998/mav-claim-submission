import { BACKEND_BASE_URL } from '@/constants';
import {
  IClaimResponse,
  IClaimEmailResponse,
  ClaimStatus,
} from '@project/types';
import axios from 'axios';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const axiosInstance = axios.create({
  baseURL: BACKEND_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
  withCredentials: true,
});

export const apiClient = {
  get: async <T>(endpoint: string): Promise<T> => {
    const response = await axiosInstance.get<T>(endpoint);
    return response.data;
  },

  post: async <T>(endpoint: string, data?: unknown): Promise<T> => {
    const response = await axiosInstance.post<T>(endpoint, data);
    return response.data;
  },

  put: async <T>(endpoint: string, data?: unknown): Promise<T> => {
    const response = await axiosInstance.put<T>(endpoint, data);
    return response.data;
  },

  patch: async <T>(endpoint: string, data?: unknown): Promise<T> => {
    const response = await axiosInstance.patch<T>(endpoint, data);
    return response.data;
  },

  delete: async <T>(endpoint: string): Promise<T> => {
    const response = await axiosInstance.delete<T>(endpoint);
    return response.data;
  },

  // Claim-specific methods
  updateClaimStatus: async (
    claimId: string,
    status: ClaimStatus,
  ): Promise<IClaimResponse> => {
    const response = await axiosInstance.put<IClaimResponse>(
      `/claims/${claimId}/status`,
      { status },
    );
    return response.data;
  },

  resendClaimEmail: async (claimId: string): Promise<IClaimEmailResponse> => {
    const response = await axiosInstance.post<IClaimEmailResponse>(
      `/claims/${claimId}/resend`,
    );
    return response.data;
  },
};
