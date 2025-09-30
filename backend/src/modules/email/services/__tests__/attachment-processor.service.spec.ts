import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { AttachmentProcessorService } from '../attachment-processor.service';
import { AttachmentEntity } from 'src/modules/claims/entities/attachment.entity';
import { GoogleDriveClient } from 'src/modules/attachments/services/google-drive-client.service';

/**
 * AttachmentProcessorService Tests
 *
 * Tests the hybrid attachment strategy that decides whether to attach files
 * to emails or keep them as Drive links based on size and download success.
 *
 * Requirement: email-attachments-analysis Task 3.2 - Unit tests for AttachmentProcessorService
 */
describe('AttachmentProcessorService', () => {
  let attachmentProcessorService: AttachmentProcessorService;
  let mockGoogleDriveClient: {
    downloadFile: Mock;
  };

  const userId = 'user-123';

  beforeEach(() => {
    mockGoogleDriveClient = {
      downloadFile: vi.fn(),
    };

    attachmentProcessorService = new AttachmentProcessorService(
      mockGoogleDriveClient as unknown as GoogleDriveClient,
    );
  });

  /**
   * Helper function to create mock attachment entities
   */
  function createMockAttachment(
    filename: string,
    fileSize: number,
    mimeType = 'application/pdf',
  ): AttachmentEntity {
    return {
      id: `attach-${filename}`,
      originalFilename: filename,
      fileSize,
      mimeType,
      googleDriveFileId: `drive-${filename}`,
      googleDriveUrl: `https://drive.google.com/file/d/drive-${filename}`,
      uploadedAt: new Date(),
    } as unknown as AttachmentEntity;
  }

  describe('processAttachments', () => {
    describe('size-based decision logic', () => {
      it('should attach files <5MB as email attachments', async () => {
        const smallFile = createMockAttachment('small.pdf', 3 * 1024 * 1024); // 3MB
        const buffer = Buffer.from('mock-file-content');

        mockGoogleDriveClient.downloadFile.mockResolvedValue(buffer);

        const result = await attachmentProcessorService.processAttachments(
          userId,
          [smallFile],
        );

        expect(result.attachments).toHaveLength(1);
        expect(result.attachments[0]).toEqual({
          filename: 'small.pdf',
          buffer,
          mimeType: 'application/pdf',
          size: 3 * 1024 * 1024,
        });
        expect(result.links).toHaveLength(0);
        expect(result.totalAttachmentSize).toBe(3 * 1024 * 1024);
      });

      it('should use Drive links for files ≥5MB', async () => {
        const largeFile = createMockAttachment('large.pdf', 6 * 1024 * 1024); // 6MB

        const result = await attachmentProcessorService.processAttachments(
          userId,
          [largeFile],
        );

        expect(result.attachments).toHaveLength(0);
        expect(result.links).toHaveLength(1);
        expect(result.links[0]).toEqual({
          filename: 'large.pdf',
          driveUrl: `https://drive.google.com/file/d/drive-large.pdf`,
          size: 6 * 1024 * 1024,
          reason: 'size-exceeded',
        });
        expect(result.totalAttachmentSize).toBe(0);
        expect(mockGoogleDriveClient.downloadFile).not.toHaveBeenCalled();
      });

      it('should use Drive links for files exactly at 5MB threshold', async () => {
        const exactThresholdFile = createMockAttachment(
          'exact.pdf',
          5 * 1024 * 1024,
        ); // Exactly 5MB

        const result = await attachmentProcessorService.processAttachments(
          userId,
          [exactThresholdFile],
        );

        expect(result.attachments).toHaveLength(0);
        expect(result.links).toHaveLength(1);
        expect(result.links[0].reason).toBe('size-exceeded');
        expect(mockGoogleDriveClient.downloadFile).not.toHaveBeenCalled();
      });

      it('should attach files just below 5MB threshold', async () => {
        const justBelowThreshold = createMockAttachment(
          'almost.pdf',
          5 * 1024 * 1024 - 1,
        ); // 5MB - 1 byte
        const buffer = Buffer.from('content');

        mockGoogleDriveClient.downloadFile.mockResolvedValue(buffer);

        const result = await attachmentProcessorService.processAttachments(
          userId,
          [justBelowThreshold],
        );

        expect(result.attachments).toHaveLength(1);
        expect(result.links).toHaveLength(0);
        expect(mockGoogleDriveClient.downloadFile).toHaveBeenCalled();
      });
    });

    describe('20MB total size limit', () => {
      it('should respect 20MB total size limit', async () => {
        const file1 = createMockAttachment('file1.pdf', 4 * 1024 * 1024); // 4MB
        const file2 = createMockAttachment('file2.pdf', 4 * 1024 * 1024); // 4MB
        const file3 = createMockAttachment('file3.pdf', 4 * 1024 * 1024); // 4MB
        const file4 = createMockAttachment('file4.pdf', 4 * 1024 * 1024); // 4MB
        const file5 = createMockAttachment('file5.pdf', 4 * 1024 * 1024); // 4MB
        const file6 = createMockAttachment('file6.pdf', 1 * 1024 * 1024); // 1MB

        mockGoogleDriveClient.downloadFile.mockResolvedValue(
          Buffer.from('content'),
        );

        const result = await attachmentProcessorService.processAttachments(
          userId,
          [file1, file2, file3, file4, file5, file6],
        );

        // Files sorted by size: file6 (1MB) first, then file1-5 (4MB each)
        // Processing: 1MB + 4MB + 4MB + 4MB + 4MB = 17MB (5 files attached)
        // Next 4MB would make 21MB (exceeds 20MB limit) → becomes link
        expect(result.attachments).toHaveLength(5);
        expect(result.links).toHaveLength(1);
        expect(result.totalAttachmentSize).toBe(17 * 1024 * 1024);
        expect(result.links[0].reason).toBe('size-exceeded');
      });

      it('should stop attaching when projected size would exceed 20MB', async () => {
        const file1 = createMockAttachment('file1.pdf', 4.5 * 1024 * 1024); // 4.5MB
        const file2 = createMockAttachment('file2.pdf', 4.5 * 1024 * 1024); // 4.5MB
        const file3 = createMockAttachment('file3.pdf', 4.5 * 1024 * 1024); // 4.5MB
        const file4 = createMockAttachment('file4.pdf', 4.5 * 1024 * 1024); // 4.5MB
        const file5 = createMockAttachment('file5.pdf', 2.1 * 1024 * 1024); // 2.1MB - would exceed 20MB

        mockGoogleDriveClient.downloadFile.mockResolvedValue(
          Buffer.from('content'),
        );

        const result = await attachmentProcessorService.processAttachments(
          userId,
          [file1, file2, file3, file4, file5],
        );

        // Files sorted by size: file5 (2.1MB) first, then file1-4 (4.5MB each)
        // Processing: 2.1MB + 4.5MB + 4.5MB + 4.5MB + 4.5MB = 20.1MB
        // Last 4.5MB would make 20.1MB (exceeds 20MB limit) → becomes link
        expect(result.attachments).toHaveLength(4);
        expect(result.links).toHaveLength(1);
        expect(result.totalAttachmentSize).toBe(15.6 * 1024 * 1024);
      });

      it('should allow exactly 20MB total', async () => {
        const file1 = createMockAttachment('file1.pdf', 4 * 1024 * 1024); // 4MB
        const file2 = createMockAttachment('file2.pdf', 4 * 1024 * 1024); // 4MB
        const file3 = createMockAttachment('file3.pdf', 4 * 1024 * 1024); // 4MB
        const file4 = createMockAttachment('file4.pdf', 4 * 1024 * 1024); // 4MB
        const file5 = createMockAttachment('file5.pdf', 4 * 1024 * 1024); // 4MB - exactly 20MB

        mockGoogleDriveClient.downloadFile.mockResolvedValue(
          Buffer.from('content'),
        );

        const result = await attachmentProcessorService.processAttachments(
          userId,
          [file1, file2, file3, file4, file5],
        );

        expect(result.attachments).toHaveLength(5);
        expect(result.links).toHaveLength(0);
        expect(result.totalAttachmentSize).toBe(20 * 1024 * 1024);
      });

      it('should not allow exceeding 20MB by 1 byte', async () => {
        const file1 = createMockAttachment('file1.pdf', 4 * 1024 * 1024); // 4MB
        const file2 = createMockAttachment('file2.pdf', 4 * 1024 * 1024); // 4MB
        const file3 = createMockAttachment('file3.pdf', 4 * 1024 * 1024); // 4MB
        const file4 = createMockAttachment('file4.pdf', 4 * 1024 * 1024); // 4MB
        const file5 = createMockAttachment('file5.pdf', 4 * 1024 * 1024); // 4MB
        const file6 = createMockAttachment('file6.pdf', 1); // 1 byte - would exceed 20MB

        mockGoogleDriveClient.downloadFile.mockResolvedValue(
          Buffer.from('content'),
        );

        const result = await attachmentProcessorService.processAttachments(
          userId,
          [file1, file2, file3, file4, file5, file6],
        );

        expect(result.attachments).toHaveLength(5); // file1-5
        expect(result.links).toHaveLength(1); // file6 as link
      });
    });

    describe('download failure fallback', () => {
      it('should fallback to link on download failure', async () => {
        const smallFile = createMockAttachment('failing.pdf', 2 * 1024 * 1024); // 2MB

        mockGoogleDriveClient.downloadFile.mockRejectedValue(
          new Error('Download failed'),
        );

        const result = await attachmentProcessorService.processAttachments(
          userId,
          [smallFile],
        );

        expect(result.attachments).toHaveLength(0);
        expect(result.links).toHaveLength(1);
        expect(result.links[0]).toEqual({
          filename: 'failing.pdf',
          driveUrl: `https://drive.google.com/file/d/drive-failing.pdf`,
          size: 2 * 1024 * 1024,
          reason: 'download-failed',
        });
        expect(result.totalAttachmentSize).toBe(0);
      });

      it('should continue processing other files after download failure', async () => {
        const file1 = createMockAttachment('success.pdf', 2 * 1024 * 1024); // 2MB
        const file2 = createMockAttachment('failure.pdf', 3 * 1024 * 1024); // 3MB
        const file3 = createMockAttachment('success2.pdf', 1 * 1024 * 1024); // 1MB

        // Files are sorted by size: success2.pdf (1MB), success.pdf (2MB), failure.pdf (3MB)
        mockGoogleDriveClient.downloadFile
          .mockResolvedValueOnce(Buffer.from('content3')) // success2.pdf (1MB)
          .mockResolvedValueOnce(Buffer.from('content1')) // success.pdf (2MB)
          .mockRejectedValueOnce(new Error('Network error')); // failure.pdf (3MB)

        const result = await attachmentProcessorService.processAttachments(
          userId,
          [file1, file2, file3],
        );

        expect(result.attachments).toHaveLength(2); // file1 and file3
        expect(result.links).toHaveLength(1); // file2
        expect(result.links[0].filename).toBe('failure.pdf');
        expect(result.links[0].reason).toBe('download-failed');
        expect(result.totalAttachmentSize).toBe(3 * 1024 * 1024); // 2MB + 1MB
      });

      it('should handle all files failing gracefully', async () => {
        const file1 = createMockAttachment('fail1.pdf', 2 * 1024 * 1024);
        const file2 = createMockAttachment('fail2.pdf', 3 * 1024 * 1024);

        mockGoogleDriveClient.downloadFile.mockRejectedValue(
          new Error('Service unavailable'),
        );

        const result = await attachmentProcessorService.processAttachments(
          userId,
          [file1, file2],
        );

        expect(result.attachments).toHaveLength(0);
        expect(result.links).toHaveLength(2);
        expect(result.links[0].reason).toBe('download-failed');
        expect(result.links[1].reason).toBe('download-failed');
        expect(result.totalAttachmentSize).toBe(0);
      });
    });

    describe('sorting smallest files first', () => {
      it('should sort files by size (smallest first)', async () => {
        const large = createMockAttachment('large.pdf', 4 * 1024 * 1024); // 4MB
        const small = createMockAttachment('small.pdf', 1 * 1024 * 1024); // 1MB
        const medium = createMockAttachment('medium.pdf', 2 * 1024 * 1024); // 2MB

        const downloadOrder: string[] = [];
        mockGoogleDriveClient.downloadFile.mockImplementation(
          (_userId: string, fileId: string) => {
            downloadOrder.push(fileId);
            return Promise.resolve(Buffer.from('content'));
          },
        );

        await attachmentProcessorService.processAttachments(userId, [
          large,
          small,
          medium,
        ]);

        // Should download in order: small, medium, large
        expect(downloadOrder).toEqual([
          'drive-small.pdf',
          'drive-medium.pdf',
          'drive-large.pdf',
        ]);
      });

      it('should maximize attachment count within size limit by sorting', async () => {
        // Scenario: 20MB limit
        // Without sorting: [4.5MB, 4MB, 3MB] → attach all (11.5MB)
        // But to test sorting behavior with limit:
        // [4.5MB, 4.5MB, 4.5MB, 4.5MB, 1MB] = 19MB total
        // If we add another 4.5MB, only first 4 fit (18MB), 5th would exceed
        const file45mb_1 = createMockAttachment(
          '4.5mb-1.pdf',
          4.5 * 1024 * 1024,
        );
        const file45mb_2 = createMockAttachment(
          '4.5mb-2.pdf',
          4.5 * 1024 * 1024,
        );
        const file45mb_3 = createMockAttachment(
          '4.5mb-3.pdf',
          4.5 * 1024 * 1024,
        );
        const file45mb_4 = createMockAttachment(
          '4.5mb-4.pdf',
          4.5 * 1024 * 1024,
        );
        const file1mb = createMockAttachment('1mb.pdf', 1 * 1024 * 1024);

        mockGoogleDriveClient.downloadFile.mockResolvedValue(
          Buffer.from('content'),
        );

        const result = await attachmentProcessorService.processAttachments(
          userId,
          [file45mb_1, file45mb_2, file45mb_3, file45mb_4, file1mb],
        );

        // With sorting: 1MB first, then 4.5MB files
        // 1MB + 4.5MB + 4.5MB + 4.5MB + 4.5MB = 19MB (all fit)
        expect(result.attachments).toHaveLength(5);
        expect(result.attachments[0].filename).toBe('1mb.pdf');
        expect(result.links).toHaveLength(0);
      });

      it('should not mutate original array when sorting', async () => {
        const file1 = createMockAttachment('z.pdf', 3 * 1024 * 1024);
        const file2 = createMockAttachment('a.pdf', 1 * 1024 * 1024);
        const originalOrder = [file1, file2];

        mockGoogleDriveClient.downloadFile.mockResolvedValue(
          Buffer.from('content'),
        );

        await attachmentProcessorService.processAttachments(
          userId,
          originalOrder,
        );

        // Original array should remain unchanged
        expect(originalOrder[0]).toBe(file1);
        expect(originalOrder[1]).toBe(file2);
      });
    });

    describe('empty attachments array', () => {
      it('should handle empty attachments array', async () => {
        const result = await attachmentProcessorService.processAttachments(
          userId,
          [],
        );

        expect(result.attachments).toHaveLength(0);
        expect(result.links).toHaveLength(0);
        expect(result.totalAttachmentSize).toBe(0);
        expect(mockGoogleDriveClient.downloadFile).not.toHaveBeenCalled();
      });
    });

    describe('edge cases', () => {
      it('should handle very small files (1 byte)', async () => {
        const tinyFile = createMockAttachment('tiny.txt', 1);

        mockGoogleDriveClient.downloadFile.mockResolvedValue(Buffer.from('a'));

        const result = await attachmentProcessorService.processAttachments(
          userId,
          [tinyFile],
        );

        expect(result.attachments).toHaveLength(1);
        expect(result.totalAttachmentSize).toBe(1);
      });

      it('should handle files with special characters in filename', async () => {
        const specialFile = createMockAttachment(
          'file (copy) [1].pdf',
          1 * 1024 * 1024,
        );

        mockGoogleDriveClient.downloadFile.mockResolvedValue(
          Buffer.from('content'),
        );

        const result = await attachmentProcessorService.processAttachments(
          userId,
          [specialFile],
        );

        expect(result.attachments[0].filename).toBe('file (copy) [1].pdf');
      });

      it('should handle different MIME types', async () => {
        const pdf = createMockAttachment('doc.pdf', 1024, 'application/pdf');
        const image = createMockAttachment('pic.jpg', 2048, 'image/jpeg');
        const text = createMockAttachment('note.txt', 512, 'text/plain');

        mockGoogleDriveClient.downloadFile.mockResolvedValue(
          Buffer.from('content'),
        );

        const result = await attachmentProcessorService.processAttachments(
          userId,
          [pdf, image, text],
        );

        expect(result.attachments).toHaveLength(3);
        expect(result.attachments[0].mimeType).toBe('text/plain');
        expect(result.attachments[1].mimeType).toBe('application/pdf');
        expect(result.attachments[2].mimeType).toBe('image/jpeg');
      });

      it('should handle many small files within limit', async () => {
        const files = Array.from({ length: 20 }, (_, i) =>
          createMockAttachment(`file${i}.pdf`, 0.5 * 1024 * 1024),
        ); // 20 files × 0.5MB = 10MB

        mockGoogleDriveClient.downloadFile.mockResolvedValue(
          Buffer.from('content'),
        );

        const result = await attachmentProcessorService.processAttachments(
          userId,
          files,
        );

        expect(result.attachments).toHaveLength(20);
        expect(result.links).toHaveLength(0);
        expect(result.totalAttachmentSize).toBe(10 * 1024 * 1024);
      });

      it('should handle mixed scenario: size exceeded, download failed, and success', async () => {
        const small = createMockAttachment('small.pdf', 2 * 1024 * 1024); // 2MB - will succeed
        const large = createMockAttachment('large.pdf', 6 * 1024 * 1024); // 6MB - size exceeded
        const failing = createMockAttachment('failing.pdf', 3 * 1024 * 1024); // 3MB - will fail

        mockGoogleDriveClient.downloadFile
          .mockResolvedValueOnce(Buffer.from('success'))
          .mockRejectedValueOnce(new Error('Network error'));

        const result = await attachmentProcessorService.processAttachments(
          userId,
          [small, large, failing],
        );

        expect(result.attachments).toHaveLength(1); // small
        expect(result.links).toHaveLength(2); // large (size-exceeded), failing (download-failed)

        const sizeExceededLink = result.links.find(
          (l) => l.filename === 'large.pdf',
        );
        const downloadFailedLink = result.links.find(
          (l) => l.filename === 'failing.pdf',
        );

        expect(sizeExceededLink?.reason).toBe('size-exceeded');
        expect(downloadFailedLink?.reason).toBe('download-failed');
      });

      it('should correctly calculate total size with mixed results', async () => {
        const file1 = createMockAttachment('file1.pdf', 3 * 1024 * 1024); // 3MB - attached
        const file2 = createMockAttachment('file2.pdf', 6 * 1024 * 1024); // 6MB - size exceeded
        const file3 = createMockAttachment('file3.pdf', 2 * 1024 * 1024); // 2MB - attached

        mockGoogleDriveClient.downloadFile.mockResolvedValue(
          Buffer.from('content'),
        );

        const result = await attachmentProcessorService.processAttachments(
          userId,
          [file1, file2, file3],
        );

        expect(result.totalAttachmentSize).toBe(5 * 1024 * 1024); // Only file1 + file3
      });
    });

    describe('return value structure', () => {
      it('should return correct ProcessedAttachments structure', async () => {
        const file = createMockAttachment('test.pdf', 1 * 1024 * 1024);

        mockGoogleDriveClient.downloadFile.mockResolvedValue(
          Buffer.from('content'),
        );

        const result = await attachmentProcessorService.processAttachments(
          userId,
          [file],
        );

        expect(result).toHaveProperty('attachments');
        expect(result).toHaveProperty('links');
        expect(result).toHaveProperty('totalAttachmentSize');
        expect(Array.isArray(result.attachments)).toBe(true);
        expect(Array.isArray(result.links)).toBe(true);
        expect(typeof result.totalAttachmentSize).toBe('number');
      });

      it('should return attachment with correct structure', async () => {
        const file = createMockAttachment('test.pdf', 1 * 1024 * 1024);
        const buffer = Buffer.from('mock-content');

        mockGoogleDriveClient.downloadFile.mockResolvedValue(buffer);

        const result = await attachmentProcessorService.processAttachments(
          userId,
          [file],
        );

        expect(result.attachments[0]).toHaveProperty('filename');
        expect(result.attachments[0]).toHaveProperty('buffer');
        expect(result.attachments[0]).toHaveProperty('mimeType');
        expect(result.attachments[0]).toHaveProperty('size');
        expect(result.attachments[0].buffer).toBe(buffer);
      });

      it('should return link with correct structure', async () => {
        const file = createMockAttachment('large.pdf', 6 * 1024 * 1024);

        const result = await attachmentProcessorService.processAttachments(
          userId,
          [file],
        );

        expect(result.links[0]).toHaveProperty('filename');
        expect(result.links[0]).toHaveProperty('driveUrl');
        expect(result.links[0]).toHaveProperty('size');
        expect(result.links[0]).toHaveProperty('reason');
        expect(['size-exceeded', 'download-failed']).toContain(
          result.links[0].reason,
        );
      });
    });
  });
});
