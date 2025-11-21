/**
 * Unit tests for file-utils.ts
 * Tests file formatting, validation, and type detection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  formatFileSize,
  getFileTypeInfo,
  validateFileType,
  validateFileSize,
  createFilePreview,
} from '../file-utils';
import { FileText, Image, File as FileIcon } from 'lucide-react';

describe('file-utils', () => {
  describe('formatFileSize', () => {
    it('should format 0 bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });

    it('should format bytes (< 1KB)', () => {
      expect(formatFileSize(500)).toBe('500 Bytes');
      expect(formatFileSize(1023)).toBe('1023 Bytes');
    });

    it('should format kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(10240)).toBe('10 KB');
      expect(formatFileSize(102400)).toBe('100 KB');
    });

    it('should format megabytes correctly', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
      expect(formatFileSize(5242880)).toBe('5 MB');
      expect(formatFileSize(10485760)).toBe('10 MB');
    });

    it('should format gigabytes correctly', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
      expect(formatFileSize(1610612736)).toBe('1.5 GB');
      expect(formatFileSize(5368709120)).toBe('5 GB');
    });

    it('should round to 2 decimal places', () => {
      expect(formatFileSize(1536000)).toBe('1.46 MB');
      expect(formatFileSize(2621440)).toBe('2.5 MB');
    });
  });

  describe('getFileTypeInfo', () => {
    describe('Image files', () => {
      it('should detect image/png as image type', () => {
        const info = getFileTypeInfo('image/png');
        expect(info.icon).toBe(Image);
        expect(info.color).toBe('text-blue-500');
        expect(info.bgColor).toBe('bg-blue-500/10');
        expect(info.category).toBe('image');
      });

      it('should detect image/jpeg as image type', () => {
        const info = getFileTypeInfo('image/jpeg');
        expect(info.icon).toBe(Image);
        expect(info.category).toBe('image');
      });

      it('should detect image/jpg as image type', () => {
        const info = getFileTypeInfo('image/jpg');
        expect(info.icon).toBe(Image);
        expect(info.category).toBe('image');
      });

      it('should detect image/gif as image type', () => {
        const info = getFileTypeInfo('image/gif');
        expect(info.icon).toBe(Image);
        expect(info.category).toBe('image');
      });

      it('should detect image/webp as image type', () => {
        const info = getFileTypeInfo('image/webp');
        expect(info.icon).toBe(Image);
        expect(info.category).toBe('image');
      });
    });

    describe('PDF files', () => {
      it('should detect application/pdf with red color', () => {
        const info = getFileTypeInfo('application/pdf');
        expect(info.icon).toBe(FileText);
        expect(info.color).toBe('text-red-500');
        expect(info.bgColor).toBe('bg-red-500/10');
        expect(info.category).toBe('document');
      });
    });

    describe('Document files', () => {
      it('should detect Word documents (.docx)', () => {
        const info = getFileTypeInfo(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        );
        expect(info.icon).toBe(FileText);
        expect(info.color).toBe('text-green-500');
        expect(info.bgColor).toBe('bg-green-500/10');
        expect(info.category).toBe('document');
      });

      it('should detect Excel documents (.xlsx)', () => {
        const info = getFileTypeInfo(
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        expect(info.icon).toBe(FileText);
        expect(info.color).toBe('text-green-500');
        expect(info.category).toBe('document');
      });

      it('should detect PowerPoint documents (.pptx)', () => {
        const info = getFileTypeInfo(
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        );
        expect(info.icon).toBe(FileText);
        expect(info.category).toBe('document');
      });

      it('should detect legacy Word documents (.doc)', () => {
        const info = getFileTypeInfo('application/msword');
        expect(info.icon).toBe(FileText);
        expect(info.category).toBe('document');
      });

      it('should detect legacy Excel documents (.xls)', () => {
        const info = getFileTypeInfo('application/vnd.ms-excel');
        expect(info.icon).toBe(FileText);
        expect(info.category).toBe('document');
      });

      it('should detect text files', () => {
        const info = getFileTypeInfo('text/plain');
        expect(info.icon).toBe(FileText);
        expect(info.color).toBe('text-green-500');
        expect(info.category).toBe('document');
      });

      it('should detect CSV files', () => {
        const info = getFileTypeInfo('text/csv');
        expect(info.icon).toBe(FileText);
        expect(info.category).toBe('document');
      });
    });

    describe('Other file types', () => {
      it('should handle unknown MIME types with default icon', () => {
        const info = getFileTypeInfo('application/octet-stream');
        expect(info.icon).toBe(FileIcon);
        expect(info.color).toBe('text-gray-500');
        expect(info.bgColor).toBe('bg-gray-500/10');
        expect(info.category).toBe('other');
      });

      it('should handle video files as other', () => {
        const info = getFileTypeInfo('video/mp4');
        expect(info.icon).toBe(FileIcon);
        expect(info.category).toBe('other');
      });

      it('should handle audio files as other', () => {
        const info = getFileTypeInfo('audio/mpeg');
        expect(info.icon).toBe(FileIcon);
        expect(info.category).toBe('other');
      });
    });
  });

  describe('validateFileType', () => {
    const createMockFile = (type: string): File => {
      return new File(['content'], 'test.file', { type });
    };

    describe('Default allowed types', () => {
      it('should allow image/jpeg', () => {
        const file = createMockFile('image/jpeg');
        expect(validateFileType(file)).toBe(true);
      });

      it('should allow image/png', () => {
        const file = createMockFile('image/png');
        expect(validateFileType(file)).toBe(true);
      });

      it('should allow application/pdf', () => {
        const file = createMockFile('application/pdf');
        expect(validateFileType(file)).toBe(true);
      });

      it('should allow Word documents (.docx)', () => {
        const file = createMockFile(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        );
        expect(validateFileType(file)).toBe(true);
      });

      it('should allow Excel documents (.xlsx)', () => {
        const file = createMockFile(
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        expect(validateFileType(file)).toBe(true);
      });

      it('should allow text/plain', () => {
        const file = createMockFile('text/plain');
        expect(validateFileType(file)).toBe(true);
      });

      it('should reject video files by default', () => {
        const file = createMockFile('video/mp4');
        expect(validateFileType(file)).toBe(false);
      });

      it('should reject audio files by default', () => {
        const file = createMockFile('audio/mpeg');
        expect(validateFileType(file)).toBe(false);
      });

      it('should reject unknown MIME types by default', () => {
        const file = createMockFile('application/x-custom');
        expect(validateFileType(file)).toBe(false);
      });
    });

    describe('Custom allowed types', () => {
      it('should allow only specified types when custom list provided', () => {
        const pngFile = createMockFile('image/png');
        const jpegFile = createMockFile('image/jpeg');
        const pdfFile = createMockFile('application/pdf');

        const allowedTypes = ['image/png', 'image/jpeg'];

        expect(validateFileType(pngFile, allowedTypes)).toBe(true);
        expect(validateFileType(jpegFile, allowedTypes)).toBe(true);
        expect(validateFileType(pdfFile, allowedTypes)).toBe(false);
      });

      it('should handle empty custom allowed types list', () => {
        const file = createMockFile('image/png');
        expect(validateFileType(file, [])).toBe(false);
      });
    });
  });

  describe('validateFileSize', () => {
    const createMockFileWithSize = (sizeInBytes: number): File => {
      // Mock only the size property - validateFileSize only reads file.size
      // No need to allocate actual MB of data in memory
      const file = new File([''], 'test.file', { type: 'text/plain' });
      Object.defineProperty(file, 'size', {
        value: sizeInBytes,
        writable: false,
        configurable: true,
      });
      return file;
    };

    describe('Default max size (10MB)', () => {
      it('should allow files smaller than 10MB', () => {
        const file = createMockFileWithSize(5 * 1024 * 1024); // 5MB
        expect(validateFileSize(file)).toBe(true);
      });

      it('should allow files exactly 10MB', () => {
        const file = createMockFileWithSize(10 * 1024 * 1024); // 10MB
        expect(validateFileSize(file)).toBe(true);
      });

      it('should reject files larger than 10MB', () => {
        const file = createMockFileWithSize(11 * 1024 * 1024); // 11MB
        expect(validateFileSize(file)).toBe(false);
      });

      it('should allow empty files', () => {
        const file = createMockFileWithSize(0);
        expect(validateFileSize(file)).toBe(true);
      });

      it('should allow very small files', () => {
        const file = createMockFileWithSize(100); // 100 bytes
        expect(validateFileSize(file)).toBe(true);
      });
    });

    describe('Custom max size', () => {
      it('should respect custom max size (5MB)', () => {
        const maxSize = 5 * 1024 * 1024;
        const smallFile = createMockFileWithSize(3 * 1024 * 1024);
        const largeFile = createMockFileWithSize(6 * 1024 * 1024);

        expect(validateFileSize(smallFile, maxSize)).toBe(true);
        expect(validateFileSize(largeFile, maxSize)).toBe(false);
      });

      it('should handle custom max size at boundary', () => {
        const maxSize = 2 * 1024 * 1024; // 2MB
        const exactFile = createMockFileWithSize(2 * 1024 * 1024);
        const slightlyLarger = createMockFileWithSize(2 * 1024 * 1024 + 1);

        expect(validateFileSize(exactFile, maxSize)).toBe(true);
        expect(validateFileSize(slightlyLarger, maxSize)).toBe(false);
      });
    });
  });

  describe('createFilePreview', () => {
    let originalCreateObjectURL: typeof URL.createObjectURL;
    let originalRevokeObjectURL: typeof URL.revokeObjectURL;

    beforeEach(() => {
      originalCreateObjectURL = URL.createObjectURL;
      originalRevokeObjectURL = URL.revokeObjectURL;
      URL.createObjectURL = vi.fn(() => 'blob:mock-url-12345');
      URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    });

    it('should create preview URL for image files', async () => {
      const file = new File(['content'], 'test.png', { type: 'image/png' });
      const preview = await createFilePreview(file);

      expect(preview).toBe('blob:mock-url-12345');
      expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    });

    it('should create preview for different image types', async () => {
      const jpegFile = new File(['content'], 'test.jpg', {
        type: 'image/jpeg',
      });
      const gifFile = new File(['content'], 'test.gif', { type: 'image/gif' });
      const webpFile = new File(['content'], 'test.webp', {
        type: 'image/webp',
      });

      expect(await createFilePreview(jpegFile)).toBe('blob:mock-url-12345');
      expect(await createFilePreview(gifFile)).toBe('blob:mock-url-12345');
      expect(await createFilePreview(webpFile)).toBe('blob:mock-url-12345');
    });

    it('should return undefined for non-image files', async () => {
      const pdfFile = new File(['content'], 'test.pdf', {
        type: 'application/pdf',
      });
      const preview = await createFilePreview(pdfFile);

      expect(preview).toBeUndefined();
      expect(URL.createObjectURL).not.toHaveBeenCalled();
    });

    it('should return undefined for text files', async () => {
      const textFile = new File(['content'], 'test.txt', {
        type: 'text/plain',
      });
      const preview = await createFilePreview(textFile);

      expect(preview).toBeUndefined();
    });

    it('should return undefined for document files', async () => {
      const docFile = new File(['content'], 'test.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const preview = await createFilePreview(docFile);

      expect(preview).toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
      URL.createObjectURL = vi.fn(() => {
        throw new Error('Failed to create object URL');
      });

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const file = new File(['content'], 'test.png', { type: 'image/png' });
      const preview = await createFilePreview(file);

      expect(preview).toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to create file preview:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
