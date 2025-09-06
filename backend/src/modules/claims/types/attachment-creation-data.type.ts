export interface IAttachmentCreationData {
  claimId: string;
  originalFilename: string;
  storedFilename: string;
  googleDriveFileId?: string;
  googleDriveUrl?: string;
  fileSize: number;
  mimeType: string;
}
