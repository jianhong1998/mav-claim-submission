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

/**
 * Profile settings page - Update user display name and email preferences
 * URL: /profile
 * Allows authenticated users to customize their profile and manage CC/BCC emails for claim submissions
 */
const ProfilePage: NextPage = () => {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    router.push('/login');
  }, [isAuthenticated, isLoading, router]);

  // Show loading skeleton while checking authentication
  if (isLoading || !isAuthenticated || !user) {
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
                id: user.id,
                name: user.name,
                email: user.email,
                emailPreferences: [],
              }}
              onSuccess={() => {
                // Optionally refresh auth status to get updated user data
                // For now, the form handles success notifications
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
