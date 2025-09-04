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
