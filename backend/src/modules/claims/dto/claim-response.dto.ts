import { ApiProperty } from '@nestjs/swagger';
import type { IClaimMetadata } from '@project/types';

export class ClaimResponseDto {
  @ApiProperty({
    description: 'Indicates if the operation was successful',
    example: true,
  })
  public success: boolean;

  @ApiProperty({
    description: 'Claim data when operation is successful',
    required: false,
  })
  public claim?: IClaimMetadata;

  @ApiProperty({
    description: 'Error message when operation fails',
    required: false,
    example: 'Claim not found',
  })
  public error?: string;

  constructor(params: {
    success: boolean;
    claim?: IClaimMetadata;
    error?: string;
  }) {
    this.success = params.success;
    this.claim = params.claim;
    this.error = params.error;
  }

  static success(claim: IClaimMetadata): ClaimResponseDto {
    return new ClaimResponseDto({ success: true, claim });
  }

  static error(error: string): ClaimResponseDto {
    return new ClaimResponseDto({ success: false, error });
  }
}
