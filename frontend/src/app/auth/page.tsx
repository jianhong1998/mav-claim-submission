'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { AuthStatus } from '@/components/auth/AuthStatus';
import { useAuth } from '@/hooks/queries/auth/useAuth';

export default function AuthPage() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading, logout } = useAuth();

  useEffect(() => {
    // If user is already authenticated, redirect to home or dashboard
    if (isAuthenticated && !isLoading) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Welcome</h1>
          <p className="text-muted-foreground">
            Sign in to access your account and manage your claims
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>
              Sign in with your Google account to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isAuthenticated ? (
              <GoogleAuthButton
                className="w-full"
                size="lg"
              />
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  You are already signed in. Redirecting...
                </p>
                <div className="flex justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <AuthStatus
          user={user}
          isAuthenticated={isAuthenticated}
          isLoading={isLoading}
          onLogout={logout}
        />

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                By signing in, you agree to our Terms of Service and Privacy
                Policy.
              </p>
              <p>
                Your Google account information will be used to create and
                manage your profile.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
