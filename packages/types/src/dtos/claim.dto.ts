import { IAttachmentMetadata } from './attachment.dto';

export const ClaimStatus = Object.freeze({
  DRAFT: 'draft',
  SENT: 'sent',
  FAILED: 'failed',
  PAID: 'paid',
} as const);
export type ClaimStatus = (typeof ClaimStatus)[keyof typeof ClaimStatus];

export type IClaimMetadata = {
  id: string;
  userId: string;
  category: string;
  claimName: string | null;
  month: number;
  year: number;
  totalAmount: number;
  status: ClaimStatus;
  submissionDate: string | null;
  attachments?: IAttachmentMetadata[];
  createdAt: string;
  updatedAt: string;
};

export type IClaimCreateRequest = {
  category: string;
  claimName?: string;
  month: number;
  year: number;
  totalAmount: number;
};

export type IClaimUpdateRequest = Partial<IClaimCreateRequest> & {
  status?: ClaimStatus;
};

export type IClaimResponse = {
  success: boolean;
  claim?: IClaimMetadata;
  error?: string;
};

export type IClaimListResponse = {
  success: boolean;
  claims?: IClaimMetadata[];
  total?: number;
  error?: string;
};
