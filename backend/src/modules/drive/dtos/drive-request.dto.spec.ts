import { validate } from 'class-validator';
import { describe, it, expect } from 'vitest';
import {
  DriveUploadRequestDto,
  DriveOperationRequestDto,
  DriveFolderCreateRequestDto,
  DrivePermissionUpdateRequestDto,
} from './drive-request.dto';

describe('Drive Request DTOs', () => {
  describe('DriveUploadRequestDto', () => {
    describe('fileName validation', () => {
      it('should pass validation with valid file name', async () => {
        const dto = new DriveUploadRequestDto();
        dto.fileName = 'test-file.txt';

        const errors = await validate(dto);
        const fileNameErrors = errors.filter(
          (error) => error.property === 'fileName',
        );

        expect(fileNameErrors).toHaveLength(0);
      });

      it('should fail validation when fileName is empty', async () => {
        const dto = new DriveUploadRequestDto();
        dto.fileName = '';

        const errors = await validate(dto);
        const fileNameErrors = errors.filter(
          (error) => error.property === 'fileName',
        );

        expect(fileNameErrors).toHaveLength(1);
        expect(fileNameErrors[0].constraints?.isNotEmpty).toBe(
          'File name is required',
        );
      });

      it('should fail validation when fileName is not provided', async () => {
        const dto = new DriveUploadRequestDto();

        const errors = await validate(dto);
        const fileNameErrors = errors.filter(
          (error) => error.property === 'fileName',
        );

        expect(fileNameErrors).toHaveLength(1);
        expect(fileNameErrors[0].constraints?.isNotEmpty).toBe(
          'File name is required',
        );
      });

      it('should fail validation when fileName exceeds max length', async () => {
        const dto = new DriveUploadRequestDto();
        dto.fileName = 'a'.repeat(256); // Exceeds 255 character limit

        const errors = await validate(dto);
        const fileNameErrors = errors.filter(
          (error) => error.property === 'fileName',
        );

        expect(fileNameErrors).toHaveLength(1);
        expect(fileNameErrors[0].constraints?.maxLength).toBe(
          'File name too long (max 255 characters)',
        );
      });

      it('should pass validation with fileName at max length', async () => {
        const dto = new DriveUploadRequestDto();
        dto.fileName = 'a'.repeat(255); // Exactly 255 characters

        const errors = await validate(dto);
        const fileNameErrors = errors.filter(
          (error) => error.property === 'fileName',
        );

        expect(fileNameErrors).toHaveLength(0);
      });
    });

    describe('parentFolderId validation', () => {
      it('should pass validation when parentFolderId is not provided', async () => {
        const dto = new DriveUploadRequestDto();
        dto.fileName = 'test-file.txt';

        const errors = await validate(dto);
        const parentFolderErrors = errors.filter(
          (error) => error.property === 'parentFolderId',
        );

        expect(parentFolderErrors).toHaveLength(0);
      });

      it('should pass validation with valid parentFolderId', async () => {
        const dto = new DriveUploadRequestDto();
        dto.fileName = 'test-file.txt';
        dto.parentFolderId = 'valid-folder-id-123';

        const errors = await validate(dto);
        const parentFolderErrors = errors.filter(
          (error) => error.property === 'parentFolderId',
        );

        expect(parentFolderErrors).toHaveLength(0);
      });

      it('should fail validation when parentFolderId exceeds max length', async () => {
        const dto = new DriveUploadRequestDto();
        dto.fileName = 'test-file.txt';
        dto.parentFolderId = 'a'.repeat(101); // Exceeds 100 character limit

        const errors = await validate(dto);
        const parentFolderErrors = errors.filter(
          (error) => error.property === 'parentFolderId',
        );

        expect(parentFolderErrors).toHaveLength(1);
        expect(parentFolderErrors[0].constraints?.maxLength).toBe(
          'Parent folder ID too long (max 100 characters)',
        );
      });

      it('should pass validation with parentFolderId at max length', async () => {
        const dto = new DriveUploadRequestDto();
        dto.fileName = 'test-file.txt';
        dto.parentFolderId = 'a'.repeat(100); // Exactly 100 characters

        const errors = await validate(dto);
        const parentFolderErrors = errors.filter(
          (error) => error.property === 'parentFolderId',
        );

        expect(parentFolderErrors).toHaveLength(0);
      });

      it('should pass validation with empty parentFolderId', async () => {
        const dto = new DriveUploadRequestDto();
        dto.fileName = 'test-file.txt';
        dto.parentFolderId = '';

        const errors = await validate(dto);
        const parentFolderErrors = errors.filter(
          (error) => error.property === 'parentFolderId',
        );

        expect(parentFolderErrors).toHaveLength(0);
      });
    });

    describe('description validation', () => {
      it('should pass validation when description is not provided', async () => {
        const dto = new DriveUploadRequestDto();
        dto.fileName = 'test-file.txt';

        const errors = await validate(dto);
        const descriptionErrors = errors.filter(
          (error) => error.property === 'description',
        );

        expect(descriptionErrors).toHaveLength(0);
      });

      it('should pass validation with valid description', async () => {
        const dto = new DriveUploadRequestDto();
        dto.fileName = 'test-file.txt';
        dto.description = 'This is a test file description';

        const errors = await validate(dto);
        const descriptionErrors = errors.filter(
          (error) => error.property === 'description',
        );

        expect(descriptionErrors).toHaveLength(0);
      });

      it('should fail validation when description exceeds max length', async () => {
        const dto = new DriveUploadRequestDto();
        dto.fileName = 'test-file.txt';
        dto.description = 'a'.repeat(1001); // Exceeds 1000 character limit

        const errors = await validate(dto);
        const descriptionErrors = errors.filter(
          (error) => error.property === 'description',
        );

        expect(descriptionErrors).toHaveLength(1);
        expect(descriptionErrors[0].constraints?.maxLength).toBe(
          'Description too long (max 1000 characters)',
        );
      });

      it('should pass validation with description at max length', async () => {
        const dto = new DriveUploadRequestDto();
        dto.fileName = 'test-file.txt';
        dto.description = 'a'.repeat(1000); // Exactly 1000 characters

        const errors = await validate(dto);
        const descriptionErrors = errors.filter(
          (error) => error.property === 'description',
        );

        expect(descriptionErrors).toHaveLength(0);
      });

      it('should pass validation with empty description', async () => {
        const dto = new DriveUploadRequestDto();
        dto.fileName = 'test-file.txt';
        dto.description = '';

        const errors = await validate(dto);
        const descriptionErrors = errors.filter(
          (error) => error.property === 'description',
        );

        expect(descriptionErrors).toHaveLength(0);
      });
    });
  });

  describe('DriveOperationRequestDto', () => {
    describe('operation validation', () => {
      const validOperations = [
        'create-folder',
        'get-metadata',
        'update-permissions',
      ] as const;

      validOperations.forEach((operation) => {
        it(`should pass validation with valid operation: ${operation}`, async () => {
          const dto = new DriveOperationRequestDto();
          dto.operation = operation;

          const errors = await validate(dto);
          const operationErrors = errors.filter(
            (error) => error.property === 'operation',
          );

          expect(operationErrors).toHaveLength(0);
        });
      });

      it('should fail validation when operation is not provided', async () => {
        const dto = new DriveOperationRequestDto();

        const errors = await validate(dto);
        const operationErrors = errors.filter(
          (error) => error.property === 'operation',
        );

        expect(operationErrors).toHaveLength(1);
        expect(operationErrors[0].constraints?.isNotEmpty).toBe(
          'Operation type is required',
        );
      });

      it('should fail validation when operation is empty', async () => {
        const dto = new DriveOperationRequestDto();
        (dto as unknown as { operation: string }).operation = '';

        const errors = await validate(dto);
        const operationErrors = errors.filter(
          (error) => error.property === 'operation',
        );

        expect(operationErrors).toHaveLength(1);
        expect(operationErrors[0].constraints?.isNotEmpty).toBe(
          'Operation type is required',
        );
      });

      it('should fail validation with invalid operation', async () => {
        const dto = new DriveOperationRequestDto();
        (dto as unknown as { operation: string }).operation =
          'invalid-operation';

        const errors = await validate(dto);
        const operationErrors = errors.filter(
          (error) => error.property === 'operation',
        );

        expect(operationErrors).toHaveLength(1);
        expect(operationErrors[0].constraints?.isIn).toBe(
          'Invalid operation type',
        );
      });
    });

    describe('parentFolderId validation', () => {
      it('should pass validation when parentFolderId is not provided', async () => {
        const dto = new DriveOperationRequestDto();
        dto.operation = 'create-folder';

        const errors = await validate(dto);
        const parentFolderErrors = errors.filter(
          (error) => error.property === 'parentFolderId',
        );

        expect(parentFolderErrors).toHaveLength(0);
      });

      it('should fail validation when parentFolderId exceeds max length', async () => {
        const dto = new DriveOperationRequestDto();
        dto.operation = 'create-folder';
        dto.parentFolderId = 'a'.repeat(101); // Exceeds 100 character limit

        const errors = await validate(dto);
        const parentFolderErrors = errors.filter(
          (error) => error.property === 'parentFolderId',
        );

        expect(parentFolderErrors).toHaveLength(1);
        expect(parentFolderErrors[0].constraints?.maxLength).toBe(
          'Parent folder ID too long (max 100 characters)',
        );
      });
    });

    describe('folderName validation', () => {
      it('should pass validation when folderName is not provided', async () => {
        const dto = new DriveOperationRequestDto();
        dto.operation = 'get-metadata';

        const errors = await validate(dto);
        const folderNameErrors = errors.filter(
          (error) => error.property === 'folderName',
        );

        expect(folderNameErrors).toHaveLength(0);
      });

      it('should fail validation when folderName exceeds max length', async () => {
        const dto = new DriveOperationRequestDto();
        dto.operation = 'create-folder';
        dto.folderName = 'a'.repeat(256); // Exceeds 255 character limit

        const errors = await validate(dto);
        const folderNameErrors = errors.filter(
          (error) => error.property === 'folderName',
        );

        expect(folderNameErrors).toHaveLength(1);
        expect(folderNameErrors[0].constraints?.maxLength).toBe(
          'Folder name too long (max 255 characters)',
        );
      });
    });
  });

  describe('DriveFolderCreateRequestDto', () => {
    describe('folderName validation', () => {
      it('should pass validation with valid folder name', async () => {
        const dto = new DriveFolderCreateRequestDto();
        dto.folderName = 'Test Folder';

        const errors = await validate(dto);
        const folderNameErrors = errors.filter(
          (error) => error.property === 'folderName',
        );

        expect(folderNameErrors).toHaveLength(0);
      });

      it('should fail validation when folderName is not provided', async () => {
        const dto = new DriveFolderCreateRequestDto();

        const errors = await validate(dto);
        const folderNameErrors = errors.filter(
          (error) => error.property === 'folderName',
        );

        expect(folderNameErrors).toHaveLength(1);
        expect(folderNameErrors[0].constraints?.isNotEmpty).toBe(
          'Folder name is required',
        );
      });

      it('should fail validation when folderName is empty', async () => {
        const dto = new DriveFolderCreateRequestDto();
        dto.folderName = '';

        const errors = await validate(dto);
        const folderNameErrors = errors.filter(
          (error) => error.property === 'folderName',
        );

        expect(folderNameErrors).toHaveLength(1);
        expect(folderNameErrors[0].constraints?.isNotEmpty).toBe(
          'Folder name is required',
        );
      });

      it('should fail validation when folderName exceeds max length', async () => {
        const dto = new DriveFolderCreateRequestDto();
        dto.folderName = 'a'.repeat(256); // Exceeds 255 character limit

        const errors = await validate(dto);
        const folderNameErrors = errors.filter(
          (error) => error.property === 'folderName',
        );

        expect(folderNameErrors).toHaveLength(1);
        expect(folderNameErrors[0].constraints?.maxLength).toBe(
          'Folder name too long (max 255 characters)',
        );
      });

      it('should pass validation with folderName at max length', async () => {
        const dto = new DriveFolderCreateRequestDto();
        dto.folderName = 'a'.repeat(255); // Exactly 255 characters

        const errors = await validate(dto);
        const folderNameErrors = errors.filter(
          (error) => error.property === 'folderName',
        );

        expect(folderNameErrors).toHaveLength(0);
      });
    });

    describe('parentFolderId validation', () => {
      it('should pass validation when parentFolderId is not provided', async () => {
        const dto = new DriveFolderCreateRequestDto();
        dto.folderName = 'Test Folder';

        const errors = await validate(dto);
        const parentFolderErrors = errors.filter(
          (error) => error.property === 'parentFolderId',
        );

        expect(parentFolderErrors).toHaveLength(0);
      });

      it('should pass validation with valid parentFolderId', async () => {
        const dto = new DriveFolderCreateRequestDto();
        dto.folderName = 'Test Folder';
        dto.parentFolderId = 'valid-folder-id-123';

        const errors = await validate(dto);
        const parentFolderErrors = errors.filter(
          (error) => error.property === 'parentFolderId',
        );

        expect(parentFolderErrors).toHaveLength(0);
      });

      it('should fail validation when parentFolderId exceeds max length', async () => {
        const dto = new DriveFolderCreateRequestDto();
        dto.folderName = 'Test Folder';
        dto.parentFolderId = 'a'.repeat(101); // Exceeds 100 character limit

        const errors = await validate(dto);
        const parentFolderErrors = errors.filter(
          (error) => error.property === 'parentFolderId',
        );

        expect(parentFolderErrors).toHaveLength(1);
        expect(parentFolderErrors[0].constraints?.maxLength).toBe(
          'Parent folder ID too long (max 100 characters)',
        );
      });
    });
  });

  describe('DrivePermissionUpdateRequestDto', () => {
    describe('fileId validation', () => {
      it('should pass validation with valid fileId', async () => {
        const dto = new DrivePermissionUpdateRequestDto();
        dto.fileId = 'valid-file-id-123';
        dto.permissionType = 'anyone';
        dto.role = 'reader';

        const errors = await validate(dto);
        const fileIdErrors = errors.filter(
          (error) => error.property === 'fileId',
        );

        expect(fileIdErrors).toHaveLength(0);
      });

      it('should fail validation when fileId is not provided', async () => {
        const dto = new DrivePermissionUpdateRequestDto();
        dto.permissionType = 'anyone';
        dto.role = 'reader';

        const errors = await validate(dto);
        const fileIdErrors = errors.filter(
          (error) => error.property === 'fileId',
        );

        expect(fileIdErrors).toHaveLength(1);
        expect(fileIdErrors[0].constraints?.isNotEmpty).toBe(
          'File ID is required',
        );
      });

      it('should fail validation when fileId is empty', async () => {
        const dto = new DrivePermissionUpdateRequestDto();
        dto.fileId = '';
        dto.permissionType = 'anyone';
        dto.role = 'reader';

        const errors = await validate(dto);
        const fileIdErrors = errors.filter(
          (error) => error.property === 'fileId',
        );

        expect(fileIdErrors).toHaveLength(1);
        expect(fileIdErrors[0].constraints?.isNotEmpty).toBe(
          'File ID is required',
        );
      });

      it('should fail validation when fileId exceeds max length', async () => {
        const dto = new DrivePermissionUpdateRequestDto();
        dto.fileId = 'a'.repeat(101); // Exceeds 100 character limit
        dto.permissionType = 'anyone';
        dto.role = 'reader';

        const errors = await validate(dto);
        const fileIdErrors = errors.filter(
          (error) => error.property === 'fileId',
        );

        expect(fileIdErrors).toHaveLength(1);
        expect(fileIdErrors[0].constraints?.maxLength).toBe(
          'File ID too long (max 100 characters)',
        );
      });
    });

    describe('permissionType validation', () => {
      const validPermissionTypes = ['anyone', 'domain', 'user'] as const;

      validPermissionTypes.forEach((permissionType) => {
        it(`should pass validation with valid permissionType: ${permissionType}`, async () => {
          const dto = new DrivePermissionUpdateRequestDto();
          dto.fileId = 'valid-file-id';
          dto.permissionType = permissionType;
          dto.role = 'reader';

          const errors = await validate(dto);
          const permissionTypeErrors = errors.filter(
            (error) => error.property === 'permissionType',
          );

          expect(permissionTypeErrors).toHaveLength(0);
        });
      });

      it('should fail validation when permissionType is not provided', async () => {
        const dto = new DrivePermissionUpdateRequestDto();
        dto.fileId = 'valid-file-id';
        dto.role = 'reader';

        const errors = await validate(dto);
        const permissionTypeErrors = errors.filter(
          (error) => error.property === 'permissionType',
        );

        expect(permissionTypeErrors).toHaveLength(1);
        expect(permissionTypeErrors[0].constraints?.isNotEmpty).toBe(
          'Permission type is required',
        );
      });

      it('should fail validation with invalid permissionType', async () => {
        const dto = new DrivePermissionUpdateRequestDto();
        dto.fileId = 'valid-file-id';
        (dto as unknown as { permissionType: string }).permissionType =
          'invalid-permission';
        dto.role = 'reader';

        const errors = await validate(dto);
        const permissionTypeErrors = errors.filter(
          (error) => error.property === 'permissionType',
        );

        expect(permissionTypeErrors).toHaveLength(1);
        expect(permissionTypeErrors[0].constraints?.isIn).toBe(
          'Invalid permission type',
        );
      });
    });

    describe('role validation', () => {
      const validRoles = ['reader', 'writer', 'commenter'] as const;

      validRoles.forEach((role) => {
        it(`should pass validation with valid role: ${role}`, async () => {
          const dto = new DrivePermissionUpdateRequestDto();
          dto.fileId = 'valid-file-id';
          dto.permissionType = 'anyone';
          dto.role = role;

          const errors = await validate(dto);
          const roleErrors = errors.filter(
            (error) => error.property === 'role',
          );

          expect(roleErrors).toHaveLength(0);
        });
      });

      it('should fail validation when role is not provided', async () => {
        const dto = new DrivePermissionUpdateRequestDto();
        dto.fileId = 'valid-file-id';
        dto.permissionType = 'anyone';

        const errors = await validate(dto);
        const roleErrors = errors.filter((error) => error.property === 'role');

        expect(roleErrors).toHaveLength(1);
        expect(roleErrors[0].constraints?.isNotEmpty).toBe('Role is required');
      });

      it('should fail validation with invalid role', async () => {
        const dto = new DrivePermissionUpdateRequestDto();
        dto.fileId = 'valid-file-id';
        dto.permissionType = 'anyone';
        (dto as unknown as { role: string }).role = 'invalid-role';

        const errors = await validate(dto);
        const roleErrors = errors.filter((error) => error.property === 'role');

        expect(roleErrors).toHaveLength(1);
        expect(roleErrors[0].constraints?.isIn).toBe('Invalid role');
      });
    });
  });

  describe('Integration tests - multiple validation errors', () => {
    it('should return multiple validation errors for DriveUploadRequestDto', async () => {
      const dto = new DriveUploadRequestDto();
      dto.fileName = ''; // Invalid: empty
      dto.parentFolderId = 'a'.repeat(101); // Invalid: too long
      dto.description = 'a'.repeat(1001); // Invalid: too long

      const errors = await validate(dto);

      expect(errors).toHaveLength(3);

      const fileNameError = errors.find(
        (error) => error.property === 'fileName',
      );
      const parentFolderError = errors.find(
        (error) => error.property === 'parentFolderId',
      );
      const descriptionError = errors.find(
        (error) => error.property === 'description',
      );

      expect(fileNameError?.constraints?.isNotEmpty).toBe(
        'File name is required',
      );
      expect(parentFolderError?.constraints?.maxLength).toBe(
        'Parent folder ID too long (max 100 characters)',
      );
      expect(descriptionError?.constraints?.maxLength).toBe(
        'Description too long (max 1000 characters)',
      );
    });

    it('should return multiple validation errors for DrivePermissionUpdateRequestDto', async () => {
      const dto = new DrivePermissionUpdateRequestDto();
      dto.fileId = ''; // Invalid: empty
      (dto as unknown as { permissionType: string }).permissionType = 'invalid'; // Invalid: not in allowed values
      (dto as unknown as { role: string }).role = 'invalid'; // Invalid: not in allowed values

      const errors = await validate(dto);

      expect(errors).toHaveLength(3);

      const fileIdError = errors.find((error) => error.property === 'fileId');
      const permissionTypeError = errors.find(
        (error) => error.property === 'permissionType',
      );
      const roleError = errors.find((error) => error.property === 'role');

      expect(fileIdError?.constraints?.isNotEmpty).toBe('File ID is required');
      expect(permissionTypeError?.constraints?.isIn).toBe(
        'Invalid permission type',
      );
      expect(roleError?.constraints?.isIn).toBe('Invalid role');
    });
  });

  describe('Edge cases', () => {
    it('should handle null values for required fields', async () => {
      const dto = new DriveUploadRequestDto();
      (dto as unknown as { fileName: null }).fileName = null;

      const errors = await validate(dto);
      const fileNameErrors = errors.filter(
        (error) => error.property === 'fileName',
      );

      expect(fileNameErrors).toHaveLength(1);
      expect(fileNameErrors[0].constraints?.isNotEmpty).toBe(
        'File name is required',
      );
    });

    it('should handle undefined values for required fields', async () => {
      const dto = new DriveFolderCreateRequestDto();
      (dto as unknown as { folderName: undefined }).folderName = undefined;

      const errors = await validate(dto);
      const folderNameErrors = errors.filter(
        (error) => error.property === 'folderName',
      );

      expect(folderNameErrors).toHaveLength(1);
      expect(folderNameErrors[0].constraints?.isNotEmpty).toBe(
        'Folder name is required',
      );
    });

    it('should handle whitespace-only strings for required fields', async () => {
      const dto = new DrivePermissionUpdateRequestDto();
      dto.fileId = '   '; // Only whitespace
      dto.permissionType = 'anyone';
      dto.role = 'reader';

      const errors = await validate(dto);
      const fileIdErrors = errors.filter(
        (error) => error.property === 'fileId',
      );

      // Note: @IsNotEmpty with class-validator considers whitespace as valid
      // This is expected behavior - if we need to trim whitespace, we should use @Transform or custom validator
      expect(fileIdErrors).toHaveLength(0);
    });
  });
});
