import * as dotenv from 'dotenv';
import * as path from 'path';
import axiosInstance from '../config/axios';

// Load environment variables from root .env file
dotenv.config({ path: path.join(__dirname, '../../../.env') });

/**
 * Response structure from POST /internal/test-data endpoint
 */
interface TestDataResponse {
  user: {
    id: string;
    email: string;
    name: string;
    googleId: string;
  };
}

/**
 * Global test setup
 *
 * Ensures test user exists in database before running integration tests
 */
export async function setup(): Promise<void> {
  try {
    // Cleanup: Delete any existing test data first
    await axiosInstance.delete('/internal/test-data');

    // Create test user via HTTP endpoint
    const response = await axiosInstance.post<TestDataResponse>(
      '/internal/test-data',
    );

    console.log('✓ Test user created:', response.data.user.email);
  } catch (error) {
    console.error('Failed to setup test user:', error);
    throw error;
  }
}
