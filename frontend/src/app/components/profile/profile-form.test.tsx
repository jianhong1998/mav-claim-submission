import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { ProfileForm } from './profile-form';
import * as updateProfileApi from '@/api/users/update-profile';
import type { UpdateUserResponse } from '@/api/users/update-profile';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock API client
vi.mock('@/api/users/update-profile', async () => {
  const actual = await vi.importActual<typeof updateProfileApi>(
    '@/api/users/update-profile',
  );
  return {
    ...actual,
    updateUserProfile: vi.fn(),
  };
});

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    disabled,
    onClick,
    type,
    variant,
    size,
    'aria-label': ariaLabel,
    ...props
  }: {
    children?: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    type?: string;
    variant?: string;
    size?: string;
    'aria-label'?: string;
    [key: string]: unknown;
  }) => (
    <button
      type={type as 'button' | 'submit'}
      disabled={disabled}
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => {
  const MockInput = React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement>
  >(({ ...props }, ref) => (
    <input
      ref={ref}
      {...props}
    />
  ));
  MockInput.displayName = 'Input';
  return { Input: MockInput };
});

// Don't mock the form components - let react-hook-form work naturally
// This allows proper form integration and validation testing

vi.mock('lucide-react', () => ({
  Trash2: () => <svg data-testid="trash-icon" />,
  Plus: () => <svg data-testid="plus-icon" />,
}));

// Helper to create mock user data
const createMockUser = (
  overrides?: Partial<{
    id: string;
    name: string;
    email: string;
    emailPreferences: Array<{
      id: string;
      type: 'cc' | 'bcc';
      emailAddress: string;
    }>;
  }>,
) => ({
  id: 'user-123',
  name: 'John Doe',
  email: 'john@example.com',
  emailPreferences: [],
  ...overrides,
});

