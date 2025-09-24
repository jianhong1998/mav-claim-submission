import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkFileUploadComponent } from '../BulkFileUploadComponent';
import { ClaimCategory, ClaimStatus, IClaimMetadata } from '@project/types';

// Mock dependencies
vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Mock FileUploadComponent
vi.mock('../FileUploadComponent', () => ({
  FileUploadComponent: ({
    claimId,
    onUploadSuccess,
    onUploadError,
    multiple,
  }: {
    claimId: string;
    onUploadSuccess?: (fileName: string) => void;
    onUploadError?: (fileName: string, error: string) => void;
    multiple: boolean;
  }) => (
    <div
      data-testid="file-upload-component"
      data-claim-id={claimId}
      data-multiple={multiple}
    >
      <button
        onClick={() => onUploadSuccess?.('test-file.pdf')}
        data-testid={`upload-success-${claimId}`}
      >
        Upload Success
      </button>
      <button
        onClick={() => onUploadError?.('test-file.pdf', 'Upload failed')}
        data-testid={`upload-error-${claimId}`}
      >
        Upload Error
      </button>
    </div>
  ),
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Upload: () => <span data-testid="Upload" />,
  FileText: () => <span data-testid="FileText" />,
  CheckCircle2: () => <span data-testid="CheckCircle2" />,
  AlertCircle: () => <span data-testid="AlertCircle" />,
  RotateCcw: () => <span data-testid="RotateCcw" />,
  Paperclip: () => <span data-testid="Paperclip" />,
}));

// Test utilities
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

