import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import CryptoJS from 'crypto-js';
import { BaseDBUtil } from 'src/modules/common/base-classes/base-db-util';
import { IOAuthToken } from '@project/types';
import { EnvironmentVariableUtil } from '../../common/utils/environment-variable.util';
import { OAuthTokenEntity } from 'src/modules/models/oauth-token.entity';

export interface TokenCreationData {
  userId: string;
  provider: 'google';
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}

@Injectable()
export class TokenService extends BaseDBUtil<
  OAuthTokenEntity,
  TokenCreationData
> {
  private readonly encryptionKey: string;

  constructor(
    @InjectRepository(OAuthTokenEntity)
    private readonly tokenRepository: Repository<OAuthTokenEntity>,
    private readonly environmentVariableUtil: EnvironmentVariableUtil,
  ) {
    super(OAuthTokenEntity, tokenRepository);
    const variables = environmentVariableUtil.getVariables();
    this.encryptionKey =
      variables.tokenEncryptionKey || 'default-key-change-in-production';
  }

  async create(params: {
    creationData: TokenCreationData;
    entityManager?: EntityManager;
  }): Promise<OAuthTokenEntity> {
    const { creationData, entityManager } = params;
    const repo =
      entityManager?.getRepository(OAuthTokenEntity) ?? this.tokenRepository;

    const encryptedAccessToken = this.encryptToken(creationData.accessToken);
    const encryptedRefreshToken = this.encryptToken(creationData.refreshToken);

    const token = repo.create({
      userId: creationData.userId,
      provider: creationData.provider,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt: creationData.expiresAt,
      scope: creationData.scope,
    });

    return await repo.save(token);
  }

  async getTokenForUser(
    userId: string,
    provider: 'google' = 'google',
  ): Promise<OAuthTokenEntity | null> {
    return await this.getOne({
      criteria: { userId, provider },
      relation: { user: true },
    });
  }

  async updateToken(params: {
    userId: string;
    provider: 'google';
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    scope: string;
  }): Promise<OAuthTokenEntity> {
    const { userId, provider, accessToken, refreshToken, expiresAt, scope } =
      params;

    const encryptedAccessToken = this.encryptToken(accessToken);
    const encryptedRefreshToken = this.encryptToken(refreshToken);

    // Try to find existing token first, including soft-deleted ones
    const existingToken = await this.getOne({
      criteria: { userId, provider },
      withDeleted: true,
    });

    if (existingToken) {
      // Update existing token
      existingToken.accessToken = encryptedAccessToken;
      existingToken.refreshToken = encryptedRefreshToken;
      existingToken.expiresAt = expiresAt;
      existingToken.scope = scope;
      existingToken.deletedAt = null; // Restore if it was soft-deleted

      return await this.updateWithSave({
        dataArray: [existingToken],
      }).then((tokens) => tokens[0]);
    }

    // Create new token if none exists
    return await this.create({
      creationData: {
        userId,
        provider,
        accessToken,
        refreshToken,
        expiresAt,
        scope,
      },
    });
  }

  async deleteTokenForUser(
    userId: string,
    provider: 'google' = 'google',
  ): Promise<boolean> {
    const result = await this.delete({
      criteria: { userId, provider },
    });
    return result !== null;
  }

  isTokenExpired(token: OAuthTokenEntity): boolean {
    return token.expiresAt <= new Date();
  }

  getDecryptedAccessToken(token: OAuthTokenEntity): string {
    return this.decryptToken(token.accessToken);
  }

  getDecryptedRefreshToken(token: OAuthTokenEntity): string {
    return this.decryptToken(token.refreshToken);
  }

  async getValidTokenForUser(
    userId: string,
  ): Promise<{ accessToken: string; refreshToken: string } | null> {
    const token = await this.getTokenForUser(userId);

    if (!token) {
      return null;
    }

    return {
      accessToken: this.getDecryptedAccessToken(token),
      refreshToken: this.getDecryptedRefreshToken(token),
    };
  }

  toDTO(token: OAuthTokenEntity): IOAuthToken {
    return {
      id: token.id,
      userId: token.userId,
      provider: token.provider,
      accessToken: '***', // Never expose actual token in DTO
      refreshToken: '***', // Never expose actual token in DTO
      expiresAt: token.expiresAt.toISOString(),
      scope: token.scope,
      createdAt: token.createdAt.toISOString(),
      updatedAt: token.updatedAt.toISOString(),
    };
  }

  private encryptToken(token: string): string {
    return CryptoJS.AES.encrypt(token, this.encryptionKey).toString();
  }

  private decryptToken(encryptedToken: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedToken, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}
