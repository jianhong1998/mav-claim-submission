'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export const ClaimReviewLoadingState: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <h1 className="text-2xl font-bold">Loading Review...</h1>
      </div>

      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card
            key={i}
            className="animate-pulse"
          >
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="h-8 bg-muted rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
