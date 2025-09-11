import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthHeader } from '../auth-header';
import { useAuth } from '@/components/providers/auth-provider';
import { IUser } from '@project/types';

// Mock the useAuth hook
vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: vi.fn(),
}));

// Mock Next.js Link component
vi.mock('next/link', () => {
  return {
    __esModule: true,
    default: ({
      children,
      href,
      ...props
    }: {
      children: React.ReactNode;
      href: string;
      [key: string]: unknown;
    }) => (
      <a
        href={href}
        {...props}
      >
        {children}
      </a>
    ),
  };
});

// Mock UI components
vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => (
    <div
      data-testid="avatar"
      className={className}
    >
      {children}
    </div>
  ),
  AvatarFallback: ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => (
    <div
      data-testid="avatar-fallback"
      className={className}
    >
      {children}
    </div>
  ),
  AvatarImage: ({
    src,
    alt,
    ...props
  }: {
    src?: string;
    alt?: string;
    [key: string]: unknown;
  }) => (
    <div
      data-testid="avatar-image"
      src={src}
      alt={alt}
      {...props}
    >
      {alt}
    </div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    disabled,
    onClick,
    asChild,
    ...props
  }: {
    children?: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    asChild?: boolean;
    [key: string]: unknown;
  }) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        disabled,
        onClick,
        ...props,
        ...(children.props as object),
      });
    }

    return (
      <button
        disabled={disabled}
        onClick={onClick}
        {...props}
      >
        {children}
      </button>
    );
  },
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuTrigger: ({
    children,
    asChild,
  }: {
    children?: React.ReactNode;
    asChild?: boolean;
  }) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        ...(children.props as object),
        'data-testid': 'dropdown-trigger',
      });
    }
    return <div data-testid="dropdown-trigger">{children}</div>;
  },
  DropdownMenuContent: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
    disabled,
    asChild,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    asChild?: boolean;
  }) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        onClick,
        disabled,
        ...(children.props as object),
      });
    }

    return (
      <button
        data-testid="dropdown-item"
        onClick={onClick}
        disabled={disabled}
      >
        {children}
      </button>
    );
  },
  DropdownMenuLabel: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="dropdown-label">{children}</div>
  ),
  DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  User: () => <span data-testid="user-icon">User</span>,
  LogOut: () => <span data-testid="logout-icon">LogOut</span>,
}));

