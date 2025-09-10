import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

export interface EncryptedToken {
  data: string;
  iv: string;
  salt: string;
}

export class TokenEncryptionUtil {
  private static readonly ALGORITHM = 'aes-256-ctr';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly SALT_LENGTH = 32;

  private readonly masterKey: string;

  constructor(masterKey: string) {
    if (!masterKey || masterKey.length < 32) {
      throw new Error('Master key must be at least 32 characters');
    }
    this.masterKey = masterKey;
  }

  public async encrypt(plaintext: string): Promise<EncryptedToken> {
    const salt = randomBytes(TokenEncryptionUtil.SALT_LENGTH);
    const iv = randomBytes(TokenEncryptionUtil.IV_LENGTH);

    const key = (await scryptAsync(
      this.masterKey,
      salt,
      TokenEncryptionUtil.KEY_LENGTH,
    )) as Buffer;

    const cipher = createCipheriv(TokenEncryptionUtil.ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    return {
      data: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      salt: salt.toString('base64'),
    };
  }

  public async decrypt(encryptedToken: EncryptedToken): Promise<string> {
    const salt = Buffer.from(encryptedToken.salt, 'base64');
    const iv = Buffer.from(encryptedToken.iv, 'base64');
    const data = Buffer.from(encryptedToken.data, 'base64');

    const key = (await scryptAsync(
      this.masterKey,
      salt,
      TokenEncryptionUtil.KEY_LENGTH,
    )) as Buffer;

    const decipher = createDecipheriv(TokenEncryptionUtil.ALGORITHM, key, iv);

    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);

    return decrypted.toString('utf8');
  }

  public async encryptTokens(
    accessToken: string,
    refreshToken: string,
  ): Promise<{
    encryptedAccessToken: EncryptedToken;
    encryptedRefreshToken: EncryptedToken;
  }> {
    const [encryptedAccessToken, encryptedRefreshToken] = await Promise.all([
      this.encrypt(accessToken),
      this.encrypt(refreshToken),
    ]);

    return {
      encryptedAccessToken,
      encryptedRefreshToken,
    };
  }

  public async decryptTokens(
    encryptedAccessToken: EncryptedToken,
    encryptedRefreshToken: EncryptedToken,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.decrypt(encryptedAccessToken),
      this.decrypt(encryptedRefreshToken),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
