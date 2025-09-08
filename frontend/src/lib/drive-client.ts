import {
  DriveApiConfig,
  DriveClientSettings,
  DriveErrorCodes,
} from '@/constants/drive-config';
import {
  DriveConfig,
  DriveClientState,
  DriveApiError,
  DriveOperationResult,
} from '@project/types';

interface GoogleAuth {
  isSignedIn: {
    get(): boolean;
    listen(callback: (signedIn: boolean) => void): void;
  };
  signIn(): Promise<unknown>;
  signOut(): Promise<void>;
  currentUser: {
    get(): {
      getAuthResponse(): { access_token: string };
      reloadAuthResponse(): Promise<{ access_token: string }>;
      getGrantedScopes(): string;
    };
  };
}

interface GoogleApiClient {
  init(config: {
    clientId: string;
    scope: string;
    discoveryDocs: string[];
    apiKey?: string;
  }): Promise<void>;
  drive: unknown;
}

interface GoogleApi {
  load(
    libraries: string,
    config: { callback: () => void; onerror: (error: unknown) => void },
  ): void;
  auth2: {
    getAuthInstance(): GoogleAuth;
  };
  client: GoogleApiClient;
}

declare global {
  interface Window {
    gapi: GoogleApi;
    google: unknown;
  }
}

export class DriveClientError extends Error {
  constructor(
    message: string,
    public code: number,
    public status?: string,
  ) {
    super(message);
    this.name = 'DriveClientError';
  }
}

export class DriveClient {
  private _isInitialized = false;
  private _isSignedIn = false;
  private _hasAccess = false;
  private _authInstance: GoogleAuth | null = null;
  private _driveApi: unknown = null;
  private _error?: string;
  private _config: DriveConfig;

  constructor(config: DriveConfig) {
    this._config = config;
  }

  get state(): DriveClientState {
    return {
      isInitialized: this._isInitialized,
      isSignedIn: this._isSignedIn,
      hasAccess: this._hasAccess,
      error: this._error,
    };
  }

  async initialize(): Promise<DriveOperationResult<void>> {
    try {
      if (this._isInitialized) {
        return { success: true };
      }

      // Load Google API library if not already loaded
      if (!window.gapi) {
        await this._loadGoogleApi();
      }

      // Load the auth2 and client libraries
      await new Promise<void>((resolve, reject) => {
        window.gapi.load('auth2:client', {
          callback: resolve,
          onerror: reject,
        });
      });

      // Initialize the client
      await window.gapi.client.init({
        clientId: this._config.clientId,
        scope: this._config.scope.join(' '),
        discoveryDocs: this._config.discoveryDocs,
        apiKey: this._config.apiKey,
      });

      this._authInstance = window.gapi.auth2.getAuthInstance();
      this._driveApi = window.gapi.client.drive;
      this._isInitialized = true;
      this._isSignedIn = this._authInstance.isSignedIn.get();
      this._hasAccess = this._isSignedIn && this._hasRequiredScopes();
      this._error = undefined;

      // Listen for sign-in state changes
      this._authInstance.isSignedIn.listen((isSignedIn: boolean) => {
        this._isSignedIn = isSignedIn;
        this._hasAccess = isSignedIn && this._hasRequiredScopes();
      });

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to initialize Google Drive client';
      this._error = errorMessage;

      return {
        success: false,
        error: {
          code: DriveErrorCodes.INTERNAL_ERROR,
          message: errorMessage,
          status: 'INITIALIZATION_FAILED',
        },
      };
    }
  }

  async signIn(): Promise<DriveOperationResult<unknown>> {
    try {
      if (!this._isInitialized || !this._authInstance) {
        throw new DriveClientError(
          'Drive client not initialized',
          DriveErrorCodes.INTERNAL_ERROR,
        );
      }

      if (this._isSignedIn && this._hasAccess) {
        return { success: true };
      }

      const authResult = await this._authInstance.signIn();
      this._isSignedIn = true;
      this._hasAccess = this._hasRequiredScopes();
      this._error = undefined;

      if (!this._hasAccess) {
        throw new DriveClientError(
          'Insufficient permissions',
          DriveErrorCodes.FORBIDDEN,
        );
      }

      return { success: true, data: authResult };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Sign-in failed';
      this._error = errorMessage;

      return {
        success: false,
        error: {
          code:
            error instanceof DriveClientError
              ? error.code
              : DriveErrorCodes.UNAUTHORIZED,
          message: errorMessage,
          status: 'SIGN_IN_FAILED',
        },
      };
    }
  }

