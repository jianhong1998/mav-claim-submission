import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { AttachmentList } from '../AttachmentList';
import { useAttachmentList } from '@/hooks/attachments/useAttachmentList';
import {
  IAttachmentMetadata,
  AttachmentStatus,
  AttachmentMimeType,
} from '@project/types';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('@/hooks/attachments/useAttachmentList');
vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
  },
}));

// Mock window.confirm and window.open
const mockConfirm = vi.fn();
const mockOpen = vi.fn();
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: mockConfirm,
});
Object.defineProperty(window, 'open', {
  writable: true,
  value: mockOpen,
});

const mockUseAttachmentList = useAttachmentList as ReturnType<typeof vi.fn>;
const mockToast = {
  info: toast.info as ReturnType<typeof vi.fn>,
};

// Test data
const mockAttachments: IAttachmentMetadata[] = [
  {
    id: 'attachment-1',
    claimId: 'claim-123',
    originalFilename: 'receipt.pdf',
    storedFilename: 'john_doe_telco_2024_09_1234567890.pdf',
    fileSize: 1024 * 1024, // 1MB
    mimeType: AttachmentMimeType.PDF,
    driveFileId: 'drive-file-1',
    driveShareableUrl: 'https://drive.google.com/file/d/drive-file-1/view',
    status: AttachmentStatus.UPLOADED,
    uploadedAt: '2024-01-15T10:30:00Z',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'attachment-2',
    claimId: 'claim-123',
    originalFilename: 'invoice.png',
    storedFilename: 'john_doe_telco_2024_09_1234567891.png',
    fileSize: 2 * 1024 * 1024, // 2MB
    mimeType: AttachmentMimeType.PNG,
    driveFileId: 'drive-file-2',
    driveShareableUrl: 'https://drive.google.com/file/d/drive-file-2/view',
    status: AttachmentStatus.UPLOADED,
    uploadedAt: '2024-01-16T14:45:00Z',
    createdAt: '2024-01-16T14:45:00Z',
    updatedAt: '2024-01-16T14:45:00Z',
  },
  {
    id: 'attachment-3',
    claimId: 'claim-123',
    originalFilename: 'failed-upload.jpg',
    storedFilename: 'john_doe_telco_2024_09_1234567892.jpg',
    fileSize: 3 * 1024 * 1024, // 3MB
    mimeType: AttachmentMimeType.JPEG,
    driveFileId: '',
    driveShareableUrl: '',
    status: AttachmentStatus.FAILED,
    uploadedAt: '2024-01-17T09:20:00Z',
    createdAt: '2024-01-17T09:20:00Z',
    updatedAt: '2024-01-17T09:20:00Z',
  },
];

const mockAttachmentListHook = {
  attachments: mockAttachments,
  total: mockAttachments.length,
  isLoading: false,
  isFetching: false,
  isError: false,
  error: null,
  isDeletingAttachment: false,
  refreshAttachments: vi.fn(),
  deleteAttachment: vi.fn(),
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });

  const WrapperComponent = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  WrapperComponent.displayName = 'TestQueryClientWrapper';
  return WrapperComponent;
};

