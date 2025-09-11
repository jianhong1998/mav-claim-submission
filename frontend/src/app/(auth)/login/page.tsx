'use client';

import { GoogleOAuthButton } from '@/components/auth/google-oauth-button';
import { useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { toast } from 'sonner';
import type { NextPage } from 'next';

/**
 * Error message mappings for different error types from URL parameters
 */
const ERROR_MESSAGES = Object.freeze({
  auth_failed: 'Authentication failed. Please try again.',
  domain_not_allowed:
    'Access denied: Only @mavericks-consulting.com accounts are allowed',
  network_error:
    'Network error occurred. Please check your connection and try again.',
  jwt_failed:
    'Authentication succeeded but session creation failed. Please try again.',
} as const);

type ErrorType = keyof typeof ERROR_MESSAGES;

const LoginContent = () => {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') as ErrorType | null;

  useEffect(() => {
    if (error && ERROR_MESSAGES[error]) {
      toast.error(ERROR_MESSAGES[error]);
    } else if (error) {
      // Fallback for unknown error types
      toast.error('An error occurred during authentication. Please try again.');
    }
  }, [error]);

  const handleOAuthError = (error: Error) => {
    toast.error(
      error.message || 'OAuth authentication failed. Please try again.',
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome to Mavericks Claims
          </h1>
          <p className="text-muted-foreground text-lg">
            Sign in with your Mavericks Consulting account to access the claim
            submission system
          </p>
        </div>

        {/* OAuth Button Section */}
        <div className="flex flex-col items-center space-y-6">
          <GoogleOAuthButton
            size="lg"
            className="w-full max-w-sm py-3 text-lg"
            onOAuthError={handleOAuthError}
            aria-label="Sign in with Google using your @mavericks-consulting.com account"
          >
            Sign in with Google
          </GoogleOAuthButton>

          {/* Additional Information */}
          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>Only @mavericks-consulting.com accounts are allowed</p>
            <p>
              By signing in, you agree to our terms of service and privacy
              policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const LoginPage: NextPage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
};

export default LoginPage;
