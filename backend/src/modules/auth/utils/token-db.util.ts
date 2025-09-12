import { BaseDBUtil } from 'src/modules/common/base-classes/base-db-util';
import { OAuthTokenEntity } from '../entities/oauth-token.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { TokenEncryptionUtil } from './token-encryption.util';
import { EnvironmentVariableUtil } from 'src/modules/common/utils/environment-variable.util';

export interface TokenCreationData {
  userId: string;
  provider: 'google';
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}

@Injectable()
export class TokenDBUtil extends BaseDBUtil<
  OAuthTokenEntity,
  TokenCreationData
> {
  private readonly encryptionUtil: TokenEncryptionUtil;

  constructor(
    @InjectRepository(OAuthTokenEntity)
    tokenRepo: Repository<OAuthTokenEntity>,
    private readonly environmentUtil: EnvironmentVariableUtil,
  ) {
    super(OAuthTokenEntity, tokenRepo);
    const { tokenEncryptionKey } = this.environmentUtil.getVariables();
    this.encryptionUtil = new TokenEncryptionUtil(tokenEncryptionKey);
  }

  public async create(params: {
    creationData: TokenCreationData;
    entityManager?: EntityManager;
  }): Promise<OAuthTokenEntity> {
    const { creationData, entityManager } = params;

    const repo = entityManager?.getRepository(OAuthTokenEntity) ?? this.repo;

    const { encryptedAccessToken, encryptedRefreshToken } =
      await this.encryptionUtil.encryptTokens(
        creationData.accessToken,
        creationData.refreshToken,
      );

    const encryptedTokenData = {
      ...creationData,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
    };

    const token = repo.create(encryptedTokenData);
    const createdToken = await repo.save(token);

    return createdToken;
  }

  public async upsert(params: {
    creationData: TokenCreationData;
    entityManager?: EntityManager;
  }): Promise<OAuthTokenEntity> {
    const { creationData, entityManager } = params;

    const repo = entityManager?.getRepository(OAuthTokenEntity) ?? this.repo;

    const { encryptedAccessToken, encryptedRefreshToken } =
      await this.encryptionUtil.encryptTokens(
        creationData.accessToken,
        creationData.refreshToken,
      );

    const encryptedTokenData = {
      ...creationData,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      deletedAt: null,
    };

    await repo.upsert(encryptedTokenData, {
      conflictPaths: ['userId', 'provider'],
      skipUpdateIfNoValuesChanged: false,
    });

    const savedToken = await repo.findOne({
      where: {
        userId: creationData.userId,
        provider: creationData.provider,
      },
    });

    if (!savedToken) {
      throw new Error('Failed to upsert token');
    }

    return savedToken;
  }

  public async getDecryptedTokens(tokenEntity: OAuthTokenEntity): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    return this.encryptionUtil.decryptTokens(
      tokenEntity.accessToken,
      tokenEntity.refreshToken,
    );
  }

  public async findByUserIdWithDecryptedTokens(
    userId: string,
    provider: 'google' = 'google',
  ): Promise<
    | (OAuthTokenEntity & {
        decryptedAccessToken: string;
        decryptedRefreshToken: string;
      })
    | null
  > {
    const tokenEntity = await this.repo.findOne({
      where: { userId, provider },
    });

    if (!tokenEntity) {
      return null;
    }

    const { accessToken, refreshToken } =
      await this.getDecryptedTokens(tokenEntity);

    return {
      ...tokenEntity,
      decryptedAccessToken: accessToken,
      decryptedRefreshToken: refreshToken,
    };
  }
}
