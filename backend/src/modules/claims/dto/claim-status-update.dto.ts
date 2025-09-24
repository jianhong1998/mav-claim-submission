import { IsEnum, IsNotEmpty } from 'class-validator';
import { ClaimStatus } from '@project/types';

export class ClaimStatusUpdateDto {
  @IsEnum(ClaimStatus, {
    message: `Status must be one of: ${Object.values(ClaimStatus).join(', ')}`,
  })
  @IsNotEmpty()
  status: ClaimStatus;
}
