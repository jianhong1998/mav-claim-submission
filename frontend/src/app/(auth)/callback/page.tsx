'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { getQueryKey, QueryGroup, QueryType } from '@/hooks/queries/keys';

export default function CallbackPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleRedirection = useCallback(async () => {
    const authQueryKey = getQueryKey({
      group: QueryGroup.AUTH,
      type: QueryType.ONE,
      key: 'status',
    });

    await queryClient.invalidateQueries({ queryKey: authQueryKey });
    router.replace('/');
  }, [router, queryClient]);

  useEffect(() => {
    void handleRedirection();
  }, [handleRedirection]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 size-8" />
    </div>
  );
}