const mockUser: IUser = {
  id: '1',
  email: 'john.doe@mavericks-consulting.com',
  name: 'John Doe',
  picture: 'https://example.com/avatar.jpg',
  googleId: 'google123',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockUserWithoutPicture: IUser = {
  ...mockUser,
  picture: null,
};

describe('AuthHeader', () => {
  const mockLogout = vi.fn();
  const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should display loading spinner when isLoading is true', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
        logout: mockLogout,
        isLoggingOut: false,
      });

      const { container } = render(<AuthHeader />);

      const loadingElement = container.querySelector('.animate-pulse');
      expect(loadingElement).toHaveClass('animate-pulse');
      expect(loadingElement).toHaveClass('rounded-full');
      expect(loadingElement).toHaveClass('bg-muted');
    });

    it('should apply custom className to loading state', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
        logout: mockLogout,
        isLoggingOut: false,
      });

      const { container } = render(<AuthHeader className="custom-class" />);

      const authContainer = container.firstChild as HTMLElement;
      expect(authContainer).toHaveClass('custom-class');
    });
  });

  describe('Unauthenticated State', () => {
    it('should display Sign In button when not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        logout: mockLogout,
        isLoggingOut: false,
      });

      render(<AuthHeader />);

      const signInLink = screen.getByRole('link', { name: /sign in/i });
      expect(signInLink).toBeInTheDocument();
      expect(signInLink).toHaveAttribute('href', '/auth/login');
    });

    it('should display Sign In button when user is null', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: true, // Even if authenticated is true, null user should show sign in
        isLoading: false,
        error: null,
        logout: mockLogout,
        isLoggingOut: false,
      });

      render(<AuthHeader />);

      const signInLink = screen.getByRole('link', { name: /sign in/i });
      expect(signInLink).toBeInTheDocument();
    });

    it('should apply custom className to unauthenticated state', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        logout: mockLogout,
        isLoggingOut: false,
      });

      const { container } = render(<AuthHeader className="custom-class" />);

      const authContainer = container.firstChild as HTMLElement;
      expect(authContainer).toHaveClass('custom-class');
    });
  });

  describe('Authenticated State', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        logout: mockLogout,
        isLoggingOut: false,
      });
    });

    it('should display user avatar with picture', () => {
      render(<AuthHeader />);

      const avatarImage = screen.getByTestId('avatar-image');
      expect(avatarImage).toHaveAttribute('src', mockUser.picture);
      expect(avatarImage).toHaveAttribute(
        'alt',
        `${mockUser.name} profile picture`,
      );
    });

    it('should display user initials when no picture', () => {
      mockUseAuth.mockReturnValue({
        user: mockUserWithoutPicture,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        logout: mockLogout,
        isLoggingOut: false,
      });

      render(<AuthHeader />);

      const avatarFallback = screen.getByTestId('avatar-fallback');
      expect(avatarFallback).toHaveTextContent('JD'); // John Doe initials
    });

    it('should handle single name correctly for initials', () => {
      const singleNameUser = { ...mockUser, name: 'John' };
      mockUseAuth.mockReturnValue({
        user: singleNameUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        logout: mockLogout,
        isLoggingOut: false,
      });

      render(<AuthHeader />);

      const avatarFallback = screen.getByTestId('avatar-fallback');
      expect(avatarFallback).toHaveTextContent('J');
    });

    it('should limit initials to 2 characters', () => {
      const longNameUser = { ...mockUser, name: 'John Michael Smith Doe' };
      mockUseAuth.mockReturnValue({
        user: longNameUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        logout: mockLogout,
        isLoggingOut: false,
      });

      render(<AuthHeader />);

      const avatarFallback = screen.getByTestId('avatar-fallback');
      expect(avatarFallback).toHaveTextContent('JM'); // Only first 2 initials
    });

    it('should display dropdown menu with user information', () => {
      render(<AuthHeader />);

      expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
      expect(screen.getByText(mockUser.email)).toBeInTheDocument();

      // Use getAllByText for John Doe since it appears in both avatar fallback and dropdown label
      const nameElements = screen.getAllByText(mockUser.name);
      expect(nameElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should display Profile menu item with correct link', () => {
      render(<AuthHeader />);

      const profileLink = screen.getByRole('link');
      expect(profileLink).toHaveAttribute('href', '/profile');
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByTestId('user-icon')).toBeInTheDocument();
    });

    it('should display Logout menu item', () => {
      render(<AuthHeader />);

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      expect(logoutButton).toBeInTheDocument();
      expect(screen.getByTestId('logout-icon')).toBeInTheDocument();
    });

    it('should apply custom className to authenticated state', () => {
      const { container } = render(<AuthHeader className="custom-class" />);

      const authContainer = container.firstChild as HTMLElement;
      expect(authContainer).toHaveClass('custom-class');
    });

    it('should disable avatar button when logging out', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        logout: mockLogout,
        isLoggingOut: true,
      });

      render(<AuthHeader />);

      const avatarButton = screen.getAllByRole('button')[0]; // First button is the avatar button
      expect(avatarButton).toBeDisabled();
    });
  });

  describe('User Menu Interactions', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        logout: mockLogout,
        isLoggingOut: false,
      });
    });

    it('should call logout function when logout button is clicked', async () => {
      const user = userEvent.setup();
      render(<AuthHeader />);

      const logoutButton = screen.getByText('Logout').closest('button');
      await user.click(logoutButton!);

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('should disable logout button when logging out', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        logout: mockLogout,
        isLoggingOut: true,
      });

      render(<AuthHeader />);

      const logoutButton = screen.getByText('Signing out...');
      expect(logoutButton.closest('button')).toBeDisabled();
      expect(logoutButton).toBeInTheDocument();
    });

    it('should show proper logout button text when not logging out', () => {
      render(<AuthHeader />);

      const logoutButton = screen.getByText('Logout');
      expect(logoutButton).toBeInTheDocument();
      expect(logoutButton.closest('button')).not.toBeDisabled();
    });

    it('should handle keyboard navigation on avatar button', async () => {
      const user = userEvent.setup();
      render(<AuthHeader />);

      const avatarButton = screen.getAllByRole('button')[0]; // First button is the avatar button
      await user.tab();
      expect(avatarButton).toHaveFocus();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        logout: mockLogout,
        isLoggingOut: false,
      });
    });

    it('should have proper alt text for avatar image', () => {
      render(<AuthHeader />);

      const avatarImage = screen.getByTestId('avatar-image');
      expect(avatarImage).toHaveAttribute(
        'alt',
        `${mockUser.name} profile picture`,
      );
    });

    it('should have proper button roles and labels', () => {
      render(<AuthHeader />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(1);

      const logoutText = screen.getByText('Logout');
      expect(logoutText).toBeInTheDocument();
      expect(logoutText.closest('button')).toBeInTheDocument();
    });

    it('should have proper link roles and hrefs', () => {
      render(<AuthHeader />);

      const profileLink = screen.getByRole('link');
      expect(profileLink).toHaveAttribute('href', '/profile');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing user data gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        logout: mockLogout,
        isLoggingOut: false,
      });

      expect(() => render(<AuthHeader />)).not.toThrow();
      expect(
        screen.getByRole('link', { name: /sign in/i }),
      ).toBeInTheDocument();
    });

    it('should handle malformed user data gracefully', () => {
      const malformedUser = { ...mockUser, name: '' };
      mockUseAuth.mockReturnValue({
        user: malformedUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        logout: mockLogout,
        isLoggingOut: false,
      });

      expect(() => render(<AuthHeader />)).not.toThrow();
    });

    it('should handle auth hook errors gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: new Error('Network error'),
        logout: mockLogout,
        isLoggingOut: false,
      });

      expect(() => render(<AuthHeader />)).not.toThrow();
      expect(
        screen.getByRole('link', { name: /sign in/i }),
      ).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('should render with all UI components properly integrated', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        logout: mockLogout,
        isLoggingOut: false,
      });

      render(<AuthHeader />);

      // Check all major UI components are rendered
      expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
      expect(screen.getByTestId('dropdown-trigger')).toBeInTheDocument();
      expect(screen.getByTestId('dropdown-content')).toBeInTheDocument();
      expect(screen.getByTestId('avatar')).toBeInTheDocument();
      expect(screen.getAllByTestId('dropdown-separator')).toHaveLength(2);
    });

    it('should maintain component displayName', () => {
      expect(AuthHeader.displayName).toBe('AuthHeader');
    });
  });
});
