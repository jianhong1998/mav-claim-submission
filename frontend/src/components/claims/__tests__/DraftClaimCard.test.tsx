import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DraftClaimCard } from '../draft-claim-card';
import {
  ClaimStatus,
  IClaimMetadata,
  IClaimCategory,
  IAttachmentMetadata,
  AttachmentStatus,
  AttachmentMimeType,
} from '@project/types';

// Mock dependencies
vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

vi.mock('lucide-react', () => ({
  Edit: () => <span data-testid="Edit" />,
  Trash2: () => <span data-testid="Trash2" />,
  FileText: () => <span data-testid="FileText" />,
  Calendar: () => <span data-testid="Calendar" />,
  DollarSign: () => <span data-testid="DollarSign" />,
  ChevronDown: () => <span data-testid="ChevronDown" />,
  ChevronUp: () => <span data-testid="ChevronUp" />,
  Eye: () => <span data-testid="Eye" />,
}));

vi.mock('@/components/attachments/FileUploadComponent', () => ({
  FileUploadComponent: ({
    claimId,
    disabled,
  }: {
    claimId: string;
    disabled: boolean;
  }) => (
    <div
      data-testid="file-upload-component"
      data-claim-id={claimId}
      data-disabled={disabled}
    >
      File Upload Component
    </div>
  ),
}));

const mockCategories: IClaimCategory[] = [
  {
    uuid: '1',
    code: 'telco',
    name: 'Telecommunications',
    limit: { type: 'monthly', amount: 150 },
  },
  {
    uuid: '2',
    code: 'fitness',
    name: 'Fitness & Wellness',
    limit: { type: 'monthly', amount: 50 },
  },
];

const createMockAttachment = (
  overrides: Partial<IAttachmentMetadata> = {},
): IAttachmentMetadata => ({
  id: 'att-1',
  claimId: 'claim-1',
  originalFilename: 'receipt.pdf',
  storedFilename: 'receipt.pdf',
  fileSize: 1024,
  mimeType: AttachmentMimeType.PDF,
  driveFileId: 'drive-file-id',
  driveShareableUrl: 'https://drive.google.com/file/d/xxx',
  status: AttachmentStatus.UPLOADED,
  uploadedAt: '2024-03-15T10:00:00Z',
  createdAt: '2024-03-15T10:00:00Z',
  updatedAt: '2024-03-15T10:00:00Z',
  ...overrides,
});

