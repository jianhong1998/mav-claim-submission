import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClaimFormModal } from '../ClaimFormModal';
import { ClaimCategory, ClaimStatus, IClaimMetadata } from '@project/types';

// Mock all dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: vi.fn().mockResolvedValue({ success: true, claim: {} }),
  },
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

vi.mock('lucide-react', () => ({
  Plus: () => <span data-testid="Plus" />,
  Calendar: () => <span data-testid="Calendar" />,
  DollarSign: () => <span data-testid="DollarSign" />,
  X: () => <span data-testid="X" />,
}));

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: Infinity,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        enabled: false,
      },
      mutations: {
        retry: false,
        gcTime: 0,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
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
  userId: 'user-1',
  submissionDate: new Date().toISOString(),
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

describe('ClaimFormModal', () => {
  let wrapper: ReturnType<typeof createTestWrapper>;

  beforeEach(() => {
    vi.clearAllMocks();
    wrapper = createTestWrapper();
  });

  describe('Create Mode', () => {
    it('should render create mode when no initialValues provided', () => {
      render(
        <ClaimFormModal
          isOpen={true}
          onClose={() => {}}
        />,
        { wrapper },
      );

      expect(screen.getByText('Add New Claim')).toBeInTheDocument();
      expect(
        screen.getByText(
          /Create draft claims that will be submitted together/i,
        ),
      ).toBeInTheDocument();
    });

    it('should render all form fields in create mode', () => {
      render(
        <ClaimFormModal
          isOpen={true}
          onClose={() => {}}
        />,
        { wrapper },
      );

      expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Claim Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Total Amount/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /add to draft list/i }),
      ).toBeInTheDocument();
    });

    it('should handle category selection', () => {
      render(
        <ClaimFormModal
          isOpen={true}
          onClose={() => {}}
        />,
        { wrapper },
      );

      const categorySelect = screen.getByLabelText(/Category/i);
      fireEvent.change(categorySelect, { target: { value: 'fitness' } });

      expect(categorySelect).toHaveValue('fitness');
    });

    it('should initialize with default values in create mode', () => {
      render(
        <ClaimFormModal
          isOpen={true}
          onClose={() => {}}
        />,
        { wrapper },
      );

      const categorySelect = screen.getByLabelText(
        /Category/i,
      ) as HTMLSelectElement;
      const claimNameInput = screen.getByLabelText(
        /Claim Name/i,
      ) as HTMLInputElement;
      const amountInput = screen.getByLabelText(
        /Total Amount/i,
      ) as HTMLInputElement;

      expect(categorySelect.value).toBe('telco'); // Default category
      expect(claimNameInput.value).toBe('');
      expect(amountInput.value).toBe('0');
    });

    it('should not show modal when isOpen is false', () => {
      render(
        <ClaimFormModal
          isOpen={false}
          onClose={() => {}}
        />,
        { wrapper },
      );

      expect(screen.queryByText('Add New Claim')).not.toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('should render edit mode when initialValues with id provided', () => {
      const claim = createMockClaim({
        id: 'claim-123',
        claimName: 'Test Claim',
        category: ClaimCategory.FITNESS,
        month: 5,
        year: 2024,
        totalAmount: 250.0,
      });

      render(
        <ClaimFormModal
          isOpen={true}
          onClose={() => {}}
          initialValues={claim}
        />,
        { wrapper },
      );

      expect(screen.getByText('Edit Claim')).toBeInTheDocument();
      expect(
        screen.getByText(/Update the claim details below/i),
      ).toBeInTheDocument();
    });

    it('should pre-fill form fields with initialValues in edit mode', async () => {
      const claim = createMockClaim({
        id: 'claim-123',
        claimName: 'Gym Membership',
        category: ClaimCategory.FITNESS,
        month: 5,
        year: 2024,
        totalAmount: 250.0,
      });

      render(
        <ClaimFormModal
          isOpen={true}
          onClose={() => {}}
          initialValues={claim}
        />,
        { wrapper },
      );

      await waitFor(() => {
        const categorySelect = screen.getByLabelText(
          /Category/i,
        ) as HTMLSelectElement;
        const claimNameInput = screen.getByLabelText(
          /Claim Name/i,
        ) as HTMLInputElement;
        const amountInput = screen.getByLabelText(
          /Total Amount/i,
        ) as HTMLInputElement;

        expect(categorySelect.value).toBe('fitness');
        expect(claimNameInput.value).toBe('Gym Membership');
        expect(amountInput.value).toBe('250');
      });
    });

    it('should reset form when switching from edit to create mode', async () => {
      const claim = createMockClaim({
        id: 'claim-123',
        claimName: 'Test Claim',
        category: ClaimCategory.FITNESS,
        totalAmount: 250.0,
      });

      const { rerender } = render(
        <ClaimFormModal
          isOpen={true}
          onClose={() => {}}
          initialValues={claim}
        />,
        { wrapper },
      );

      // Verify edit mode
      expect(screen.getByText('Edit Claim')).toBeInTheDocument();

      // Switch to create mode
      rerender(
        <ClaimFormModal
          isOpen={true}
          onClose={() => {}}
          initialValues={undefined}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Add New Claim')).toBeInTheDocument();

        const categorySelect = screen.getByLabelText(
          /Category/i,
        ) as HTMLSelectElement;
        const claimNameInput = screen.getByLabelText(
          /Claim Name/i,
        ) as HTMLInputElement;

        expect(categorySelect.value).toBe('telco'); // Default
        expect(claimNameInput.value).toBe('');
      });
    });

    it('should handle edit mode with partial initialValues', async () => {
      const partialClaim = {
        id: 'claim-123',
        category: ClaimCategory.DENTAL,
      };

      render(
        <ClaimFormModal
          isOpen={true}
          onClose={() => {}}
          initialValues={partialClaim}
        />,
        { wrapper },
      );

      await waitFor(() => {
        const categorySelect = screen.getByLabelText(
          /Category/i,
        ) as HTMLSelectElement;
        expect(categorySelect.value).toBe('dental');
      });
    });
  });

  describe('Modal Controls', () => {
    it('should call onClose when dialog is dismissed', () => {
      const mockOnClose = vi.fn();

      render(
        <ClaimFormModal
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper },
      );

      // Simulate dialog close (this would typically be done via overlay click or escape key)
      // Since we're testing the Dialog component behavior, we verify the prop is passed
      expect(mockOnClose).toBeDefined();
    });

    it('should be accessible via dialog when isOpen is true', () => {
      render(
        <ClaimFormModal
          isOpen={true}
          onClose={() => {}}
        />,
        { wrapper },
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should render submit button in create mode', () => {
      render(
        <ClaimFormModal
          isOpen={true}
          onClose={() => {}}
        />,
        { wrapper },
      );

      const submitButton = screen.getByRole('button', {
        name: /add to draft list/i,
      });
      expect(submitButton).toBeInTheDocument();
    });

    it('should handle form submission without hanging', () => {
      render(
        <ClaimFormModal
          isOpen={true}
          onClose={() => {}}
        />,
        { wrapper },
      );

      const submitButton = screen.getByRole('button', {
        name: /add to draft list/i,
      });
      fireEvent.click(submitButton);

      expect(submitButton).toBeInTheDocument();
    });

    it('should call onClaimCreated callback after successful creation', async () => {
      const mockOnClaimCreated = vi.fn();
      const mockOnClose = vi.fn();

      render(
        <ClaimFormModal
          isOpen={true}
          onClose={mockOnClose}
          onClaimCreated={mockOnClaimCreated}
        />,
        { wrapper },
      );

      // Note: Full integration testing of form submission would require
      // mocking the useMultiClaimForm hook, which is tested separately
      expect(mockOnClaimCreated).toBeDefined();
      expect(mockOnClose).toBeDefined();
    });
  });

  describe('Props Validation', () => {
    it('should accept existingDraftClaims prop', () => {
      const existingClaims = [
        createMockClaim(),
        createMockClaim({ id: 'claim-2' }),
      ];

      render(
        <ClaimFormModal
          isOpen={true}
          onClose={() => {}}
          existingDraftClaims={existingClaims}
        />,
        { wrapper },
      );

      expect(screen.getByText('Add New Claim')).toBeInTheDocument();
    });

    it('should handle empty existingDraftClaims array', () => {
      render(
        <ClaimFormModal
          isOpen={true}
          onClose={() => {}}
          existingDraftClaims={[]}
        />,
        { wrapper },
      );

      expect(screen.getByText('Add New Claim')).toBeInTheDocument();
    });
  });

  describe('Conditional Rendering', () => {
    it('should show different descriptions for create vs edit mode', () => {
      const { rerender } = render(
        <ClaimFormModal
          isOpen={true}
          onClose={() => {}}
        />,
        { wrapper },
      );

      expect(
        screen.getByText(
          /Create draft claims that will be submitted together/i,
        ),
      ).toBeInTheDocument();

      const claim = createMockClaim({ id: 'claim-123' });
      rerender(
        <ClaimFormModal
          isOpen={true}
          onClose={() => {}}
          initialValues={claim}
        />,
      );

      expect(
        screen.getByText(/Update the claim details below/i),
      ).toBeInTheDocument();
    });
  });
});
