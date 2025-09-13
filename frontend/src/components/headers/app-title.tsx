'use client';

import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { FC } from 'react';
import { ClassNameValue } from 'tailwind-merge';

type AppTitleProps = {
  containerClassName?: ClassNameValue;
  textClassName?: ClassNameValue;
};

export const AppTitle: FC<AppTitleProps> = ({
  containerClassName,
  textClassName,
}) => {
  const router = useRouter();

  const classNames = {
    container: cn(
      'cursor-pointer flex items-center space-x-4',
      containerClassName,
    ),
    text: cn('text-xl font-semibold', textClassName),
  };

  const handleRedirectToHomePage = () => {
    router.push('/');
  };

  return (
    <div
      className={classNames.container}
      onClick={handleRedirectToHomePage}
    >
      <h1 className={classNames.text}>Mavericks Claims</h1>
    </div>
  );
};
