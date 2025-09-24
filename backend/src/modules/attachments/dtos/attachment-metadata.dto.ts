import {
  IsString,
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsNumber,
  IsPositive,
  Length,
  Matches,
  IsEnum,
} from 'class-validator';
import { AttachmentMimeType } from '@project/types';

export class AttachmentMetadataDto {
  @IsUUID()
  @IsNotEmpty()
  claimId: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  originalFilename: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  storedFilename: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Google Drive file ID contains invalid characters',
  })
  googleDriveFileId: string;

  @IsUrl({}, { message: 'Google Drive URL must be a valid URL' })
  @IsNotEmpty()
  googleDriveUrl: string;

  @IsNumber()
  @IsPositive()
  fileSize: number;

  @IsEnum(AttachmentMimeType, {
    message: `MIME type must be one of: ${Object.values(AttachmentMimeType).join(', ')}`,
  })
  mimeType: AttachmentMimeType;

  @IsUUID()
  @IsOptional()
  parentFolderId?: string;
}

export class AttachmentMetadataUpdateDto {
  @IsString()
  @IsOptional()
  @Length(1, 255)
  originalFilename?: string;

  @IsString()
  @IsOptional()
  @Length(1, 255)
  storedFilename?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Google Drive file ID contains invalid characters',
  })
  googleDriveFileId?: string;

  @IsUrl({}, { message: 'Google Drive URL must be a valid URL' })
  @IsOptional()
  googleDriveUrl?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  fileSize?: number;

  @IsEnum(AttachmentMimeType, {
    message: `MIME type must be one of: ${Object.values(AttachmentMimeType).join(', ')}`,
  })
  @IsOptional()
  mimeType?: AttachmentMimeType;
}
