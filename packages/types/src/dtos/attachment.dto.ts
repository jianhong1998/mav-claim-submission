export const AttachmentStatus = Object.freeze({
  PENDING: 'pending',
  UPLOADED: 'uploaded',
  FAILED: 'failed',
} as const);
export type AttachmentStatus =
  (typeof AttachmentStatus)[keyof typeof AttachmentStatus];

export const AttachmentMimeType = Object.freeze({
  PDF: 'application/pdf',
  PNG: 'image/png',
  JPEG: 'image/jpeg',
  JPG: 'image/jpeg',
  IMG: 'image/jpeg',
} as const);
export type AttachmentMimeType =
  (typeof AttachmentMimeType)[keyof typeof AttachmentMimeType];

export type IAttachmentUploadRequest = {
  fileName: string;
  fileSize: number;
  mimeType: AttachmentMimeType;
  claimId: string;
  parentFolderId?: string;
};

export type IAttachmentUploadResponse = {
  success: boolean;
  attachmentId?: string;
  fileId?: string;
  fileName?: string;
  webViewLink?: string;
  status?: AttachmentStatus;
  error?: string;
};

export type IAttachmentMetadata = {
  id: string;
  claimId: string;
  originalFilename: string;
  storedFilename: string;
  fileSize: number;
  mimeType: AttachmentMimeType;
  driveFileId: string;
  driveShareableUrl: string;
  status: AttachmentStatus;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type IAttachmentListResponse = {
  success: boolean;
  attachments?: IAttachmentMetadata[];
  total?: number;
  error?: string;
};

export type IAttachmentStatusUpdate = {
  attachmentId: string;
  status: AttachmentStatus;
  error?: string;
};

export type IAttachmentStatusResponse = {
  success: boolean;
  attachmentId?: string;
  status?: AttachmentStatus;
  error?: string;
};

export type IAttachmentValidation = {
  isValid: boolean;
  fileName?: string;
  fileSize?: number;
  mimeType?: AttachmentMimeType;
  errors?: string[];
};

export type IAttachmentBulkUploadRequest = {
  attachments: IAttachmentUploadRequest[];
  claimId: string;
};

export type IAttachmentBulkUploadResponse = {
  success: boolean;
  results?: IAttachmentUploadResponse[];
  totalProcessed?: number;
  totalSuccessful?: number;
  totalFailed?: number;
  error?: string;
};
