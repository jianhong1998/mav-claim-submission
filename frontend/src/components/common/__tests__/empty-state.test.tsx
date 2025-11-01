/**
 * EmptyState Component Tests
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileText } from 'lucide-react';
import EmptyState from '../empty-states/empty-state';

describe('EmptyState', () => {
  it('renders icon, title, and description correctly', () => {
    render(
      <EmptyState
        icon={FileText}
        title="No items found"
        description="There are no items to display at this time."
      />,
    );

    expect(screen.getByText('No items found')).toBeInTheDocument();
    expect(
      screen.getByText('There are no items to display at this time.'),
    ).toBeInTheDocument();
  });

  it('renders without action button when action is not provided', () => {
    render(
      <EmptyState
        icon={FileText}
        title="No items"
        description="No items available"
      />,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders action button when action is provided', () => {
    const mockAction = {
      label: 'Create Item',
      onClick: vi.fn(),
    };

    render(
      <EmptyState
        icon={FileText}
        title="No items"
        description="No items available"
        action={mockAction}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Create Item' }),
    ).toBeInTheDocument();
  });

  it('calls action onClick when button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClick = vi.fn();
    const mockAction = {
      label: 'Create Item',
      onClick: mockOnClick,
    };

    render(
      <EmptyState
        icon={FileText}
        title="No items"
        description="No items available"
        action={mockAction}
      />,
    );

    const button = screen.getByRole('button', { name: 'Create Item' });
    await user.click(button);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    const { container } = render(
      <EmptyState
        icon={FileText}
        title="No items"
        description="No items available"
        className="custom-class"
      />,
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('renders centered layout', () => {
    const { container } = render(
      <EmptyState
        icon={FileText}
        title="No items"
        description="No items available"
      />,
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('text-center');
  });
});
