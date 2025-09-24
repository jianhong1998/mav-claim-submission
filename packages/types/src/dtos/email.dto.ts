import { IClaimMetadata } from './claim.dto';

export type IEmailSendRequest = {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
};

export type IEmailSendResponse = {
  success: boolean;
  messageId?: string;
  error?: string;
};

export type IGmailAccessResponse = {
  hasAccess: boolean;
  email?: string;
  error?: string;
};

export type IClaimEmailRequest = {
  claimId: string;
};

export type IClaimEmailResponse = {
  success: boolean;
  messageId?: string;
  claim?: IClaimMetadata;
  error?: string;
};
