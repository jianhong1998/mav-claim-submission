'use client';

import React from 'react';
import { NextPage } from 'next';
import { ClaimsListComponent } from '@/components/claims/ClaimsListComponent';

/**
 * Claims listing page - View all user claims across all statuses
 * URL: /claim
 * Following requirement 1.1 for authenticated claim viewing
 */
const ClaimsPage: NextPage = () => {
  return (
    <div className="container mx-auto py-4 sm:py-6 px-4">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            All Claims
          </h1>
          <p className="text-muted-foreground mt-1 sm:mt-0">
            View and manage your expense claims across all categories and
            statuses
          </p>
        </div>

        {/* Claims List */}
        <ClaimsListComponent />
      </div>
    </div>
  );
};

export default ClaimsPage;
