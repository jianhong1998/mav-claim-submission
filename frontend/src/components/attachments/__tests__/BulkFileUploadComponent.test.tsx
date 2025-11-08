import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BulkFileUploadComponent } from '../BulkFileUploadComponent';
import { ClaimCategory, ClaimStatus, IClaimMetadata } from '@project/types';

// Mock dependencies
vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
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

describe('BulkFileUploadComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Deprecation', () => {
    it('should display deprecation message', () => {
      const claims = [createMockClaim()];

      render(<BulkFileUploadComponent draftClaims={claims} />);

      const deprecationMessages = screen.getAllByText(
        'Component deprecated - use DraftClaimCard instead',
      );
      expect(deprecationMessages.length).toBeGreaterThan(0);
    });

    it('should render deprecation message for each claim', () => {
      const claims = [
        createMockClaim({ id: 'claim-1' }),
        createMockClaim({ id: 'claim-2' }),
        createMockClaim({ id: 'claim-3' }),
      ];

      render(<BulkFileUploadComponent draftClaims={claims} />);

      const deprecationMessages = screen.getAllByText(
        'Component deprecated - use DraftClaimCard instead',
      );
      // Should show deprecation message for each claim
      expect(deprecationMessages.length).toBe(3);
    });

    it('should render with no claims without errors', () => {
      render(<BulkFileUploadComponent draftClaims={[]} />);

      // Component should render without crashing
      expect(screen.getByText(/Bulk File Upload/i)).toBeInTheDocument();
      expect(
        screen.getByText(
          /No draft claims available. Create claims first to attach files./i,
        ),
      ).toBeInTheDocument();
    });

    it('should render basic stats when provided claims', () => {
      const claims = [
        createMockClaim({
          id: 'claim-1',
          attachments: [{ id: 'att-1' }] as IClaimMetadata['attachments'],
        }),
        createMockClaim({ id: 'claim-2', attachments: [] }),
      ];

      render(<BulkFileUploadComponent draftClaims={claims} />);

      expect(screen.getByText('Total Claims')).toBeInTheDocument();
      expect(screen.getByText('With Files')).toBeInTheDocument();
      expect(screen.getByText('Without Files')).toBeInTheDocument();
    });

    it('should accept optional callback props without errors', () => {
      const mockOnUploadComplete = vi.fn();
      const mockOnAllUploadsComplete = vi.fn();
      const claims = [createMockClaim()];

      render(
        <BulkFileUploadComponent
          draftClaims={claims}
          onUploadComplete={mockOnUploadComplete}
          onAllUploadsComplete={mockOnAllUploadsComplete}
        />,
      );

      expect(
        screen.getByText(/Attach Files to Claims/i, { exact: false }),
      ).toBeInTheDocument();
    });
  });
});
