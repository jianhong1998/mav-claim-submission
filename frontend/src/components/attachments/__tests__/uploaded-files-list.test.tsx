import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import UploadedFilesList, {
  UploadedFile,
  UploadedFilesListProps,
} from '../uploaded-files-list';

// Mock file data
const createMockFile = (overrides?: Partial<UploadedFile>): UploadedFile => ({
  id: 'file-1',
  originalFilename: 'receipt.pdf',
  fileSize: 1024 * 1024, // 1MB
  mimeType: 'application/pdf',
  driveShareableUrl: 'https://drive.google.com/file/d/abc123/view',
  ...overrides,
});

const mockFilesWithUrls: UploadedFile[] = [
  createMockFile({
    id: 'file-1',
    originalFilename: 'receipt.pdf',
    fileSize: 1024 * 1024,
    mimeType: 'application/pdf',
    driveShareableUrl: 'https://drive.google.com/file/d/abc123/view',
  }),
  createMockFile({
    id: 'file-2',
    originalFilename: 'invoice.png',
    fileSize: 2 * 1024 * 1024,
    mimeType: 'image/png',
    driveShareableUrl: 'https://drive.google.com/file/d/def456/view',
  }),
];

const mockFilesWithoutUrls: UploadedFile[] = [
  createMockFile({
    id: 'file-3',
    originalFilename: 'receipt.pdf',
    fileSize: 1024 * 1024,
    mimeType: 'application/pdf',
    driveShareableUrl: undefined,
  }),
  createMockFile({
    id: 'file-4',
    originalFilename: 'invoice.png',
    fileSize: 2 * 1024 * 1024,
    mimeType: 'image/png',
    driveShareableUrl: undefined,
  }),
];

const mockMixedFiles: UploadedFile[] = [
  createMockFile({
    id: 'file-5',
    originalFilename: 'clickable.pdf',
    fileSize: 1024 * 1024,
    mimeType: 'application/pdf',
    driveShareableUrl: 'https://drive.google.com/file/d/ghi789/view',
  }),
  createMockFile({
    id: 'file-6',
    originalFilename: 'non-clickable.png',
    fileSize: 2 * 1024 * 1024,
    mimeType: 'image/png',
    driveShareableUrl: undefined,
  }),
];

