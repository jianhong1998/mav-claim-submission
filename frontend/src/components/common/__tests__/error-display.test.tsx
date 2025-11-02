/**
 * ErrorDisplay Component Tests
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorDisplay from '../errors/error-display';

describe('ErrorDisplay', () => {
  it('renders error message from string', () => {
    render(<ErrorDisplay error="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders error message from Error object', () => {
    const error = new Error('Network error occurred');
    render(<ErrorDisplay error={error} />);
    expect(screen.getByText('Network error occurred')).toBeInTheDocument();
  });

  it('renders alert variant by default', () => {
    render(<ErrorDisplay error="Test error" />);
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('renders inline variant correctly', () => {
    const { container } = render(
      <ErrorDisplay
        error="Inline error"
        variant="inline"
      />,
    );
    expect(screen.getByText('Inline error')).toBeInTheDocument();
    // Check for inline variant classes
    expect(container.querySelector('.text-destructive')).toBeInTheDocument();
  });

  it('renders toast variant correctly', () => {
    const { container } = render(
      <ErrorDisplay
        error="Toast error"
        variant="toast"
      />,
    );
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Toast error')).toBeInTheDocument();
    // Check for toast variant classes
    expect(container.querySelector('.bg-destructive')).toBeInTheDocument();
  });

  it('does not show retry button when onRetry is not provided', () => {
    render(<ErrorDisplay error="Test error" />);
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('shows retry button when onRetry is provided', () => {
    const mockOnRetry = vi.fn();
    render(
      <ErrorDisplay
        error="Test error"
        onRetry={mockOnRetry}
      />,
    );
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnRetry = vi.fn();
    render(
      <ErrorDisplay
        error="Test error"
        onRetry={mockOnRetry}
      />,
    );

    const retryButton = screen.getByText('Retry');
    await user.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    const { container } = render(
      <ErrorDisplay
        error="Test error"
        className="custom-class"
      />,
    );
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('renders AlertCircle icon for all variants', () => {
    const { container: container1 } = render(
      <ErrorDisplay
        error="Test"
        variant="alert"
      />,
    );
    const { container: container2 } = render(
      <ErrorDisplay
        error="Test"
        variant="inline"
      />,
    );
    const { container: container3 } = render(
      <ErrorDisplay
        error="Test"
        variant="toast"
      />,
    );

    // Each variant should have an icon (svg element from AlertCircle)
    expect(container1.querySelector('svg')).toBeInTheDocument();
    expect(container2.querySelector('svg')).toBeInTheDocument();
    expect(container3.querySelector('svg')).toBeInTheDocument();
  });
});
