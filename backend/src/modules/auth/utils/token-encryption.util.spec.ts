import { TokenEncryptionUtil } from './token-encryption.util';

describe('TokenEncryptionUtil', () => {
  const TEST_MASTER_KEY =
    'test-master-key-that-is-32-chars-long-enough-for-testing';
  let encryptionUtil: TokenEncryptionUtil;

  beforeEach(() => {
    encryptionUtil = new TokenEncryptionUtil(TEST_MASTER_KEY);
  });

  describe('constructor', () => {
    it('should throw error for short master key', () => {
      expect(() => new TokenEncryptionUtil('short')).toThrow(
        'Master key must be at least 32 characters',
      );
    });

    it('should throw error for empty master key', () => {
      expect(() => new TokenEncryptionUtil('')).toThrow(
        'Master key must be at least 32 characters',
      );
    });

    it('should accept valid master key', () => {
      expect(() => new TokenEncryptionUtil(TEST_MASTER_KEY)).not.toThrow();
    });
  });

  describe('encrypt and decrypt', () => {
    const TEST_PLAINTEXT = 'test-oauth-token-value';

    it('should encrypt and decrypt text correctly', async () => {
      const encrypted = await encryptionUtil.encrypt(TEST_PLAINTEXT);
      const decrypted = await encryptionUtil.decrypt(encrypted);

      expect(decrypted).toBe(TEST_PLAINTEXT);
    });

    it('should produce different ciphertext for same plaintext', async () => {
      const encrypted1 = await encryptionUtil.encrypt(TEST_PLAINTEXT);
      const encrypted2 = await encryptionUtil.encrypt(TEST_PLAINTEXT);

      expect(encrypted1.data).not.toBe(encrypted2.data);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.salt).not.toBe(encrypted2.salt);
    });

    it('should have proper encrypted token structure', async () => {
      const encrypted = await encryptionUtil.encrypt(TEST_PLAINTEXT);

      expect(encrypted).toHaveProperty('data');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('salt');

      expect(typeof encrypted.data).toBe('string');
      expect(typeof encrypted.iv).toBe('string');
      expect(typeof encrypted.salt).toBe('string');
    });

    it('should produce different output with tampered data (CTR mode behavior)', async () => {
      const encrypted = await encryptionUtil.encrypt(TEST_PLAINTEXT);
      const tamperedEncrypted = {
        ...encrypted,
        data: 'VGhpc0lzVGFtcGVyZWREYXRh', // "ThisIsTamperedData" in base64
      };

      const decrypted = await encryptionUtil.decrypt(tamperedEncrypted);
      expect(decrypted).not.toBe(TEST_PLAINTEXT);
    });

    it('should produce different output with tampered salt (CTR mode behavior)', async () => {
      const encrypted = await encryptionUtil.encrypt(TEST_PLAINTEXT);
      const tamperedEncrypted = {
        ...encrypted,
        salt: encrypted.salt.slice(0, -1) + 'X',
      };

      const decrypted = await encryptionUtil.decrypt(tamperedEncrypted);
      expect(decrypted).not.toBe(TEST_PLAINTEXT);
    });
  });

  describe('encryptTokens and decryptTokens', () => {
    const ACCESS_TOKEN = 'test-access-token-value';
    const REFRESH_TOKEN = 'test-refresh-token-value';

    it('should encrypt and decrypt both tokens correctly', async () => {
      const { encryptedAccessToken, encryptedRefreshToken } =
        await encryptionUtil.encryptTokens(ACCESS_TOKEN, REFRESH_TOKEN);

      const { accessToken, refreshToken } = await encryptionUtil.decryptTokens(
        encryptedAccessToken,
        encryptedRefreshToken,
      );

      expect(accessToken).toBe(ACCESS_TOKEN);
      expect(refreshToken).toBe(REFRESH_TOKEN);
    });

    it('should encrypt tokens independently', async () => {
      const { encryptedAccessToken, encryptedRefreshToken } =
        await encryptionUtil.encryptTokens(ACCESS_TOKEN, REFRESH_TOKEN);

      expect(encryptedAccessToken.data).not.toBe(encryptedRefreshToken.data);
      expect(encryptedAccessToken.iv).not.toBe(encryptedRefreshToken.iv);
      expect(encryptedAccessToken.salt).not.toBe(encryptedRefreshToken.salt);
    });
  });

  describe('encryption security properties', () => {
    it('should use different salts for each encryption', async () => {
      const plaintext = 'same-plaintext';
      const encrypted1 = await encryptionUtil.encrypt(plaintext);
      const encrypted2 = await encryptionUtil.encrypt(plaintext);

      expect(encrypted1.salt).not.toBe(encrypted2.salt);
    });

    it('should use different IVs for each encryption', async () => {
      const plaintext = 'same-plaintext';
      const encrypted1 = await encryptionUtil.encrypt(plaintext);
      const encrypted2 = await encryptionUtil.encrypt(plaintext);

      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should produce different output with different master key', async () => {
      const plaintext = 'test-plaintext';
      const encrypted = await encryptionUtil.encrypt(plaintext);

      const differentKeyUtil = new TokenEncryptionUtil(
        'different-master-key-32-chars-long-for-security-test',
      );

      const decrypted = await differentKeyUtil.decrypt(encrypted);
      expect(decrypted).not.toBe(plaintext);
    });
  });
});