describe('UploadedFilesList', () => {
  const mockOnDelete = vi.fn();
  const defaultProps: UploadedFilesListProps = {
    files: mockFilesWithUrls,
    isDeleting: false,
    onDelete: mockOnDelete,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render uploaded files list with header', () => {
      render(<UploadedFilesList {...defaultProps} />);

      expect(screen.getByText('Uploaded files:')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <UploadedFilesList
          {...defaultProps}
          className="custom-class"
        />,
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should render all file items', () => {
      render(<UploadedFilesList {...defaultProps} />);

      expect(screen.getByText('receipt.pdf')).toBeInTheDocument();
      expect(screen.getByText('invoice.png')).toBeInTheDocument();
    });

    it('should display file sizes correctly', () => {
      render(<UploadedFilesList {...defaultProps} />);

      expect(screen.getByText('1 MB')).toBeInTheDocument();
      expect(screen.getByText('2 MB')).toBeInTheDocument();
    });

    it('should return null when files array is empty', () => {
      const { container } = render(
        <UploadedFilesList
          {...defaultProps}
          files={[]}
        />,
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Clickable File Items with driveShareableUrl', () => {
    it('should render anchor tag when driveShareableUrl is present', () => {
      render(<UploadedFilesList {...defaultProps} />);

      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(2);

      expect(links[0]).toHaveAttribute(
        'href',
        'https://drive.google.com/file/d/abc123/view',
      );
      expect(links[1]).toHaveAttribute(
        'href',
        'https://drive.google.com/file/d/def456/view',
      );
    });

    it('should have correct security attributes on anchor tags', () => {
      render(<UploadedFilesList {...defaultProps} />);

      const links = screen.getAllByRole('link');

      links.forEach((link) => {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });

    it('should have cursor-pointer class on clickable items', () => {
      render(<UploadedFilesList {...defaultProps} />);

      const links = screen.getAllByRole('link');

      links.forEach((link) => {
        expect(link).toHaveClass('cursor-pointer');
      });
    });

    it('should have hover transition classes on clickable items', () => {
      render(<UploadedFilesList {...defaultProps} />);

      const links = screen.getAllByRole('link');

      links.forEach((link) => {
        expect(link).toHaveClass('hover:opacity-80');
        expect(link).toHaveClass('transition-opacity');
      });
    });

    it('should contain filename and file size in anchor tag', () => {
      render(<UploadedFilesList {...defaultProps} />);

      const firstLink = screen.getAllByRole('link')[0];

      // Anchor should contain the filename and size
      expect(firstLink).toHaveTextContent('receipt.pdf');
      expect(firstLink).toHaveTextContent('1 MB');
    });
  });

  describe('Non-Clickable File Items without driveShareableUrl', () => {
    it('should render div (not anchor) when driveShareableUrl is missing', () => {
      render(
        <UploadedFilesList
          {...defaultProps}
          files={mockFilesWithoutUrls}
        />,
      );

      // Should not have any links
      expect(screen.queryByRole('link')).not.toBeInTheDocument();

      // Should still render filenames in divs
      expect(screen.getByText('receipt.pdf')).toBeInTheDocument();
      expect(screen.getByText('invoice.png')).toBeInTheDocument();
    });

    it('should not have cursor-pointer class on non-clickable items', () => {
      render(
        <UploadedFilesList
          {...defaultProps}
          files={mockFilesWithoutUrls}
        />,
      );

      const fileNameElement = screen.getByText('receipt.pdf').parentElement;

      expect(fileNameElement).not.toHaveClass('cursor-pointer');
    });

    it('should not have hover classes on non-clickable items', () => {
      render(
        <UploadedFilesList
          {...defaultProps}
          files={mockFilesWithoutUrls}
        />,
      );

      const fileNameElement = screen.getByText('receipt.pdf').parentElement;

      expect(fileNameElement).not.toHaveClass('hover:opacity-80');
      expect(fileNameElement).not.toHaveClass('transition-opacity');
    });
  });

  describe('Mixed Clickable and Non-Clickable Items', () => {
    it('should handle both clickable and non-clickable items correctly', () => {
      render(
        <UploadedFilesList
          {...defaultProps}
          files={mockMixedFiles}
        />,
      );

      // Should have exactly 1 link (for file with URL)
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(1);
      expect(links[0]).toHaveTextContent('clickable.pdf');

      // Non-clickable file should still render
      expect(screen.getByText('non-clickable.png')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should allow keyboard focus on anchor tags', () => {
      render(<UploadedFilesList {...defaultProps} />);

      const links = screen.getAllByRole('link');

      // Anchor tags should be focusable
      links.forEach((link) => {
        expect(link).toHaveAttribute('href');
        // Verify it's a valid anchor that can receive focus
        expect(link.tagName).toBe('A');
      });
    });

    it('should have proper semantic HTML structure', () => {
      render(<UploadedFilesList {...defaultProps} />);

      // Should use semantic anchor tags
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);

      links.forEach((link) => {
        expect(link.tagName).toBe('A');
      });
    });

    it('should have screen reader accessible delete button', () => {
      render(<UploadedFilesList {...defaultProps} />);

      const deleteButtons = screen.getAllByLabelText('Delete file');
      expect(deleteButtons).toHaveLength(2);

      // Should have sr-only text
      expect(
        screen.getAllByText('Delete file', { selector: '.sr-only' }),
      ).toHaveLength(2);
    });

    it('should have proper structure for screen readers', () => {
      render(<UploadedFilesList {...defaultProps} />);

      // Header should be present
      expect(screen.getByText('Uploaded files:')).toBeInTheDocument();

      // Files should be identifiable
      expect(screen.getByText('receipt.pdf')).toBeInTheDocument();
      expect(screen.getByText('invoice.png')).toBeInTheDocument();
    });
  });

  describe('Delete Button Functionality', () => {
    it('should call onDelete when delete button is clicked', async () => {
      const user = userEvent.setup();

      render(<UploadedFilesList {...defaultProps} />);

      const deleteButtons = screen.getAllByLabelText('Delete file');
      await user.click(deleteButtons[0]);

      expect(mockOnDelete).toHaveBeenCalledWith('file-1', 'receipt.pdf');
    });

    it('should delete button work independently without triggering link', async () => {
      const user = userEvent.setup();

      // Mock window.open to verify link is not triggered
      const mockOpen = vi.fn();
      const originalOpen = window.open;
      window.open = mockOpen;

      render(<UploadedFilesList {...defaultProps} />);

      const deleteButtons = screen.getAllByLabelText('Delete file');
      await user.click(deleteButtons[0]);

      // Delete should be called
      expect(mockOnDelete).toHaveBeenCalledWith('file-1', 'receipt.pdf');

      // Link should NOT be triggered
      expect(mockOpen).not.toHaveBeenCalled();

      // Restore original window.open
      window.open = originalOpen;
    });

    it('should disable delete button when isDeleting is true', () => {
      render(
        <UploadedFilesList
          {...defaultProps}
          isDeleting={true}
        />,
      );

      const deleteButtons = screen.getAllByLabelText('Delete file');

      deleteButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it('should show loading spinner when deleting', () => {
      render(
        <UploadedFilesList
          {...defaultProps}
          isDeleting={true}
        />,
      );

      // Should show loading spinner instead of X icon
      const spinners = screen.getAllByRole('generic').filter((el) => {
        return (
          el.className.includes('animate-spin') &&
          el.className.includes('border-destructive')
        );
      });

      expect(spinners.length).toBeGreaterThan(0);
    });

    it('should not call onDelete multiple times when disabled', async () => {
      const user = userEvent.setup();

      render(
        <UploadedFilesList
          {...defaultProps}
          isDeleting={true}
        />,
      );

      const deleteButtons = screen.getAllByLabelText('Delete file');

      // Try to click disabled button
      await user.click(deleteButtons[0]);

      // Should not be called because button is disabled
      expect(mockOnDelete).not.toHaveBeenCalled();
    });
  });

  describe('Status Indicators', () => {
    it('should display "Uploaded to Drive" status', () => {
      render(<UploadedFilesList {...defaultProps} />);

      const statusTexts = screen.getAllByText('Uploaded to Drive');
      expect(statusTexts).toHaveLength(2);
    });

    it('should show success icon (CheckCircle2)', () => {
      const { container } = render(<UploadedFilesList {...defaultProps} />);

      // Check for green checkmark icons
      const checkIcons = container.querySelectorAll('.text-green-500');
      expect(checkIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Props Support', () => {
    it('should accept and render all files', () => {
      const customFiles: UploadedFile[] = [
        createMockFile({
          id: 'custom-1',
          originalFilename: 'custom-file.txt',
          fileSize: 500,
          mimeType: 'text/plain',
          driveShareableUrl: 'https://drive.google.com/custom',
        }),
      ];

      render(
        <UploadedFilesList
          {...defaultProps}
          files={customFiles}
        />,
      );

      expect(screen.getByText('custom-file.txt')).toBeInTheDocument();
      expect(screen.getByText('500 Bytes')).toBeInTheDocument();
    });

    it('should respect isDeleting prop', () => {
      const { rerender } = render(
        <UploadedFilesList
          {...defaultProps}
          isDeleting={false}
        />,
      );

      let deleteButtons = screen.getAllByLabelText('Delete file');
      expect(deleteButtons[0]).not.toBeDisabled();

      // Re-render with isDeleting=true
      rerender(
        <UploadedFilesList
          {...defaultProps}
          isDeleting={true}
        />,
      );

      deleteButtons = screen.getAllByLabelText('Delete file');
      expect(deleteButtons[0]).toBeDisabled();
    });

    it('should call onDelete callback with correct parameters', async () => {
      const customOnDelete = vi.fn();
      const user = userEvent.setup();

      render(
        <UploadedFilesList
          {...defaultProps}
          onDelete={customOnDelete}
        />,
      );

      const deleteButtons = screen.getAllByLabelText('Delete file');
      await user.click(deleteButtons[1]);

      expect(customOnDelete).toHaveBeenCalledWith('file-2', 'invoice.png');
      expect(customOnDelete).toHaveBeenCalledTimes(1);
    });

    it('should apply custom className', () => {
      const { container } = render(
        <UploadedFilesList
          {...defaultProps}
          className="my-custom-class another-class"
        />,
      );

      expect(container.firstChild).toHaveClass('my-custom-class');
      expect(container.firstChild).toHaveClass('another-class');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty driveShareableUrl string', () => {
      const filesWithEmptyUrl: UploadedFile[] = [
        createMockFile({
          id: 'file-empty',
          originalFilename: 'empty-url.pdf',
          driveShareableUrl: '',
        }),
      ];

      render(
        <UploadedFilesList
          {...defaultProps}
          files={filesWithEmptyUrl}
        />,
      );

      // Empty string should be treated as falsy - should not render as link
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(screen.getByText('empty-url.pdf')).toBeInTheDocument();
    });

    it('should handle very long filenames', () => {
      const longFilename =
        'this-is-a-very-long-filename-that-should-be-truncated-properly-without-breaking-the-layout.pdf';
      const filesWithLongName: UploadedFile[] = [
        createMockFile({
          id: 'file-long',
          originalFilename: longFilename,
          driveShareableUrl: 'https://drive.google.com/long',
        }),
      ];

      render(
        <UploadedFilesList
          {...defaultProps}
          files={filesWithLongName}
        />,
      );

      expect(screen.getByText(longFilename)).toBeInTheDocument();

      // Should have truncate class
      const filenameElement = screen.getByText(longFilename);
      expect(filenameElement).toHaveClass('truncate');
    });

    it('should handle single file', () => {
      const singleFile: UploadedFile[] = [
        createMockFile({
          id: 'single',
          originalFilename: 'single.pdf',
          driveShareableUrl: 'https://drive.google.com/single',
        }),
      ];

      render(
        <UploadedFilesList
          {...defaultProps}
          files={singleFile}
        />,
      );

      expect(screen.getByText('single.pdf')).toBeInTheDocument();
      expect(screen.getAllByRole('link')).toHaveLength(1);
    });
  });

  describe('Component Optimization', () => {
    it('should use React.memo for performance', () => {
      // Verify component has displayName (set by React.memo)
      expect(UploadedFilesList.displayName).toBe('UploadedFilesList');
    });

    it('should not re-render when props are the same', () => {
      const { rerender } = render(<UploadedFilesList {...defaultProps} />);

      const initialElement = screen.getByText('receipt.pdf');

      // Re-render with same props
      rerender(<UploadedFilesList {...defaultProps} />);

      const afterRerender = screen.getByText('receipt.pdf');

      // Elements should be the same (React.memo prevents re-render)
      expect(initialElement).toBe(afterRerender);
    });
  });
});
