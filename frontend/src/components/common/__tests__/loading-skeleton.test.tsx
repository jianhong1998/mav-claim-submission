/**
 * LoadingSkeleton Component Tests
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import LoadingSkeleton from '../skeletons/loading-skeleton';

describe('LoadingSkeleton', () => {
  it('renders claim-card variant correctly', () => {
    const { container } = render(<LoadingSkeleton variant="claim-card" />);
    // Should have 3 skeletons by default
    const cards = container.querySelectorAll('.animate-pulse');
    expect(cards.length).toBe(3);
  });

  it('renders claim-list variant correctly', () => {
    const { container } = render(<LoadingSkeleton variant="claim-list" />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(3);
  });

  it('renders attachment-list variant correctly', () => {
    const { container } = render(<LoadingSkeleton variant="attachment-list" />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(3);
  });

  it('renders form variant correctly', () => {
    const { container } = render(<LoadingSkeleton variant="form" />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(3);
  });

  it('renders correct number of skeletons based on count prop', () => {
    const { container } = render(
      <LoadingSkeleton
        variant="claim-card"
        count={5}
      />,
    );
    const cards = container.querySelectorAll('.animate-pulse');
    expect(cards.length).toBe(5);
  });

  it('renders single skeleton when count is 1', () => {
    const { container } = render(
      <LoadingSkeleton
        variant="claim-list"
        count={1}
      />,
    );
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(1);
  });

  it('applies custom className', () => {
    const { container } = render(
      <LoadingSkeleton
        variant="claim-card"
        className="custom-class"
      />,
    );
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('uses animate-pulse for animation', () => {
    const { container } = render(<LoadingSkeleton variant="claim-card" />);
    const animatedElements = container.querySelectorAll('.animate-pulse');
    expect(animatedElements.length).toBeGreaterThan(0);
  });
});
