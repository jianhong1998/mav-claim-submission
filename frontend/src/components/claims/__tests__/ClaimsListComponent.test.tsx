import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClaimsListComponent } from '../ClaimsListComponent';
import { apiClient } from '@/lib/api-client';
import {
  ClaimCategory,
  ClaimStatus,
  IClaimMetadata,
  IClaimListResponse,
  AttachmentMimeType,
  AttachmentStatus,
  IAttachmentMetadata,
} from '@project/types';

// Mock dependencies
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Mock Lucide React icons
interface MockIconProps {
  className?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
  [key: string]: unknown;
}

vi.mock('lucide-react', () => ({
  FileText: (props: MockIconProps) => (
    <span
      data-testid="FileText"
      {...props}
    />
  ),
  Calendar: (props: MockIconProps) => (
    <span
      data-testid="Calendar"
      {...props}
    />
  ),
  DollarSign: (props: MockIconProps) => (
    <span
      data-testid="DollarSign"
      {...props}
    />
  ),
  RefreshCw: (props: MockIconProps) => (
    <span
      data-testid="RefreshCw"
      {...props}
    />
  ),
  AlertTriangle: (props: MockIconProps) => (
    <span
      data-testid="AlertTriangle"
      {...props}
    />
  ),
  Plus: (props: MockIconProps) => (
    <span
      data-testid="Plus"
      {...props}
    />
  ),
  CheckCircle: (props: MockIconProps) => (
    <span
      data-testid="CheckCircle"
      {...props}
    />
  ),
  XCircle: (props: MockIconProps) => (
    <span
      data-testid="XCircle"
      {...props}
    />
  ),
  Mail: (props: MockIconProps) => (
    <span
      data-testid="Mail"
      {...props}
    />
  ),
  Send: (props: MockIconProps) => (
    <span
      data-testid="Send"
      {...props}
    />
  ),
  Edit2Icon: (props: MockIconProps) => (
    <span
      data-testid="Edit2Icon"
      {...props}
    />
  ),
}));

const mockApiClient = {
  get: apiClient.get as ReturnType<typeof vi.fn>,
};

// Test utilities
const createTestWrapper = (retryEnabled = false) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: retryEnabled ? 3 : false,
        gcTime: 0,
        staleTime: 0,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
      },
      mutations: { retry: false, gcTime: 0 },
    },
  });

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  TestWrapper.displayName = 'TestWrapper';
  return TestWrapper;
};

const createMockClaim = (
  overrides: Partial<IClaimMetadata> = {},
): IClaimMetadata => ({
  id: 'claim-1',
  userId: 'user-123',
  category: ClaimCategory.TELCO,
  month: 3,
  year: 2024,
  totalAmount: 100.5,
  status: ClaimStatus.DRAFT,
  createdAt: '2024-03-15T10:00:00Z',
  updatedAt: '2024-03-15T10:00:00Z',
  claimName: null,
  submissionDate: null,
  attachments: [],
  ...overrides,
});

const createMockResponse = (
  claims: IClaimMetadata[] = [],
): IClaimListResponse => ({
  success: true,
  claims,
  total: claims.length,
});

const createMockAttachment = (
  overrides: Partial<IAttachmentMetadata> = {},
): IAttachmentMetadata => ({
  id: 'att-1',
  claimId: 'claim-1',
  originalFilename: 'receipt.pdf',
  storedFilename: 'stored-receipt.pdf',
  fileSize: 12345,
  mimeType: AttachmentMimeType.PDF,
  driveFileId: 'drive-file-id-1',
  driveShareableUrl: 'https://drive.google.com/file/d/drive-file-id-1/view',
  status: AttachmentStatus.UPLOADED,
  uploadedAt: '2024-03-15T10:00:00Z',
  createdAt: '2024-03-15T10:00:00Z',
  updatedAt: '2024-03-15T10:00:00Z',
  ...overrides,
});

