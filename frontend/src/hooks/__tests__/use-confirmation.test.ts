import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React, { createElement } from 'react';
import { useConfirmation } from '../use-confirmation';
import { ConfirmationProvider } from '@/components/providers/confirmation-provider';
import type { ConfirmOptions } from '@/types/confirmation';

// Mock console methods
const mockConsoleError = vi
  .spyOn(console, 'error')
  .mockImplementation(() => {});
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

// Mock window.confirm
const mockWindowConfirm = vi.fn();
Object.defineProperty(window, 'confirm', {
  value: mockWindowConfirm,
  writable: true,
});

describe('useConfirmation Hook Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Hook with Provider Present', () => {
    const createProviderWrapper = () => {
      const Wrapper = ({ children }: { children: React.ReactNode }) =>
        createElement(ConfirmationProvider, {}, children);

      Wrapper.displayName = 'ConfirmationProviderWrapper';

      return Wrapper;
    };

    it('should return confirm function from context', () => {
      const { result } = renderHook(() => useConfirmation(), {
        wrapper: createProviderWrapper(),
      });

      expect(result.current).toBeDefined();
      expect(typeof result.current.confirm).toBe('function');
    });

    it('should return isOpen boolean from context', () => {
      const { result } = renderHook(() => useConfirmation(), {
        wrapper: createProviderWrapper(),
      });

      expect(result.current).toBeDefined();
      expect(typeof result.current.isOpen).toBe('boolean');
      expect(result.current.isOpen).toBe(false);
    });

    it('should have confirm function that accepts ConfirmOptions', () => {
      const { result } = renderHook(() => useConfirmation(), {
        wrapper: createProviderWrapper(),
      });

      const options: ConfirmOptions = {
        title: 'Test Title',
        description: 'Test Description',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        variant: 'default',
      };

      // Should not throw when called with valid options
      expect(() => {
        void result.current.confirm(options);
      }).not.toThrow();
    });

    it('should return Promise<boolean> from confirm function', async () => {
      const { result } = renderHook(() => useConfirmation(), {
        wrapper: createProviderWrapper(),
      });

      const options: ConfirmOptions = {
        title: 'Test Title',
        description: 'Test Description',
      };

      const confirmPromise = result.current.confirm(options);

      expect(confirmPromise).toBeInstanceOf(Promise);
    });

    it('should not log console errors when provider is present', () => {
      renderHook(() => useConfirmation(), {
        wrapper: createProviderWrapper(),
      });

      expect(mockConsoleError).not.toHaveBeenCalled();
    });
  });

  describe('Hook without Provider (Fallback)', () => {
    it('should log console.error when provider is missing', () => {
      renderHook(() => useConfirmation());

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('[useConfirmation]'),
      );
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('ConfirmationProvider not found'),
      );
    });

    it('should return fallback confirm function', () => {
      const { result } = renderHook(() => useConfirmation());

      expect(result.current).toBeDefined();
      expect(typeof result.current.confirm).toBe('function');
    });

    it('should return isOpen: false in fallback mode', () => {
      const { result } = renderHook(() => useConfirmation());

      expect(result.current.isOpen).toBe(false);
    });

    it('fallback confirm should call window.confirm with string description', async () => {
      mockWindowConfirm.mockReturnValue(true);

      const { result } = renderHook(() => useConfirmation());

      const options: ConfirmOptions = {
        title: 'Delete Item',
        description: 'Are you sure you want to delete this item?',
      };

      await result.current.confirm(options);

      expect(mockWindowConfirm).toHaveBeenCalledWith(
        'Delete Item\n\nAre you sure you want to delete this item?',
      );
    });

    it('fallback confirm should return window.confirm result', async () => {
      mockWindowConfirm.mockReturnValue(true);

      const { result } = renderHook(() => useConfirmation());

      const options: ConfirmOptions = {
        title: 'Test',
        description: 'Test description',
      };

      const confirmed = await result.current.confirm(options);

      expect(confirmed).toBe(true);

      // Test false case
      mockWindowConfirm.mockReturnValue(false);

      const cancelled = await result.current.confirm(options);

      expect(cancelled).toBe(false);
    });

    it('fallback should handle ReactNode descriptions with console.warn', async () => {
      mockWindowConfirm.mockReturnValue(true);

      const { result } = renderHook(() => useConfirmation());

      const reactNodeDescription = createElement('div', {}, 'Complex content');

      const options: ConfirmOptions = {
        title: 'Delete Item',
        description: reactNodeDescription,
      };

      await result.current.confirm(options);

      // Should log warning about ReactNode
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('[useConfirmation]'),
        expect.anything(),
      );

      // Should call window.confirm with placeholder text
      expect(mockWindowConfirm).toHaveBeenCalledWith(
        expect.stringContaining('[Complex content - see console for details]'),
      );
    });

    it('fallback should convert non-string, non-ReactNode descriptions to string', async () => {
      mockWindowConfirm.mockReturnValue(true);

      const { result } = renderHook(() => useConfirmation());

      const options = {
        title: 'Test',
        description: 123 as unknown as string, // Force type to test edge case
      };

      await result.current.confirm(options);

      expect(mockWindowConfirm).toHaveBeenCalledWith('Test\n\n123');
    });

    it('fallback should work without optional confirmText and cancelText', async () => {
      mockWindowConfirm.mockReturnValue(true);

      const { result } = renderHook(() => useConfirmation());

      const options: ConfirmOptions = {
        title: 'Simple Confirm',
        description: 'This is a simple confirmation',
      };

      const confirmed = await result.current.confirm(options);

      expect(confirmed).toBe(true);
      expect(mockWindowConfirm).toHaveBeenCalledWith(
        'Simple Confirm\n\nThis is a simple confirmation',
      );
    });

    it('fallback should ignore variant parameter', async () => {
      mockWindowConfirm.mockReturnValue(true);

      const { result } = renderHook(() => useConfirmation());

      const options: ConfirmOptions = {
        title: 'Destructive Action',
        description: 'This will delete everything',
        variant: 'destructive',
      };

      await result.current.confirm(options);

      // window.confirm doesn't support variants, should still work
      expect(mockWindowConfirm).toHaveBeenCalledWith(
        'Destructive Action\n\nThis will delete everything',
      );
    });
  });

  describe('Type Safety', () => {
    it('should accept valid ConfirmOptions with all fields', () => {
      const { result } = renderHook(() => useConfirmation());

      const options: ConfirmOptions = {
        title: 'Complete Options',
        description: 'Full description',
        confirmText: 'Yes',
        cancelText: 'No',
        variant: 'destructive',
      };

      // TypeScript should accept this without errors
      expect(() => {
        void result.current.confirm(options);
      }).not.toThrow();
    });

    it('should accept minimal ConfirmOptions with only required fields', () => {
      const { result } = renderHook(() => useConfirmation());

      const options: ConfirmOptions = {
        title: 'Minimal Options',
        description: 'Description only',
      };

      // TypeScript should accept this without errors
      expect(() => {
        void result.current.confirm(options);
      }).not.toThrow();
    });

    it('should return ConfirmationContextValue shape', () => {
      const { result } = renderHook(() => useConfirmation());

      expect(result.current).toHaveProperty('confirm');
      expect(result.current).toHaveProperty('isOpen');
      expect(typeof result.current.confirm).toBe('function');
      expect(typeof result.current.isOpen).toBe('boolean');
    });

    it('confirm function should return Promise<boolean>', async () => {
      mockWindowConfirm.mockReturnValue(true);

      const { result } = renderHook(() => useConfirmation());

      const options: ConfirmOptions = {
        title: 'Test',
        description: 'Test',
      };

      const confirmResult = result.current.confirm(options);

      expect(confirmResult).toBeInstanceOf(Promise);

      const resolvedValue = await confirmResult;

      expect(typeof resolvedValue).toBe('boolean');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string description in fallback', async () => {
      mockWindowConfirm.mockReturnValue(true);

      const { result } = renderHook(() => useConfirmation());

      const options: ConfirmOptions = {
        title: 'Empty Description',
        description: '',
      };

      await result.current.confirm(options);

      expect(mockWindowConfirm).toHaveBeenCalledWith('Empty Description\n\n');
    });

    it('should handle long descriptions in fallback', async () => {
      mockWindowConfirm.mockReturnValue(true);

      const { result } = renderHook(() => useConfirmation());

      const longDescription = 'A'.repeat(1000);

      const options: ConfirmOptions = {
        title: 'Long Description',
        description: longDescription,
      };

      await result.current.confirm(options);

      expect(mockWindowConfirm).toHaveBeenCalledWith(
        `Long Description\n\n${longDescription}`,
      );
    });

    it('should handle special characters in description', async () => {
      mockWindowConfirm.mockReturnValue(true);

      const { result } = renderHook(() => useConfirmation());

      const options: ConfirmOptions = {
        title: 'Special Characters',
        description: 'Line 1\nLine 2\tTab\r\nWindows newline',
      };

      await result.current.confirm(options);

      expect(mockWindowConfirm).toHaveBeenCalledWith(
        'Special Characters\n\nLine 1\nLine 2\tTab\r\nWindows newline',
      );
    });

    it('should handle multiple consecutive calls in fallback mode', async () => {
      mockWindowConfirm.mockReturnValueOnce(true).mockReturnValueOnce(false);

      const { result } = renderHook(() => useConfirmation());

      const options1: ConfirmOptions = {
        title: 'First',
        description: 'First call',
      };

      const options2: ConfirmOptions = {
        title: 'Second',
        description: 'Second call',
      };

      const result1 = await result.current.confirm(options1);
      const result2 = await result.current.confirm(options2);

      expect(result1).toBe(true);
      expect(result2).toBe(false);
      expect(mockWindowConfirm).toHaveBeenCalledTimes(2);
    });
  });

  describe('Memory Management', () => {
    it('should properly cleanup on unmount', () => {
      const { unmount } = renderHook(() => useConfirmation());

      expect(() => unmount()).not.toThrow();
    });

    it('should handle multiple hook instances in fallback mode', () => {
      const { result: result1 } = renderHook(() => useConfirmation());
      const { result: result2 } = renderHook(() => useConfirmation());

      expect(result1.current).toBeDefined();
      expect(result2.current).toBeDefined();
      expect(result1.current.isOpen).toBe(false);
      expect(result2.current.isOpen).toBe(false);

      // Each instance logs its own error
      expect(mockConsoleError).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple hook instances with provider', () => {
      const createProviderWrapper = () => {
        const Wrapper = ({ children }: { children: React.ReactNode }) =>
          createElement(ConfirmationProvider, {}, children);

        Wrapper.displayName = 'ConfirmationProviderWrapper';

        return Wrapper;
      };

      const { result: result1 } = renderHook(() => useConfirmation(), {
        wrapper: createProviderWrapper(),
      });

      const { result: result2 } = renderHook(() => useConfirmation(), {
        wrapper: createProviderWrapper(),
      });

      expect(result1.current).toBeDefined();
      expect(result2.current).toBeDefined();

      // No errors should be logged when provider is present
      expect(mockConsoleError).not.toHaveBeenCalled();
    });
  });

  describe('Fallback Behavior Consistency', () => {
    it('should consistently return same isOpen value in fallback', () => {
      const { result, rerender } = renderHook(() => useConfirmation());

      expect(result.current.isOpen).toBe(false);

      rerender();

      expect(result.current.isOpen).toBe(false);
    });

    it('should log error on each render when provider is missing', () => {
      const { rerender } = renderHook(() => useConfirmation());

      // First render logs error
      expect(mockConsoleError).toHaveBeenCalledTimes(1);

      // Rerender logs error again
      rerender();
      expect(mockConsoleError).toHaveBeenCalledTimes(2);

      // Another rerender logs error again
      rerender();
      expect(mockConsoleError).toHaveBeenCalledTimes(3);
    });
  });
});