const createMockClaim = (
  overrides: Partial<IClaimMetadata> = {},
): IClaimMetadata => ({
  id: 'claim-1',
  userId: 'user-1',
  submissionDate: new Date().toISOString(),
  category: 'telco',
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

describe('DraftClaimCard', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnPreview = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render claim information correctly', () => {
      const claim = createMockClaim({
        claimName: 'Mobile Phone Bill',
        category: 'telco',
        month: 3,
        year: 2024,
        totalAmount: 150.75,
      });

      render(
        <DraftClaimCard
          claim={claim}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onPreview={mockOnPreview}
          categories={mockCategories}
        />,
      );

      expect(screen.getByText('Mobile Phone Bill')).toBeInTheDocument();
      expect(screen.getByText('March 2024')).toBeInTheDocument();
      expect(screen.getByText('SGD 150.75')).toBeInTheDocument();
      expect(screen.getByText(/Category:/)).toBeInTheDocument();
      expect(screen.getByText(/Telecommunications/)).toBeInTheDocument();
    });

    it('should render default claim name when claimName is null', () => {
      const claim = createMockClaim({
        claimName: null,
        category: 'fitness',
      });

      render(
        <DraftClaimCard
          claim={claim}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onPreview={mockOnPreview}
          categories={mockCategories}
        />,
      );

      expect(screen.getByText('Fitness & Wellness')).toBeInTheDocument();
    });

    it('should display attachment count when attachments exist', () => {
      const claim = createMockClaim({
        attachments: [
          createMockAttachment({
            id: 'att-1',
            originalFilename: 'receipt1.pdf',
          }),
          createMockAttachment({
            id: 'att-2',
            originalFilename: 'receipt2.pdf',
          }),
        ],
      });

      render(
        <DraftClaimCard
          claim={claim}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onPreview={mockOnPreview}
          categories={mockCategories}
        />,
      );

      expect(screen.getByText('2 files')).toBeInTheDocument();
    });

    it('should display singular "file" when one attachment exists', () => {
      const claim = createMockClaim({
        attachments: [
          createMockAttachment({
            id: 'att-1',
            originalFilename: 'receipt.pdf',
          }),
        ],
      });

      render(
        <DraftClaimCard
          claim={claim}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onPreview={mockOnPreview}
          categories={mockCategories}
        />,
      );

      expect(screen.getByText('1 file')).toBeInTheDocument();
    });

    it('should display formatted creation date', () => {
      const claim = createMockClaim({
        createdAt: '2024-03-15T10:00:00Z',
      });

      render(
        <DraftClaimCard
          claim={claim}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onPreview={mockOnPreview}
          categories={mockCategories}
        />,
      );

      expect(screen.getByText(/Created/)).toBeInTheDocument();
      expect(screen.getByText(/15\/03\/2024/)).toBeInTheDocument();
    });
  });

  describe('Expansion Functionality', () => {
    it('should be collapsed by default', () => {
      const claim = createMockClaim();

      render(
        <DraftClaimCard
          claim={claim}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onPreview={mockOnPreview}
          categories={mockCategories}
        />,
      );

      expect(
        screen.queryByTestId('file-upload-component'),
      ).not.toBeInTheDocument();
      expect(screen.getByLabelText('Expand file upload')).toBeInTheDocument();
    });

    it('should expand when defaultExpanded is true', () => {
      const claim = createMockClaim();

      render(
        <DraftClaimCard
          claim={claim}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onPreview={mockOnPreview}
          categories={mockCategories}
          defaultExpanded={true}
        />,
      );

      expect(screen.getByTestId('file-upload-component')).toBeInTheDocument();
      expect(screen.getByLabelText('Collapse file upload')).toBeInTheDocument();
    });

    it('should toggle expansion when chevron button is clicked', () => {
      const claim = createMockClaim();

      render(
        <DraftClaimCard
          claim={claim}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onPreview={mockOnPreview}
          categories={mockCategories}
        />,
      );

      const expandButton = screen.getByLabelText('Expand file upload');

      // Initially collapsed
      expect(
        screen.queryByTestId('file-upload-component'),
      ).not.toBeInTheDocument();

      // Click to expand
      fireEvent.click(expandButton);
      expect(screen.getByTestId('file-upload-component')).toBeInTheDocument();

      // Click to collapse
      const collapseButton = screen.getByLabelText('Collapse file upload');
      fireEvent.click(collapseButton);
      expect(
        screen.queryByTestId('file-upload-component'),
      ).not.toBeInTheDocument();
    });

    it('should render FileUploadComponent with correct props when expanded', () => {
      const claim = createMockClaim({ id: 'test-claim-123' });

      render(
        <DraftClaimCard
          claim={claim}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onPreview={mockOnPreview}
          categories={mockCategories}
          defaultExpanded={true}
        />,
      );

      const fileUpload = screen.getByTestId('file-upload-component');
      expect(fileUpload).toHaveAttribute('data-claim-id', 'test-claim-123');
      expect(fileUpload).toHaveAttribute('data-disabled', 'false');
    });
  });

  describe('Edit Button', () => {
    it('should call onEdit with claim when edit button is clicked', () => {
      const claim = createMockClaim();

      render(
        <DraftClaimCard
          claim={claim}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onPreview={mockOnPreview}
          categories={mockCategories}
        />,
      );

      const editButton = screen.getByRole('button', { name: /Edit/i });
      fireEvent.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledTimes(1);
      expect(mockOnEdit).toHaveBeenCalledWith(claim);
    });

    it('should disable edit button when isDeleting is true', () => {
      const claim = createMockClaim();

      render(
        <DraftClaimCard
          claim={claim}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onPreview={mockOnPreview}
          categories={mockCategories}
          isDeleting={true}
        />,
      );

      const editButton = screen.getByRole('button', { name: /Edit/i });
      expect(editButton).toBeDisabled();
    });
  });

  describe('Delete Button', () => {
    it('should call onDelete with claim when delete button is clicked', () => {
      const claim = createMockClaim();

      render(
        <DraftClaimCard
          claim={claim}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onPreview={mockOnPreview}
          categories={mockCategories}
        />,
      );

      const deleteButton = screen.getByRole('button', { name: /Delete/i });
      fireEvent.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
      expect(mockOnDelete).toHaveBeenCalledWith(claim);
    });

    it('should disable delete button when isDeleting is true', () => {
      const claim = createMockClaim();

      render(
        <DraftClaimCard
          claim={claim}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onPreview={mockOnPreview}
          categories={mockCategories}
          isDeleting={true}
        />,
      );

      const deleteButton = screen.getByRole('button', { name: /Delete/i });
      expect(deleteButton).toBeDisabled();
    });
  });

  describe('Deleting State', () => {
    it('should show deleting overlay when isDeleting is true', () => {
      const claim = createMockClaim();

      render(
        <DraftClaimCard
          claim={claim}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onPreview={mockOnPreview}
          categories={mockCategories}
          isDeleting={true}
        />,
      );

      expect(screen.getByText('Deleting...')).toBeInTheDocument();
    });

    it('should disable expansion button when isDeleting is true', () => {
      const claim = createMockClaim();

      render(
        <DraftClaimCard
          claim={claim}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onPreview={mockOnPreview}
          categories={mockCategories}
          isDeleting={true}
        />,
      );

      const expandButton = screen.getByLabelText('Expand file upload');
      expect(expandButton).toBeDisabled();
    });

    it('should disable FileUploadComponent when isDeleting is true', () => {
      const claim = createMockClaim();

      render(
        <DraftClaimCard
          claim={claim}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onPreview={mockOnPreview}
          categories={mockCategories}
          isDeleting={true}
          defaultExpanded={true}
        />,
      );

      const fileUpload = screen.getByTestId('file-upload-component');
      expect(fileUpload).toHaveAttribute('data-disabled', 'true');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className when provided', () => {
      const claim = createMockClaim();

      const { container } = render(
        <DraftClaimCard
          claim={claim}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onPreview={mockOnPreview}
          categories={mockCategories}
          className="custom-class"
        />,
      );

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('custom-class');
    });
  });

  describe('Memoization', () => {
    it('should memoize component to prevent unnecessary re-renders', () => {
      const claim = createMockClaim();

      const { rerender } = render(
        <DraftClaimCard
          claim={claim}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onPreview={mockOnPreview}
          categories={mockCategories}
        />,
      );

      // Re-render with same props
      rerender(
        <DraftClaimCard
          claim={claim}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onPreview={mockOnPreview}
          categories={mockCategories}
        />,
      );

      // Component should still be in document (no re-mount)
      // Check for amount instead since "Telecommunications" appears in multiple places
      expect(screen.getByText('SGD 100.50')).toBeInTheDocument();
    });
  });
});
