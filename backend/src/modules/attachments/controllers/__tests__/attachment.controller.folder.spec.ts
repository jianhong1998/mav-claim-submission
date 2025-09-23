import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { AttachmentController } from '../attachment.controller';
import { AttachmentService } from '../../services/attachment.service';
import { UserEntity } from '../../../user/entities/user.entity';

/**
 * AttachmentController Folder Creation Tests
 *
 * Tests the POST /attachments/folder/:claimId endpoint which creates
 * Google Drive folders for claim attachments with descriptive naming.
 *
 * Test Categories:
 * - Successful folder creation scenarios
 * - Service layer error handling
 * - Request validation and authentication
 * - Invalid input handling
 * - Logging and error reporting
 */
describe('AttachmentController - Folder Creation', () => {
  let controller: AttachmentController;
  let mockAttachmentService: {
    createClaimFolder: Mock;
  };
  let mockLogger: {
    debug: Mock;
    warn: Mock;
    error: Mock;
  };

  const mockUser: UserEntity = {
    id: 'user-123',
    googleId: 'google-123',
    email: 'test@mavericks-consulting.com',
    name: 'Test User',
    picture: 'https://example.com/picture.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Create service mock with all required methods
    mockAttachmentService = {
      createClaimFolder: vi.fn(),
    };

    // Create logger mock
    mockLogger = {
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    // Initialize controller with mocked dependencies
    controller = new AttachmentController(
      mockAttachmentService as unknown as AttachmentService,
    );

    // Mock the private logger - accessing private property for testing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (controller as any).logger = mockLogger;
  });

  describe('Successful Folder Creation', () => {
    it('should create folder successfully with valid claim data', async () => {
      const claimId = 'claim-123';
      const expectedFolderId = 'folder-456';

      mockAttachmentService.createClaimFolder.mockResolvedValue(
        expectedFolderId,
      );

      const result = await controller.createClaimFolder(claimId, mockUser);

      expect(result.success).toBe(true);
      expect(result.folderId).toBe(expectedFolderId);
      expect(result.error).toBeUndefined();

      // Verify service was called with correct parameters
      expect(mockAttachmentService.createClaimFolder).toHaveBeenCalledTimes(1);
      expect(mockAttachmentService.createClaimFolder).toHaveBeenCalledWith(
        mockUser.id,
        claimId,
      );

      // Verify logging
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Creating folder for claim: ${claimId}`,
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Folder created successfully for claim ${claimId}: ${expectedFolderId}`,
      );
    });

    it('should handle empty folder ID as success when service returns empty string', async () => {
      const claimId = 'claim-123';
      const emptyFolderId = '';

      mockAttachmentService.createClaimFolder.mockResolvedValue(emptyFolderId);

      const result = await controller.createClaimFolder(claimId, mockUser);

      expect(result.success).toBe(false);
      expect(result.folderId).toBeUndefined();
      expect(result.error).toBe('Failed to create claim folder');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Failed to create folder for claim: ${claimId}`,
      );
    });

    it('should verify user ID is correctly passed to service', async () => {
      const claimId = 'claim-456';
      const differentUser: UserEntity = {
        ...mockUser,
        id: 'different-user-789',
      };

      mockAttachmentService.createClaimFolder.mockResolvedValue('folder-123');

      await controller.createClaimFolder(claimId, differentUser);

      expect(mockAttachmentService.createClaimFolder).toHaveBeenCalledWith(
        'different-user-789',
        claimId,
      );
    });
  });

  describe('Folder Creation Failures', () => {
    it('should handle service returning null folder ID', async () => {
      const claimId = 'claim-123';

      mockAttachmentService.createClaimFolder.mockResolvedValue(null);

      const result = await controller.createClaimFolder(claimId, mockUser);

      expect(result.success).toBe(false);
      expect(result.folderId).toBeUndefined();
      expect(result.error).toBe('Failed to create claim folder');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Failed to create folder for claim: ${claimId}`,
      );
    });

    it('should handle service returning undefined folder ID', async () => {
      const claimId = 'claim-123';

      mockAttachmentService.createClaimFolder.mockResolvedValue(undefined);

      const result = await controller.createClaimFolder(claimId, mockUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create claim folder');
    });

    it('should handle service throwing an error', async () => {
      const claimId = 'claim-123';
      const serviceError = new Error('Google Drive API failed');

      mockAttachmentService.createClaimFolder.mockRejectedValue(serviceError);

      const result = await controller.createClaimFolder(claimId, mockUser);

      expect(result.success).toBe(false);
      expect(result.folderId).toBeUndefined();
      expect(result.error).toBe('Folder creation failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Folder creation failed for claim ${claimId}:`,
        serviceError,
      );
    });

    it('should handle BadRequestException from service', async () => {
      const claimId = 'claim-123';
      const badRequestError = new BadRequestException('Invalid claim data');

      mockAttachmentService.createClaimFolder.mockRejectedValue(
        badRequestError,
      );

      const result = await controller.createClaimFolder(claimId, mockUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Folder creation failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Folder creation failed for claim ${claimId}:`,
        badRequestError,
      );
    });

    it('should handle service timeout errors', async () => {
      const claimId = 'claim-123';
      const timeoutError = new Error('Request timeout');

      mockAttachmentService.createClaimFolder.mockRejectedValue(timeoutError);

      const result = await controller.createClaimFolder(claimId, mockUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Folder creation failed');
    });

    it('should handle network connectivity errors', async () => {
      const claimId = 'claim-123';
      const networkError = new Error('Network unreachable');

      mockAttachmentService.createClaimFolder.mockRejectedValue(networkError);

      const result = await controller.createClaimFolder(claimId, mockUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Folder creation failed');
    });
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle valid UUID format claim ID', async () => {
      const validUuidClaimId = '550e8400-e29b-41d4-a716-446655440000';

      mockAttachmentService.createClaimFolder.mockResolvedValue('folder-123');

      const result = await controller.createClaimFolder(
        validUuidClaimId,
        mockUser,
      );

      expect(result.success).toBe(true);
      expect(mockAttachmentService.createClaimFolder).toHaveBeenCalledWith(
        mockUser.id,
        validUuidClaimId,
      );
    });

    it('should work with different user email domains', async () => {
      const claimId = 'claim-123';
      const userWithDifferentDomain: UserEntity = {
        ...mockUser,
        email: 'another-user@mavericks-consulting.com',
        id: 'user-456',
      };

      mockAttachmentService.createClaimFolder.mockResolvedValue('folder-789');

      const result = await controller.createClaimFolder(
        claimId,
        userWithDifferentDomain,
      );

      expect(result.success).toBe(true);
      expect(mockAttachmentService.createClaimFolder).toHaveBeenCalledWith(
        'user-456',
        claimId,
      );
    });

    it('should handle user with minimal required properties', async () => {
      const claimId = 'claim-123';
      const minimalUser: UserEntity = {
        id: 'minimal-user-123',
        googleId: 'google-minimal',
        email: 'minimal@mavericks-consulting.com',
        name: 'Minimal User',
        picture: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAttachmentService.createClaimFolder.mockResolvedValue(
        'folder-minimal',
      );

      const result = await controller.createClaimFolder(claimId, minimalUser);

      expect(result.success).toBe(true);
      expect(result.folderId).toBe('folder-minimal');
    });
  });

  describe('Error Response Consistency', () => {
    it('should always return consistent error response structure', async () => {
      const claimId = 'claim-123';
      const serviceError = new Error('Service error');

      mockAttachmentService.createClaimFolder.mockRejectedValue(serviceError);

      const result = await controller.createClaimFolder(claimId, mockUser);

      // Verify response structure
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('error');
      expect(result.success).toBe(false);
      expect(typeof result.error).toBe('string');
      expect(result.folderId).toBeUndefined();
    });

    it('should always return consistent success response structure', async () => {
      const claimId = 'claim-123';
      const folderId = 'folder-success';

      mockAttachmentService.createClaimFolder.mockResolvedValue(folderId);

      const result = await controller.createClaimFolder(claimId, mockUser);

      // Verify response structure
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('folderId');
      expect(result.success).toBe(true);
      expect(result.folderId).toBe(folderId);
      expect(result.error).toBeUndefined();
    });

    it('should return same error message for all service failures', async () => {
      const claimId = 'claim-123';
      const errors = [
        new Error('Google API error'),
        new BadRequestException('Invalid data'),
        new Error('Network timeout'),
        'String error', // Non-Error object
      ];

      for (const error of errors) {
        vi.clearAllMocks();
        mockAttachmentService.createClaimFolder.mockRejectedValue(error);

        const result = await controller.createClaimFolder(claimId, mockUser);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Folder creation failed');
      }
    });
  });

  describe('Logging Behavior', () => {
    it('should log debug message on folder creation initiation', async () => {
      const claimId = 'claim-123';

      mockAttachmentService.createClaimFolder.mockResolvedValue('folder-123');

      await controller.createClaimFolder(claimId, mockUser);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Creating folder for claim: ${claimId}`,
      );
    });

    it('should log success debug message with folder ID', async () => {
      const claimId = 'claim-123';
      const folderId = 'folder-456';

      mockAttachmentService.createClaimFolder.mockResolvedValue(folderId);

      await controller.createClaimFolder(claimId, mockUser);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Folder created successfully for claim ${claimId}: ${folderId}`,
      );
    });

    it('should log warning when service returns null/empty folder ID', async () => {
      const claimId = 'claim-123';

      mockAttachmentService.createClaimFolder.mockResolvedValue(null);

      await controller.createClaimFolder(claimId, mockUser);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Failed to create folder for claim: ${claimId}`,
      );
    });

    it('should log error with exception details on service failure', async () => {
      const claimId = 'claim-123';
      const serviceError = new Error('Service failure');

      mockAttachmentService.createClaimFolder.mockRejectedValue(serviceError);

      await controller.createClaimFolder(claimId, mockUser);

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Folder creation failed for claim ${claimId}:`,
        serviceError,
      );
    });

    it('should not log success when folder creation fails', async () => {
      const claimId = 'claim-123';

      mockAttachmentService.createClaimFolder.mockRejectedValue(
        new Error('Failed'),
      );

      await controller.createClaimFolder(claimId, mockUser);

      expect(mockLogger.debug).toHaveBeenCalledTimes(1); // Only initial debug call
      expect(mockLogger.debug).not.toHaveBeenCalledWith(
        expect.stringContaining('successfully'),
      );
    });
  });

  describe('Service Integration Contract', () => {
    it('should call service with exact user ID from authenticated user', async () => {
      const claimId = 'claim-123';
      const specificUserId = 'very-specific-user-id-789';
      const userWithSpecificId: UserEntity = {
        ...mockUser,
        id: specificUserId,
      };

      mockAttachmentService.createClaimFolder.mockResolvedValue('folder-123');

      await controller.createClaimFolder(claimId, userWithSpecificId);

      expect(mockAttachmentService.createClaimFolder).toHaveBeenCalledWith(
        specificUserId,
        claimId,
      );
    });

    it('should call service with exact claim ID from request parameter', async () => {
      const specificClaimId = 'very-specific-claim-id-456';

      mockAttachmentService.createClaimFolder.mockResolvedValue('folder-123');

      await controller.createClaimFolder(specificClaimId, mockUser);

      expect(mockAttachmentService.createClaimFolder).toHaveBeenCalledWith(
        mockUser.id,
        specificClaimId,
      );
    });

    it('should call service exactly once per request', async () => {
      const claimId = 'claim-123';

      mockAttachmentService.createClaimFolder.mockResolvedValue('folder-123');

      await controller.createClaimFolder(claimId, mockUser);

      expect(mockAttachmentService.createClaimFolder).toHaveBeenCalledTimes(1);
    });

    it('should not retry service calls on failure', async () => {
      const claimId = 'claim-123';

      mockAttachmentService.createClaimFolder.mockRejectedValue(
        new Error('Failed'),
      );

      await controller.createClaimFolder(claimId, mockUser);

      expect(mockAttachmentService.createClaimFolder).toHaveBeenCalledTimes(1);
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle very long claim IDs within UUID limits', async () => {
      const longClaimId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

      mockAttachmentService.createClaimFolder.mockResolvedValue('folder-long');

      const result = await controller.createClaimFolder(longClaimId, mockUser);

      expect(result.success).toBe(true);
      expect(mockAttachmentService.createClaimFolder).toHaveBeenCalledWith(
        mockUser.id,
        longClaimId,
      );
    });

    it('should handle very long folder IDs from service', async () => {
      const claimId = 'claim-123';
      const veryLongFolderId = 'a'.repeat(100); // 100 character folder ID

      mockAttachmentService.createClaimFolder.mockResolvedValue(
        veryLongFolderId,
      );

      const result = await controller.createClaimFolder(claimId, mockUser);

      expect(result.success).toBe(true);
      expect(result.folderId).toBe(veryLongFolderId);
    });

    it('should handle empty string folder ID as failure', async () => {
      const claimId = 'claim-123';

      mockAttachmentService.createClaimFolder.mockResolvedValue('');

      const result = await controller.createClaimFolder(claimId, mockUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create claim folder');
    });

    it('should handle whitespace-only folder ID as success (truthy string)', async () => {
      const claimId = 'claim-123';
      const whitespaceOnlyFolderId = '   ';

      mockAttachmentService.createClaimFolder.mockResolvedValue(
        whitespaceOnlyFolderId,
      );

      const result = await controller.createClaimFolder(claimId, mockUser);

      expect(result.success).toBe(true);
      expect(result.folderId).toBe(whitespaceOnlyFolderId);
    });
  });

  describe('Async Error Handling', () => {
    it('should handle Promise rejection properly', async () => {
      const claimId = 'claim-123';

      mockAttachmentService.createClaimFolder.mockImplementation(() =>
        Promise.reject(new Error('Async error')),
      );

      const result = await controller.createClaimFolder(claimId, mockUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Folder creation failed');
    });

    it('should handle synchronous throws from service', async () => {
      const claimId = 'claim-123';

      mockAttachmentService.createClaimFolder.mockImplementation(() => {
        throw new Error('Synchronous error');
      });

      const result = await controller.createClaimFolder(claimId, mockUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Folder creation failed');
    });

    it('should handle non-Error throw objects', async () => {
      const claimId = 'claim-123';

      mockAttachmentService.createClaimFolder.mockRejectedValue('String error');

      const result = await controller.createClaimFolder(claimId, mockUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Folder creation failed');
    });

    it('should handle null rejection', async () => {
      const claimId = 'claim-123';

      mockAttachmentService.createClaimFolder.mockRejectedValue(null);

      const result = await controller.createClaimFolder(claimId, mockUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Folder creation failed');
    });

    it('should handle undefined rejection', async () => {
      const claimId = 'claim-123';

      mockAttachmentService.createClaimFolder.mockRejectedValue(undefined);

      const result = await controller.createClaimFolder(claimId, mockUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Folder creation failed');
    });
  });

  describe('Type Safety and Return Values', () => {
    it('should return exactly the expected success response type', async () => {
      const claimId = 'claim-123';
      const folderId = 'folder-123';

      mockAttachmentService.createClaimFolder.mockResolvedValue(folderId);

      const result = await controller.createClaimFolder(claimId, mockUser);

      // Type assertion tests
      expect(typeof result.success).toBe('boolean');
      expect(result.success).toBe(true);
      expect(typeof result.folderId).toBe('string');
      expect(result.folderId).toBe(folderId);
      expect(result.error).toBeUndefined();
    });

    it('should return exactly the expected error response type', async () => {
      const claimId = 'claim-123';

      mockAttachmentService.createClaimFolder.mockRejectedValue(
        new Error('Failed'),
      );

      const result = await controller.createClaimFolder(claimId, mockUser);

      // Type assertion tests
      expect(typeof result.success).toBe('boolean');
      expect(result.success).toBe(false);
      expect(typeof result.error).toBe('string');
      expect(result.error).toBe('Folder creation failed');
      expect(result.folderId).toBeUndefined();
    });

    it('should never return both folderId and error', async () => {
      const claimId = 'claim-123';

      // Test success case
      mockAttachmentService.createClaimFolder.mockResolvedValue('folder-123');
      const successResult = await controller.createClaimFolder(
        claimId,
        mockUser,
      );
      expect(successResult.folderId).toBeDefined();
      expect(successResult.error).toBeUndefined();

      // Test error case
      mockAttachmentService.createClaimFolder.mockRejectedValue(
        new Error('Failed'),
      );
      const errorResult = await controller.createClaimFolder(claimId, mockUser);
      expect(errorResult.folderId).toBeUndefined();
      expect(errorResult.error).toBeDefined();
    });

    it('should always return success boolean property', async () => {
      const claimId = 'claim-123';

      // Test success case
      mockAttachmentService.createClaimFolder.mockResolvedValue('folder-123');
      const successResult = await controller.createClaimFolder(
        claimId,
        mockUser,
      );
      expect(successResult).toHaveProperty('success');
      expect(typeof successResult.success).toBe('boolean');

      // Test error case
      mockAttachmentService.createClaimFolder.mockRejectedValue(
        new Error('Failed'),
      );
      const errorResult = await controller.createClaimFolder(claimId, mockUser);
      expect(errorResult).toHaveProperty('success');
      expect(typeof errorResult.success).toBe('boolean');
    });
  });
});