describe('AttachmentList', () => {
  const defaultProps = {
    claimId: 'claim-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAttachmentList.mockReturnValue(mockAttachmentListHook);
    mockConfirm.mockReturnValue(true);

    // Reset mock implementations
    Object.keys(mockAttachmentListHook).forEach((key) => {
      const hookKey = key as keyof typeof mockAttachmentListHook;
      const hookValue = mockAttachmentListHook[hookKey];
      if (typeof hookValue === 'function') {
        (hookValue as unknown as { mockReset: () => void }).mockReset();
      }
    });
  });

  describe('Component Rendering', () => {
    it('should render attachment list with header', () => {
      render(<AttachmentList {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Attachments')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Attachment count
    });

    it('should render with custom className', () => {
      const { container } = render(
        <AttachmentList
          {...defaultProps}
          className="custom-class"
        />,
        { wrapper: createWrapper() },
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should render all attachment items', () => {
      render(<AttachmentList {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('receipt.pdf')).toBeInTheDocument();
      expect(screen.getByText('invoice.png')).toBeInTheDocument();
      expect(screen.getByText('failed-upload.jpg')).toBeInTheDocument();
    });

    it('should display file sizes correctly', () => {
      render(<AttachmentList {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('1 MB')).toBeInTheDocument();
      expect(screen.getByText('2 MB')).toBeInTheDocument();
      expect(screen.getByText('3 MB')).toBeInTheDocument();
    });

    it('should format upload dates correctly', () => {
      render(<AttachmentList {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      // Should contain formatted dates
      expect(screen.getByText(/Uploaded Jan 15, 2024/)).toBeInTheDocument();
      expect(screen.getByText(/Uploaded Jan 16, 2024/)).toBeInTheDocument();
      expect(screen.getByText(/Uploaded Jan 17, 2024/)).toBeInTheDocument();
    });
  });

  describe('File Type Icons and Colors', () => {
    it('should display correct icons for different file types', () => {
      render(<AttachmentList {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      // Should have file text icon for PDF
      const pdfIcon = screen.getByLabelText('Document file');
      expect(pdfIcon).toBeInTheDocument();

      // Should have image icons
      const imageIcons = screen.getAllByLabelText('Image file');
      expect(imageIcons).toHaveLength(2); // PNG and JPEG
    });

    it('should apply correct styling for different file types', () => {
      render(<AttachmentList {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      // Check that file type containers have appropriate background colors
      const fileTypeContainers = screen
        .getAllByRole('generic')
        .filter(
          (el) =>
            el.className.includes('bg-') &&
            el.className.includes('rounded-lg') &&
            el.className.includes('w-10'),
        );

      expect(fileTypeContainers.length).toBeGreaterThan(0);
    });
  });

  describe('Status Indicators', () => {
    it('should display correct status for uploaded files', () => {
      render(<AttachmentList {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const uploadedLabels = screen.getAllByText('Uploaded');
      expect(uploadedLabels).toHaveLength(2);
    });

    it('should display correct status for failed files', () => {
      render(<AttachmentList {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    it('should apply correct styling for different statuses', () => {
      render(<AttachmentList {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      // Failed attachment should have destructive styling
      const failedAttachment = screen
        .getByText('failed-upload.jpg')
        .closest('[class*="border-destructive/30"]');
      expect(failedAttachment).toHaveClass('border-destructive/30');

      // Uploaded attachments should have success styling
      const uploadedAttachment = screen
        .getByText('receipt.pdf')
        .closest('[class*="border-green-500/30"]');
      expect(uploadedAttachment).toHaveClass('border-green-500/30');
    });
  });

  describe('Loading State', () => {
    it('should display loading skeleton when loading', () => {
      mockUseAttachmentList.mockReturnValue({
        ...mockAttachmentListHook,
        isLoading: true,
        attachments: [],
      });

      render(<AttachmentList {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Attachments')).toBeInTheDocument();

      // Should show loading spinner
      const spinners = screen
        .getAllByRole('generic')
        .filter((el) => el.className.includes('animate-spin'));
      expect(spinners.length).toBeGreaterThan(0);

      // Should show skeleton items
      const skeletonItems = screen
        .getAllByRole('generic')
        .filter((el) => el.className.includes('animate-pulse'));
      expect(skeletonItems.length).toBeGreaterThan(0);
    });

    it('should show fetching indicator when refetching', () => {
      mockUseAttachmentList.mockReturnValue({
        ...mockAttachmentListHook,
        isFetching: true,
      });

      render(<AttachmentList {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      // Should show spinner in header
      const headerSpinners = screen
        .getAllByRole('generic')
        .filter(
          (el) =>
            el.className.includes('animate-spin') &&
            el.className.includes('border-t-transparent'),
        );
      expect(headerSpinners.length).toBeGreaterThan(0);
    });
  });

  describe('Error State', () => {
    it('should display error state when there is an error', () => {
      const mockError = new Error('Failed to load attachments');
      mockUseAttachmentList.mockReturnValue({
        ...mockAttachmentListHook,
        isError: true,
        error: mockError,
        attachments: [],
      });

      render(<AttachmentList {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getAllByText('Failed to load attachments')).toHaveLength(2); // h3 title and error message
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should handle non-Error error objects', () => {
      mockUseAttachmentList.mockReturnValue({
        ...mockAttachmentListHook,
        isError: true,
        error: 'String error',
        attachments: [],
      });

      render(<AttachmentList {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(
        screen.getByText('An unexpected error occurred'),
      ).toBeInTheDocument();
    });

    it('should allow retry on error', async () => {
      const mockError = new Error('Failed to load attachments');
      mockUseAttachmentList.mockReturnValue({
        ...mockAttachmentListHook,
        isError: true,
        error: mockError,
        attachments: [],
      });

      const user = userEvent.setup();

      render(<AttachmentList {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const tryAgainButton = screen.getByText('Try Again');

      await user.click(tryAgainButton);

      expect(mockAttachmentListHook.refreshAttachments).toHaveBeenCalled();
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no attachments', () => {
      mockUseAttachmentList.mockReturnValue({
        ...mockAttachmentListHook,
        attachments: [],
        total: 0,
      });

      render(<AttachmentList {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('No attachments yet')).toBeInTheDocument();
      expect(
        screen.getByText(/Upload files to attach them to this claim/),
      ).toBeInTheDocument();
    });

    it('should not display count badge when no attachments', () => {
      mockUseAttachmentList.mockReturnValue({
        ...mockAttachmentListHook,
        attachments: [],
        total: 0,
      });

      render(<AttachmentList {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should show action buttons for uploaded attachments', () => {
      render(<AttachmentList {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      // Should show action buttons for uploaded files
      expect(screen.getAllByLabelText('View attachment')).toHaveLength(2);
      expect(screen.getAllByLabelText('Download attachment')).toHaveLength(2);
      expect(screen.getAllByLabelText('Open in Google Drive')).toHaveLength(2);
      expect(screen.getAllByLabelText('Delete attachment')).toHaveLength(2);
    });

    it('should not show action buttons when showActions is false', () => {
      render(
        <AttachmentList
          {...defaultProps}
          showActions={false}
        />,
        {
          wrapper: createWrapper(),
        },
      );

      expect(
        screen.queryByLabelText('View attachment'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByLabelText('Delete attachment'),
      ).not.toBeInTheDocument();
    });

    it('should not show action buttons for failed uploads', () => {
      render(<AttachmentList {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      // Failed attachment should not have action buttons (commented out to avoid unused variable)

      // Count action buttons - failed attachment should not contribute to the count
      const viewButtons = screen.getAllByLabelText('View attachment');
      const deleteButtons = screen.getAllByLabelText('Delete attachment');

      expect(viewButtons).toHaveLength(2); // Only for the 2 uploaded files
      expect(deleteButtons).toHaveLength(2); // Only for the 2 uploaded files
    });

    it('should handle view action', async () => {
      const onAttachmentViewed = vi.fn();
      const user = userEvent.setup();

      render(
        <AttachmentList
          {...defaultProps}
          onAttachmentViewed={onAttachmentViewed}
        />,
        { wrapper: createWrapper() },
      );

      const viewButtons = screen.getAllByLabelText('View attachment');
      await user.click(viewButtons[0]);

      expect(mockOpen).toHaveBeenCalledWith(
        'https://drive.google.com/file/d/drive-file-1/view',
        '_blank',
      );
      expect(onAttachmentViewed).toHaveBeenCalledWith(mockAttachments[0]);
    });

    it('should handle download action', async () => {
      const user = userEvent.setup();

      render(<AttachmentList {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const downloadButtons = screen.getAllByLabelText('Download attachment');
      await user.click(downloadButtons[0]);

      expect(mockOpen).toHaveBeenCalledWith(
        'https://drive.google.com/file/d/drive-file-1/view',
        '_blank',
      );
    });

    it('should handle Google Drive link action', async () => {
      const user = userEvent.setup();

      render(<AttachmentList {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const driveButtons = screen.getAllByLabelText('Open in Google Drive');
      await user.click(driveButtons[0]);

      expect(mockOpen).toHaveBeenCalledWith(
        'https://drive.google.com/file/d/drive-file-1/view',
        '_blank',
      );
    });

    it('should handle delete confirmation and deletion', async () => {
      const onAttachmentDeleted = vi.fn();
      mockConfirm.mockReturnValue(true);
      mockAttachmentListHook.deleteAttachment.mockResolvedValue(undefined);

      const user = userEvent.setup();

      render(
        <AttachmentList
          {...defaultProps}
          onAttachmentDeleted={onAttachmentDeleted}
        />,
        { wrapper: createWrapper() },
      );

      const deleteButtons = screen.getAllByLabelText('Delete attachment');
      await user.click(deleteButtons[0]);

      expect(mockConfirm).toHaveBeenCalledWith(
        'Are you sure you want to delete "receipt.pdf"? This action cannot be undone.',
      );

      await waitFor(() => {
        expect(mockAttachmentListHook.deleteAttachment).toHaveBeenCalledWith(
          'attachment-1',
        );
        expect(onAttachmentDeleted).toHaveBeenCalledWith('attachment-1');
      });
    });

    it('should cancel delete when user declines confirmation', async () => {
      mockConfirm.mockReturnValue(false);
      const user = userEvent.setup();

      render(<AttachmentList {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const deleteButtons = screen.getAllByLabelText('Delete attachment');
      await user.click(deleteButtons[0]);

      expect(mockConfirm).toHaveBeenCalled();
      expect(mockAttachmentListHook.deleteAttachment).not.toHaveBeenCalled();
    });

    it('should show loading spinner during deletion', async () => {
      mockConfirm.mockReturnValue(true);

      // Make deletion hang to test loading state
      let resolveDelete: () => void;
      const deletePromise = new Promise<void>((resolve) => {
        resolveDelete = resolve;
      });
      mockAttachmentListHook.deleteAttachment.mockReturnValue(deletePromise);

      const user = userEvent.setup();

      render(<AttachmentList {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const deleteButtons = screen.getAllByLabelText('Delete attachment');

      await act(async () => {
        await user.click(deleteButtons[0]);
      });

      // Should show loading spinner
      await waitFor(() => {
        const loadingSpinners = screen
          .getAllByRole('generic')
          .filter(
            (el) =>
              el.className.includes('animate-spin') &&
              el.className.includes('border-destructive'),
          );
        expect(loadingSpinners.length).toBeGreaterThan(0);
      });

      // Complete deletion
      await act(async () => {
        resolveDelete!();
        await deletePromise;
      });
    });

    it('should disable delete button when deletion is in progress', () => {
      mockUseAttachmentList.mockReturnValue({
        ...mockAttachmentListHook,
        isDeletingAttachment: true,
      });

      render(<AttachmentList {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const deleteButtons = screen.getAllByLabelText('Delete attachment');
      deleteButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should handle refresh action', async () => {
      const user = userEvent.setup();

      render(<AttachmentList {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const refreshButton = screen.getByRole('button', {
        name: /refresh attachments/i,
      });
      await user.click(refreshButton);

      expect(mockAttachmentListHook.refreshAttachments).toHaveBeenCalled();
      expect(mockToast.info).toHaveBeenCalledWith('Refreshing attachments...');
    });

    it('should disable refresh button when fetching', () => {
      mockUseAttachmentList.mockReturnValue({
        ...mockAttachmentListHook,
        isFetching: true,
      });

      render(<AttachmentList {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const refreshButton = screen.getByRole('button', {
        name: /refresh attachments/i,
      });
      expect(refreshButton).toBeDisabled();
    });

    it('should show spinning refresh icon when fetching', () => {
      mockUseAttachmentList.mockReturnValue({
        ...mockAttachmentListHook,
        isFetching: true,
      });

      render(<AttachmentList {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      // Refresh icon should have spin animation when fetching
      const refreshIcon = screen
        .getByRole('button', { name: /refresh attachments/i })
        .querySelector('svg');
      expect(refreshIcon).toHaveClass('animate-spin');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<AttachmentList {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getAllByLabelText('View attachment')).toHaveLength(2);
      expect(screen.getAllByLabelText('Download attachment')).toHaveLength(2);
      expect(screen.getAllByLabelText('Open in Google Drive')).toHaveLength(2);
      expect(screen.getAllByLabelText('Delete attachment')).toHaveLength(2);
      expect(
        screen.getByRole('button', { name: /refresh attachments/i }),
      ).toBeInTheDocument();
    });

    it('should have screen reader friendly content', () => {
      render(<AttachmentList {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      // Should have screen reader only text for actions
      expect(
        screen.getAllByText('View attachment', { selector: '.sr-only' }),
      ).toHaveLength(2);
      expect(
        screen.getAllByText('Download attachment', { selector: '.sr-only' }),
      ).toHaveLength(2);
      expect(
        screen.getAllByText('Open in Google Drive', { selector: '.sr-only' }),
      ).toHaveLength(2);
      expect(
        screen.getAllByText('Delete attachment', { selector: '.sr-only' }),
      ).toHaveLength(2);
      expect(
        screen.getByText('Refresh attachments', { selector: '.sr-only' }),
      ).toBeInTheDocument();
    });

    it('should show renamed file indicator with tooltip', () => {
      render(<AttachmentList {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      // All files have different stored filenames, so should show "Renamed" indicator
      const renamedIndicators = screen.getAllByText('Renamed');
      expect(renamedIndicators).toHaveLength(3);

      // Should have title attributes with stored filename
      renamedIndicators.forEach((indicator) => {
        expect(indicator).toHaveAttribute(
          'title',
          expect.stringContaining('Stored as:'),
        );
      });
    });
  });

  describe('Integration', () => {
    it('should call useAttachmentList hook with correct claimId', () => {
      render(
        <AttachmentList
          {...defaultProps}
          claimId="test-claim-456"
        />,
        {
          wrapper: createWrapper(),
        },
      );

      expect(mockUseAttachmentList).toHaveBeenCalledWith('test-claim-456');
    });
  });
});
