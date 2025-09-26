'use client';

import { useHealthCheck } from '@/hooks/queries/health-check/useBackendHealthCheck';
import { ErrorHandler } from '@/hooks/queries/helper/error-handler';
import { NextPage } from 'next';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { useRouter } from 'next/navigation';

export const HomePage: NextPage = () => {
  const { error: healthCheckError, data: healthCheckResult } = useHealthCheck();
  const router = useRouter();

  useEffect(() => {
    if (!healthCheckError) return;

    const errorMessage = ErrorHandler.extractErrorMessage(healthCheckError);
    toast.error(errorMessage);
  }, [healthCheckError]);

  return (
    <div className="px-4 py-4 sm:py-6">
      <div className="text-3xl font-extrabold text-blue-600 mb-4">
        Backend Server is{' '}
        {healthCheckResult?.isHealthy ? (
          <span className="text-gray-300">Healthy</span>
        ) : (
          <span className="text-red-400">Unhealthy</span>
        )}
      </div>
      <div>
        <Button
          className="cursor-pointer disabled:cursor-not-allowed bg-blue-400 border-blue-700 text-blue-700 font-bold hover:bg-blue-500 hover:text-gray-300"
          // variant={'outline'}
          onClick={() => router.push('/')}
        >
          Home Page
        </Button>
      </div>
    </div>
  );
};
