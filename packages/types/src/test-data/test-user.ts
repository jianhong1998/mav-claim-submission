export const TEST_USER_DATA = Object.freeze({
  id: '00000000-0000-0000-0000-000000000001',
  email: 'test@mavericks-consulting.com',
  name: 'Test User',
  googleId: 'test-google-id-12345',
} as const);

export type TestUserData = typeof TEST_USER_DATA;
