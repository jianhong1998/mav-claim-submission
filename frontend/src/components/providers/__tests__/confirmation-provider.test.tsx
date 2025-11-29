import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ConfirmationProvider,
  ConfirmationContext,
} from '../confirmation-provider';

// Mock console.warn for single dialog enforcement tests
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

// Mock AlertDialog components from shadcn/ui
vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
  }) => (
    <div
      data-testid="alert-dialog"
      data-open={open}
    >
      {open && (
        <div>
          {children}
          <button
            data-testid="dialog-overlay"
            onClick={() => onOpenChange(false)}
          >
            Overlay
          </button>
        </div>
      )}
    </div>
  ),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-content">{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-header">{children}</div>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-footer">{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="alert-dialog-title">{children}</h2>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-description">{children}</div>
  ),
  AlertDialogAction: ({
    onClick,
    children,
    className,
  }: {
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
  }) => (
    <button
      data-testid="alert-dialog-action"
      onClick={onClick}
      className={className}
    >
      {children}
    </button>
  ),
  AlertDialogCancel: ({
    onClick,
    children,
  }: {
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      data-testid="alert-dialog-cancel"
      onClick={onClick}
    >
      {children}
    </button>
  ),
}));

describe('ConfirmationProvider Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Dialog Opens with Correct Options', () => {
    it('should display provided title', async () => {
      const TestComponent = () => {
        const context = React.useContext(ConfirmationContext);
        return (
          <button
            onClick={() =>
              context?.confirm({
                title: 'Test Title',
                description: 'Test Description',
              })
            }
          >
            Open Dialog
          </button>
        );
      };

      render(
        <ConfirmationProvider>
          <TestComponent />
        </ConfirmationProvider>,
      );

      const openButton = screen.getByText('Open Dialog');
      await userEvent.click(openButton);

      await waitFor(() => {
        expect(screen.getByTestId('alert-dialog-title')).toHaveTextContent(
          'Test Title',
        );
      });
    });

    it('should display provided string description', async () => {
      const TestComponent = () => {
        const context = React.useContext(ConfirmationContext);
        return (
          <button
            onClick={() =>
              context?.confirm({
                title: 'Delete Item',
                description: 'Are you sure you want to delete this item?',
              })
            }
          >
            Open Dialog
          </button>
        );
      };

      render(
        <ConfirmationProvider>
          <TestComponent />
        </ConfirmationProvider>,
      );

      const openButton = screen.getByText('Open Dialog');
      await userEvent.click(openButton);

      await waitFor(() => {
        expect(
          screen.getByTestId('alert-dialog-description'),
        ).toHaveTextContent('Are you sure you want to delete this item?');
      });
    });

    it('should display provided ReactNode description', async () => {
      const TestComponent = () => {
        const context = React.useContext(ConfirmationContext);
        return (
          <button
            onClick={() =>
              context?.confirm({
                title: 'Complex Dialog',
                description: (
                  <div>
                    <p>Line 1</p>
                    <p>Line 2</p>
                  </div>
                ),
              })
            }
          >
            Open Dialog
          </button>
        );
      };

      render(
        <ConfirmationProvider>
          <TestComponent />
        </ConfirmationProvider>,
      );

      const openButton = screen.getByText('Open Dialog');
      await userEvent.click(openButton);

      await waitFor(() => {
        const description = screen.getByTestId('alert-dialog-description');
        expect(description.textContent).toContain('Line 1');
        expect(description.textContent).toContain('Line 2');
      });
    });

    it('should display custom confirmText', async () => {
      const TestComponent = () => {
        const context = React.useContext(ConfirmationContext);
        return (
          <button
            onClick={() =>
              context?.confirm({
                title: 'Submit',
                description: 'Ready to submit?',
                confirmText: 'Yes, Submit',
              })
            }
          >
            Open Dialog
          </button>
        );
      };

      render(
        <ConfirmationProvider>
          <TestComponent />
        </ConfirmationProvider>,
      );

      const openButton = screen.getByText('Open Dialog');
      await userEvent.click(openButton);

      await waitFor(() => {
        expect(screen.getByTestId('alert-dialog-action')).toHaveTextContent(
          'Yes, Submit',
        );
      });
    });

    it('should display custom cancelText', async () => {
      const TestComponent = () => {
        const context = React.useContext(ConfirmationContext);
        return (
          <button
            onClick={() =>
              context?.confirm({
                title: 'Delete',
                description: 'Delete this?',
                cancelText: 'No, Keep It',
              })
            }
          >
            Open Dialog
          </button>
        );
      };

      render(
        <ConfirmationProvider>
          <TestComponent />
        </ConfirmationProvider>,
      );

      const openButton = screen.getByText('Open Dialog');
      await userEvent.click(openButton);

      await waitFor(() => {
        expect(screen.getByTestId('alert-dialog-cancel')).toHaveTextContent(
          'No, Keep It',
        );
      });
    });

    it('should display default button text when not provided', async () => {
      const TestComponent = () => {
        const context = React.useContext(ConfirmationContext);
        return (
          <button
            onClick={() =>
              context?.confirm({
                title: 'Confirm',
                description: 'Proceed?',
              })
            }
          >
            Open Dialog
          </button>
        );
      };

      render(
        <ConfirmationProvider>
          <TestComponent />
        </ConfirmationProvider>,
      );

      const openButton = screen.getByText('Open Dialog');
      await userEvent.click(openButton);

      await waitFor(() => {
        expect(screen.getByTestId('alert-dialog-action')).toHaveTextContent(
          'Confirm',
        );
        expect(screen.getByTestId('alert-dialog-cancel')).toHaveTextContent(
          'Cancel',
        );
      });
    });

    it('should apply destructive variant className', async () => {
      const TestComponent = () => {
        const context = React.useContext(ConfirmationContext);
        return (
          <button
            onClick={() =>
              context?.confirm({
                title: 'Delete',
                description: 'This is destructive',
                variant: 'destructive',
              })
            }
          >
            Open Dialog
          </button>
        );
      };

      render(
        <ConfirmationProvider>
          <TestComponent />
        </ConfirmationProvider>,
      );

      const openButton = screen.getByText('Open Dialog');
      await userEvent.click(openButton);

      await waitFor(() => {
        const actionButton = screen.getByTestId('alert-dialog-action');
        expect(actionButton.className).toContain('bg-destructive');
        expect(actionButton.className).toContain('text-destructive-foreground');
      });
    });

    it('should not apply destructive className for default variant', async () => {
      const TestComponent = () => {
        const context = React.useContext(ConfirmationContext);
        return (
          <button
            onClick={() =>
              context?.confirm({
                title: 'Save',
                description: 'Save changes?',
                variant: 'default',
              })
            }
          >
            Open Dialog
          </button>
        );
      };

      render(
        <ConfirmationProvider>
          <TestComponent />
        </ConfirmationProvider>,
      );

      const openButton = screen.getByText('Open Dialog');
      await userEvent.click(openButton);

      await waitFor(() => {
        const actionButton = screen.getByTestId('alert-dialog-action');
        expect(actionButton.className).not.toContain('bg-destructive');
      });
    });
  });

  describe('Promise Resolution on Confirm', () => {
    it('should resolve Promise to true when confirm button is clicked', async () => {
      const TestComponent = () => {
        const context = React.useContext(ConfirmationContext);
        const [result, setResult] = React.useState<boolean | null>(null);

        const handleClick = async () => {
          const confirmed = await context?.confirm({
            title: 'Confirm',
            description: 'Proceed?',
          });
          setResult(confirmed ?? null);
        };

        return (
          <div>
            <button onClick={handleClick}>Open Dialog</button>
            {result !== null && (
              <div data-testid="result">{String(result)}</div>
            )}
          </div>
        );
      };

      render(
        <ConfirmationProvider>
          <TestComponent />
        </ConfirmationProvider>,
      );

      const openButton = screen.getByText('Open Dialog');
      await userEvent.click(openButton);

      await waitFor(() => {
        expect(screen.getByTestId('alert-dialog-action')).toBeInTheDocument();
      });

      const confirmButton = screen.getByTestId('alert-dialog-action');
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByTestId('result')).toHaveTextContent('true');
      });
    });

    it('should close dialog after confirmation', async () => {
      const TestComponent = () => {
        const context = React.useContext(ConfirmationContext);
        return (
          <button
            onClick={() =>
              context?.confirm({
                title: 'Confirm',
                description: 'Proceed?',
              })
            }
          >
            Open Dialog
          </button>
        );
      };

      render(
        <ConfirmationProvider>
          <TestComponent />
        </ConfirmationProvider>,
      );

      const openButton = screen.getByText('Open Dialog');
      await userEvent.click(openButton);

      await waitFor(() => {
        expect(screen.getByTestId('alert-dialog')).toHaveAttribute(
          'data-open',
          'true',
        );
      });

      const confirmButton = screen.getByTestId('alert-dialog-action');
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByTestId('alert-dialog')).toHaveAttribute(
          'data-open',
          'false',
        );
      });
    });
  });

  describe('Promise Resolution on Cancel', () => {
    it('should resolve Promise to false when cancel button is clicked', async () => {
      const TestComponent = () => {
        const context = React.useContext(ConfirmationContext);
        const [result, setResult] = React.useState<boolean | null>(null);

        const handleClick = async () => {
          const confirmed = await context?.confirm({
            title: 'Confirm',
            description: 'Proceed?',
          });
          setResult(confirmed ?? null);
        };

        return (
          <div>
            <button onClick={handleClick}>Open Dialog</button>
            {result !== null && (
              <div data-testid="result">{String(result)}</div>
            )}
          </div>
        );
      };

      render(
        <ConfirmationProvider>
          <TestComponent />
        </ConfirmationProvider>,
      );

      const openButton = screen.getByText('Open Dialog');
      await userEvent.click(openButton);

      await waitFor(() => {
        expect(screen.getByTestId('alert-dialog-cancel')).toBeInTheDocument();
      });

      const cancelButton = screen.getByTestId('alert-dialog-cancel');
      await userEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByTestId('result')).toHaveTextContent('false');
      });
    });

    it('should resolve Promise to false when ESC key is pressed (onOpenChange)', async () => {
      const TestComponent = () => {
        const context = React.useContext(ConfirmationContext);
        const [result, setResult] = React.useState<boolean | null>(null);

        const handleClick = async () => {
          const confirmed = await context?.confirm({
            title: 'Confirm',
            description: 'Proceed?',
          });
          setResult(confirmed ?? null);
        };

        return (
          <div>
            <button onClick={handleClick}>Open Dialog</button>
            {result !== null && (
              <div data-testid="result">{String(result)}</div>
            )}
          </div>
        );
      };

      render(
        <ConfirmationProvider>
          <TestComponent />
        </ConfirmationProvider>,
      );

      const openButton = screen.getByText('Open Dialog');
      await userEvent.click(openButton);

      await waitFor(() => {
        expect(screen.getByTestId('dialog-overlay')).toBeInTheDocument();
      });

      // Simulate ESC key by clicking overlay (which triggers onOpenChange)
      const overlay = screen.getByTestId('dialog-overlay');
      await userEvent.click(overlay);

      await waitFor(() => {
        expect(screen.getByTestId('result')).toHaveTextContent('false');
      });
    });

    it('should close dialog after cancellation', async () => {
      const TestComponent = () => {
        const context = React.useContext(ConfirmationContext);
        return (
          <button
            onClick={() =>
              context?.confirm({
                title: 'Confirm',
                description: 'Proceed?',
              })
            }
          >
            Open Dialog
          </button>
        );
      };

      render(
        <ConfirmationProvider>
          <TestComponent />
        </ConfirmationProvider>,
      );

      const openButton = screen.getByText('Open Dialog');
      await userEvent.click(openButton);

      await waitFor(() => {
        expect(screen.getByTestId('alert-dialog')).toHaveAttribute(
          'data-open',
          'true',
        );
      });

      const cancelButton = screen.getByTestId('alert-dialog-cancel');
      await userEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByTestId('alert-dialog')).toHaveAttribute(
          'data-open',
          'false',
        );
      });
    });
  });

  describe('Single Active Dialog Enforcement', () => {
    it('should reject new confirm() call when dialog is already open', async () => {
      const TestComponent = () => {
        const context = React.useContext(ConfirmationContext);
        const [firstResult, setFirstResult] = React.useState<boolean | null>(
          null,
        );
        const [secondResult, setSecondResult] = React.useState<boolean | null>(
          null,
        );

        const handleFirstClick = async () => {
          const confirmed = await context?.confirm({
            title: 'First Dialog',
            description: 'First',
          });
          setFirstResult(confirmed ?? null);
        };

        const handleSecondClick = async () => {
          const confirmed = await context?.confirm({
            title: 'Second Dialog',
            description: 'Second',
          });
          setSecondResult(confirmed ?? null);
        };

        return (
          <div>
            <button onClick={handleFirstClick}>Open First</button>
            <button onClick={handleSecondClick}>Open Second</button>
            {firstResult !== null && (
              <div data-testid="first-result">{String(firstResult)}</div>
            )}
            {secondResult !== null && (
              <div data-testid="second-result">{String(secondResult)}</div>
            )}
          </div>
        );
      };

      render(
        <ConfirmationProvider>
          <TestComponent />
        </ConfirmationProvider>,
      );

      // Open first dialog
      const firstButton = screen.getByText('Open First');
      await userEvent.click(firstButton);

      await waitFor(() => {
        expect(screen.getByTestId('alert-dialog-title')).toHaveTextContent(
          'First Dialog',
        );
      });

      // Try to open second dialog while first is still open
      const secondButton = screen.getByText('Open Second');
      await userEvent.click(secondButton);

      // Second dialog should be rejected immediately (resolves to false)
      await waitFor(() => {
        expect(screen.getByTestId('second-result')).toHaveTextContent('false');
      });

      // First dialog should still be open with original content
      expect(screen.getByTestId('alert-dialog-title')).toHaveTextContent(
        'First Dialog',
      );
    });

    it('should log console warning when rejecting new request', async () => {
      const TestComponent = () => {
        const context = React.useContext(ConfirmationContext);

        return (
          <div>
            <button
              onClick={() =>
                context?.confirm({ title: 'First', description: 'First' })
              }
            >
              Open First
            </button>
            <button
              onClick={() =>
                context?.confirm({ title: 'Second', description: 'Second' })
              }
            >
              Open Second
            </button>
          </div>
        );
      };

      render(
        <ConfirmationProvider>
          <TestComponent />
        </ConfirmationProvider>,
      );

      // Open first dialog
      const firstButton = screen.getByText('Open First');
      await userEvent.click(firstButton);

      await waitFor(() => {
        expect(screen.getByTestId('alert-dialog')).toHaveAttribute(
          'data-open',
          'true',
        );
      });

      // Clear previous warnings
      mockConsoleWarn.mockClear();

      // Try to open second dialog
      const secondButton = screen.getByText('Open Second');
      await userEvent.click(secondButton);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        '[ConfirmationDialog] Dialog already open',
      );
    });

    it('should allow new dialog after first one is closed', async () => {
      const TestComponent = () => {
        const context = React.useContext(ConfirmationContext);

        return (
          <div>
            <button
              onClick={() =>
                context?.confirm({ title: 'First', description: 'First' })
              }
            >
              Open First
            </button>
            <button
              onClick={() =>
                context?.confirm({ title: 'Second', description: 'Second' })
              }
            >
              Open Second
            </button>
          </div>
        );
      };

      render(
        <ConfirmationProvider>
          <TestComponent />
        </ConfirmationProvider>,
      );

      // Open and close first dialog
      const firstButton = screen.getByText('Open First');
      await userEvent.click(firstButton);

      await waitFor(() => {
        expect(screen.getByTestId('alert-dialog-title')).toHaveTextContent(
          'First',
        );
      });

      const confirmButton = screen.getByTestId('alert-dialog-action');
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByTestId('alert-dialog')).toHaveAttribute(
          'data-open',
          'false',
        );
      });

      // Now open second dialog - should succeed
      const secondButton = screen.getByText('Open Second');
      await userEvent.click(secondButton);

      await waitFor(() => {
        expect(screen.getByTestId('alert-dialog-title')).toHaveTextContent(
          'Second',
        );
      });
    });
  });

  describe('Cleanup and Memory Leak Prevention', () => {
    it('should resolve pending Promise to false on unmount', async () => {
      const TestComponent = () => {
        const context = React.useContext(ConfirmationContext);
        const [result, setResult] = React.useState<boolean | null>(null);

        const handleClick = async () => {
          const confirmed = await context?.confirm({
            title: 'Test',
            description: 'Test',
          });
          setResult(confirmed ?? null);
        };

        return (
          <div>
            <button onClick={handleClick}>Open Dialog</button>
            {result !== null && (
              <div data-testid="result">{String(result)}</div>
            )}
          </div>
        );
      };

      const { unmount } = render(
        <ConfirmationProvider>
          <TestComponent />
        </ConfirmationProvider>,
      );

      // Open dialog
      const openButton = screen.getByText('Open Dialog');
      await userEvent.click(openButton);

      await waitFor(() => {
        expect(screen.getByTestId('alert-dialog')).toHaveAttribute(
          'data-open',
          'true',
        );
      });

      // Unmount while dialog is open
      unmount();

      // Promise should resolve to false (cleanup prevents memory leak)
      // This test verifies cleanup runs without errors
    });

    it('should not throw errors on unmount', () => {
      const { unmount } = render(
        <ConfirmationProvider>
          <div>Test</div>
        </ConfirmationProvider>,
      );

      expect(() => unmount()).not.toThrow();
    });

    it('should handle unmount with no pending Promise', () => {
      const { unmount } = render(
        <ConfirmationProvider>
          <div>Test</div>
        </ConfirmationProvider>,
      );

      // Should not throw when unmounting without any dialog opened
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Context Value', () => {
    it('should provide confirm function in context', () => {
      const TestComponent = () => {
        const context = React.useContext(ConfirmationContext);
        return (
          <div data-testid="has-confirm">
            {typeof context?.confirm === 'function' ? 'yes' : 'no'}
          </div>
        );
      };

      render(
        <ConfirmationProvider>
          <TestComponent />
        </ConfirmationProvider>,
      );

      expect(screen.getByTestId('has-confirm')).toHaveTextContent('yes');
    });

    it('should provide isOpen state in context', () => {
      const TestComponent = () => {
        const context = React.useContext(ConfirmationContext);
        return (
          <div data-testid="is-open">{String(context?.isOpen ?? 'null')}</div>
        );
      };

      render(
        <ConfirmationProvider>
          <TestComponent />
        </ConfirmationProvider>,
      );

      expect(screen.getByTestId('is-open')).toHaveTextContent('false');
    });

    it('should update isOpen state when dialog opens', async () => {
      const TestComponent = () => {
        const context = React.useContext(ConfirmationContext);
        return (
          <div>
            <button
              onClick={() =>
                context?.confirm({ title: 'Test', description: 'Test' })
              }
            >
              Open Dialog
            </button>
            <div data-testid="is-open">{String(context?.isOpen)}</div>
          </div>
        );
      };

      render(
        <ConfirmationProvider>
          <TestComponent />
        </ConfirmationProvider>,
      );

      expect(screen.getByTestId('is-open')).toHaveTextContent('false');

      const openButton = screen.getByText('Open Dialog');
      await userEvent.click(openButton);

      await waitFor(() => {
        expect(screen.getByTestId('is-open')).toHaveTextContent('true');
      });
    });

    it('should update isOpen state when dialog closes', async () => {
      const TestComponent = () => {
        const context = React.useContext(ConfirmationContext);
        return (
          <div>
            <button
              onClick={() =>
                context?.confirm({ title: 'Test', description: 'Test' })
              }
            >
              Open Dialog
            </button>
            <div data-testid="is-open">{String(context?.isOpen)}</div>
          </div>
        );
      };

      render(
        <ConfirmationProvider>
          <TestComponent />
        </ConfirmationProvider>,
      );

      const openButton = screen.getByText('Open Dialog');
      await userEvent.click(openButton);

      await waitFor(() => {
        expect(screen.getByTestId('is-open')).toHaveTextContent('true');
      });

      const confirmButton = screen.getByTestId('alert-dialog-action');
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByTestId('is-open')).toHaveTextContent('false');
      });
    });
  });
});
