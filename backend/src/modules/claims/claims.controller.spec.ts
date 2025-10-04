import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import {
  UnprocessableEntityException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ClaimsController } from './claims.controller';
import { ClaimStatus, ClaimCategory } from '@project/types';
import { UserEntity } from '../user/entities/user.entity';
import { ClaimEntity } from './entities/claim.entity';

/**
 * Interface for accessing private methods in ClaimsController during testing
 */
interface ClaimsControllerWithPrivateMethods {
  validateStatusTransition(
    currentStatus: ClaimStatus,
    newStatus: ClaimStatus,
  ): void;
  validateMonthlyLimit(
    userId: string,
    category: ClaimCategory,
    month: number,
    year: number,
    newAmount: number,
    excludeClaimId?: string,
  ): Promise<void>;
  validateYearlyLimit(
    userId: string,
    category: ClaimCategory,
    year: number,
    newAmount: number,
    excludeClaimId?: string,
  ): Promise<void>;
  mapClaimEntityToMetadata(claim: ClaimEntity): unknown;
}

/**
 * ClaimsController Status Transition Tests
 *
 * Tests the validateStatusTransition method to ensure proper status
 * transition validation, including the new paid → sent transition.
 *
 * Test Categories:
 * - Valid status transitions
 * - Invalid status transitions
 * - Edge cases and boundary conditions
 */
