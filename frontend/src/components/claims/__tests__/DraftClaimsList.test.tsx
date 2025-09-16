import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DraftClaimsList } from '../DraftClaimsList';
import { apiClient } from '@/lib/api-client';
import {
  ClaimCategory,
  ClaimStatus,
  IClaimMetadata,
  IClaimListResponse,
} from '@project/types';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Edit: () => <span data-testid="Edit" />,
  Trash2: () => <span data-testid="Trash2" />,
  FileText: () => <span data-testid="FileText" />,
  Calendar: () => <span data-testid="Calendar" />,
  DollarSign: () => <span data-testid="DollarSign" />,
}));

const mockApiClient = {
  get: apiClient.get as ReturnType<typeof vi.fn>,
  delete: apiClient.delete as ReturnType<typeof vi.fn>,
};

const mockToast = {
  success: toast.success as ReturnType<typeof vi.fn>,
  error: toast.error as ReturnType<typeof vi.fn>,
};

// Test utilities
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
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
  employeeEmail: 'test@mavericks-consulting.com',
  category: ClaimCategory.TELCO,
  month: 3,
  year: 2024,
  totalAmount: 100.5,
  status: ClaimStatus.DRAFT,
  createdAt: '2024-03-15T10:00:00Z',
  updatedAt: '2024-03-15T10:00:00Z',
  claimName: null,
  attachments: [],
  ...overrides,
});

const createMockResponse = (
  claims: IClaimMetadata[] = [],
): IClaimListResponse => ({
  claims,
  total: claims.length,
  status: 'success',
});

// Mock window.confirm
const mockConfirm = vi.fn();
Object.defineProperty(window, 'confirm', {
  value: mockConfirm,
  writable: true,
});

