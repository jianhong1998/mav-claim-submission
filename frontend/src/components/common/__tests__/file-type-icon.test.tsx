/**
 * FileTypeIcon Component Tests
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import FileTypeIcon from '../icons/file-type-icon';
import * as fileUtils from '@/lib/file-utils';

// Mock file-utils to avoid real implementation
vi.mock('@/lib/file-utils', () => ({
  getFileTypeInfo: vi.fn((mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return {
        icon: () => <div data-testid="image-icon" />,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        category: 'image',
      };
    }
    if (mimeType === 'application/pdf') {
      return {
        icon: () => <div data-testid="pdf-icon" />,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        category: 'document',
      };
    }
    return {
      icon: () => <div data-testid="file-icon" />,
      color: 'text-gray-500',
      bgColor: 'bg-gray-500/10',
      category: 'other',
    };
  }),
}));

describe('FileTypeIcon', () => {
  it('renders image icon for image MIME type', () => {
    const { getByTestId } = render(<FileTypeIcon mimeType="image/png" />);
    expect(getByTestId('image-icon')).toBeInTheDocument();
  });

  it('renders PDF icon for PDF MIME type', () => {
    const { getByTestId } = render(<FileTypeIcon mimeType="application/pdf" />);
    expect(getByTestId('pdf-icon')).toBeInTheDocument();
  });

  it('renders file icon for other MIME types', () => {
    const { getByTestId } = render(<FileTypeIcon mimeType="text/plain" />);
    expect(getByTestId('file-icon')).toBeInTheDocument();
  });

  it('renders without background by default', () => {
    const { container } = render(<FileTypeIcon mimeType="image/png" />);
    // Should not have the background wrapper div
    expect(
      container.querySelector('div[style*="width"]'),
    ).not.toBeInTheDocument();
  });

  it('renders with background when showBackground is true', () => {
    const { container } = render(
      <FileTypeIcon
        mimeType="image/png"
        showBackground={true}
      />,
    );
    // Should have the background wrapper div with inline style
    const backgroundDiv = container.querySelector('div[style*="width"]');
    expect(backgroundDiv).toBeInTheDocument();
  });

  it('applies custom size', () => {
    const { container } = render(
      <FileTypeIcon
        mimeType="image/png"
        size={32}
        showBackground={true}
      />,
    );
    const backgroundDiv = container.querySelector('div[style*="width"]');
    expect(backgroundDiv).toHaveStyle({ width: '64px', height: '64px' });
  });

  it('applies default size of 20', () => {
    const { container } = render(
      <FileTypeIcon
        mimeType="image/png"
        showBackground={true}
      />,
    );
    const backgroundDiv = container.querySelector('div[style*="width"]');
    expect(backgroundDiv).toHaveStyle({ width: '40px', height: '40px' });
  });

  it('applies custom className', () => {
    // Just verify the component renders successfully with className prop
    const { getByTestId } = render(
      <FileTypeIcon
        mimeType="image/png"
        className="custom-class"
      />,
    );
    // Icon is mocked and returns a testid div
    expect(getByTestId('image-icon')).toBeInTheDocument();
  });

  it('calls getFileTypeInfo with correct MIME type', () => {
    const getFileTypeInfoSpy = vi.spyOn(fileUtils, 'getFileTypeInfo');
    render(<FileTypeIcon mimeType="application/pdf" />);
    expect(getFileTypeInfoSpy).toHaveBeenCalledWith('application/pdf');
  });
});
