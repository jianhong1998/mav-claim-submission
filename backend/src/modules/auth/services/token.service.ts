import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import CryptoJS from 'crypto-js';
import { IOAuthToken } from '@project/types';
import { EnvironmentVariableUtil } from '../../common/utils/environment-variable.util';
import { OAuthTokenEntity } from 'src/modules/auth/entities/oauth-token.entity';
import { TokenDBUtil, TokenCreationData } from '../utils/token-db.util';
import { RequiredScope } from '../enums/required-scope.enum';

@Injectable()
export class TokenService {
  private readonly encryptionKey: string;

  constructor(
    private readonly tokenDBUtil: TokenDBUtil,
    private readonly environmentVariableUtil: EnvironmentVariableUtil,
  ) {
    const variables = environmentVariableUtil.getVariables();
    this.encryptionKey =
      variables.tokenEncryptionKey || 'default-key-change-in-production';
  }

  async create(params: {
    creationData: TokenCreationData;
    entityManager?: EntityManager;
  }): Promise<OAuthTokenEntity> {
    const { creationData, entityManager } = params;

    const encryptedAccessToken = this.encryptToken(creationData.accessToken);
    const encryptedRefreshToken = this.encryptToken(creationData.refreshToken);

    const encryptedCreationData = {
      ...creationData,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
    };

    return await this.tokenDBUtil.create({
      creationData: encryptedCreationData,
      entityManager,
    });
  }

  async getTokenForUser(
    userId: string,
    provider: 'google' = 'google',
  ): Promise<OAuthTokenEntity | null> {
    return await this.tokenDBUtil.getOne({
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
    mergeScopes?: boolean;
  }): Promise<OAuthTokenEntity> {
    const {
      userId,
      provider,
      accessToken,
      refreshToken,
      expiresAt,
      scope,
      mergeScopes = true,
    } = params;

    const encryptedAccessToken = this.encryptToken(accessToken);
    const encryptedRefreshToken = this.encryptToken(refreshToken);

    // Try to find existing token first, including soft-deleted ones
    const existingToken = await this.tokenDBUtil.getOne({
      criteria: { userId, provider },
      withDeleted: true,
    });

    if (existingToken) {
      // Merge scopes if requested and existing token has scopes
      let finalScope = scope;
      if (mergeScopes && existingToken.scope) {
        const existingScopes = this.parseScopeString(existingToken.scope);
        const newScopes = this.parseScopeString(scope);
        const combinedScopes = new Set([...existingScopes, ...newScopes]);
        finalScope = Array.from(combinedScopes).join(' ');
      }

      // Update existing token
      existingToken.accessToken = encryptedAccessToken;
      existingToken.refreshToken = encryptedRefreshToken;
      existingToken.expiresAt = expiresAt;
      existingToken.scope = finalScope;
      existingToken.deletedAt = null; // Restore if it was soft-deleted

      const updatedTokens = await this.tokenDBUtil.updateWithSave({
        dataArray: [existingToken],
      });

      if (updatedTokens.length !== 1)
        throw new Error('Updated token number is not 1.');

      return updatedTokens[0];
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
    const result = await this.tokenDBUtil.delete({
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

  validateRequiredScopes(
    tokenScopes: string,
    requiredScopes: RequiredScope[],
  ): boolean {
    const scopes = this.parseScopeString(tokenScopes);
    return requiredScopes.every((scope) => scopes.includes(scope));
  }

  hasGmailScope(token: OAuthTokenEntity): boolean {
    return this.validateRequiredScopes(token.scope, [RequiredScope.GMAIL]);
  }

  hasDriveScope(token: OAuthTokenEntity): boolean {
    return this.validateRequiredScopes(token.scope, [RequiredScope.DRIVE]);
  }

  hasAllRequiredScopes(
    token: OAuthTokenEntity,
    includesDrive: boolean = false,
  ): boolean {
    const requiredScopes: RequiredScope[] = [
      RequiredScope.EMAIL,
      RequiredScope.PROFILE,
      RequiredScope.GMAIL,
    ];

    if (includesDrive) {
      requiredScopes.push(RequiredScope.DRIVE);
    }

    return this.validateRequiredScopes(token.scope, requiredScopes);
  }

  combineScopes(
    existingScopes: string,
    additionalScopes: RequiredScope[],
  ): string {
    const existing = this.parseScopeString(existingScopes);
    const combined = new Set([...existing, ...additionalScopes]);
    return Array.from(combined).join(' ');
  }

  async getUserTokenWithScope(
    userId: string,
    requiredScope: RequiredScope,
  ): Promise<{ token: OAuthTokenEntity; hasRequiredScope: boolean } | null> {
    const token = await this.getTokenForUser(userId);

    if (!token) {
      return null;
    }

    const hasRequiredScope = this.validateRequiredScopes(token.scope, [
      requiredScope,
    ]);

    return {
      token,
      hasRequiredScope,
    };
  }

  async updateTokenWithAdditionalScopes(params: {
    userId: string;
    provider: 'google';
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    newScopes: RequiredScope[];
  }): Promise<OAuthTokenEntity> {
    const existingToken = await this.getTokenForUser(
      params.userId,
      params.provider,
    );

    let combinedScope = params.newScopes.join(' ');

    if (existingToken) {
      combinedScope = this.combineScopes(existingToken.scope, params.newScopes);
    }

    return this.updateToken({
      userId: params.userId,
      provider: params.provider,
      accessToken: params.accessToken,
      refreshToken: params.refreshToken,
      expiresAt: params.expiresAt,
      scope: combinedScope,
      mergeScopes: true,
    });
  }

  private encryptToken(token: string): string {
    return CryptoJS.AES.encrypt(token, this.encryptionKey).toString();
  }

  private decryptToken(encryptedToken: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedToken, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  private parseScopeString(scopes: string): string[] {
    return scopes
      .split(/\s+/)
      .map((scope) => scope.trim())
      .filter((scope) => scope.length > 0);
  }
}
