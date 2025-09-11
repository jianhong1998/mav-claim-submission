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

// Extract getUserInitials to avoid recreation on every render
const getUserInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const AuthHeaderComponent: React.FC<AuthHeaderProps> = ({ className }) => {
  const { user, isAuthenticated, isLoading, logout, isLoggingOut } = useAuth();

  // Memoize user-derived computations to avoid recalculation on every render
  const userInitials = React.useMemo(() => {
    return user?.name ? getUserInitials(user.name) : '';
  }, [user?.name]);

  // Memoize logout handler to avoid recreation on every render
  const handleLogout = React.useCallback(() => {
    logout();
  }, [logout]);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex items-center', className)}>
        <div
          className="size-8 animate-pulse rounded-full bg-muted"
          role="status"
          aria-label="Loading user authentication status"
        />
        <span className="sr-only">Loading authentication status...</span>
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
          <Link
            href="/auth/login"
            aria-label="Sign in to your account"
          >
            Sign In
          </Link>
        </Button>
      </div>
    );
  }

  // Authenticated state
  return (
    <div className={cn('flex items-center', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-8 w-8 rounded-full p-0 hover:bg-accent focus:ring-2 focus:ring-primary focus:ring-offset-2"
            disabled={isLoggingOut}
            aria-label={`User menu for ${user.name}`}
            aria-haspopup="menu"
            aria-expanded="false"
            title={`${user.name} - User menu`}
          >
            <Avatar className="size-8">
              <AvatarImage
                src={user.picture || undefined}
                alt={`${user.name} profile picture`}
              />
              <AvatarFallback
                className="bg-primary text-primary-foreground text-sm"
                aria-label={`${user.name} initials`}
              >
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-56"
          align="end"
          forceMount
          role="menu"
          aria-label="User account menu"
          onCloseAutoFocus={(event) => {
            // Prevent default behavior to maintain focus on trigger when closing via ESC
            event.preventDefault();
          }}
        >
          <DropdownMenuLabel
            className="font-normal"
            role="none"
          >
            <div className="flex flex-col space-y-1">
              <p
                className="text-sm font-medium leading-none"
                aria-label={`Signed in as ${user.name}`}
              >
                {user.name}
              </p>
              <p
                className="text-xs leading-none text-muted-foreground"
                aria-label={`Email: ${user.email}`}
              >
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator role="separator" />
          <DropdownMenuItem
            asChild
            role="menuitem"
          >
            <Link
              href="/profile"
              className="cursor-pointer"
              aria-label="View and edit profile settings"
            >
              <User
                className="mr-2 size-4"
                aria-hidden="true"
              />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator role="separator" />
          <DropdownMenuItem
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
            role="menuitem"
            aria-label={
              isLoggingOut
                ? 'Signing out, please wait'
                : 'Sign out of your account'
            }
          >
            <LogOut
              className="mr-2 size-4"
              aria-hidden="true"
            />
            <span>{isLoggingOut ? 'Signing out...' : 'Logout'}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

// Apply React.memo with custom comparison for props optimization
const AuthHeader = React.memo(AuthHeaderComponent, (prevProps, nextProps) => {
  // Only re-render if className changes
  return prevProps.className === nextProps.className;
});

AuthHeader.displayName = 'AuthHeader';

export { AuthHeader };
export type { AuthHeaderProps };
