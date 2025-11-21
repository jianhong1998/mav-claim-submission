import { apiClient } from '@/lib/api-client';

/**
 * Email preference entry for update request
 */
export interface EmailPreferenceRequest {
  type: 'cc' | 'bcc';
  emailAddress: string;
}

/**
 * Request payload for updating user profile
 */
export interface UpdateUserRequest {
  name?: string;
  emailPreferences?: EmailPreferenceRequest[];
}

/**
 * Email preference entry in response
 */
export interface EmailPreferenceResponse {
  id: string;
  userId: string;
  type: 'cc' | 'bcc';
  emailAddress: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Response from profile update endpoint
 */
export interface UpdateUserResponse {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  googleId: string;
  emailPreferences: EmailPreferenceResponse[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Updates user profile information
 * @param userId - User ID to update
 * @param data - Profile update data (name and/or emailPreferences)
 * @returns Promise with updated user data
 * @throws ApiError if request fails (handled by axios interceptor)
 */
export const updateUserProfile = async (
  userId: string,
  data: UpdateUserRequest,
): Promise<UpdateUserResponse> => {
  return apiClient.patch<UpdateUserResponse>(`/users/${userId}`, data);
};