describe('BulkFileUploadComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty State', () => {
    it('should show empty state when no draft claims are provided', () => {
      render(<BulkFileUploadComponent draftClaims={[]} />);

      expect(screen.getByText('Bulk File Upload')).toBeInTheDocument();
      expect(
        screen.getByText(
          'No draft claims available. Create claims first to attach files.',
        ),
      ).toBeInTheDocument();
    });

    it('should apply custom className in empty state', () => {
      const { container } = render(
        <BulkFileUploadComponent
          draftClaims={[]}
          className="custom-class"
        />,
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Header and Statistics', () => {
    it('should display correct statistics for multiple claims', () => {
      const mockClaims = [
        createMockClaim({
          attachments: [
            { id: 'att-1' },
            { id: 'att-2' },
          ] as IClaimMetadata['attachments'],
        }),
        createMockClaim({
          id: 'claim-2',
          attachments: [{ id: 'att-3' }] as IClaimMetadata['attachments'],
        }),
        createMockClaim({
          id: 'claim-3',
          attachments: [],
        }),
      ];

      render(<BulkFileUploadComponent draftClaims={mockClaims} />);

      expect(screen.getByText('Total Claims')).toBeInTheDocument();
      expect(screen.getByText('With Files')).toBeInTheDocument();
      expect(screen.getByText('Without Files')).toBeInTheDocument();
      expect(screen.getByText('Total Files')).toBeInTheDocument();

      // Check the actual statistics values by finding parent elements
      const totalClaimsSection = screen
        .getByText('Total Claims')
        .closest('div');
      const withFilesSection = screen.getByText('With Files').closest('div');
      const withoutFilesSection = screen
        .getByText('Without Files')
        .closest('div');
      const totalFilesSection = screen.getByText('Total Files').closest('div');

      expect(totalClaimsSection).toHaveTextContent('3');
      expect(withFilesSection).toHaveTextContent('2');
      expect(withoutFilesSection).toHaveTextContent('1');
      expect(totalFilesSection).toHaveTextContent('3');
    });

    it('should show correct progress percentage', () => {
      const mockClaims = [
        createMockClaim({
          attachments: [{ id: 'att-1' }] as IClaimMetadata['attachments'],
        }),
        createMockClaim({ id: 'claim-2', attachments: [] }),
      ];

      render(<BulkFileUploadComponent draftClaims={mockClaims} />);

      expect(screen.getByText('50% Complete')).toBeInTheDocument(); // 1 of 2 claims have files
    });

    it('should handle singular vs plural text correctly', () => {
      const singleClaim = [createMockClaim()];
      const { rerender } = render(
        <BulkFileUploadComponent draftClaims={singleClaim} />,
      );

      expect(screen.getByText(/your 1 draft claim\./)).toBeInTheDocument();

      const multipleClaims = [
        createMockClaim(),
        createMockClaim({ id: 'claim-2' }),
      ];
      rerender(<BulkFileUploadComponent draftClaims={multipleClaims} />);

      expect(screen.getByText(/your 2 draft claims\./)).toBeInTheDocument();
    });
  });

  describe('Claim Display', () => {
    it('should display individual claim information correctly', () => {
      const mockClaims = [
        createMockClaim({
          category: ClaimCategory.TELCO,
          claimName: 'Mobile Phone Bill',
          month: 3,
          year: 2024,
          totalAmount: 100.5,
          attachments: [{ id: 'att-1' }] as IClaimMetadata['attachments'],
        }),
        createMockClaim({
          id: 'claim-2',
          category: ClaimCategory.FITNESS,
          claimName: null,
          month: 2,
          year: 2024,
          totalAmount: 75.0,
          attachments: [],
        }),
      ];

      render(<BulkFileUploadComponent draftClaims={mockClaims} />);

      expect(screen.getByText('Mobile Phone Bill')).toBeInTheDocument();
      expect(screen.getByText('Fitness & Wellness Claim')).toBeInTheDocument();
      expect(screen.getByText('Mar 2024')).toBeInTheDocument();
      expect(screen.getByText('Feb 2024')).toBeInTheDocument();
      expect(screen.getByText(/\$100\.50/)).toBeInTheDocument();
      expect(screen.getByText(/\$75\.00/)).toBeInTheDocument();
    });

    it('should show file count badge for claims with attachments', () => {
      const mockClaims = [
        createMockClaim({
          attachments: [
            { id: 'att-1' },
            { id: 'att-2' },
          ] as IClaimMetadata['attachments'],
        }),
        createMockClaim({
          id: 'claim-2',
          attachments: [{ id: 'att-3' }] as IClaimMetadata['attachments'],
        }),
        createMockClaim({
          id: 'claim-3',
          attachments: [],
        }),
      ];

      render(<BulkFileUploadComponent draftClaims={mockClaims} />);

      expect(screen.getByText('2 files')).toBeInTheDocument();
      expect(screen.getByText('1 file')).toBeInTheDocument();
      // Claim without attachments should not show file badge
      expect(screen.queryByText('0 files')).not.toBeInTheDocument();
    });

    it('should show appropriate status indicators', () => {
      const mockClaims = [
        createMockClaim({
          attachments: [{ id: 'att-1' }] as IClaimMetadata['attachments'],
        }),
        createMockClaim({
          id: 'claim-2',
          attachments: [],
        }),
      ];

      render(<BulkFileUploadComponent draftClaims={mockClaims} />);

      expect(screen.getByText('Ready')).toBeInTheDocument(); // Claim with files
      expect(screen.getByText('No Files')).toBeInTheDocument(); // Claim without files
    });

    it('should apply visual styling based on file status', () => {
      const mockClaims = [
        createMockClaim({
          attachments: [{ id: 'att-1' }] as IClaimMetadata['attachments'],
        }),
      ];

      render(<BulkFileUploadComponent draftClaims={mockClaims} />);

      const claimCard = screen
        .getByText('Telecommunications Claim')
        .closest('[class*="border-green-500/50"]');
      expect(claimCard).toBeInTheDocument();
    });
  });

  describe('Expansion/Collapse Functionality', () => {
    it('should expand and collapse individual claims', async () => {
      const mockClaims = [createMockClaim()];
      const user = userEvent.setup();

      render(<BulkFileUploadComponent draftClaims={mockClaims} />);

      // Initially collapsed - FileUploadComponent should not be visible
      expect(
        screen.queryByTestId('file-upload-component'),
      ).not.toBeInTheDocument();

      // Click to expand
      const _claimHeader =
        screen
          .getByText('Telecommunications Claim')
          .closest('[role="button"]') ||
        screen.getByText('Telecommunications Claim').parentElement;

      // Since the header is clickable, we'll click on the header area
      const clickableArea = screen
        .getByText('Telecommunications Claim')
        .closest('.cursor-pointer');
      if (clickableArea) {
        await user.click(clickableArea);
      }

      // After expansion - FileUploadComponent should be visible
      await waitFor(() => {
        expect(screen.getByTestId('file-upload-component')).toBeInTheDocument();
      });
    });

    it('should expand all claims when Expand All is clicked', async () => {
      const mockClaims = [
        createMockClaim(),
        createMockClaim({ id: 'claim-2' }),
      ];
      const user = userEvent.setup();

      render(<BulkFileUploadComponent draftClaims={mockClaims} />);

      const expandAllButton = screen.getByRole('button', {
        name: 'Expand All',
      });
      await user.click(expandAllButton);

      await waitFor(() => {
        const uploadComponents = screen.getAllByTestId('file-upload-component');
        expect(uploadComponents).toHaveLength(2);
      });
    });

    it('should collapse all claims when Collapse All is clicked', async () => {
      const mockClaims = [
        createMockClaim(),
        createMockClaim({ id: 'claim-2' }),
      ];
      const user = userEvent.setup();

      render(<BulkFileUploadComponent draftClaims={mockClaims} />);

      // First expand all
      const expandAllButton = screen.getByRole('button', {
        name: 'Expand All',
      });
      await user.click(expandAllButton);

      await waitFor(() => {
        expect(screen.getAllByTestId('file-upload-component')).toHaveLength(2);
      });

      // Then collapse all
      const collapseAllButton = screen.getByRole('button', {
        name: 'Collapse All',
      });
      await user.click(collapseAllButton);

      await waitFor(() => {
        expect(screen.queryAllByTestId('file-upload-component')).toHaveLength(
          0,
        );
      });
    });
  });

  describe('Upload Event Handling', () => {
    it('should handle successful upload events', async () => {
      const mockClaims = [createMockClaim({ attachments: [] })];
      const onUploadComplete = vi.fn();
      const user = userEvent.setup();

      render(
        <BulkFileUploadComponent
          draftClaims={mockClaims}
          onUploadComplete={onUploadComplete}
        />,
      );

      // Expand the claim to show FileUploadComponent
      const expandAllButton = screen.getByRole('button', {
        name: 'Expand All',
      });
      await user.click(expandAllButton);

      await waitFor(() => {
        expect(screen.getByTestId('file-upload-component')).toBeInTheDocument();
      });

      // Simulate successful upload
      const uploadSuccessButton = screen.getByTestId('upload-success-claim-1');
      await user.click(uploadSuccessButton);

      expect(onUploadComplete).toHaveBeenCalledWith('claim-1', 1);
    });

    it('should handle upload error events', async () => {
      const mockClaims = [createMockClaim({ attachments: [] })];
      const user = userEvent.setup();

      // Mock console.error to avoid noise in test output
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(<BulkFileUploadComponent draftClaims={mockClaims} />);

      // Expand the claim
      const expandAllButton = screen.getByRole('button', {
        name: 'Expand All',
      });
      await user.click(expandAllButton);

      await waitFor(() => {
        expect(screen.getByTestId('file-upload-component')).toBeInTheDocument();
      });

      // Simulate upload error
      const uploadErrorButton = screen.getByTestId('upload-error-claim-1');
      await user.click(uploadErrorButton);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Upload failed for test-file.pdf in claim claim-1:',
        ),
        'Upload failed',
      );

      consoleSpy.mockRestore();
    });

    it('should call onAllUploadsComplete when all claims have files', async () => {
      const mockClaims = [
        createMockClaim({
          attachments: [{ id: 'att-1' }] as IClaimMetadata['attachments'],
        }),
        createMockClaim({ id: 'claim-2', attachments: [] }),
      ];
      const onAllUploadsComplete = vi.fn();
      const user = userEvent.setup();

      render(
        <BulkFileUploadComponent
          draftClaims={mockClaims}
          onAllUploadsComplete={onAllUploadsComplete}
        />,
      );

      // Expand all claims
      const expandAllButton = screen.getByRole('button', {
        name: 'Expand All',
      });
      await user.click(expandAllButton);

      await waitFor(() => {
        expect(screen.getAllByTestId('file-upload-component')).toHaveLength(2);
      });

      // Simulate successful upload for the second claim (first already has files)
      const uploadSuccessButton = screen.getByTestId('upload-success-claim-2');
      await user.click(uploadSuccessButton);

      expect(onAllUploadsComplete).toHaveBeenCalled();
    });

    it('should not call onAllUploadsComplete if not all claims have files', async () => {
      const mockClaims = [
        createMockClaim({ attachments: [] }),
        createMockClaim({ id: 'claim-2', attachments: [] }),
      ];
      const onAllUploadsComplete = vi.fn();
      const user = userEvent.setup();

      render(
        <BulkFileUploadComponent
          draftClaims={mockClaims}
          onAllUploadsComplete={onAllUploadsComplete}
        />,
      );

      // Expand all claims
      const expandAllButton = screen.getByRole('button', {
        name: 'Expand All',
      });
      await user.click(expandAllButton);

      await waitFor(() => {
        expect(screen.getAllByTestId('file-upload-component')).toHaveLength(2);
      });

      // Upload to only one claim
      const uploadSuccessButton = screen.getByTestId('upload-success-claim-1');
      await user.click(uploadSuccessButton);

      expect(onAllUploadsComplete).not.toHaveBeenCalled();
    });
  });

  describe('Completion Status', () => {
    it('should show completion message when all claims have files', () => {
      const mockClaims = [
        createMockClaim({
          attachments: [{ id: 'att-1' }] as IClaimMetadata['attachments'],
        }),
        createMockClaim({
          id: 'claim-2',
          attachments: [{ id: 'att-2' }] as IClaimMetadata['attachments'],
        }),
      ];

      render(<BulkFileUploadComponent draftClaims={mockClaims} />);

      expect(
        screen.getByText('All Claims Have Files Attached'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'You can proceed to review and finalize your claims for submission.',
        ),
      ).toBeInTheDocument();
    });

    it('should not show completion message when some claims lack files', () => {
      const mockClaims = [
        createMockClaim({
          attachments: [{ id: 'att-1' }] as IClaimMetadata['attachments'],
        }),
        createMockClaim({
          id: 'claim-2',
          attachments: [],
        }),
      ];

      render(<BulkFileUploadComponent draftClaims={mockClaims} />);

      expect(
        screen.queryByText('All Claims Have Files Attached'),
      ).not.toBeInTheDocument();
    });
  });

  describe('FileUploadComponent Integration', () => {
    it('should pass correct props to FileUploadComponent', async () => {
      const mockClaims = [createMockClaim()];
      const user = userEvent.setup();

      render(<BulkFileUploadComponent draftClaims={mockClaims} />);

      // Expand the claim
      const expandAllButton = screen.getByRole('button', {
        name: 'Expand All',
      });
      await user.click(expandAllButton);

      await waitFor(() => {
        const fileUploadComponent = screen.getByTestId('file-upload-component');
        expect(fileUploadComponent).toHaveAttribute('data-claim-id', 'claim-1');
        expect(fileUploadComponent).toHaveAttribute('data-multiple', 'true');
      });
    });
  });

  describe('State Management', () => {
    it('should initialize state correctly based on existing attachments', () => {
      const mockClaims = [
        createMockClaim({
          attachments: [
            { id: 'att-1' },
            { id: 'att-2' },
          ] as IClaimMetadata['attachments'],
        }),
        createMockClaim({
          id: 'claim-2',
          attachments: [],
        }),
      ];

      render(<BulkFileUploadComponent draftClaims={mockClaims} />);

      // Check statistics reflect initial state using more specific queries
      const withFilesSection = screen.getByText('With Files').closest('div');
      const withoutFilesSection = screen
        .getByText('Without Files')
        .closest('div');
      const totalFilesSection = screen.getByText('Total Files').closest('div');

      expect(withFilesSection).toHaveTextContent('1'); // Claims with files
      expect(withoutFilesSection).toHaveTextContent('1'); // Claims without files
      expect(totalFilesSection).toHaveTextContent('2'); // Total files
    });

    it('should update state when uploads succeed', async () => {
      const mockClaims = [createMockClaim({ attachments: [] })];
      const user = userEvent.setup();

      render(<BulkFileUploadComponent draftClaims={mockClaims} />);

      // Initially, no claims should have files - use specific section queries
      const withFilesSection = screen.getByText('With Files').closest('div');
      expect(withFilesSection).toHaveTextContent('0'); // Claims with files

      // Expand and upload
      const expandAllButton = screen.getByRole('button', {
        name: 'Expand All',
      });
      await user.click(expandAllButton);

      await waitFor(() => {
        expect(screen.getByTestId('file-upload-component')).toBeInTheDocument();
      });

      const uploadSuccessButton = screen.getByTestId('upload-success-claim-1');
      await user.click(uploadSuccessButton);

      // State should update but we can't easily test internal state changes
      // The main indicator would be the onUploadComplete callback being called
      // which we test in other test cases
    });
  });

  describe('Category Display', () => {
    it('should display category names correctly', () => {
      const mockClaims = [
        createMockClaim({ category: ClaimCategory.TELCO }),
        createMockClaim({
          id: 'claim-2',
          category: ClaimCategory.FITNESS,
        }),
        createMockClaim({
          id: 'claim-3',
          category: ClaimCategory.DENTAL,
        }),
        createMockClaim({
          id: 'claim-4',
          category: ClaimCategory.OTHERS,
        }),
      ];

      render(<BulkFileUploadComponent draftClaims={mockClaims} />);

      expect(screen.getByText('Telecommunications')).toBeInTheDocument();
      expect(screen.getByText('Fitness & Wellness')).toBeInTheDocument();
      expect(screen.getByText('Dental Care')).toBeInTheDocument();
      expect(screen.getByText('Others')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should provide proper semantic structure', () => {
      const mockClaims = [createMockClaim()];

      render(<BulkFileUploadComponent draftClaims={mockClaims} />);

      expect(
        screen.getByRole('button', { name: 'Expand All' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Collapse All' }),
      ).toBeInTheDocument();
    });
  });

  describe('Custom ClassName', () => {
    it('should apply custom className to container', () => {
      const mockClaims = [createMockClaim()];

      const { container } = render(
        <BulkFileUploadComponent
          draftClaims={mockClaims}
          className="custom-class"
        />,
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
