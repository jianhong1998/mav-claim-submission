import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { UserEntity } from 'src/db/entities/user.entity';
import { BaseDBUtil } from 'src/modules/common/base-classes/base-db-util';
import { TokenService } from './token.service';
import { IUser, IAuthResponse } from '@project/types';

export interface UserCreationData {
  email: string;
  name: string;
  picture?: string;
  googleId: string;
}

@Injectable()
export class AuthService extends BaseDBUtil<UserEntity, UserCreationData> {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly tokenService: TokenService,
  ) {
    super(UserEntity, userRepository);
  }

  async create(params: {
    creationData: UserCreationData;
    entityManager?: EntityManager;
  }): Promise<UserEntity> {
    const { creationData, entityManager } = params;
    const repo =
      entityManager?.getRepository(UserEntity) ?? this.userRepository;

    const user = repo.create({
      email: creationData.email,
      name: creationData.name,
      picture: creationData.picture,
      googleId: creationData.googleId,
    });

    return await repo.save(user);
  }

  async findOrCreateUser(userData: {
    googleId: string;
    email: string;
    name: string;
    picture?: string;
  }): Promise<UserEntity> {
    let user = await this.getUserByGoogleId(userData.googleId);

    if (!user) {
      user = await this.create({
        creationData: {
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
          googleId: userData.googleId,
        },
      });
    } else {
      // Update user info in case it changed
      user.name = userData.name;
      user.picture = userData.picture;
      user.email = userData.email;

      await this.updateWithSave({
        dataArray: [user],
      });
    }

    return user;
  }

  async handleOAuthCallback(oauthData: {
    googleId: string;
    email: string;
    name: string;
    picture?: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    scope: string;
  }): Promise<{ user: UserEntity; isNewUser: boolean }> {
    const existingUser = await this.getUserByGoogleId(oauthData.googleId);
    const isNewUser = !existingUser;

    const user = await this.findOrCreateUser({
      googleId: oauthData.googleId,
      email: oauthData.email,
      name: oauthData.name,
      picture: oauthData.picture,
    });

    // Store or update OAuth tokens
    await this.tokenService.updateToken({
      userId: user.id,
      provider: 'google',
      accessToken: oauthData.accessToken,
      refreshToken: oauthData.refreshToken,
      expiresAt: oauthData.expiresAt,
      scope: oauthData.scope,
    });

    return { user, isNewUser };
  }

  async getUserByGoogleId(googleId: string): Promise<UserEntity | null> {
    return await this.getOne({
      criteria: { googleId },
    });
  }

  async getUserByEmail(email: string): Promise<UserEntity | null> {
    return await this.getOne({
      criteria: { email },
    });
  }

  async getUserById(id: string): Promise<UserEntity | null> {
    return await this.getOne({
      criteria: { id },
      relation: { oauthTokens: true },
    });
  }

  async getUserProfile(userId: string): Promise<IAuthResponse> {
    const user = await this.getUserById(userId);

    if (!user) {
      return {
        user: null,
        isAuthenticated: false,
        message: 'User not found',
      };
    }

    return {
      user: this.toDTO(user),
      isAuthenticated: true,
    };
  }

  async logout(userId: string): Promise<boolean> {
    // Remove OAuth tokens for the user
    return await this.tokenService.deleteTokenForUser(userId);
  }

  async hasValidToken(userId: string): Promise<boolean> {
    const tokenData = await this.tokenService.getValidTokenForUser(userId);
    return tokenData !== null;
  }

  async refreshUserToken(userId: string): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (!user) return false;

    const token = await this.tokenService.getTokenForUser(userId);
    if (!token) return false;

    // Token refresh would be handled by Google OAuth library
    // This is a placeholder for the actual refresh logic
    // In a real implementation, you would use the refresh token to get a new access token
    return true;
  }

  toDTO(user: UserEntity): IUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture ?? null,
      googleId: user.googleId,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async deleteUser(userId: string): Promise<boolean> {
    const result = await this.delete({
      criteria: { id: userId },
    });
    return result !== null;
  }
}
