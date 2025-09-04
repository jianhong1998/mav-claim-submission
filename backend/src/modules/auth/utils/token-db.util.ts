import { BaseDBUtil } from 'src/modules/common/base-classes/base-db-util';
import { OAuthTokenEntity } from '../entities/oauth-token.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

export interface TokenCreationData {
  userId: string;
  provider: 'google';
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}

export class TokenDBUtil extends BaseDBUtil<
  OAuthTokenEntity,
  TokenCreationData
> {
  constructor(
    @InjectRepository(OAuthTokenEntity)
    tokenRepo: Repository<OAuthTokenEntity>,
  ) {
    super(OAuthTokenEntity, tokenRepo);
  }

  public async create(params: {
    creationData: TokenCreationData;
    entityManager?: EntityManager;
  }): Promise<OAuthTokenEntity> {
    const { creationData, entityManager } = params;

    const repo = entityManager?.getRepository(OAuthTokenEntity) ?? this.repo;

    const token = repo.create(creationData);
    const createdToken = await repo.save(token);

    return createdToken;
  }
}
