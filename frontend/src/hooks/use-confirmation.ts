import { useContext } from 'react';
import { ConfirmationContext } from '@/components/providers/confirmation-provider';
import type {
  ConfirmOptions,
  ConfirmationContextValue,
} from '@/types/confirmation';
import { isValidElement } from 'react';

/**
 * Hook for accessing the global confirmation dialog
 *
 * Provides confirm() method and isOpen state with graceful fallback to window.confirm
 * if ConfirmationProvider is missing from the component tree.
 *
 * @returns {ConfirmationContextValue} Object with confirm() method and isOpen boolean
 *
 * @example
 * ```tsx
 * const { confirm, isOpen } = useConfirmation();
 *
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     title: 'Delete Item',
 *     description: 'Are you sure? This cannot be undone.',
 *     variant: 'destructive',
 *   });
 *
 *   if (confirmed) {
 *     // Perform deletion
 *   }
 * };
 * ```
 */
export const useConfirmation = (): ConfirmationContextValue => {
  const context = useContext(ConfirmationContext);

  // Graceful fallback if provider is missing
  if (context === null) {
    // eslint-disable-next-line no-console
    console.error(
      '[useConfirmation] ConfirmationProvider not found in component tree. ' +
        'Falling back to window.confirm(). ' +
        'Please wrap your app with <ConfirmationProvider>.',
    );

    // Return fallback implementation using native window.confirm
    return {
      confirm: async (options: ConfirmOptions): Promise<boolean> => {
        // Handle React.ReactNode descriptions by converting to placeholder text
        let description: string;
        if (typeof options.description === 'string') {
          description = options.description;
        } else if (isValidElement(options.description)) {
          // ReactNode cannot be converted to string, use placeholder
          description = '[Complex content - see console for details]';
          // eslint-disable-next-line no-console
          console.warn(
            '[useConfirmation] Fallback mode cannot render React.ReactNode. ' +
              'Original content:',
            options.description,
          );
        } else {
          description = String(options.description);
        }

        // Use native window.confirm with title and description
        const message = `${options.title}\n\n${description}`;
        return window.confirm(message);
      },
      isOpen: false,
    };
  }

  return context;
};
