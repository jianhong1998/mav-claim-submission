'use client';

import * as React from 'react';
import Link from 'next/link';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface AuthHeaderProps {
  className?: string;
}

const AuthHeader: React.FC<AuthHeaderProps> = ({ className }) => {
  const { user, isAuthenticated, isLoading, logout, isLoggingOut } = useAuth();

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex items-center', className)}>
        <div className="size-8 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  // Unauthenticated state
  if (!isAuthenticated || !user) {
    return (
      <div className={cn('flex items-center', className)}>
        <Button
          asChild
          variant="ghost"
          size="sm"
        >
          <Link href="/auth/login">Sign In</Link>
        </Button>
      </div>
    );
  }

  // Get user initials for fallback
  const getUserInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = () => {
    logout();
  };

  // Authenticated state
  return (
    <div className={cn('flex items-center', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-8 w-8 rounded-full p-0 hover:bg-accent focus:ring-2 focus:ring-primary focus:ring-offset-2"
            disabled={isLoggingOut}
          >
            <Avatar className="size-8">
              <AvatarImage
                src={user.picture || undefined}
                alt={user.name}
              />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {getUserInitials(user.name)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-56"
          align="end"
          forceMount
        >
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link
              href="/profile"
              className="cursor-pointer"
            >
              <User className="mr-2 size-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
          >
            <LogOut className="mr-2 size-4" />
            <span>{isLoggingOut ? 'Signing out...' : 'Logout'}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

AuthHeader.displayName = 'AuthHeader';

export { AuthHeader };
export type { AuthHeaderProps };
