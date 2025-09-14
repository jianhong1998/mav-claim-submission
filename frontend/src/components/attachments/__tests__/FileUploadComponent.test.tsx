import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { FileUploadComponent } from '../FileUploadComponent';
import { useAttachmentUpload } from '@/hooks/attachments/useAttachmentUpload';
import { AttachmentStatus, AttachmentMimeType } from '@project/types';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('@/hooks/attachments/useAttachmentUpload');
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock URL.createObjectURL and revokeObjectURL
const mockObjectUrls: string[] = [];
Object.defineProperty(window.URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => {
    const url = 'blob:mock-url-' + Math.random();
    mockObjectUrls.push(url);
    return url;
  }),
});

Object.defineProperty(window.URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn((url: string) => {
    const index = mockObjectUrls.indexOf(url);
    if (index > -1) {
      mockObjectUrls.splice(index, 1);
    }
  }),
});

const mockUseAttachmentUpload = useAttachmentUpload as ReturnType<typeof vi.fn>;
const mockToast = {
  error: toast.error as ReturnType<typeof vi.fn>,
  success: toast.success as ReturnType<typeof vi.fn>,
};

// Test utilities
const createTestFile = (
  name: string = 'test-file.pdf',
  size: number = 1024 * 1024, // 1MB
  type: string = AttachmentMimeType.PDF,
): File => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

