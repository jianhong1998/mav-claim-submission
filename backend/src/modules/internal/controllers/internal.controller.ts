import {
  Controller,
  Post,
  Delete,
  UseGuards,
  InternalServerErrorException,
} from '@nestjs/common';
import { UserDBUtil } from '../../user/utils/user-db.util';
import { TEST_USER_DATA } from '@project/types';
import { ApiTestModeGuard } from '../guards/api-test-mode.guard';
import { TestDataResponseDTO, TestDataDeleteResponseDTO } from '../dtos';

@Controller('internal')
export class InternalController {
  constructor(private readonly userDBUtil: UserDBUtil) {}

  @Post('test-data')
  @UseGuards(ApiTestModeGuard)
  async createTestData(): Promise<TestDataResponseDTO> {
    try {
      const user = await this.userDBUtil.create({
        creationData: TEST_USER_DATA,
      });

      return new TestDataResponseDTO(user);
    } catch (error) {
      if (this.isDuplicateError(error)) {
        const existing = await this.userDBUtil.getOne({
          criteria: { id: TEST_USER_DATA.id },
          withDeleted: true,
        });
        if (!existing) {
          throw new InternalServerErrorException('User creation failed');
        }
        // If user is soft-deleted, restore it
        if (existing.deletedAt) {
          existing.deletedAt = null;
          await this.userDBUtil.updateWithSave({ dataArray: [existing] });
        }

        return new TestDataResponseDTO(existing);
      }
      throw error;
    }
  }

  @Delete('test-data')
  @UseGuards(ApiTestModeGuard)
  async deleteTestData(): Promise<TestDataDeleteResponseDTO> {
    const user = await this.userDBUtil.getOne({
      criteria: { id: TEST_USER_DATA.id },
      withDeleted: true,
    });
    if (!user) {
      return new TestDataDeleteResponseDTO({
        deleted: false,
        message: 'Test user not found (already deleted or never existed)',
      });
    }

    // Delete the test user (hard delete triggers CASCADE to remove all claims)
    await this.userDBUtil.hardDelete({ criteria: { id: TEST_USER_DATA.id } });

    return new TestDataDeleteResponseDTO({
      deleted: true,
      message: 'Test user and all related data deleted successfully',
    });
  }

  private isDuplicateError(error: unknown): boolean {
    return (error as { code?: string })?.code === '23505';
  }
}
