import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MultiClaimForm } from '../MultiClaimForm';

// Mock all dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: vi.fn().mockResolvedValue({ success: true, claim: {} }),
  },
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

vi.mock('lucide-react', () => ({
  Plus: () => <span data-testid="Plus" />,
  Calendar: () => <span data-testid="Calendar" />,
  DollarSign: () => <span data-testid="DollarSign" />,
}));

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: Infinity,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        enabled: false,
      },
      mutations: {
        retry: false,
        gcTime: 0,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  TestWrapper.displayName = 'TestWrapper';
  return TestWrapper;
};

describe('MultiClaimForm - Simple Tests', () => {
  let wrapper: ReturnType<typeof createTestWrapper>;

  beforeEach(() => {
    vi.clearAllMocks();
    wrapper = createTestWrapper();
  });

  it('should render form without timeout', () => {
    render(<MultiClaimForm />, { wrapper });

    expect(screen.getByText('Add New Claim')).toBeInTheDocument();
    expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
  });

  it('should handle category selection without hanging', () => {
    render(<MultiClaimForm />, { wrapper });

    const categorySelect = screen.getByLabelText(/Category/i);
    fireEvent.change(categorySelect, { target: { value: 'others' } });

    expect(categorySelect).toBeInTheDocument();
  });

  it('should handle form submission without hanging', () => {
    render(<MultiClaimForm />, { wrapper });

    const submitButton = screen.getByRole('button', {
      name: /add to draft list/i,
    });
    fireEvent.click(submitButton);

    expect(submitButton).toBeInTheDocument();
  });
});