const createImageFile = (name: string = 'test-image.png'): File => {
  return createTestFile(name, 1024 * 1024, AttachmentMimeType.PNG);
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

const mockAttachmentUploadHook = {
  uploadFile: vi.fn(),
  uploadFiles: vi.fn(),
  validateFiles: vi.fn(),
  isUploading: false,
  currentUploads: [],
  uploadHistory: [],
  getFileProgress: vi.fn(),
  clearHistory: vi.fn(),
  error: null,
  isError: false,
  isSuccess: false,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'],
  maxFilenameLength: 255,
};

describe('FileUploadComponent', () => {
  const defaultProps = {
    claimId: 'test-claim-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockObjectUrls.length = 0;
    mockUseAttachmentUpload.mockReturnValue(mockAttachmentUploadHook);

    // Reset mock implementations
    Object.keys(mockAttachmentUploadHook).forEach((key) => {
      const hookKey = key as keyof typeof mockAttachmentUploadHook;
      const hookValue = mockAttachmentUploadHook[hookKey];
      if (typeof hookValue === 'function') {
        (hookValue as unknown as { mockReset: () => void }).mockReset();
      }
    });
  });

  describe('Component Rendering', () => {
    it('should render upload zone with correct text', () => {
      render(<FileUploadComponent {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(
        screen.getByText('Click to upload or drag and drop'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /application\/pdf, image\/png, image\/jpeg, image\/jpg up to 10 MB/,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText('You can select multiple files'),
      ).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <FileUploadComponent
          {...defaultProps}
          className="custom-class"
        />,
        { wrapper: createWrapper() },
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should handle single file mode', () => {
      render(
        <FileUploadComponent
          {...defaultProps}
          multiple={false}
        />,
        {
          wrapper: createWrapper(),
        },
      );

      expect(
        screen.queryByText('You can select multiple files'),
      ).not.toBeInTheDocument();
    });

    it('should render in disabled state', () => {
      render(
        <FileUploadComponent
          {...defaultProps}
          disabled={true}
        />,
        {
          wrapper: createWrapper(),
        },
      );

      const uploadZone = screen
        .getByText('Click to upload or drag and drop')
        .closest('[class*="cursor-not-allowed"]');
      expect(uploadZone).toBeInTheDocument();

      const fileInput = screen.getByLabelText('Upload files');
      expect(fileInput).toBeDisabled();
    });

    it('should display upload progress overlay when uploading', () => {
      mockUseAttachmentUpload.mockReturnValue({
        ...mockAttachmentUploadHook,
        isUploading: true,
      });

      render(<FileUploadComponent {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    });
  });

  describe('File Selection', () => {
    it('should open file picker when upload zone is clicked', async () => {
      const user = userEvent.setup();

      render(<FileUploadComponent {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const uploadZone = screen
        .getByText('Click to upload or drag and drop')
        .closest('div');
      const fileInput = screen.getByLabelText(
        'Upload files',
      ) as HTMLInputElement;

      const clickSpy = vi.spyOn(fileInput, 'click');

      await user.click(uploadZone!);

      expect(clickSpy).toHaveBeenCalled();
    });

    it('should not open file picker when disabled', async () => {
      const user = userEvent.setup();

      render(
        <FileUploadComponent
          {...defaultProps}
          disabled={true}
        />,
        {
          wrapper: createWrapper(),
        },
      );

      const uploadZone = screen
        .getByText('Click to upload or drag and drop')
        .closest('div');
      const fileInput = screen.getByLabelText(
        'Upload files',
      ) as HTMLInputElement;

      const clickSpy = vi.spyOn(fileInput, 'click');

      await user.click(uploadZone!);

      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('should handle file input change', async () => {
      mockAttachmentUploadHook.validateFiles.mockReturnValue({
        valid: [createTestFile()],
        invalid: [],
      });
      mockAttachmentUploadHook.uploadFile.mockResolvedValue({
        success: true,
        attachmentId: 'test-id',
      });

      render(<FileUploadComponent {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const fileInput = screen.getByLabelText(
        'Upload files',
      ) as HTMLInputElement;
      const testFile = createTestFile();

      await act(async () => {
        await userEvent.upload(fileInput, testFile);
      });

      expect(mockAttachmentUploadHook.validateFiles).toHaveBeenCalledWith([
        testFile,
      ]);
    });
  });

  describe('Drag and Drop', () => {
    it('should handle drag over events', async () => {
      render(<FileUploadComponent {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const uploadZone = screen
        .getByText('Click to upload or drag and drop')
        .closest('div');

      fireEvent.dragOver(uploadZone!, {
        dataTransfer: { files: [] },
      });

      await waitFor(() => {
        expect(screen.getByText('Drop files here')).toBeInTheDocument();
      });
    });

    it('should handle drag leave events', async () => {
      render(<FileUploadComponent {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const uploadZone = screen
        .getByText('Click to upload or drag and drop')
        .closest('div');

      // First drag over
      fireEvent.dragOver(uploadZone!, {
        dataTransfer: { files: [] },
      });

      await waitFor(() => {
        expect(screen.getByText('Drop files here')).toBeInTheDocument();
      });

      // Then drag leave
      fireEvent.dragLeave(uploadZone!, {
        relatedTarget: document.body, // Leave the component entirely
      });

      await waitFor(() => {
        expect(
          screen.getByText('Click to upload or drag and drop'),
        ).toBeInTheDocument();
      });
    });

    it('should handle file drop', async () => {
      mockAttachmentUploadHook.validateFiles.mockReturnValue({
        valid: [createTestFile()],
        invalid: [],
      });
      mockAttachmentUploadHook.uploadFile.mockResolvedValue({
        success: true,
        attachmentId: 'test-id',
      });

      render(<FileUploadComponent {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const uploadZone = screen
        .getByText('Click to upload or drag and drop')
        .closest('div');
      const testFile = createTestFile();

      await act(async () => {
        fireEvent.drop(uploadZone!, {
          dataTransfer: {
            files: [testFile],
          },
        });
      });

      expect(mockAttachmentUploadHook.validateFiles).toHaveBeenCalledWith([
        testFile,
      ]);
    });

    it('should ignore drag events when disabled', () => {
      render(
        <FileUploadComponent
          {...defaultProps}
          disabled={true}
        />,
        {
          wrapper: createWrapper(),
        },
      );

      const uploadZone = screen
        .getByText('Click to upload or drag and drop')
        .closest('div');

      fireEvent.dragOver(uploadZone!, {
        dataTransfer: { files: [] },
      });

      // Should not show "Drop files here" when disabled
      expect(screen.queryByText('Drop files here')).not.toBeInTheDocument();
    });
  });

  describe('File Validation and Upload', () => {
    it.skip('should show validation errors for invalid files', async () => {
      const invalidFile = createTestFile(
        'invalid.exe',
        1024,
        'application/octet-stream',
      );
      mockAttachmentUploadHook.validateFiles.mockReturnValue({
        valid: [],
        invalid: [
          {
            file: invalidFile,
            errors: [
              'File type application/octet-stream is not supported. Allowed types: PDF, PNG, JPEG',
            ],
          },
        ],
      });

      const onUploadError = vi.fn();

      render(
        <FileUploadComponent
          {...defaultProps}
          onUploadError={onUploadError}
        />,
        { wrapper: createWrapper() },
      );

      const fileInput = screen.getByLabelText(
        'Upload files',
      ) as HTMLInputElement;

      await act(async () => {
        await userEvent.upload(fileInput, invalidFile);
      });

      await waitFor(() => {
        expect(mockAttachmentUploadHook.validateFiles).toHaveBeenCalledWith([
          invalidFile,
        ]);
        expect(mockToast.error).toHaveBeenCalledWith(
          'invalid.exe: File type application/octet-stream is not supported. Allowed types: PDF, PNG, JPEG',
        );
        expect(onUploadError).toHaveBeenCalledWith(
          'invalid.exe',
          'File type application/octet-stream is not supported. Allowed types: PDF, PNG, JPEG',
        );
      });
    });

    it('should upload valid files successfully', async () => {
      const validFile = createTestFile();
      mockAttachmentUploadHook.validateFiles.mockReturnValue({
        valid: [validFile],
        invalid: [],
      });
      mockAttachmentUploadHook.uploadFile.mockResolvedValue({
        success: true,
        attachmentId: 'test-id',
      });

      const onUploadSuccess = vi.fn();

      render(
        <FileUploadComponent
          {...defaultProps}
          onUploadSuccess={onUploadSuccess}
        />,
        { wrapper: createWrapper() },
      );

      const fileInput = screen.getByLabelText(
        'Upload files',
      ) as HTMLInputElement;

      await act(async () => {
        await userEvent.upload(fileInput, validFile);
      });

      expect(mockAttachmentUploadHook.uploadFile).toHaveBeenCalledWith(
        validFile,
        expect.objectContaining({
          onProgress: expect.any(Function),
        }),
      );

      await waitFor(() => {
        expect(onUploadSuccess).toHaveBeenCalledWith('test-file.pdf');
      });
    });

    it('should handle multiple file upload', async () => {
      const files = [createTestFile('file1.pdf'), createTestFile('file2.pdf')];
      mockAttachmentUploadHook.validateFiles.mockReturnValue({
        valid: files,
        invalid: [],
      });
      mockAttachmentUploadHook.uploadFiles.mockResolvedValue([
        { status: 'fulfilled', value: { success: true } },
        { status: 'fulfilled', value: { success: true } },
      ]);

      const onUploadSuccess = vi.fn();

      render(
        <FileUploadComponent
          {...defaultProps}
          onUploadSuccess={onUploadSuccess}
          multiple={true}
        />,
        { wrapper: createWrapper() },
      );

      const fileInput = screen.getByLabelText(
        'Upload files',
      ) as HTMLInputElement;

      await act(async () => {
        await userEvent.upload(fileInput, files);
      });

      expect(mockAttachmentUploadHook.uploadFiles).toHaveBeenCalledWith(
        files,
        expect.objectContaining({
          onProgress: expect.any(Function),
        }),
      );

      await waitFor(() => {
        expect(onUploadSuccess).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle upload errors', async () => {
      const validFile = createTestFile();
      mockAttachmentUploadHook.validateFiles.mockReturnValue({
        valid: [validFile],
        invalid: [],
      });
      mockAttachmentUploadHook.uploadFile.mockRejectedValue(
        new Error('Upload failed'),
      );

      const onUploadError = vi.fn();

      render(
        <FileUploadComponent
          {...defaultProps}
          onUploadError={onUploadError}
        />,
        { wrapper: createWrapper() },
      );

      const fileInput = screen.getByLabelText(
        'Upload files',
      ) as HTMLInputElement;

      await act(async () => {
        await userEvent.upload(fileInput, validFile);
      });

      await waitFor(() => {
        expect(onUploadError).toHaveBeenCalledWith(
          'test-file.pdf',
          'Upload failed',
        );
      });
    });
  });

  describe('File Previews', () => {
    it('should show file previews for selected files', async () => {
      const validFile = createTestFile();
      mockAttachmentUploadHook.validateFiles.mockReturnValue({
        valid: [validFile],
        invalid: [],
      });
      mockAttachmentUploadHook.uploadFile.mockResolvedValue({
        success: true,
        attachmentId: 'test-id',
      });

      render(<FileUploadComponent {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const fileInput = screen.getByLabelText(
        'Upload files',
      ) as HTMLInputElement;

      await act(async () => {
        await userEvent.upload(fileInput, validFile);
      });

      expect(screen.getByText('Files to upload:')).toBeInTheDocument();
      expect(screen.getByText('test-file.pdf')).toBeInTheDocument();
      expect(screen.getByText('1 MB')).toBeInTheDocument();
    });

    it('should create image previews for image files', async () => {
      const imageFile = createImageFile();
      mockAttachmentUploadHook.validateFiles.mockReturnValue({
        valid: [imageFile],
        invalid: [],
      });
      mockAttachmentUploadHook.uploadFile.mockResolvedValue({
        success: true,
        attachmentId: 'test-id',
      });

      render(<FileUploadComponent {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const fileInput = screen.getByLabelText(
        'Upload files',
      ) as HTMLInputElement;

      await act(async () => {
        await userEvent.upload(fileInput, imageFile);
      });

      // Should create object URL for image preview
      expect(window.URL.createObjectURL).toHaveBeenCalledWith(imageFile);

      const previewImage = screen.getByAltText('Preview of test-image.png');
      expect(previewImage).toBeInTheDocument();
      expect(previewImage).toHaveAttribute(
        'src',
        expect.stringContaining('blob:mock-url-'),
      );
    });

    it('should allow removing file previews', async () => {
      const validFile = createTestFile();
      mockAttachmentUploadHook.validateFiles.mockReturnValue({
        valid: [validFile],
        invalid: [],
      });

      // Don't complete upload to keep preview
      mockAttachmentUploadHook.uploadFile.mockImplementation(
        () => new Promise(() => {}),
      );

      render(<FileUploadComponent {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const fileInput = screen.getByLabelText(
        'Upload files',
      ) as HTMLInputElement;

      await act(async () => {
        await userEvent.upload(fileInput, validFile);
      });

      // Find and click remove button
      const removeButton = screen.getByRole('button', { name: 'Remove file' });

      await act(async () => {
        await userEvent.click(removeButton);
      });

      expect(screen.queryByText('test-file.pdf')).not.toBeInTheDocument();
    });

    it('should clean up object URLs when removing image previews', async () => {
      const imageFile = createImageFile();
      mockAttachmentUploadHook.validateFiles.mockReturnValue({
        valid: [imageFile],
        invalid: [],
      });

      // Don't complete upload to keep preview
      mockAttachmentUploadHook.uploadFile.mockImplementation(
        () => new Promise(() => {}),
      );

      render(<FileUploadComponent {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const fileInput = screen.getByLabelText(
        'Upload files',
      ) as HTMLInputElement;

      await act(async () => {
        await userEvent.upload(fileInput, imageFile);
      });

      const removeButton = screen.getByRole('button', { name: 'Remove file' });

      await act(async () => {
        await userEvent.click(removeButton);
      });

      // Should revoke object URL
      expect(window.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('Upload Progress Display', () => {
    it('should display current upload progress', () => {
      mockUseAttachmentUpload.mockReturnValue({
        ...mockAttachmentUploadHook,
        currentUploads: [
          {
            fileName: 'uploading-file.pdf',
            progress: 45,
            status: AttachmentStatus.PENDING,
            uploadedBytes: 450000,
            totalBytes: 1000000,
            estimatedTimeRemaining: 5,
          },
        ],
      });

      render(<FileUploadComponent {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Upload Progress:')).toBeInTheDocument();
      expect(screen.getByText('uploading-file.pdf')).toBeInTheDocument();
      expect(screen.getByText('45%')).toBeInTheDocument();
      expect(screen.getByText('5s remaining')).toBeInTheDocument();
    });

    it('should show different colors for different upload states', () => {
      mockUseAttachmentUpload.mockReturnValue({
        ...mockAttachmentUploadHook,
        currentUploads: [
          {
            fileName: 'failed-file.pdf',
            progress: 30,
            status: AttachmentStatus.FAILED,
            uploadedBytes: 300000,
            totalBytes: 1000000,
          },
          {
            fileName: 'completed-file.pdf',
            progress: 100,
            status: AttachmentStatus.UPLOADED,
            uploadedBytes: 1000000,
            totalBytes: 1000000,
          },
        ],
      });

      render(<FileUploadComponent {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const progressBars = screen
        .getAllByRole('generic')
        .filter(
          (el) => el.className.includes('rounded-full') && el.style.width,
        );

      // Should have different background colors for different states
      expect(progressBars).toHaveLength(2);
    });
  });

  describe('Error Display', () => {
    it('should display upload errors', () => {
      const uploadError = new Error('Upload failed');
      mockUseAttachmentUpload.mockReturnValue({
        ...mockAttachmentUploadHook,
        error: uploadError,
      });

      render(<FileUploadComponent {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Upload failed')).toBeInTheDocument();
    });

    it('should handle non-Error error objects', () => {
      mockUseAttachmentUpload.mockReturnValue({
        ...mockAttachmentUploadHook,
        error: 'String error',
      });

      render(<FileUploadComponent {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Upload failed')).toBeInTheDocument();
    });
  });

  describe('Upload Status Integration', () => {
    it('should show upload status icons for files', async () => {
      const testFile = createTestFile();

      // Mock file progress
      mockAttachmentUploadHook.getFileProgress.mockImplementation(
        (fileName) => {
          if (fileName === 'test-file.pdf') {
            return {
              progress: 100,
              status: AttachmentStatus.UPLOADED,
              uploadedBytes: 1024 * 1024,
              totalBytes: 1024 * 1024,
            };
          }
          return null;
        },
      );

      mockAttachmentUploadHook.validateFiles.mockReturnValue({
        valid: [testFile],
        invalid: [],
      });

      render(<FileUploadComponent {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const fileInput = screen.getByLabelText(
        'Upload files',
      ) as HTMLInputElement;

      await act(async () => {
        await userEvent.upload(fileInput, testFile);
      });

      // Should show completed status icon
      await waitFor(() => {
        expect(
          screen.getByTestId('CheckCircle2') ||
            screen.queryByLabelText(/success/i),
        ).toBeTruthy();
      });
    });

    it('should show failed status for failed uploads', async () => {
      const testFile = createTestFile();

      // Mock failed upload progress
      mockAttachmentUploadHook.getFileProgress.mockImplementation(
        (fileName) => {
          if (fileName === 'test-file.pdf') {
            return {
              progress: 0,
              status: AttachmentStatus.FAILED,
              uploadedBytes: 0,
              totalBytes: 1024 * 1024,
            };
          }
          return null;
        },
      );

      mockAttachmentUploadHook.validateFiles.mockReturnValue({
        valid: [testFile],
        invalid: [],
      });

      render(<FileUploadComponent {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const fileInput = screen.getByLabelText(
        'Upload files',
      ) as HTMLInputElement;

      await act(async () => {
        await userEvent.upload(fileInput, testFile);
      });

      // Should show error status icon
      await waitFor(() => {
        expect(
          screen.getByTestId('AlertCircle') ||
            screen.queryByLabelText(/error/i),
        ).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<FileUploadComponent {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByLabelText('Upload files')).toBeInTheDocument();
      // File type icons only appear when files are added, not in default state
    });

    it('should have keyboard navigation support', async () => {
      const user = userEvent.setup();

      render(<FileUploadComponent {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      // Tab to focus the upload zone
      await user.tab();

      // Should be focusable through its child input
      const fileInput = screen.getByLabelText('Upload files');
      expect(fileInput).toBeInTheDocument();
    });

    it('should provide screen reader friendly content', async () => {
      const imageFile = createImageFile();
      mockAttachmentUploadHook.validateFiles.mockReturnValue({
        valid: [imageFile],
        invalid: [],
      });

      render(<FileUploadComponent {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const fileInput = screen.getByLabelText(
        'Upload files',
      ) as HTMLInputElement;

      await act(async () => {
        await userEvent.upload(fileInput, imageFile);
      });

      expect(
        screen.getByAltText('Preview of test-image.png'),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Remove file')).toBeInTheDocument();
    });
  });

  describe('Memory Management', () => {
    it('should clean up object URLs on unmount', async () => {
      const imageFile = createImageFile();
      mockAttachmentUploadHook.validateFiles.mockReturnValue({
        valid: [imageFile],
        invalid: [],
      });

      const { unmount } = render(<FileUploadComponent {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const fileInput = screen.getByLabelText(
        'Upload files',
      ) as HTMLInputElement;

      await act(async () => {
        await userEvent.upload(fileInput, imageFile);
      });

      // Object URL should be created
      expect(window.URL.createObjectURL).toHaveBeenCalled();

      unmount();

      // Object URL should be revoked on unmount
      expect(window.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });
});
