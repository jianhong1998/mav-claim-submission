import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Navbar } from './navbar';
import { useAuth } from '@/components/providers/auth-provider';
import { NavItem } from './nav-item.type';

// Mock the useAuth hook
vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: vi.fn(),
}));

// Mock usePathname hook
const mockUsePathname = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
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
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    className,
    ...props
  }: {
    children?: React.ReactNode;
    className?: string;
    [key: string]: unknown;
  }) => (
    <button
      className={className}
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="sheet">{children}</div>
  ),
  SheetTrigger: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="sheet-trigger">{children}</div>
  ),
  SheetContent: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Menu: () => <span data-testid="menu-icon">Menu</span>,
}));

describe('Navbar', () => {
  const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
  const mockNavItems: NavItem[] = [
    { label: 'New Claim', href: '/' },
    { label: 'Claim History', href: '/claims' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue('/');
  });

  it('returns null when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
      logout: vi.fn(),
      isLoggingOut: false,
    });

    const { container } = render(<Navbar navItems={mockNavItems} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders desktop nav when authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: '1', email: 'test@example.com', name: 'Test User' },
      error: null,
      logout: vi.fn(),
      isLoggingOut: false,
    });

    render(<Navbar navItems={mockNavItems} />);

    const newClaimLinks = screen.getAllByText('New Claim');
    const claimHistoryLinks = screen.getAllByText('Claim History');

    expect(newClaimLinks.length).toBeGreaterThan(0);
    expect(claimHistoryLinks.length).toBeGreaterThan(0);
  });

  it('highlights active route', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: '1', email: 'test@example.com', name: 'Test User' },
      error: null,
      logout: vi.fn(),
      isLoggingOut: false,
    });
    mockUsePathname.mockReturnValue('/claims');

    render(<Navbar navItems={mockNavItems} />);

    const claimHistoryLinks = screen.getAllByText('Claim History');
    const claimHistoryLink = claimHistoryLinks[0].closest('a');
    expect(claimHistoryLink).toHaveClass('bg-accent');
  });
});
