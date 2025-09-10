import { IAuthStatusResponse, IUser } from '@project/types';

export class AuthenticatedResponseDTO {
  public user: IUser;
  public isAuthenticated: true;
  public message?: string;

  constructor(params: { user: IUser; message?: string }) {
    this.user = params.user;
    this.isAuthenticated = true;
    this.message = params.message;
  }
}

export class UnauthenticatedResponseDTO {
  public user: null;
  public isAuthenticated: false;
  public message?: string;

  constructor(params: { message?: string }) {
    this.user = null;
    this.isAuthenticated = false;
    this.message = params.message;
  }
}

export class AuthStatusResponseDTO implements IAuthStatusResponse {
  public isAuthenticated: boolean;
  public user?: IUser;

  constructor(params: { isAuthenticated: boolean; user?: IUser }) {
    this.isAuthenticated = params.isAuthenticated;
    this.user = params.user;
  }
}
