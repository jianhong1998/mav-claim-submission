import { google, drive_v3 } from 'googleapis';
import axiosInstance from '../config/axios';
import { getAuthHeaders } from './test-auth.util';

/**
 * Google Drive utility for integration tests
 *
 * Provides helper functions to interact with Google Drive API
 * for verification purposes in integration tests
 */

interface DriveTokenResponse {
  success: boolean;
  access_token?: string;
}

/**
 * Get authenticated Google Drive client using test user's tokens
 */
export async function getDriveClient(): Promise<drive_v3.Drive> {
  // Get Drive token from backend
  const tokenResponse = await axiosInstance.get<DriveTokenResponse>(
    '/auth/drive-token',
    {
      headers: getAuthHeaders(),
    },
  );

  if (!tokenResponse.data.success || !tokenResponse.data.access_token) {
    throw new Error('Failed to get Drive access token for test');
  }

  // Create OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );

  oauth2Client.setCredentials({
    access_token: tokenResponse.data.access_token,
  });

  // Create Drive client
  return google.drive({ version: 'v3', auth: oauth2Client });
}

/**
 * Find a folder by ID
 */
export async function getFolderById(
  folderId: string,
): Promise<drive_v3.Schema$File | null> {
  try {
    const drive = await getDriveClient();
    const response = await drive.files.get({
      fileId: folderId,
      fields: 'id,name,parents,mimeType',
    });
    return response.data;
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      typeof (error as { code: unknown }).code === 'number' &&
      (error as { code: number }).code === 404
    ) {
      return null;
    }
    throw error;
  }
}

/**
 * Find a folder by name
 */
export async function findFolderByName(
  folderName: string,
): Promise<drive_v3.Schema$File | null> {
  const drive = await getDriveClient();
  const searchQuery = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const response = await drive.files.list({
    q: searchQuery,
    fields: 'files(id,name,parents)',
  });

  const files = response.data.files || [];
  return files.length > 0 ? files[0] : null;
}

/**
 * Delete a folder by ID
 */
export async function deleteFolder(folderId: string): Promise<void> {
  try {
    const drive = await getDriveClient();
    await drive.files.delete({
      fileId: folderId,
    });
  } catch (error) {
    // Ignore 404 errors (folder already deleted)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      typeof (error as { code: unknown }).code === 'number' &&
      (error as { code: number }).code === 404
    ) {
      return;
    }
    throw error;
  }
}

/**
 * Delete all folders with a specific name
 */
export async function deleteFoldersByName(folderName: string): Promise<void> {
  const drive = await getDriveClient();
  const searchQuery = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const response = await drive.files.list({
    q: searchQuery,
    fields: 'files(id)',
  });

  const files = response.data.files || [];

  // Delete all matching folders
  for (const file of files) {
    if (file.id) {
      await deleteFolder(file.id);
    }
  }
}
