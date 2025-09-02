export type IUser = {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  googleId: string;
  createdAt: string;
  updatedAt: string;
};

export type IOAuthToken = {
  id: string;
  userId: string;
  provider: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  scope: string;
  createdAt: string;
  updatedAt: string;
};

export type IAuthResponse = (
  | {
      user: IUser;
      isAuthenticated: true;
    }
  | {
      user: null;
      isAuthenticated: false;
    }
) & {
  message?: string;
};

export type IAuthStatusResponse = {
  isAuthenticated: boolean;
  user?: IUser;
};
