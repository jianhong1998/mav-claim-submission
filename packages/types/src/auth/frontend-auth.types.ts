import { IUser, IAuthStatusResponse, IOAuthToken } from '../dtos/auth.dto';

// Note: React types are used for component props interfaces
// React should be available in consuming projects

// Authentication loading and error states
export const AuthenticationState = Object.freeze({
  IDLE: 'idle',
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
  ERROR: 'error',
} as const);
export type AuthenticationState = (typeof AuthenticationState)[keyof typeof AuthenticationState];

// Frontend-specific authentication error types
export const AuthenticationError = Object.freeze({
  NETWORK_ERROR: 'network-error',
  DOMAIN_RESTRICTED: 'domain-restricted',
  OAUTH_FAILED: 'oauth-failed',
  TOKEN_EXPIRED: 'token-expired',
  RATE_LIMITED: 'rate-limited',
  UNKNOWN_ERROR: 'unknown-error',
} as const);
export type AuthenticationError = (typeof AuthenticationError)[keyof typeof AuthenticationError];

// Extended authentication response with frontend-specific fields
export interface IFrontendAuthResponse extends IAuthStatusResponse {
  state: AuthenticationState;
  error?: {
    type: AuthenticationError;
    message: string;
    retryAfter?: number; // For rate limiting
  };
  loading: boolean;
}

// Authentication context value interface
export interface IAuthContextValue {
  // Current authentication state
  auth: IFrontendAuthResponse;
  
  // User information (null when not authenticated)
  user: IUser | null;
  
  // Loading states for different operations
  isLoading: boolean;
  isLoggingOut: boolean;
  
  // Authentication actions
  logout: () => Promise<void>;
  
  // Utility methods
  refetch: () => Promise<void>;
  clearError: () => void;
}

// Hook options for authentication status
export interface IAuthStatusHookOptions {
  enabled?: boolean;
  refetchInterval?: number;
  retry?: boolean | number;
  staleTime?: number;
  cacheTime?: number;
}

// Logout mutation result
export interface ILogoutMutationResult {
  isLoading: boolean;
  error: Error | null;
  mutate: () => void;
  mutateAsync: () => Promise<void>;
  reset: () => void;
}

// OAuth button configuration
export interface IGoogleOAuthButtonConfig {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

// Auth header configuration
export interface IAuthHeaderConfig {
  className?: string;
  showProfilePicture?: boolean;
  dropdownAlign?: 'left' | 'right';
}

// Auth provider configuration
export interface IAuthProviderConfig {
  options?: IAuthStatusHookOptions;
}

// Login page error parameters
export interface ILoginPageSearchParams {
  error?: string;
  message?: string;
  domain?: string;
}

// OAuth token with frontend metadata
export interface IFrontendOAuthToken extends IOAuthToken {
  isExpired: boolean;
  timeUntilExpiry?: number;
}