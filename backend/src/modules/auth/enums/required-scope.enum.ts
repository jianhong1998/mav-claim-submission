export const RequiredScope = Object.freeze({
  GMAIL: 'https://www.googleapis.com/auth/gmail.send',
  DRIVE: 'https://www.googleapis.com/auth/drive.file',
  EMAIL: 'email',
  PROFILE: 'profile',
} as const);

export type RequiredScope = (typeof RequiredScope)[keyof typeof RequiredScope];
