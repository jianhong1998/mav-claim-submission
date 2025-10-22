import { FC } from 'react';
import { Skeleton } from '../ui/skeleton';

export const SkeletonPage: FC = () => {
  return (
    <div className="w-full h-full mt-10 px-10 flex flex-col space-y-3 items-center">
      <Skeleton className="h-[125px] w-full rounded-xl" />
      <div className="space-y-2 w-full">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
};