describe('ClaimsController - Status Transition Validation', () => {
  let controller: ClaimsController;
  let mockClaimDBUtil: {
    createClaim: Mock;
    getClaimsByUserId: Mock;
    findClaimByIdAndUserId: Mock;
    updateClaimStatus: Mock;
    deleteClaim: Mock;
    getOne: Mock;
  };
  let mockEmailService: {
    sendClaimEmail: Mock;
  };

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Create service mocks
    mockClaimDBUtil = {
      createClaim: vi.fn(),
      getClaimsByUserId: vi.fn(),
      findClaimByIdAndUserId: vi.fn(),
      updateClaimStatus: vi.fn(),
      deleteClaim: vi.fn(),
      getOne: vi.fn(),
    };

    mockEmailService = {
      sendClaimEmail: vi.fn(),
    };

    // Create controller instance with mocked dependencies
    controller = new ClaimsController(mockClaimDBUtil, mockEmailService);
  });

  describe('validateStatusTransition - Valid Transitions', () => {
    it('should allow draft → sent transition', () => {
      expect(() => {
        // Access private method through type assertion
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateStatusTransition(ClaimStatus.DRAFT, ClaimStatus.SENT);
      }).not.toThrow();
    });

    it('should allow sent → paid transition', () => {
      expect(() => {
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateStatusTransition(ClaimStatus.SENT, ClaimStatus.PAID);
      }).not.toThrow();
    });

    it('should allow sent → draft transition', () => {
      expect(() => {
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateStatusTransition(ClaimStatus.SENT, ClaimStatus.DRAFT);
      }).not.toThrow();
    });

    it('should allow sent → failed transition', () => {
      expect(() => {
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateStatusTransition(ClaimStatus.SENT, ClaimStatus.FAILED);
      }).not.toThrow();
    });

    it('should allow failed → draft transition', () => {
      expect(() => {
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateStatusTransition(ClaimStatus.FAILED, ClaimStatus.DRAFT);
      }).not.toThrow();
    });

    it('should allow failed → sent transition', () => {
      expect(() => {
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateStatusTransition(ClaimStatus.FAILED, ClaimStatus.SENT);
      }).not.toThrow();
    });

    it('should allow paid → sent transition (new requirement)', () => {
      expect(() => {
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateStatusTransition(ClaimStatus.PAID, ClaimStatus.SENT);
      }).not.toThrow();
    });
  });

  describe('validateStatusTransition - Invalid Transitions', () => {
    it('should reject draft → paid transition', () => {
      expect(() => {
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateStatusTransition(ClaimStatus.DRAFT, ClaimStatus.PAID);
      }).toThrow(UnprocessableEntityException);
    });

    it('should reject draft → failed transition', () => {
      expect(() => {
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateStatusTransition(ClaimStatus.DRAFT, ClaimStatus.FAILED);
      }).toThrow(UnprocessableEntityException);
    });

    it('should reject paid → draft transition', () => {
      expect(() => {
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateStatusTransition(ClaimStatus.PAID, ClaimStatus.DRAFT);
      }).toThrow(UnprocessableEntityException);
    });

    it('should reject paid → failed transition', () => {
      expect(() => {
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateStatusTransition(ClaimStatus.PAID, ClaimStatus.FAILED);
      }).toThrow(UnprocessableEntityException);
    });

    it('should reject paid → paid transition (same status)', () => {
      expect(() => {
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateStatusTransition(ClaimStatus.PAID, ClaimStatus.PAID);
      }).toThrow(UnprocessableEntityException);
    });

    it('should reject failed → paid transition', () => {
      expect(() => {
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateStatusTransition(ClaimStatus.FAILED, ClaimStatus.PAID);
      }).toThrow(UnprocessableEntityException);
    });
  });

  describe('validateStatusTransition - Error Messages', () => {
    it('should throw exception with correct error message for invalid transition', () => {
      expect(() => {
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateStatusTransition(ClaimStatus.DRAFT, ClaimStatus.PAID);
      }).toThrow('Invalid status transition from draft to paid');
    });

    it('should throw exception with correct error message for paid → draft', () => {
      expect(() => {
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateStatusTransition(ClaimStatus.PAID, ClaimStatus.DRAFT);
      }).toThrow('Invalid status transition from paid to draft');
    });

    it('should throw exception with correct error message for failed → paid', () => {
      expect(() => {
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateStatusTransition(ClaimStatus.FAILED, ClaimStatus.PAID);
      }).toThrow('Invalid status transition from failed to paid');
    });
  });

  describe('validateStatusTransition - Edge Cases', () => {
    it('should handle all valid ClaimStatus enum values', () => {
      // Test that all enum values are properly handled
      const allStatuses = Object.values(ClaimStatus);
      expect(allStatuses).toEqual([
        ClaimStatus.DRAFT,
        ClaimStatus.SENT,
        ClaimStatus.FAILED,
        ClaimStatus.PAID,
      ]);
    });

    it('should maintain transition rule consistency', () => {
      // Verify that the transition rules are logically consistent
      // Every status should have at least one valid transition
      const validTransitions = {
        [ClaimStatus.DRAFT]: [ClaimStatus.SENT],
        [ClaimStatus.SENT]: [
          ClaimStatus.PAID,
          ClaimStatus.DRAFT,
          ClaimStatus.FAILED,
        ],
        [ClaimStatus.FAILED]: [ClaimStatus.DRAFT, ClaimStatus.SENT],
        [ClaimStatus.PAID]: [ClaimStatus.SENT],
      };

      // Test that each status has valid outgoing transitions
      Object.keys(validTransitions).forEach((fromStatus) => {
        const transitions = validTransitions[fromStatus as ClaimStatus];
        expect(transitions.length).toBeGreaterThan(0);

        transitions.forEach((toStatus) => {
          expect(() => {
            (
              controller as unknown as ClaimsControllerWithPrivateMethods
            ).validateStatusTransition(
              fromStatus as ClaimStatus,
              toStatus as ClaimStatus,
            );
          }).not.toThrow();
        });
      });
    });
  });
});

/**
 * ClaimsController Resend Email Tests
 *
 * Tests the resendClaimEmail method covering all scenarios:
 * - Successful email resend for sent/failed claims
 * - Ownership validation and authorization
 * - Status validation (only sent/failed allowed)
 * - Email service error handling
 */