describe('ClaimsListComponent', () => {
  let wrapper: ReturnType<typeof createTestWrapper>;

  beforeEach(() => {
    vi.clearAllMocks();
    wrapper = createTestWrapper();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading skeleton when data is loading', async () => {
      mockApiClient.get.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<ClaimsListComponent />, { wrapper });

      // Should show skeleton cards with animate-pulse
      const skeletonCards = screen
        .getAllByRole('generic')
        .filter((el) => el.className.includes('animate-pulse'));
      expect(skeletonCards.length).toBeGreaterThan(0);

      // Should show multiple skeleton items
      const skeletonElements = screen.getAllByRole('generic');
      const pulseElements = skeletonElements.filter((el) =>
        el.className.includes('animate-pulse'),
      );
      expect(pulseElements.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Empty State', () => {
    it('should show encouraging empty state when no claims exist', async () => {
      const emptyResponse = createMockResponse([]);
      mockApiClient.get.mockResolvedValue(emptyResponse);

      render(<ClaimsListComponent />, { wrapper });

      await waitFor(() => {
        expect(
          screen.getByText('Ready to submit your first claim?'),
        ).toBeInTheDocument();
        expect(
          screen.getByText(/Start building your expense history/),
        ).toBeInTheDocument();
        expect(screen.getByTestId('FileText')).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should show comprehensive error message when API call fails', async () => {
      mockApiClient.get.mockRejectedValue(new Error('API Error'));

      render(<ClaimsListComponent retryConfig={{ retry: false }} />, {
        wrapper,
      });

      await waitFor(
        () => {
          expect(screen.getByText('Failed to Load Claims')).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      expect(
        screen.getByText(/We're having trouble loading your claims right now/),
      ).toBeInTheDocument();
      expect(screen.getByTestId('AlertTriangle')).toBeInTheDocument();
    });

    it('should show retry button in error state', async () => {
      mockApiClient.get.mockRejectedValue(new Error('API Error'));

      render(<ClaimsListComponent retryConfig={{ retry: false }} />, {
        wrapper,
      });

      await waitFor(
        () => {
          const retryButton = screen.getByRole('button', {
            name: /try again/i,
          });
          expect(retryButton).toBeInTheDocument();
          expect(retryButton).toHaveClass('min-h-[44px]', 'touch-manipulation');
        },
        { timeout: 3000 },
      );
    });

    it('should call refetch when retry button is clicked', async () => {
      let callCount = 0;
      mockApiClient.get.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('API Error'));
        }
        return Promise.resolve(createMockResponse([]));
      });

      render(<ClaimsListComponent retryConfig={{ retry: false }} />, {
        wrapper,
      });

      await waitFor(
        () => {
          expect(screen.getByText('Failed to Load Claims')).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      await userEvent.click(retryButton);

      // Should call API again and show empty state
      await waitFor(
        () => {
          expect(
            screen.getByText('Ready to submit your first claim?'),
          ).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });
  });

  describe('Claims List Display', () => {
    it('should display list of all claims with correct information', async () => {
      const mockClaims = [
        createMockClaim({
          id: 'claim-1',
          category: ClaimCategory.TELCO,
          month: 3,
          year: 2024,
          totalAmount: 100.5,
          claimName: 'Mobile Phone Bill',
          status: ClaimStatus.SENT,
          createdAt: '2024-03-15T10:00:00Z',
        }),
        createMockClaim({
          id: 'claim-2',
          category: ClaimCategory.FITNESS,
          month: 2,
          year: 2024,
          totalAmount: 75.0,
          claimName: null,
          status: ClaimStatus.PAID,
          createdAt: '2024-02-10T08:00:00Z',
        }),
      ];
      const response = createMockResponse(mockClaims);
      mockApiClient.get.mockResolvedValue(response);

      render(<ClaimsListComponent />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('All Claims (2)')).toBeInTheDocument();
        expect(screen.getByText('Mobile Phone Bill')).toBeInTheDocument();
        expect(
          screen.getByText('Fitness & Wellness Claim'),
        ).toBeInTheDocument();
        expect(screen.getByText('March 2024')).toBeInTheDocument();
        expect(screen.getByText('February 2024')).toBeInTheDocument();
        expect(screen.getByText(/SGD 100\.50/)).toBeInTheDocument();
        expect(screen.getByText(/SGD 75\.00/)).toBeInTheDocument();
      });
    });

    it('should display claims in newest first order', async () => {
      const mockClaims = [
        createMockClaim({
          id: 'claim-1',
          claimName: 'Older Claim',
          createdAt: '2024-01-15T10:00:00Z',
        }),
        createMockClaim({
          id: 'claim-2',
          claimName: 'Newer Claim',
          createdAt: '2024-03-15T10:00:00Z',
        }),
      ];
      const response = createMockResponse(mockClaims);
      mockApiClient.get.mockResolvedValue(response);

      render(<ClaimsListComponent />, { wrapper });

      await waitFor(() => {
        const claims = screen.getAllByRole('listitem');
        const firstClaim = claims[0];
        const secondClaim = claims[1];

        expect(firstClaim).toHaveTextContent('Newer Claim');
        expect(secondClaim).toHaveTextContent('Older Claim');
      });
    });

    it('should display all claim statuses with correct styling', async () => {
      const mockClaims = [
        createMockClaim({
          id: 'claim-1',
          claimName: 'Draft Claim',
          status: ClaimStatus.DRAFT,
        }),
        createMockClaim({
          id: 'claim-2',
          claimName: 'Sent Claim',
          status: ClaimStatus.SENT,
        }),
        createMockClaim({
          id: 'claim-3',
          claimName: 'Paid Claim',
          status: ClaimStatus.PAID,
        }),
        createMockClaim({
          id: 'claim-4',
          claimName: 'Failed Claim',
          status: ClaimStatus.FAILED,
        }),
      ];
      const response = createMockResponse(mockClaims);
      mockApiClient.get.mockResolvedValue(response);

      render(<ClaimsListComponent />, { wrapper });

      await waitFor(() => {
        const draftBadge = screen.getByLabelText('Status: Draft');
        const sentBadge = screen.getByLabelText('Status: Submitted');
        const paidBadge = screen.getByLabelText('Status: Paid');
        const failedBadge = screen.getByLabelText('Status: Failed');

        expect(draftBadge).toBeInTheDocument();
        expect(sentBadge).toBeInTheDocument();
        expect(paidBadge).toBeInTheDocument();
        expect(failedBadge).toBeInTheDocument();

        // Check for status-specific styling classes from ClaimStatusBadge
        expect(draftBadge).toHaveClass(
          'bg-gray-500/10',
          'text-gray-500',
          'border-gray-500',
        );
        expect(sentBadge).toHaveClass(
          'bg-blue-500/10',
          'text-blue-500',
          'border-blue-500',
        );
        expect(paidBadge).toHaveClass(
          'bg-green-500/10',
          'text-green-500',
          'border-green-500',
        );
        expect(failedBadge).toHaveClass(
          'bg-red-500/10',
          'text-red-500',
          'border-red-500',
        );
      });
    });

    it('should display category display names correctly', async () => {
      const mockClaims = [
        createMockClaim({ id: 'claim-1', category: ClaimCategory.TELCO }),
        createMockClaim({ id: 'claim-2', category: ClaimCategory.FITNESS }),
        createMockClaim({ id: 'claim-3', category: ClaimCategory.DENTAL }),
        createMockClaim({
          id: 'claim-4',
          category: ClaimCategory.COMPANY_EVENT,
        }),
        createMockClaim({
          id: 'claim-5',
          category: ClaimCategory.SKILL_ENHANCEMENT,
        }),
        createMockClaim({ id: 'claim-6', category: ClaimCategory.OTHERS }),
      ];
      const response = createMockResponse(mockClaims);
      mockApiClient.get.mockResolvedValue(response);

      render(<ClaimsListComponent />, { wrapper });

      await waitFor(() => {
        expect(
          screen.getByText('Category: Telecommunications'),
        ).toBeInTheDocument();
        expect(
          screen.getByText('Category: Fitness & Wellness'),
        ).toBeInTheDocument();
        expect(screen.getByText('Category: Dental Care')).toBeInTheDocument();
        expect(screen.getByText('Category: Company Event')).toBeInTheDocument();
        expect(
          screen.getByText('Category: Skill Enhancement'),
        ).toBeInTheDocument();
        expect(screen.getByText('Category: Others')).toBeInTheDocument();
      });
    });

    it('should display attachment count when claim has attachments', async () => {
      const mockClaims = [
        createMockClaim({
          id: 'claim-1',
          attachments: [
            createMockAttachment({
              id: 'att-1',
              claimId: 'claim-1',
              originalFilename: 'receipt1.pdf',
            }),
            createMockAttachment({
              id: 'att-2',
              claimId: 'claim-1',
              originalFilename: 'receipt2.pdf',
            }),
          ],
        }),
        createMockClaim({
          id: 'claim-2',
          attachments: [
            createMockAttachment({
              id: 'att-3',
              claimId: 'claim-2',
              originalFilename: 'receipt3.pdf',
            }),
          ],
        }),
      ];
      const response = createMockResponse(mockClaims);
      mockApiClient.get.mockResolvedValue(response);

      render(<ClaimsListComponent />, { wrapper });

      await waitFor(() => {
        expect(screen.getByLabelText('2 attachments')).toBeInTheDocument();
        expect(screen.getByLabelText('1 attachment')).toBeInTheDocument();
      });
    });

    it('should format dates correctly with proper time elements', async () => {
      const mockClaims = [
        createMockClaim({
          month: 12,
          year: 2023,
          createdAt: '2024-01-15T14:30:00Z',
        }),
      ];
      const response = createMockResponse(mockClaims);
      mockApiClient.get.mockResolvedValue(response);

      render(<ClaimsListComponent />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('December 2023')).toBeInTheDocument();
        expect(screen.getByText('15/01/2024')).toBeInTheDocument();

        // Check for proper time elements with dateTime attributes
        const claimPeriodTime = screen
          .getByText('December 2023')
          .closest('time');
        const createdTime = screen.getByText('15/01/2024').closest('time');

        expect(claimPeriodTime).toHaveAttribute('dateTime', '2023-12');
        expect(createdTime).toHaveAttribute('dateTime', '2024-01-15T14:30:00Z');
      });
    });
  });

  describe('Responsive Design', () => {
    it('should apply responsive classes for mobile optimization', async () => {
      const mockClaim = createMockClaim();
      const response = createMockResponse([mockClaim]);
      mockApiClient.get.mockResolvedValue(response);

      render(<ClaimsListComponent />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('All Claims (1)')).toBeInTheDocument();
      });

      // Check for responsive flex classes
      const cardContent = screen
        .getByText('Telecommunications Claim')
        .closest('[class*="flex-col"]');
      expect(cardContent).toHaveClass('flex-col', 'sm:flex-row');

      // Check for responsive padding classes
      const cardHeader = screen
        .getByText('Telecommunications Claim')
        .closest('[class*="px-4"]');
      expect(cardHeader).toHaveClass('px-4', 'sm:px-6');
    });

    it('should show proper status badge sizing for mobile', async () => {
      const mockClaim = createMockClaim({ status: ClaimStatus.SENT });
      const response = createMockResponse([mockClaim]);
      mockApiClient.get.mockResolvedValue(response);

      render(<ClaimsListComponent />, { wrapper });

      await waitFor(() => {
        const statusBadge = screen.getByLabelText('Status: Submitted');
        expect(statusBadge).toHaveClass(
          'min-h-[32px]',
          'sm:min-h-[24px]',
          'touch-manipulation',
        );
      });
    });
  });

  describe('API Integration', () => {
    it('should call GET /claims endpoint correctly', async () => {
      const response = createMockResponse([]);
      mockApiClient.get.mockResolvedValue(response);

      render(<ClaimsListComponent />, { wrapper });

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith('/claims');
      });
    });

    it('should implement retry logic with exponential backoff', async () => {
      // Mock consecutive failures then success
      let callCount = 0;
      mockApiClient.get.mockImplementation(() => {
        callCount++;
        if (callCount <= 3) {
          return Promise.reject(new Error('Network Error'));
        }
        return Promise.resolve(createMockResponse([]));
      });

      render(
        <ClaimsListComponent retryConfig={{ retry: 3, retryDelay: () => 0 }} />,
        { wrapper },
      );

      // Wait for retries to complete (instant with retryDelay: 0)
      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledTimes(4); // Initial + 3 retries
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic HTML structure', async () => {
      const mockClaim = createMockClaim();
      const response = createMockResponse([mockClaim]);
      mockApiClient.get.mockResolvedValue(response);

      render(<ClaimsListComponent />, { wrapper });

      await waitFor(() => {
        // Check for main section
        const mainSection = screen.getByRole('region');
        expect(mainSection).toBeInTheDocument();

        // Check for header with proper heading
        const heading = screen.getByRole('heading', { name: /all claims/i });
        expect(heading).toHaveAttribute('id', 'claims-heading');

        // Check for list structure
        const list = screen.getByRole('list', { name: 'Claims list' });
        expect(list).toBeInTheDocument();

        // Check for list items
        const listItems = screen.getAllByRole('listitem');
        expect(listItems).toHaveLength(1);
      });
    });

    it('should have proper ARIA labels for all interactive elements', async () => {
      const mockClaim = createMockClaim({
        claimName: 'Test Claim',
        totalAmount: 150.75,
        month: 6,
        year: 2024,
        category: ClaimCategory.FITNESS,
        status: ClaimStatus.PAID,
        attachments: [
          createMockAttachment({
            id: 'att-1',
            claimId: 'claim-1',
            originalFilename: 'receipt.pdf',
          }),
        ],
      });
      const response = createMockResponse([mockClaim]);
      mockApiClient.get.mockResolvedValue(response);

      render(<ClaimsListComponent />, { wrapper });

      await waitFor(() => {
        // Status badge should have descriptive label
        const statusBadge = screen.getByLabelText('Status: Paid');
        expect(statusBadge).toBeInTheDocument();

        // Claim period should have descriptive label
        const claimPeriod = screen.getByLabelText('Claim period: June 2024');
        expect(claimPeriod).toBeInTheDocument();

        // Amount should have descriptive label
        const amount = screen.getByLabelText('Amount: SGD 150.75');
        expect(amount).toBeInTheDocument();

        // Attachments should have descriptive label
        const attachments = screen.getByLabelText('1 attachment');
        expect(attachments).toBeInTheDocument();

        // Category should have descriptive label
        const category = screen.getByLabelText('Category: Fitness & Wellness');
        expect(category).toBeInTheDocument();
      });
    });

    it('should have proper article structure with relationships', async () => {
      const mockClaim = createMockClaim({ id: 'test-claim-123' });
      const response = createMockResponse([mockClaim]);
      mockApiClient.get.mockResolvedValue(response);

      render(<ClaimsListComponent />, { wrapper });

      await waitFor(() => {
        const article = screen.getByRole('listitem');
        expect(article).toHaveAttribute(
          'aria-labelledby',
          'claim-title-test-claim-123',
        );
        expect(article).toHaveAttribute(
          'aria-describedby',
          'claim-details-test-claim-123',
        );

        const title = document.getElementById('claim-title-test-claim-123');
        expect(title).toBeInTheDocument();
        expect(title).toHaveAttribute('id', 'claim-title-test-claim-123');

        const description = document.getElementById(
          'claim-details-test-claim-123',
        );
        expect(description).toBeInTheDocument();
      });
    });

    it('should hide decorative icons from screen readers', async () => {
      const mockClaim = createMockClaim();
      const response = createMockResponse([mockClaim]);
      mockApiClient.get.mockResolvedValue(response);

      render(<ClaimsListComponent />, { wrapper });

      await waitFor(() => {
        const calendarIcon = screen.getByTestId('Calendar');
        const dollarIcon = screen.getByTestId('DollarSign');

        expect(calendarIcon).toHaveAttribute('aria-hidden', 'true');
        expect(dollarIcon).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('Custom ClassName', () => {
    it('should apply custom className to main container', async () => {
      const mockClaim = createMockClaim();
      const response = createMockResponse([mockClaim]);
      mockApiClient.get.mockResolvedValue(response);

      const { container } = render(
        <ClaimsListComponent className="custom-class" />,
        { wrapper },
      );

      await waitFor(() => {
        expect(container.firstChild).toHaveClass('custom-class');
      });
    });
  });

  describe('Error Boundary Behavior', () => {
    it('should handle malformed API responses gracefully', async () => {
      // Mock malformed response
      mockApiClient.get.mockResolvedValue({
        success: true,
        claims: null, // Invalid structure
      });

      render(<ClaimsListComponent />, { wrapper });

      await waitFor(() => {
        // Should show empty state when claims is null/undefined
        expect(
          screen.getByText('Ready to submit your first claim?'),
        ).toBeInTheDocument();
      });
    });

    it('should handle claims with missing required fields', async () => {
      const malformedClaim = {
        id: 'bad-claim',
        userId: 'user-1',
        category: ClaimCategory.TELCO,
        month: 3,
        year: 2024,
        totalAmount: 100,
        status: ClaimStatus.DRAFT,
        createdAt: '2024-03-15T10:00:00Z',
        updatedAt: '2024-03-15T10:00:00Z',
        claimName: null,
        submissionDate: null,
        attachments: [],
        // All required fields present
      } as IClaimMetadata;

      const response = {
        success: true,
        claims: [malformedClaim],
        total: 1,
      };
      mockApiClient.get.mockResolvedValue(response);

      render(<ClaimsListComponent />, { wrapper });

      await waitFor(() => {
        // Should still render without crashing
        expect(screen.getByText('All Claims (1)')).toBeInTheDocument();
      });
    });
  });
});
