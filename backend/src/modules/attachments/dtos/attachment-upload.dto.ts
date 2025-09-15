import { IsOptional, IsUUID } from 'class-validator';

export class AttachmentUploadDto {
  @IsUUID()
  claimId: string;

  @IsUUID()
  @IsOptional()
  parentFolderId?: string;
}
