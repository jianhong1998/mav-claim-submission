'use client';

import React, { useEffect } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { ClaimsListComponent } from '@/components/claims/ClaimsListComponent';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';

/**
 * Claims listing page - View all user claims across all statuses
 * URL: /claims
 * Following requirement 1.1 for authenticated claim viewing
 */
const ClaimsPage: NextPage = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  const handleCreateClaim = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    router.push('/');
  };

  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    router.push('/login');
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="container mx-auto py-4 sm:py-6 px-4">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header with Create Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              All Claims
            </h1>
            <p className="text-muted-foreground mt-1 sm:mt-0">
              View and manage your expense claims across all categories and
              statuses
            </p>
          </div>
          <div className="flex justify-center sm:justify-end">
            <Button
              onClick={handleCreateClaim}
              disabled={isLoading}
              className="w-full sm:w-auto min-w-40 min-h-11 touch-manipulation cursor-pointer"
              size="lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Submit Claims
            </Button>
          </div>
        </div>

        {/* Claims List */}
        <ClaimsListComponent />
      </div>
    </div>
  );
};

export default ClaimsPage;