describe('DraftClaimsList', () => {
  let wrapper: ReturnType<typeof createTestWrapper>;

  beforeEach(() => {
    vi.clearAllMocks();
    wrapper = createTestWrapper();
    mockConfirm.mockReturnValue(false); // Default to cancel
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading skeleton when data is loading', async () => {
      mockApiClient.get.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<DraftClaimsList />, { wrapper });

      // Should show skeleton cards
      const skeletonCards = screen
        .getAllByRole('generic')
        .filter((el) => el.className.includes('animate-pulse'));
      expect(skeletonCards.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no draft claims exist', async () => {
      const emptyResponse = createMockResponse([]);
      mockApiClient.get.mockResolvedValue(emptyResponse);

      render(<DraftClaimsList />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('No draft claims')).toBeInTheDocument();
        expect(
          screen.getByText(
            'Create your first claim to get started with your expense submission.',
          ),
        ).toBeInTheDocument();
        expect(screen.getByTestId('FileText')).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should show error message when API call fails', async () => {
      mockApiClient.get.mockRejectedValue(new Error('API Error'));

      render(<DraftClaimsList />, { wrapper });

      await waitFor(() => {
        expect(
          screen.getByText('Failed to load draft claims. Please try again.'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Claims List Display', () => {
    it('should display list of draft claims with correct information', async () => {
      const mockClaims = [
        createMockClaim({
          id: 'claim-1',
          category: ClaimCategory.TELCO,
          month: 3,
          year: 2024,
          totalAmount: 100.5,
          claimName: 'Mobile Phone Bill',
        }),
        createMockClaim({
          id: 'claim-2',
          category: ClaimCategory.FITNESS,
          month: 2,
          year: 2024,
          totalAmount: 75.0,
          claimName: null,
        }),
      ];
      const response = createMockResponse(mockClaims);
      mockApiClient.get.mockResolvedValue(response);

      render(<DraftClaimsList />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('Draft Claims (2)')).toBeInTheDocument();
        expect(screen.getByText('Mobile Phone Bill')).toBeInTheDocument();
        expect(
          screen.getByText('Fitness & Wellness Claim'),
        ).toBeInTheDocument();
        expect(screen.getByText('March 2024')).toBeInTheDocument();
        expect(screen.getByText('February 2024')).toBeInTheDocument();
        expect(screen.getByText(/\$100\.50/)).toBeInTheDocument();
        expect(screen.getByText(/\$75\.00/)).toBeInTheDocument();
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
        createMockClaim({ id: 'claim-5', category: ClaimCategory.OTHERS }),
      ];
      const response = createMockResponse(mockClaims);
      mockApiClient.get.mockResolvedValue(response);

      render(<DraftClaimsList />, { wrapper });

      await waitFor(() => {
        expect(
          screen.getByText('Category: Telecommunications'),
        ).toBeInTheDocument();
        expect(
          screen.getByText('Category: Fitness & Wellness'),
        ).toBeInTheDocument();
        expect(screen.getByText('Category: Dental Care')).toBeInTheDocument();
        expect(screen.getByText('Category: Company Event')).toBeInTheDocument();
        expect(screen.getByText('Category: Others')).toBeInTheDocument();
      });
    });

    it('should display attachment count when claim has attachments', async () => {
      const mockClaims = [
        createMockClaim({
          id: 'claim-1',
          attachments: [
            { id: 'att-1', fileName: 'receipt1.pdf' },
            { id: 'att-2', fileName: 'receipt2.pdf' },
          ] as IClaimMetadata['attachments'],
        }),
        createMockClaim({
          id: 'claim-2',
          attachments: [
            { id: 'att-3', fileName: 'receipt3.pdf' },
          ] as IClaimMetadata['attachments'],
        }),
      ];
      const response = createMockResponse(mockClaims);
      mockApiClient.get.mockResolvedValue(response);

      render(<DraftClaimsList />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('2 files')).toBeInTheDocument();
        expect(screen.getByText('1 file')).toBeInTheDocument();
      });
    });

    it('should format dates correctly', async () => {
      const mockClaims = [
        createMockClaim({
          month: 12,
          year: 2023,
          createdAt: '2024-01-15T14:30:00Z',
        }),
      ];
      const response = createMockResponse(mockClaims);
      mockApiClient.get.mockResolvedValue(response);

      render(<DraftClaimsList />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('December 2023')).toBeInTheDocument();
        expect(screen.getByText('Created 15/01/2024')).toBeInTheDocument();
      });
    });
  });

  describe('Edit Functionality', () => {
    it('should call onEditClaim when edit button is clicked', async () => {
      const mockClaim = createMockClaim();
      const response = createMockResponse([mockClaim]);
      mockApiClient.get.mockResolvedValue(response);

      const onEditClaim = vi.fn();
      render(<DraftClaimsList onEditClaim={onEditClaim} />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('Draft Claims (1)')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit/i });
      await userEvent.click(editButton);

      expect(onEditClaim).toHaveBeenCalledWith(mockClaim);
    });

    it('should disable edit button when claim is being deleted', async () => {
      const mockClaim = createMockClaim();
      const response = createMockResponse([mockClaim]);
      mockApiClient.get.mockResolvedValue(response);
      mockConfirm.mockReturnValue(true);

      // Mock delete to hang so we can test disabled state
      mockApiClient.delete.mockImplementation(() => new Promise(() => {}));

      render(<DraftClaimsList />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('Draft Claims (1)')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await userEvent.click(deleteButton);

      const editButton = screen.getByRole('button', { name: /edit/i });
      expect(editButton).toBeDisabled();
    });
  });

  describe('Delete Functionality', () => {
    it('should show confirmation dialog when delete button is clicked', async () => {
      const mockClaim = createMockClaim({
        claimName: 'Test Claim',
        category: ClaimCategory.TELCO,
        month: 3,
        year: 2024,
      });
      const response = createMockResponse([mockClaim]);
      mockApiClient.get.mockResolvedValue(response);

      render(<DraftClaimsList />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('Draft Claims (1)')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await userEvent.click(deleteButton);

      expect(mockConfirm).toHaveBeenCalledWith(
        expect.stringContaining(
          'Are you sure you want to delete the claim "Test Claim"?',
        ),
      );
    });

    it('should show attachment warning in confirmation dialog when claim has attachments', async () => {
      const mockClaim = createMockClaim({
        attachments: [
          { id: 'att-1', fileName: 'receipt.pdf' },
        ] as IClaimMetadata['attachments'],
      });
      const response = createMockResponse([mockClaim]);
      mockApiClient.get.mockResolvedValue(response);

      render(<DraftClaimsList />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('Draft Claims (1)')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await userEvent.click(deleteButton);

      expect(mockConfirm).toHaveBeenCalledWith(
        expect.stringContaining(
          'Warning: This claim has attachments. Files will remain in your Google Drive',
        ),
      );
    });

    it('should delete claim when confirmation is accepted', async () => {
      const mockClaim = createMockClaim();
      const response = createMockResponse([mockClaim]);
      mockApiClient.get.mockResolvedValue(response);
      mockApiClient.delete.mockResolvedValue({ success: true });
      mockConfirm.mockReturnValue(true);

      render(<DraftClaimsList />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('Draft Claims (1)')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await userEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockApiClient.delete).toHaveBeenCalledWith('/claims/claim-1');
        expect(mockToast.success).toHaveBeenCalledWith(
          'Claim deleted successfully',
        );
      });
    });

    it('should not delete claim when confirmation is cancelled', async () => {
      const mockClaim = createMockClaim();
      const response = createMockResponse([mockClaim]);
      mockApiClient.get.mockResolvedValue(response);
      mockConfirm.mockReturnValue(false);

      render(<DraftClaimsList />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('Draft Claims (1)')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await userEvent.click(deleteButton);

      expect(mockApiClient.delete).not.toHaveBeenCalled();
    });

    it('should show error toast when delete fails', async () => {
      const mockClaim = createMockClaim();
      const response = createMockResponse([mockClaim]);
      mockApiClient.get.mockResolvedValue(response);
      mockApiClient.delete.mockRejectedValue(new Error('Delete failed'));
      mockConfirm.mockReturnValue(true);

      render(<DraftClaimsList />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('Draft Claims (1)')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await userEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to delete claim');
      });
    });

    it('should show deleting state while delete is in progress', async () => {
      const mockClaim = createMockClaim();
      const response = createMockResponse([mockClaim]);
      mockApiClient.get.mockResolvedValue(response);
      mockConfirm.mockReturnValue(true);

      // Mock delete to hang so we can test loading state
      mockApiClient.delete.mockImplementation(() => new Promise(() => {}));

      render(<DraftClaimsList />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('Draft Claims (1)')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await userEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Deleting...')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should apply responsive classes for mobile optimization', async () => {
      const mockClaim = createMockClaim();
      const response = createMockResponse([mockClaim]);
      mockApiClient.get.mockResolvedValue(response);

      render(<DraftClaimsList />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('Draft Claims (1)')).toBeInTheDocument();
      });

      // Check for responsive flex classes
      const cardContent = screen
        .getByText('Telecommunications Claim')
        .closest('[class*="flex-col"]');
      expect(cardContent).toHaveClass('flex-col', 'sm:flex-row');

      // Check for touch-friendly button classes
      const editButton = screen.getByRole('button', { name: /edit/i });
      expect(editButton).toHaveClass('touch-manipulation');
    });
  });

  describe('Custom ClassName', () => {
    it('should apply custom className to container', async () => {
      const mockClaim = createMockClaim();
      const response = createMockResponse([mockClaim]);
      mockApiClient.get.mockResolvedValue(response);

      const { container } = render(
        <DraftClaimsList className="custom-class" />,
        { wrapper },
      );

      await waitFor(() => {
        expect(container.firstChild).toHaveClass('custom-class');
      });
    });
  });

  describe('API Integration', () => {
    it('should call GET /claims with correct status parameter', async () => {
      const response = createMockResponse([]);
      mockApiClient.get.mockResolvedValue(response);

      render(<DraftClaimsList />, { wrapper });

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith('/claims?status=draft');
      });
    });

    it('should invalidate queries after successful deletion', async () => {
      const mockClaim = createMockClaim();
      const response = createMockResponse([mockClaim]);
      mockApiClient.get.mockResolvedValue(response);
      mockApiClient.delete.mockResolvedValue({ success: true });
      mockConfirm.mockReturnValue(true);

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
          mutations: { retry: false, gcTime: 0 },
        },
      });

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const TestWrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      render(<DraftClaimsList />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('Draft Claims (1)')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await userEvent.click(deleteButton);

      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({
          queryKey: ['claims', 'draft'],
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      const mockClaim = createMockClaim();
      const response = createMockResponse([mockClaim]);
      mockApiClient.get.mockResolvedValue(response);

      render(<DraftClaimsList />, { wrapper });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /edit/i }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /delete/i }),
        ).toBeInTheDocument();
      });
    });

    it('should have screen reader friendly button labels', async () => {
      const mockClaim = createMockClaim();
      const response = createMockResponse([mockClaim]);
      mockApiClient.get.mockResolvedValue(response);

      render(<DraftClaimsList />, { wrapper });

      await waitFor(() => {
        // Buttons should have accessible names
        const editButton = screen.getByRole('button', { name: /edit/i });
        const deleteButton = screen.getByRole('button', { name: /delete/i });

        expect(editButton).toBeInTheDocument();
        expect(deleteButton).toBeInTheDocument();
      });
    });
  });
});