describe('ClaimsController - Resend Email Endpoint', () => {
  let controller: ClaimsController;
  let mockClaimDBUtil: {
    getOne: Mock;
  };
  let mockEmailService: {
    sendClaimEmail: Mock;
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

  const mockClaimEntity: ClaimEntity = {
    id: 'claim-123',
    userId: 'user-123',
    category: ClaimCategory.TELCO,
    claimName: 'Test Claim',
    month: 9,
    year: 2025,
    totalAmount: 100.0,
    status: ClaimStatus.SENT,
    submissionDate: new Date(),
    user: mockUser,
    attachments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Create service mocks
    mockClaimDBUtil = {
      getOne: vi.fn(),
    };

    mockEmailService = {
      sendClaimEmail: vi.fn(),
    };

    // Create controller instance with mocked dependencies
    controller = new ClaimsController(mockClaimDBUtil, mockEmailService);
  });

  describe('resendClaimEmail - Successful Scenarios', () => {
    it('should successfully resend email for sent claim', async () => {
      // Setup mocks
      const claimId = 'claim-123';
      mockClaimDBUtil.getOne
        .mockResolvedValueOnce(mockClaimEntity) // First call for ownership check
        .mockResolvedValueOnce({ ...mockClaimEntity, attachments: [] }); // Second call with relations

      mockEmailService.sendClaimEmail.mockResolvedValue({
        success: true,
        messageId: 'email-123',
      });

      // Mock the private mapClaimEntityToMetadata method
      const mockMetadata = {
        id: claimId,
        category: ClaimCategory.TELCO,
        claimName: 'Test Claim',
        month: 9,
        year: 2025,
        totalAmount: 100.0,
        status: ClaimStatus.SENT,
        attachmentCount: 0,
        submissionDate: mockClaimEntity.submissionDate?.toISOString() || null,
      };

      vi.spyOn(
        controller as unknown as ClaimsControllerWithPrivateMethods,
        'mapClaimEntityToMetadata',
      ).mockReturnValue(mockMetadata);

      // Execute
      const result = await controller.resendClaimEmail(mockUser, claimId);

      // Assertions
      expect(mockClaimDBUtil.getOne).toHaveBeenCalledTimes(2);
      expect(mockClaimDBUtil.getOne).toHaveBeenNthCalledWith(1, {
        criteria: { id: claimId, userId: mockUser.id },
      });
      expect(mockClaimDBUtil.getOne).toHaveBeenNthCalledWith(2, {
        criteria: { id: claimId },
        relation: { attachments: true },
      });

      expect(mockEmailService.sendClaimEmail).toHaveBeenCalledWith(
        mockUser.id,
        { claimId },
      );

      expect(result).toEqual({
        success: true,
        claim: mockMetadata,
      });
    });

    it('should successfully resend email for failed claim', async () => {
      const failedClaim = { ...mockClaimEntity, status: ClaimStatus.FAILED };
      const claimId = 'claim-456';

      mockClaimDBUtil.getOne
        .mockResolvedValueOnce(failedClaim)
        .mockResolvedValueOnce({ ...failedClaim, attachments: [] });

      mockEmailService.sendClaimEmail.mockResolvedValue({
        success: true,
        messageId: 'email-456',
      });

      const mockMetadata = {
        id: claimId,
        category: ClaimCategory.TELCO,
        claimName: 'Test Claim',
        month: 9,
        year: 2025,
        totalAmount: 100.0,
        status: ClaimStatus.FAILED,
        attachmentCount: 0,
        submissionDate: failedClaim.submissionDate?.toISOString() || null,
      };

      vi.spyOn(
        controller as unknown as ClaimsControllerWithPrivateMethods,
        'mapClaimEntityToMetadata',
      ).mockReturnValue(mockMetadata);

      const result = await controller.resendClaimEmail(mockUser, claimId);

      expect(result.success).toBe(true);
      expect(result.claim?.status).toBe(ClaimStatus.FAILED);
    });
  });

  describe('resendClaimEmail - Ownership Validation', () => {
    it('should throw NotFoundException when claim does not exist', async () => {
      const claimId = 'nonexistent-claim';
      mockClaimDBUtil.getOne.mockResolvedValue(null);

      await expect(
        controller.resendClaimEmail(mockUser, claimId),
      ).rejects.toThrow(NotFoundException);

      expect(mockClaimDBUtil.getOne).toHaveBeenCalledWith({
        criteria: { id: claimId, userId: mockUser.id },
      });
    });

    it('should throw NotFoundException when claim belongs to different user', async () => {
      const claimId = 'claim-123';
      mockClaimDBUtil.getOne.mockResolvedValue(null); // Simulates no match for user

      await expect(
        controller.resendClaimEmail(mockUser, claimId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('resendClaimEmail - Status Validation', () => {
    it('should throw BadRequestException for draft claim', async () => {
      const draftClaim = { ...mockClaimEntity, status: ClaimStatus.DRAFT };
      const claimId = 'claim-draft';

      mockClaimDBUtil.getOne.mockResolvedValue(draftClaim);

      await expect(
        controller.resendClaimEmail(mockUser, claimId),
      ).rejects.toThrow(BadRequestException);

      const error = await controller
        .resendClaimEmail(mockUser, claimId)
        .catch((err: unknown) => err as BadRequestException);

      expect(error.message).toContain('Cannot resend email');
      expect(error.message).toContain('Claim status is draft');
      expect(error.message).toContain('expected sent or failed');
    });

    it('should throw BadRequestException for paid claim', async () => {
      const paidClaim = { ...mockClaimEntity, status: ClaimStatus.PAID };
      const claimId = 'claim-paid';

      mockClaimDBUtil.getOne.mockResolvedValue(paidClaim);

      await expect(
        controller.resendClaimEmail(mockUser, claimId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow resend for sent claim', async () => {
      const sentClaim = { ...mockClaimEntity, status: ClaimStatus.SENT };
      mockClaimDBUtil.getOne
        .mockResolvedValueOnce(sentClaim)
        .mockResolvedValueOnce({ ...sentClaim, attachments: [] });

      mockEmailService.sendClaimEmail.mockResolvedValue({
        success: true,
        messageId: 'email-sent',
      });

      vi.spyOn(
        controller as unknown as ClaimsControllerWithPrivateMethods,
        'mapClaimEntityToMetadata',
      ).mockReturnValue({
        status: ClaimStatus.SENT,
      });

      // Should not throw
      await expect(
        controller.resendClaimEmail(mockUser, 'claim-sent'),
      ).resolves.toBeDefined();
    });

    it('should allow resend for failed claim', async () => {
      const failedClaim = { ...mockClaimEntity, status: ClaimStatus.FAILED };
      mockClaimDBUtil.getOne
        .mockResolvedValueOnce(failedClaim)
        .mockResolvedValueOnce({ ...failedClaim, attachments: [] });

      mockEmailService.sendClaimEmail.mockResolvedValue({
        success: true,
        messageId: 'email-failed',
      });

      vi.spyOn(
        controller as unknown as ClaimsControllerWithPrivateMethods,
        'mapClaimEntityToMetadata',
      ).mockReturnValue({
        status: ClaimStatus.FAILED,
      });

      // Should not throw
      await expect(
        controller.resendClaimEmail(mockUser, 'claim-failed'),
      ).resolves.toBeDefined();
    });
  });

  describe('resendClaimEmail - Email Service Error Handling', () => {
    it('should throw InternalServerErrorException when email service fails', async () => {
      const claimId = 'claim-123';
      mockClaimDBUtil.getOne.mockResolvedValue(mockClaimEntity);

      mockEmailService.sendClaimEmail.mockResolvedValue({
        success: false,
        error: 'Email service unavailable',
      });

      await expect(
        controller.resendClaimEmail(mockUser, claimId),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException with default message when email service fails without error', async () => {
      const claimId = 'claim-123';
      mockClaimDBUtil.getOne.mockResolvedValue(mockClaimEntity);

      mockEmailService.sendClaimEmail.mockResolvedValue({
        success: false,
      });

      await expect(
        controller.resendClaimEmail(mockUser, claimId),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when email service throws', async () => {
      const claimId = 'claim-123';
      mockClaimDBUtil.getOne.mockResolvedValue(mockClaimEntity);

      mockEmailService.sendClaimEmail.mockRejectedValue(
        new Error('Network error'),
      );

      await expect(
        controller.resendClaimEmail(mockUser, claimId),
      ).rejects.toThrow();
    });
  });

  describe('resendClaimEmail - Data Retrieval Error Handling', () => {
    it('should throw InternalServerErrorException when updated claim cannot be retrieved', async () => {
      const claimId = 'claim-123';
      mockClaimDBUtil.getOne
        .mockResolvedValueOnce(mockClaimEntity) // First call succeeds
        .mockResolvedValueOnce(null); // Second call fails

      mockEmailService.sendClaimEmail.mockResolvedValue({
        success: true,
        messageId: 'email-123',
      });

      await expect(
        controller.resendClaimEmail(mockUser, claimId),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});

/**
 * ClaimsController Monthly Limit Validation Tests
 *
 * Tests the validateMonthlyLimit method to ensure proper monthly limit
 * enforcement for Telco and Fitness categories.
 *
 * Test Categories:
 * - Limit exceeded scenarios (Telco $150, Fitness $50)
 * - Under limit acceptance
 * - Unlimited categories
 * - Update with excludeClaimId
 * - Edge cases (empty claims, exact boundary, non-limit field changes)
 */
describe('ClaimsController - Monthly Limit Validation', () => {
  let controller: ClaimsController;
  let mockClaimDBUtil: {
    getAll: Mock;
    getOne: Mock;
  };
  let mockEmailService: {
    sendClaimEmail: Mock;
  };
  let mockLogger: {
    log: Mock;
    warn: Mock;
    error: Mock;
  };

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Create service mocks
    mockClaimDBUtil = {
      getAll: vi.fn(),
      getOne: vi.fn(),
    };

    mockEmailService = {
      sendClaimEmail: vi.fn(),
    };

    // Create controller instance with mocked dependencies
    controller = new ClaimsController(mockClaimDBUtil, mockEmailService);

    // Mock logger to prevent console noise
    mockLogger = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (controller as any).logger = mockLogger;
  });

  describe('validateMonthlyLimit - Limit Exceeded', () => {
    it('should reject Telco claim exceeding $150 limit', async () => {
      const userId = 'user-123';
      const existingClaims: Partial<ClaimEntity>[] = [
        { id: 'claim-1', totalAmount: 80 },
        { id: 'claim-2', totalAmount: 40 },
      ];

      mockClaimDBUtil.getAll.mockResolvedValue(existingClaims);

      await expect(
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateMonthlyLimit(
          userId,
          ClaimCategory.TELCO,
          10,
          2024,
          50, // $80 + $40 + $50 = $170 > $150
        ),
      ).rejects.toThrow(
        new UnprocessableEntityException(
          'Telecommunications monthly limit of $150.00 exceeded. Current: $120.00, Proposed: $50.00, Total: $170.00',
        ),
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Monthly limit validation failed'),
      );
    });

    it('should reject Fitness claim exceeding $50 limit', async () => {
      const userId = 'user-456';
      const existingClaims: Partial<ClaimEntity>[] = [
        { id: 'claim-1', totalAmount: 40 },
      ];

      mockClaimDBUtil.getAll.mockResolvedValue(existingClaims);

      await expect(
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateMonthlyLimit(
          userId,
          ClaimCategory.FITNESS,
          11,
          2024,
          15, // $40 + $15 = $55 > $50
        ),
      ).rejects.toThrow(
        new UnprocessableEntityException(
          'Fitness & Wellness monthly limit of $50.00 exceeded. Current: $40.00, Proposed: $15.00, Total: $55.00',
        ),
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Monthly limit validation failed'),
      );
    });
  });

  describe('validateMonthlyLimit - Under Limit', () => {
    it('should accept Telco claim under $150 limit', async () => {
      const userId = 'user-789';
      const existingClaims: Partial<ClaimEntity>[] = [
        { id: 'claim-1', totalAmount: 100 },
      ];

      mockClaimDBUtil.getAll.mockResolvedValue(existingClaims);

      await expect(
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateMonthlyLimit(
          userId,
          ClaimCategory.TELCO,
          9,
          2024,
          40, // $100 + $40 = $140 < $150
        ),
      ).resolves.toBeUndefined();

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('validateMonthlyLimit - Unlimited Categories', () => {
    it('should accept category with no monthly limit (Dental)', async () => {
      const userId = 'user-unlimited';
      const existingClaims: Partial<ClaimEntity>[] = [
        { id: 'claim-1', totalAmount: 300 },
        { id: 'claim-2', totalAmount: 200 },
      ];

      mockClaimDBUtil.getAll.mockResolvedValue(existingClaims);

      await expect(
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateMonthlyLimit(
          userId,
          ClaimCategory.DENTAL,
          8,
          2024,
          500, // Dental has no monthly limit (has yearly limit instead)
        ),
      ).resolves.toBeUndefined();

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('validateMonthlyLimit - Update with Exclude', () => {
    it('should exclude current claim when updating', async () => {
      const userId = 'user-update';
      const existingClaims: Partial<ClaimEntity>[] = [
        { id: 'claim-1', totalAmount: 80 },
        { id: 'claim-2', totalAmount: 60 }, // This is the one being updated
      ];

      mockClaimDBUtil.getAll.mockResolvedValue(existingClaims);

      await expect(
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateMonthlyLimit(
          userId,
          ClaimCategory.TELCO,
          7,
          2024,
          80, // $80 (claim-1) + $80 (new amount) = $160 > $150
          'claim-2', // Exclude claim-2's $60
        ),
      ).rejects.toThrow(
        new UnprocessableEntityException(
          'Telecommunications monthly limit of $150.00 exceeded. Current: $80.00, Proposed: $80.00, Total: $160.00',
        ),
      );
    });

    it('should validate even when only non-limit fields change', async () => {
      const userId = 'user-no-change';
      const existingClaims: Partial<ClaimEntity>[] = [
        { id: 'claim-1', totalAmount: 50 },
        { id: 'claim-2', totalAmount: 40 },
      ];

      mockClaimDBUtil.getAll.mockResolvedValue(existingClaims);

      // Updating claim-2 with same amount (only claimName changed)
      await expect(
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateMonthlyLimit(
          userId,
          ClaimCategory.TELCO,
          6,
          2024,
          40, // Same amount as before
          'claim-2', // Exclude claim-2's $40
        ),
      ).resolves.toBeUndefined();

      // Validation was called and succeeded ($50 + $40 = $90 < $150)
      expect(mockClaimDBUtil.getAll).toHaveBeenCalled();
    });
  });

  describe('validateMonthlyLimit - Edge Cases', () => {
    it('should accept claim when no existing claims', async () => {
      const userId = 'user-new';
      mockClaimDBUtil.getAll.mockResolvedValue([]);

      await expect(
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateMonthlyLimit(
          userId,
          ClaimCategory.TELCO,
          5,
          2024,
          50, // $0 + $50 = $50 < $150
        ),
      ).resolves.toBeUndefined();

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should accept claim at exact limit boundary', async () => {
      const userId = 'user-boundary';
      const existingClaims: Partial<ClaimEntity>[] = [
        { id: 'claim-1', totalAmount: 100 },
      ];

      mockClaimDBUtil.getAll.mockResolvedValue(existingClaims);

      await expect(
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateMonthlyLimit(
          userId,
          ClaimCategory.TELCO,
          4,
          2024,
          50, // $100 + $50 = $150 (exactly at limit, not exceeding)
        ),
      ).resolves.toBeUndefined();

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });
});

/**
 * ClaimsController Yearly Limit Validation Tests
 *
 * Tests the validateYearlyLimit method to ensure proper yearly limit
 * enforcement for Dental category ($300/year).
 *
 * Test Categories:
 * - Limit exceeded scenarios (Dental $300)
 * - Under limit acceptance
 * - Unlimited categories (no yearly limit)
 * - Update scenarios with claim exclusion
 * - Edge cases (no existing claims, exact limit)
 */
describe('ClaimsController - Yearly Limit Validation', () => {
  let controller: ClaimsController;
  let mockClaimDBUtil: {
    getAll: Mock;
  };
  let mockEmailService: {
    sendClaimEmail: Mock;
  };
  let mockLogger: {
    log: Mock;
    warn: Mock;
    error: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockClaimDBUtil = {
      getAll: vi.fn(),
    };

    mockEmailService = {
      sendClaimEmail: vi.fn(),
    };

    controller = new ClaimsController(
      mockClaimDBUtil as never,
      mockEmailService as never,
    );

    mockLogger = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (controller as any).logger = mockLogger;
  });

  describe('validateYearlyLimit - Limit Exceeded', () => {
    it('should reject Dental claim exceeding $300 yearly limit', async () => {
      const userId = 'user-123';
      const existingClaims: Partial<ClaimEntity>[] = [
        { id: 'claim-1', totalAmount: 200, month: 1 },
        { id: 'claim-2', totalAmount: 50, month: 3 },
      ];

      mockClaimDBUtil.getAll.mockResolvedValue(existingClaims);

      await expect(
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateYearlyLimit(
          userId,
          ClaimCategory.DENTAL,
          2024,
          100, // $200 + $50 + $100 = $350 > $300
        ),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Yearly limit validation failed'),
      );
    });

    it('should reject Dental claim when existing yearly total plus new amount exceeds limit', async () => {
      const userId = 'user-456';
      const existingClaims: Partial<ClaimEntity>[] = [
        { id: 'claim-1', totalAmount: 150, month: 2 },
        { id: 'claim-2', totalAmount: 100, month: 6 },
      ];

      mockClaimDBUtil.getAll.mockResolvedValue(existingClaims);

      await expect(
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateYearlyLimit(
          userId,
          ClaimCategory.DENTAL,
          2024,
          51, // $150 + $100 + $51 = $301 > $300
        ),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Yearly limit validation failed'),
      );
    });
  });

  describe('validateYearlyLimit - Under Limit', () => {
    it('should accept Dental claim under $300 yearly limit', async () => {
      const userId = 'user-789';
      const existingClaims: Partial<ClaimEntity>[] = [
        { id: 'claim-1', totalAmount: 100, month: 1 },
        { id: 'claim-2', totalAmount: 50, month: 5 },
      ];

      mockClaimDBUtil.getAll.mockResolvedValue(existingClaims);

      await expect(
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateYearlyLimit(
          userId,
          ClaimCategory.DENTAL,
          2024,
          100, // $100 + $50 + $100 = $250 < $300
        ),
      ).resolves.toBeUndefined();

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should accept Dental claim across different months within yearly limit', async () => {
      const userId = 'user-multi-month';
      const existingClaims: Partial<ClaimEntity>[] = [
        { id: 'claim-1', totalAmount: 75, month: 1 },
        { id: 'claim-2', totalAmount: 50, month: 3 },
        { id: 'claim-3', totalAmount: 75, month: 6 },
      ];

      mockClaimDBUtil.getAll.mockResolvedValue(existingClaims);

      await expect(
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateYearlyLimit(
          userId,
          ClaimCategory.DENTAL,
          2024,
          50, // $75 + $50 + $75 + $50 = $250 < $300
        ),
      ).resolves.toBeUndefined();

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('validateYearlyLimit - Unlimited Categories', () => {
    it('should accept category with no yearly limit (Telco)', async () => {
      const userId = 'user-unlimited';
      const existingClaims: Partial<ClaimEntity>[] = [
        { id: 'claim-1', totalAmount: 500, month: 1 },
        { id: 'claim-2', totalAmount: 300, month: 6 },
      ];

      mockClaimDBUtil.getAll.mockResolvedValue(existingClaims);

      await expect(
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateYearlyLimit(
          userId,
          ClaimCategory.TELCO,
          2024,
          1000, // Telco has no yearly limit (has monthly limit instead)
        ),
      ).resolves.toBeUndefined();

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should accept category with no yearly limit (Fitness)', async () => {
      const userId = 'user-fitness';
      const existingClaims: Partial<ClaimEntity>[] = [
        { id: 'claim-1', totalAmount: 200, month: 2 },
      ];

      mockClaimDBUtil.getAll.mockResolvedValue(existingClaims);

      await expect(
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateYearlyLimit(
          userId,
          ClaimCategory.FITNESS,
          2024,
          500, // Fitness has no yearly limit (has monthly limit instead)
        ),
      ).resolves.toBeUndefined();

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('validateYearlyLimit - Update with Exclude', () => {
    it('should exclude current claim when updating', async () => {
      const userId = 'user-update';
      const existingClaims: Partial<ClaimEntity>[] = [
        { id: 'claim-1', totalAmount: 150, month: 2 },
        { id: 'claim-2', totalAmount: 100, month: 5 },
      ];

      mockClaimDBUtil.getAll.mockResolvedValue(existingClaims);

      await expect(
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateYearlyLimit(
          userId,
          ClaimCategory.DENTAL,
          2024,
          100, // $150 (claim-1) + $100 (new amount) = $250 < $300
          'claim-2', // Exclude claim-2 ($100) from calculation
        ),
      ).resolves.toBeUndefined();

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should reject update if yearly limit exceeded even with exclusion', async () => {
      const userId = 'user-update-fail';
      const existingClaims: Partial<ClaimEntity>[] = [
        { id: 'claim-1', totalAmount: 200, month: 1 },
        { id: 'claim-2', totalAmount: 50, month: 4 },
      ];

      mockClaimDBUtil.getAll.mockResolvedValue(existingClaims);

      await expect(
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateYearlyLimit(
          userId,
          ClaimCategory.DENTAL,
          2024,
          150, // $200 (claim-1) + $150 (new amount) = $350 > $300
          'claim-2', // Exclude claim-2 from calculation
        ),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Yearly limit validation failed'),
      );
    });

    it('should accept update when amount unchanged', async () => {
      const userId = 'user-same-amount';
      const existingClaims: Partial<ClaimEntity>[] = [
        { id: 'claim-1', totalAmount: 150, month: 3 },
        { id: 'claim-2', totalAmount: 100, month: 7 },
      ];

      mockClaimDBUtil.getAll.mockResolvedValue(existingClaims);

      await expect(
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateYearlyLimit(
          userId,
          ClaimCategory.DENTAL,
          2024,
          100, // Same amount as claim-2
          'claim-2',
        ),
      ).resolves.toBeUndefined();

      expect(mockClaimDBUtil.getAll).toHaveBeenCalled();
    });
  });

  describe('validateYearlyLimit - Edge Cases', () => {
    it('should accept claim when no existing claims', async () => {
      const userId = 'user-new';
      mockClaimDBUtil.getAll.mockResolvedValue([]);

      await expect(
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateYearlyLimit(
          userId,
          ClaimCategory.DENTAL,
          2024,
          150, // $0 + $150 = $150 < $300
        ),
      ).resolves.toBeUndefined();

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should accept claim at exact yearly limit', async () => {
      const userId = 'user-exact';
      const existingClaims: Partial<ClaimEntity>[] = [
        { id: 'claim-1', totalAmount: 200, month: 2 },
      ];

      mockClaimDBUtil.getAll.mockResolvedValue(existingClaims);

      await expect(
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateYearlyLimit(
          userId,
          ClaimCategory.DENTAL,
          2024,
          100, // $200 + $100 = $300 (exactly at limit, not exceeding)
        ),
      ).resolves.toBeUndefined();

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should reject claim at one cent over yearly limit', async () => {
      const userId = 'user-over-by-one';
      const existingClaims: Partial<ClaimEntity>[] = [
        { id: 'claim-1', totalAmount: 200, month: 4 },
      ];

      mockClaimDBUtil.getAll.mockResolvedValue(existingClaims);

      await expect(
        (
          controller as unknown as ClaimsControllerWithPrivateMethods
        ).validateYearlyLimit(
          userId,
          ClaimCategory.DENTAL,
          2024,
          100.01, // $200 + $100.01 = $300.01 > $300
        ),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Yearly limit validation failed'),
      );
    });
  });
});
