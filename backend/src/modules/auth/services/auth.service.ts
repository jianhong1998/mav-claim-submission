import { Injectable } from '@nestjs/common';
import { TokenService } from './token.service';
import { IUser, IAuthResponse } from '@project/types';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { UserDBUtil } from 'src/modules/user/utils/user-db.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly userDBUtil: UserDBUtil,
    private readonly tokenService: TokenService,
  ) {}

  async findOrCreateUser(userData: {
    googleId: string;
    email: string;
    name: string;
    picture?: string;
  }): Promise<UserEntity> {
    const user = await this.getUserByGoogleId(userData.googleId);

    if (!user) {
      return await this.userDBUtil.create({
        creationData: {
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
          googleId: userData.googleId,
        },
      });
    }

    // Update user info in case it changed
    user.name = userData.name;
    user.picture = userData.picture;
    user.email = userData.email;

    const updatedUsers = await this.userDBUtil.updateWithSave({
      dataArray: [user],
    });

    if (updatedUsers.length !== 1)
      throw new Error('Updated user number is not 1.');

    return updatedUsers[0];
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
    return await this.userDBUtil.getOne({
      criteria: { googleId },
    });
  }

  async getUserByEmail(email: string): Promise<UserEntity | null> {
    return await this.userDBUtil.getOne({
      criteria: { email },
    });
  }

  async getUserById(id: string): Promise<UserEntity | null> {
    return await this.userDBUtil.getOne({
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
    const result = await this.userDBUtil.delete({
      criteria: { id: userId },
    });
    return result !== null;
  }
}