  async signOut(): Promise<DriveOperationResult<void>> {
    try {
      if (!this._isInitialized || !this._isSignedIn || !this._authInstance) {
        return { success: true };
      }

      await this._authInstance.signOut();
      this._isSignedIn = false;
      this._hasAccess = false;
      this._error = undefined;

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Sign-out failed';
      this._error = errorMessage;

      return {
        success: false,
        error: {
          code: DriveErrorCodes.INTERNAL_ERROR,
          message: errorMessage,
          status: 'SIGN_OUT_FAILED',
        },
      };
    }
  }

  async getAccessToken(): Promise<string | null> {
    if (!this._isInitialized || !this._isSignedIn || !this._authInstance) {
      return null;
    }

    const currentUser = this._authInstance.currentUser.get();
    const authResponse = currentUser.getAuthResponse();
    return authResponse?.access_token || null;
  }

  async refreshToken(): Promise<DriveOperationResult<string>> {
    try {
      if (!this._isInitialized || !this._isSignedIn || !this._authInstance) {
        throw new DriveClientError(
          'Not authenticated',
          DriveErrorCodes.UNAUTHORIZED,
        );
      }

      const currentUser = this._authInstance.currentUser.get();
      const authResponse = await currentUser.reloadAuthResponse();

      return {
        success: true,
        data: authResponse.access_token,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Token refresh failed';
      this._error = errorMessage;

      return {
        success: false,
        error: {
          code: DriveErrorCodes.UNAUTHORIZED,
          message: errorMessage,
          status: 'TOKEN_REFRESH_FAILED',
        },
      };
    }
  }

  getDriveApi() {
    if (!this._isInitialized || !this._driveApi) {
      throw new DriveClientError(
        'Drive API not available',
        DriveErrorCodes.INTERNAL_ERROR,
      );
    }
    return this._driveApi;
  }

  private async _loadGoogleApi(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google API'));
      document.head.appendChild(script);
    });
  }

  private _hasRequiredScopes(): boolean {
    if (!this._authInstance || !this._isSignedIn) {
      return false;
    }

    const currentUser = this._authInstance.currentUser.get();
    const grantedScopes = currentUser.getGrantedScopes();

    return this._config.scope.every((scope) => grantedScopes.includes(scope));
  }
}

// Global Drive client factory
export const createDriveClient = (
  config?: Partial<DriveConfig>,
): DriveClient => {
  const fullConfig: DriveConfig = {
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    scope: [...DriveApiConfig.SCOPES],
    discoveryDocs: [...DriveApiConfig.DISCOVERY_DOCS],
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
    ...config,
  };

  if (!fullConfig.clientId) {
    throw new DriveClientError(
      'Google Client ID is required',
      DriveErrorCodes.INTERNAL_ERROR,
    );
  }

  return new DriveClient(fullConfig);
};

// Helper function to handle Drive API errors
export const handleDriveApiError = (error: unknown): DriveApiError => {
  // Type guard for Google API error structure
  if (
    typeof error === 'object' &&
    error !== null &&
    'result' in error &&
    typeof (error as { result: unknown }).result === 'object' &&
    (error as { result: unknown }).result !== null &&
    'error' in (error as { result: { error: unknown } }).result
  ) {
    const apiError = (
      error as {
        result: { error: { code?: number; message?: string; status?: string } };
      }
    ).result.error;
    return {
      code: apiError.code || DriveErrorCodes.INTERNAL_ERROR,
      message: apiError.message || 'Unknown Drive API error',
      status: apiError.status || 'UNKNOWN_ERROR',
    };
  }

  // Type guard for HTTP error structure
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status: unknown }).status === 'number'
  ) {
    const httpError = error as { status: number; statusText?: string };
    return {
      code: httpError.status,
      message: httpError.statusText || 'Drive API request failed',
      status: `HTTP_${httpError.status}`,
    };
  }

  // Handle Error objects
  if (error instanceof Error) {
    return {
      code: DriveErrorCodes.INTERNAL_ERROR,
      message: error.message,
      status: 'UNKNOWN_ERROR',
    };
  }

  return {
    code: DriveErrorCodes.INTERNAL_ERROR,
    message: 'Unexpected error occurred',
    status: 'UNKNOWN_ERROR',
  };
};

// Helper function for retry logic
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = DriveClientSettings.RETRY_COUNT,
  delay: number = DriveClientSettings.RETRY_DELAY,
): Promise<T> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      // Don't retry on certain error types
      if (error instanceof DriveClientError) {
        const shouldNotRetry = [
          DriveErrorCodes.UNAUTHORIZED as number,
          DriveErrorCodes.FORBIDDEN as number,
          DriveErrorCodes.NOT_FOUND as number,
        ].includes(error.code);

        if (shouldNotRetry) {
          throw error;
        }
      }

      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff
      const backoffDelay = delay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  throw lastError || new Error('Operation failed after retries');
};
