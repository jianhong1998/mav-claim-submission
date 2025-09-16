import { IClaimMetadata } from '@project/types';

export class ClaimListResponseDto {
  public success: boolean;
  public claims?: IClaimMetadata[];
  public total?: number;
  public error?: string;

  constructor(params: {
    success: boolean;
    claims?: IClaimMetadata[];
    total?: number;
    error?: string;
  }) {
    this.success = params.success;
    this.claims = params.claims;
    this.total = params.total;
    this.error = params.error;
  }

  static success(
    claims: IClaimMetadata[],
    total?: number,
  ): ClaimListResponseDto {
    return new ClaimListResponseDto({
      success: true,
      claims,
      total: total ?? claims.length,
    });
  }

  static error(error: string): ClaimListResponseDto {
    return new ClaimListResponseDto({ success: false, error });
  }
}
