import type React from 'react';

/**
 * Configuration options for confirmation dialogs
 *
 * Supports both string and ReactNode descriptions for rich content (e.g., bullet lists)
 */
export interface ConfirmOptions {
  /** Dialog title */
  title: string;
  /** Dialog description - supports both plain text and rich React content */
  description: string | React.ReactNode;
  /** Custom text for confirm button (default: "Confirm") */
  confirmText?: string;
  /** Custom text for cancel button (default: "Cancel") */
  cancelText?: string;
  /** Button variant - 'destructive' for dangerous actions, 'default' otherwise */
  variant?: 'default' | 'destructive';
}

/**
 * Context value provided to consumers via useConfirmation hook
 *
 * Promise-based API allows clean async/await usage matching window.confirm()
 */
export interface ConfirmationContextValue {
  /** Opens confirmation dialog and returns Promise resolving to user's choice */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Indicates if a confirmation dialog is currently open */
  isOpen: boolean;
}

/**
 * Internal state for ConfirmationProvider
 *
 * Uses Promise resolver pattern: store resolver in state, call it when user clicks
 */
export interface DialogState {
  /** Whether dialog is currently open */
  isOpen: boolean;
  /** Configuration options for the current dialog (null when closed) */
  options: ConfirmOptions | null;
  /** Promise resolver function (called with true/false based on user action) */
  resolver: ((value: boolean) => void) | null;
}
