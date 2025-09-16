import { IClaimMetadata } from '@project/types';

export class ClaimResponseDto {
  public success: boolean;
  public claim?: IClaimMetadata;
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
