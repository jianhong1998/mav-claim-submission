export type IPreviewEmailResponse = {
  subject: string;
  htmlBody: string;
  recipients: string[];
  cc: string[];
  bcc: string[];
};
