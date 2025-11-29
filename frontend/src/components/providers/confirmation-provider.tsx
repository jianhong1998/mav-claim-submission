'use client';

import React, {
  createContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type {
  ConfirmOptions,
  ConfirmationContextValue,
  DialogState,
} from '@/types/confirmation';

/**
 * Context for global confirmation dialog state
 *
 * Provides confirm() method and isOpen state to consuming components
 */
export const ConfirmationContext =
  createContext<ConfirmationContextValue | null>(null);

interface ConfirmationProviderProps {
  children: React.ReactNode;
}

/**
 * Global confirmation dialog provider
 *
 * Manages dialog state and Promise-based API for confirmation dialogs.
 * Only one dialog can be active at a time (new requests rejected with warning).
 */
export const ConfirmationProvider: React.FC<ConfirmationProviderProps> = ({
  children,
}) => {
  const [state, setState] = useState<DialogState>({
    isOpen: false,
    options: null,
    resolver: null,
  });

  /**
   * Opens confirmation dialog and returns Promise that resolves to user's choice
   *
   * @param options - Dialog configuration (title, description, button text, variant)
   * @returns Promise<boolean> - true if confirmed, false if cancelled
   */
  const confirm = useCallback(
    (options: ConfirmOptions): Promise<boolean> => {
      // Create new Promise and use functional setState to access current state
      return new Promise<boolean>((resolve) => {
        setState((currentState) => {
          // Single dialog enforcement: reject new requests if dialog already open
          if (currentState.isOpen) {
            // eslint-disable-next-line no-console
            console.warn(
              '[ConfirmationDialog] Dialog already open, rejecting new request',
            );
            resolve(false);
            return currentState; // No state change
          }

          // Store resolver in state and open dialog
          return {
            isOpen: true,
            options,
            resolver: resolve,
          };
        });
      });
    },
    [], // No dependencies - function is stable
  );

  /**
   * Handles confirm button click - resolves Promise to true
   */
  const handleConfirm = useCallback(() => {
    setState((current) => {
      current.resolver?.(true);
      return {
        isOpen: false,
        options: null,
        resolver: null,
      };
    });
  }, []);

  /**
   * Handles cancel button click and ESC key - resolves Promise to false
   */
  const handleCancel = useCallback(() => {
    setState((current) => {
      current.resolver?.(false);
      return {
        isOpen: false,
        options: null,
        resolver: null,
      };
    });
  }, []);

  /**
   * Cleanup effect: resolve pending Promise to false on unmount
   * Prevents memory leaks from unresolved Promises
   */
  useEffect(() => {
    return () => {
      setState((current) => {
        current.resolver?.(false);
        return current;
      });
    };
  }, []); // Only run on mount/unmount

  const contextValue = useMemo<ConfirmationContextValue>(
    () => ({
      confirm,
      isOpen: state.isOpen,
    }),
    [confirm, state.isOpen],
  );

  return (
    <ConfirmationContext.Provider value={contextValue}>
      {children}
      <AlertDialog
        open={state.isOpen}
        onOpenChange={handleCancel}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{state.options?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {state.options?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>
              {state.options?.cancelText ?? 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={
                state.options?.variant === 'destructive'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : ''
              }
            >
              {state.options?.confirmText ?? 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmationContext.Provider>
  );
};
