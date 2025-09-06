import { IsNotEmpty, IsOptional, MaxLength, IsIn } from 'class-validator';
import {
  IDriveUploadRequest,
  IDriveOperationRequest,
  IDriveFolderCreateRequest,
  IDrivePermissionUpdateRequest,
} from '@project/types';

export class DriveUploadRequestDto implements IDriveUploadRequest {
  @IsNotEmpty({ message: 'File name is required' })
  @MaxLength(255, { message: 'File name too long (max 255 characters)' })
  fileName: string;

  @IsOptional()
  @MaxLength(100, { message: 'Parent folder ID too long (max 100 characters)' })
  parentFolderId?: string;

  @IsOptional()
  @MaxLength(1000, { message: 'Description too long (max 1000 characters)' })
  description?: string;
}

export class DriveOperationRequestDto implements IDriveOperationRequest {
  @IsNotEmpty({ message: 'Operation type is required' })
  @IsIn(['create-folder', 'get-metadata', 'update-permissions'], {
    message: 'Invalid operation type',
  })
  operation: 'create-folder' | 'get-metadata' | 'update-permissions';

  @IsOptional()
  @MaxLength(100, { message: 'Parent folder ID too long (max 100 characters)' })
  parentFolderId?: string;

  @IsOptional()
  @MaxLength(255, { message: 'Folder name too long (max 255 characters)' })
  folderName?: string;
}

export class DriveFolderCreateRequestDto implements IDriveFolderCreateRequest {
  @IsNotEmpty({ message: 'Folder name is required' })
  @MaxLength(255, { message: 'Folder name too long (max 255 characters)' })
  folderName: string;

  @IsOptional()
  @MaxLength(100, { message: 'Parent folder ID too long (max 100 characters)' })
  parentFolderId?: string;
}

export class DrivePermissionUpdateRequestDto
  implements IDrivePermissionUpdateRequest
{
  @IsNotEmpty({ message: 'File ID is required' })
  @MaxLength(100, { message: 'File ID too long (max 100 characters)' })
  fileId: string;

  @IsNotEmpty({ message: 'Permission type is required' })
  @IsIn(['anyone', 'domain', 'user'], {
    message: 'Invalid permission type',
  })
  permissionType: 'anyone' | 'domain' | 'user';

  @IsNotEmpty({ message: 'Role is required' })
  @IsIn(['reader', 'writer', 'commenter'], {
    message: 'Invalid role',
  })
  role: 'reader' | 'writer' | 'commenter';
}
