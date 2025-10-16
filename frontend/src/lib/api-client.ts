import { getBackendBaseUrl } from '@/constants';
import {
  IClaimResponse,
  IClaimEmailResponse,
  ClaimStatus,
} from '@project/types';
import axios, { AxiosError, AxiosInstance } from 'axios';

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

let axiosInstance: AxiosInstance | null = null;

const getAxiosInstance = (): AxiosInstance => {
  if (axiosInstance) {
    return axiosInstance;
  }

  axiosInstance = axios.create({
    baseURL: getBackendBaseUrl(),
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 10000,
    withCredentials: true,
  });

  // Add response interceptor to handle errors properly
  axiosInstance.interceptors.response.use(
    (response) => response,
    (error: AxiosError<{ message?: string; error?: string }>) => {
      // Extract error message from response
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'An unexpected error occurred';

      const status = error.response?.status || 500;

      throw new ApiError(errorMessage, status, error.response?.data);
    },
  );

  return axiosInstance;
};

export const apiClient = {
  get: async <T>(endpoint: string): Promise<T> => {
    const response = await getAxiosInstance().get<T>(endpoint);
    return response.data;
  },

  post: async <T>(endpoint: string, data?: unknown): Promise<T> => {
    const response = await getAxiosInstance().post<T>(endpoint, data);
    return response.data;
  },

  put: async <T>(endpoint: string, data?: unknown): Promise<T> => {
    const response = await getAxiosInstance().put<T>(endpoint, data);
    return response.data;
  },

  patch: async <T>(endpoint: string, data?: unknown): Promise<T> => {
    const response = await getAxiosInstance().patch<T>(endpoint, data);
    return response.data;
  },

  delete: async <T>(endpoint: string): Promise<T> => {
    const response = await getAxiosInstance().delete<T>(endpoint);
    return response.data;
  },

  // Claim-specific methods
  updateClaimStatus: async (
    claimId: string,
    status: ClaimStatus,
  ): Promise<IClaimResponse> => {
    const response = await getAxiosInstance().put<IClaimResponse>(
      `/claims/${claimId}/status`,
      { status },
    );
    return response.data;
  },

  resendClaimEmail: async (claimId: string): Promise<IClaimEmailResponse> => {
    const response = await getAxiosInstance().post<IClaimEmailResponse>(
      `/claims/${claimId}/resend`,
    );
    return response.data;
  },
};