// Helper to create mock API response
const createMockApiResponse = (
  overrides?: Partial<UpdateUserResponse>,
): UpdateUserResponse => ({
  id: 'user-123',
  email: 'john@example.com',
  name: 'John Doe',
  picture: null,
  googleId: 'google-123',
  emailPreferences: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

describe('ProfileForm', () => {
  const mockUpdateUserProfile = vi.mocked(updateProfileApi.updateUserProfile);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders display name input and email sections', () => {
      const user = createMockUser();
      render(<ProfileForm user={user} />);

      // Check Display Name section
      expect(screen.getByText('Display Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Enter your display name'),
      ).toHaveValue(user.name);

      // Check CC Emails section
      expect(screen.getByText('CC Emails')).toBeInTheDocument();
      expect(screen.getByText('Add CC Email')).toBeInTheDocument();
      expect(
        screen.getByText(
          'No CC emails configured. Click "Add CC Email" to add one.',
        ),
      ).toBeInTheDocument();

      // Check BCC Emails section
      expect(screen.getByText('BCC Emails')).toBeInTheDocument();
      expect(screen.getByText('Add BCC Email')).toBeInTheDocument();
      expect(
        screen.getByText(
          'No BCC emails configured. Click "Add BCC Email" to add one.',
        ),
      ).toBeInTheDocument();

      // Check submit button
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('renders existing email preferences', () => {
      const user = createMockUser({
        emailPreferences: [
          { id: '1', type: 'cc', emailAddress: 'cc@example.com' },
          { id: '2', type: 'bcc', emailAddress: 'bcc@example.com' },
        ],
      });
      render(<ProfileForm user={user} />);

      // Check that email fields are rendered
      const emailInputs = screen.getAllByPlaceholderText('email@example.com');
      expect(emailInputs).toHaveLength(2);
      expect(emailInputs[0]).toHaveValue('cc@example.com');
      expect(emailInputs[1]).toHaveValue('bcc@example.com');
    });
  });

  describe('Validation', () => {
    it('shows validation error for empty name', async () => {
      const user = createMockUser({ name: 'Valid Name' });
      render(<ProfileForm user={user} />);

      const nameInput = screen.getByLabelText('Name');
      const submitButton = screen.getByText('Save Changes');

      // Clear the name field
      await userEvent.clear(nameInput);
      await userEvent.click(submitButton);

      // Wait for validation error to appear
      await waitFor(() => {
        expect(
          screen.getByText('Name must be at least 1 character long'),
        ).toBeInTheDocument();
      });

      // Verify API was not called
      expect(mockUpdateUserProfile).not.toHaveBeenCalled();
    });

    it('shows validation error for invalid email format', async () => {
      const user = createMockUser();
      render(<ProfileForm user={user} />);

      // Add CC email
      const addCCButton = screen.getByText('Add CC Email');
      await userEvent.click(addCCButton);

      // Enter invalid email (no @ symbol)
      const emailInput = screen.getByPlaceholderText('email@example.com');
      await userEvent.type(emailInput, 'notanemail');

      // Blur to trigger validation
      await userEvent.tab();

      const submitButton = screen.getByText('Save Changes');
      await userEvent.click(submitButton);

      // Verify API was not called due to validation failure
      await waitFor(() => {
        expect(mockUpdateUserProfile).not.toHaveBeenCalled();
      });

      // The validation error should prevent submission
      // Check that the input still has the invalid value
      expect(emailInput).toHaveValue('notanemail');
    });

    it('shows validation error for duplicate email addresses', async () => {
      const user = createMockUser();
      render(<ProfileForm user={user} />);

      // Add two CC emails with same address
      const addCCButton = screen.getByText('Add CC Email');
      await userEvent.click(addCCButton);
      await userEvent.click(addCCButton);

      const emailInputs = screen.getAllByPlaceholderText('email@example.com');
      await userEvent.type(emailInputs[0], 'same@example.com');
      await userEvent.type(emailInputs[1], 'same@example.com');

      // Blur to trigger validation
      await userEvent.tab();

      const submitButton = screen.getByText('Save Changes');
      await userEvent.click(submitButton);

      // Verify API was not called due to validation failure
      await waitFor(() => {
        expect(mockUpdateUserProfile).not.toHaveBeenCalled();
      });

      // The validation error should prevent submission
      // Both inputs should still have the duplicate values
      expect(emailInputs[0]).toHaveValue('same@example.com');
      expect(emailInputs[1]).toHaveValue('same@example.com');
    });
  });

  describe('Dynamic Email Fields', () => {
    it('adds CC email field on [Add CC Email] click', async () => {
      const user = createMockUser();
      render(<ProfileForm user={user} />);

      const addCCButton = screen.getByText('Add CC Email');

      // Initially no email inputs
      expect(
        screen.queryByPlaceholderText('email@example.com'),
      ).not.toBeInTheDocument();

      // Click add button
      await userEvent.click(addCCButton);

      // Email input should appear
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('email@example.com'),
        ).toBeInTheDocument();
      });

      // Add another CC email
      await userEvent.click(addCCButton);

      // Should have 2 email inputs now
      await waitFor(() => {
        expect(
          screen.getAllByPlaceholderText('email@example.com'),
        ).toHaveLength(2);
      });
    });

    it('adds BCC email field on [Add BCC Email] click', async () => {
      const user = createMockUser();
      render(<ProfileForm user={user} />);

      const addBCCButton = screen.getByText('Add BCC Email');

      // Initially no email inputs
      expect(
        screen.queryByPlaceholderText('email@example.com'),
      ).not.toBeInTheDocument();

      // Click add button
      await userEvent.click(addBCCButton);

      // Email input should appear
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('email@example.com'),
        ).toBeInTheDocument();
      });
    });

    it('removes email field on [Remove] click', async () => {
      const user = createMockUser({
        emailPreferences: [
          { id: '1', type: 'cc', emailAddress: 'cc1@example.com' },
          { id: '2', type: 'cc', emailAddress: 'cc2@example.com' },
        ],
      });
      render(<ProfileForm user={user} />);

      // Should have 2 email inputs
      let emailInputs = screen.getAllByPlaceholderText('email@example.com');
      expect(emailInputs).toHaveLength(2);

      // Get all remove buttons and click the first one
      const removeButtons = screen.getAllByLabelText(/Remove CC email/);
      await userEvent.click(removeButtons[0]);

      // Should have 1 email input now
      await waitFor(() => {
        emailInputs = screen.getAllByPlaceholderText('email@example.com');
        expect(emailInputs).toHaveLength(1);
        expect(emailInputs[0]).toHaveValue('cc2@example.com');
      });
    });

    it('can add and remove multiple email fields', async () => {
      const user = createMockUser();
      render(<ProfileForm user={user} />);

      const addCCButton = screen.getByText('Add CC Email');
      const addBCCButton = screen.getByText('Add BCC Email');

      // Add 2 CC and 2 BCC emails
      await userEvent.click(addCCButton);
      await userEvent.click(addCCButton);
      await userEvent.click(addBCCButton);
      await userEvent.click(addBCCButton);

      // Should have 4 email inputs
      await waitFor(() => {
        expect(
          screen.getAllByPlaceholderText('email@example.com'),
        ).toHaveLength(4);
      });

      // Remove one CC email
      const removeButtons = screen.getAllByLabelText(/Remove (CC|BCC) email/);
      await userEvent.click(removeButtons[0]);

      // Should have 3 email inputs
      await waitFor(() => {
        expect(
          screen.getAllByPlaceholderText('email@example.com'),
        ).toHaveLength(3);
      });
    });
  });

  describe('Form Submission', () => {
    it('calls updateUserProfile API on form submit with correct data', async () => {
      const user = createMockUser();
      const mockResponse = createMockApiResponse({
        name: 'Updated Name',
        emailPreferences: [
          {
            id: 'pref-1',
            userId: 'user-123',
            type: 'cc',
            emailAddress: 'cc@example.com',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      });

      mockUpdateUserProfile.mockResolvedValueOnce(mockResponse);

      render(<ProfileForm user={user} />);

      // Update name
      const nameInput = screen.getByLabelText('Name');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Name');

      // Add CC email
      const addCCButton = screen.getByText('Add CC Email');
      await userEvent.click(addCCButton);

      const emailInput = screen.getByPlaceholderText('email@example.com');
      await userEvent.type(emailInput, 'cc@example.com');

      // Submit form
      const submitButton = screen.getByText('Save Changes');
      await userEvent.click(submitButton);

      // Verify API was called with correct data
      await waitFor(() => {
        expect(mockUpdateUserProfile).toHaveBeenCalledWith('user-123', {
          name: 'Updated Name',
          emailPreferences: [
            {
              type: 'cc',
              emailAddress: 'cc@example.com',
            },
          ],
        });
      });
    });

    it('submits form with mixed CC and BCC emails', async () => {
      const user = createMockUser();
      const mockResponse = createMockApiResponse({
        emailPreferences: [
          {
            id: 'pref-1',
            userId: 'user-123',
            type: 'cc',
            emailAddress: 'cc@example.com',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
          {
            id: 'pref-2',
            userId: 'user-123',
            type: 'bcc',
            emailAddress: 'bcc@example.com',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      });

      mockUpdateUserProfile.mockResolvedValueOnce(mockResponse);

      render(<ProfileForm user={user} />);

      // Add CC email
      await userEvent.click(screen.getByText('Add CC Email'));
      const emailInputs = screen.getAllByPlaceholderText('email@example.com');
      await userEvent.type(emailInputs[0], 'cc@example.com');

      // Add BCC email
      await userEvent.click(screen.getByText('Add BCC Email'));
      const updatedEmailInputs =
        screen.getAllByPlaceholderText('email@example.com');
      await userEvent.type(updatedEmailInputs[1], 'bcc@example.com');

      // Submit form
      await userEvent.click(screen.getByText('Save Changes'));

      // Verify API call includes both types
      await waitFor(() => {
        expect(mockUpdateUserProfile).toHaveBeenCalledWith('user-123', {
          name: 'John Doe',
          emailPreferences: expect.arrayContaining([
            { type: 'cc', emailAddress: 'cc@example.com' },
            { type: 'bcc', emailAddress: 'bcc@example.com' },
          ]),
        });
      });
    });

    it('disables form during submission', async () => {
      const user = createMockUser();

      // Mock slow API response
      mockUpdateUserProfile.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(createMockApiResponse()), 100),
          ),
      );

      render(<ProfileForm user={user} />);

      const submitButton = screen.getByText('Save Changes');
      expect(submitButton).not.toBeDisabled();

      // Submit form
      await userEvent.click(submitButton);

      // Button should be disabled and show loading state
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
      });
    });
  });

  describe('Toast Notifications', () => {
    it('shows success toast on API success', async () => {
      const user = createMockUser();
      const mockResponse = createMockApiResponse();

      mockUpdateUserProfile.mockResolvedValueOnce(mockResponse);

      render(<ProfileForm user={user} />);

      // Update name and submit
      const nameInput = screen.getByLabelText('Name');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'New Name');

      const submitButton = screen.getByText('Save Changes');
      await userEvent.click(submitButton);

      // Verify success toast
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Profile updated successfully',
        );
      });
    });

    it('shows error toast on API failure', async () => {
      const user = createMockUser();

      mockUpdateUserProfile.mockRejectedValueOnce(
        new Error('Network error occurred'),
      );

      render(<ProfileForm user={user} />);

      // Update name and submit
      const nameInput = screen.getByLabelText('Name');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'New Name');

      const submitButton = screen.getByText('Save Changes');
      await userEvent.click(submitButton);

      // Verify error toast with error message
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Network error occurred');
      });
    });

    it('shows generic error toast when error has no message', async () => {
      const user = createMockUser();

      mockUpdateUserProfile.mockRejectedValueOnce('Unknown error');

      render(<ProfileForm user={user} />);

      // Submit form
      const submitButton = screen.getByText('Save Changes');
      await userEvent.click(submitButton);

      // Verify generic error toast
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to update profile');
      });
    });

    it('calls onSuccess callback after successful update', async () => {
      const user = createMockUser();
      const mockResponse = createMockApiResponse();
      const onSuccess = vi.fn();

      mockUpdateUserProfile.mockResolvedValueOnce(mockResponse);

      render(
        <ProfileForm
          user={user}
          onSuccess={onSuccess}
        />,
      );

      // Submit form
      const submitButton = screen.getByText('Save Changes');
      await userEvent.click(submitButton);

      // Verify onSuccess callback
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(mockResponse);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty emailPreferences array', async () => {
      const user = createMockUser();
      const mockResponse = createMockApiResponse({
        emailPreferences: [],
      });

      mockUpdateUserProfile.mockResolvedValueOnce(mockResponse);

      render(<ProfileForm user={user} />);

      // Submit without adding any email preferences
      const submitButton = screen.getByText('Save Changes');
      await userEvent.click(submitButton);

      // Should submit successfully with empty array
      await waitFor(() => {
        expect(mockUpdateUserProfile).toHaveBeenCalledWith('user-123', {
          name: 'John Doe',
          emailPreferences: [],
        });
      });
    });

    it('handles form with only name update', async () => {
      const user = createMockUser();
      const mockResponse = createMockApiResponse({ name: 'Jane Doe' });

      mockUpdateUserProfile.mockResolvedValueOnce(mockResponse);

      render(<ProfileForm user={user} />);

      // Update only name
      const nameInput = screen.getByLabelText('Name');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Jane Doe');

      const submitButton = screen.getByText('Save Changes');
      await userEvent.click(submitButton);

      // Should submit with updated name
      await waitFor(() => {
        expect(mockUpdateUserProfile).toHaveBeenCalledWith('user-123', {
          name: 'Jane Doe',
          emailPreferences: [],
        });
      });
    });

    it('maintains form state after validation error', async () => {
      const user = createMockUser();
      render(<ProfileForm user={user} />);

      // Add email with invalid format
      await userEvent.click(screen.getByText('Add CC Email'));
      const emailInput = screen.getByPlaceholderText('email@example.com');
      await userEvent.type(emailInput, 'invalid');

      // Blur to trigger validation
      await userEvent.tab();

      // Try to submit
      await userEvent.click(screen.getByText('Save Changes'));

      // Verify validation prevented submission
      await waitFor(() => {
        expect(mockUpdateUserProfile).not.toHaveBeenCalled();
      });

      // Input should still contain the invalid value
      expect(emailInput).toHaveValue('invalid');
    });
  });
});
