'use client';

import React, { useEffect } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { ProfileForm } from '@/app/components/profile/profile-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SkeletonPage } from '@/components/pages/skeleton-page';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { useUserProfile } from '@/hooks/user/useUserProfile';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Profile settings page - Update user display name and email preferences
 * URL: /profile
 * Allows authenticated users to customize their profile and manage CC/BCC emails for claim submissions
 */
const ProfilePage: NextPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const {
    data: profileData,
    isLoading: isLoadingProfile,
    errorMessage,
    refetch,
  } = useUserProfile(user?.id);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isAuthLoading || isAuthenticated) return;
    router.push('/login');
  }, [isAuthenticated, isAuthLoading, router]);

  // Show loading skeleton while checking authentication or loading profile
  if (isAuthLoading || !isAuthenticated || !user) {
    return <SkeletonPage />;
  }

  if (isLoadingProfile) {
    return <SkeletonPage />;
  }

  // Show error state with retry option
  if (errorMessage) {
    return (
      <div className="container mx-auto py-4 sm:py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center space-y-4 py-8">
                <AlertCircle className="size-12 text-destructive" />
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold">
                    Error Loading Profile
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {errorMessage}
                  </p>
                </div>
                {errorMessage.includes('try again') && (
                  <Button
                    onClick={() => void refetch()}
                    variant="outline"
                  >
                    Retry
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show profile form once data is loaded
  if (!profileData) {
    return <SkeletonPage />;
  }

  return (
    <div className="container mx-auto py-4 sm:py-6 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>
              Update your display name and manage email preferences for claim
              submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              user={{
                id: profileData.id,
                name: profileData.name,
                email: profileData.email,
                emailPreferences: profileData.emailPreferences,
              }}
              onSuccess={() => {
                // Invalidate and refetch user profile data
                void queryClient.invalidateQueries({
                  queryKey: ['user', 'one', { userId: user.id }],
                });
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
