'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/queries/auth/useAuth';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();

  const [status, setStatus] = useState<'processing' | 'success' | 'error'>(
    'processing',
  );
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const authStatus = searchParams.get('status');
    const isNewUser = searchParams.get('isNewUser') === 'true';
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setMessage(decodeURIComponent(error));
      return;
    }

    if (authStatus === 'success') {
      setStatus('success');
      setMessage(
        isNewUser
          ? 'Welcome! Your account has been created successfully.'
          : 'Welcome back! You have been signed in successfully.',
      );

      // Wait a moment to show success message, then redirect
      const redirectTimer = setTimeout(() => {
        router.push('/');
      }, 2000);

      return () => clearTimeout(redirectTimer);
    } else if (authStatus === 'error') {
      setStatus('error');
      setMessage('Authentication failed. Please try again.');
    } else {
      // No specific status, wait for auth state to update
      const checkAuthTimer = setTimeout(() => {
        if (isAuthenticated) {
          setStatus('success');
          setMessage('Authentication successful! Redirecting...');
          setTimeout(() => router.push('/'), 1000);
        } else if (!isLoading) {
          setStatus('error');
          setMessage('Authentication verification failed.');
        }
      }, 1000);

      return () => clearTimeout(checkAuthTimer);
    }
  }, [searchParams, router, isAuthenticated, isLoading]);

  const handleRetry = () => {
    router.push('/auth');
  };

  const handleGoHome = () => {
    router.push('/');
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return (
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        );
      case 'success':
        return (
          <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <svg
              className="h-6 w-6 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
            <svg
              className="h-6 w-6 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'text-blue-600 dark:text-blue-400';
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Authentication Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            {getStatusIcon()}

            <div className="text-center space-y-2">
              <h3 className={`font-semibold ${getStatusColor()}`}>
                {status === 'processing' && 'Processing...'}
                {status === 'success' && 'Success!'}
                {status === 'error' && 'Error'}
              </h3>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          </div>

          {status === 'success' && (
            <div className="text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                Redirecting to home page in a moment...
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGoHome}
              >
                Go to Home Now
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  You can try signing in again or go to the home page.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    size="sm"
                    onClick={handleRetry}
                  >
                    Try Again
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGoHome}
                  >
                    Go Home
                  </Button>
                </div>
              </div>
            </div>
          )}

          {status === 'processing' && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                This usually takes just a few seconds...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8 max-w-md">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Authentication Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-blue-600 dark:text-blue-400">
                    Loading...
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Preparing authentication status...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
