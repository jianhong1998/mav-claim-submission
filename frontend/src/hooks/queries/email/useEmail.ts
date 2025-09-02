import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getQueryKey, QueryGroup, QueryType } from '../keys';
import { apiClient } from '@/lib/api-client';
import { ErrorHandler } from '../helper/error-handler';
import {
  IEmailSendRequest,
  IEmailSendResponse,
  IGmailAccessResponse,
} from '@project/types';
import { toast } from 'sonner';

export const useGmailAccess = () => {
  return useQuery<IGmailAccessResponse>({
    queryKey: getQueryKey({
      group: QueryGroup.EMAIL,
      type: QueryType.ONE,
      key: 'gmail-access',
    }),
    queryFn: async () => {
      return await apiClient.post<IGmailAccessResponse>('/email/check-access');
    },
    retry: false,
    staleTime: 1000 * 60 * 2, // 2 minutes - check access frequently
  });
};

export const useRefreshGmailToken = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return await apiClient.post<IGmailAccessResponse>('/email/refresh-token');
    },
    onSuccess: (data) => {
      // Update Gmail access status in cache
      queryClient.setQueryData(
        getQueryKey({
          group: QueryGroup.EMAIL,
          type: QueryType.ONE,
          key: 'gmail-access',
        }),
        data,
      );

      if (data.hasAccess) {
        toast.success('Gmail access refreshed successfully');
      } else {
        toast.error('Failed to refresh Gmail access');
      }
    },
    onError: (error) => {
      const errorMessage = ErrorHandler.extractErrorMessage(error);
      console.error('Gmail token refresh failed:', error);
      toast.error(`Token refresh failed: ${errorMessage}`);

      // Clear Gmail access on refresh failure
      queryClient.setQueryData(
        getQueryKey({
          group: QueryGroup.EMAIL,
          type: QueryType.ONE,
          key: 'gmail-access',
        }),
        { hasAccess: false, error: errorMessage },
      );
    },
  });
};

export const useSendEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (emailData: IEmailSendRequest) => {
      // Validate email data on client side
      if (!emailData.to?.trim()) {
        throw new Error('Recipient email is required');
      }
      if (!emailData.subject?.trim()) {
        throw new Error('Email subject is required');
      }
      if (!emailData.body?.trim()) {
        throw new Error('Email body is required');
      }

      return await apiClient.post<IEmailSendResponse>('/email/send', emailData);
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        toast.success('Email sent successfully!', {
          description: data.messageId
            ? `Message ID: ${data.messageId}`
            : `Sent to ${variables.to}`,
        });
      } else {
        const errorMsg = data.error || 'Failed to send email';
        toast.error('Email sending failed', {
          description: errorMsg,
        });
      }

      // Refresh Gmail access status after sending attempt
      queryClient.invalidateQueries({
        queryKey: [QueryGroup.EMAIL, QueryType.ONE, 'gmail-access'],
      });
    },
    onError: (error) => {
      const errorMessage = ErrorHandler.extractErrorMessage(error);
      console.error('Email sending failed:', error);

      // Handle specific error cases
      const statusCode = ErrorHandler.extractStatusCodeFromError(error);

      if (statusCode === 401) {
        toast.error('Authentication required', {
          description: 'Please sign in with Google to send emails',
        });
      } else if (statusCode === 403) {
        toast.error('Gmail access denied', {
          description: 'Please grant Gmail permissions to send emails',
        });
      } else if (statusCode === 429) {
        toast.error('Rate limit exceeded', {
          description: 'Gmail quota exceeded. Please try again later',
        });
      } else {
        toast.error('Failed to send email', {
          description: errorMessage,
        });
      }

      // Refresh Gmail access status on error
      queryClient.invalidateQueries({
        queryKey: [QueryGroup.EMAIL, QueryType.ONE, 'gmail-access'],
      });
    },
  });
};

// Custom hook that combines email operations and provides convenience methods
export const useEmail = () => {
  const {
    data: gmailAccess,
    isLoading: isCheckingAccess,
    error: accessError,
  } = useGmailAccess();
  const sendEmailMutation = useSendEmail();
  const refreshTokenMutation = useRefreshGmailToken();

  const hasGmailAccess = gmailAccess?.hasAccess ?? false;
  const gmailEmail = gmailAccess?.email;
  const isLoading = isCheckingAccess;
  const error = accessError;

  const sendEmail = async (emailData: IEmailSendRequest) => {
    try {
      return await sendEmailMutation.mutateAsync(emailData);
    } catch (error) {
      console.error('Send email error:', error);
      throw error;
    }
  };

  const refreshGmailToken = async () => {
    try {
      return await refreshTokenMutation.mutateAsync();
    } catch (error) {
      console.error('Refresh Gmail token error:', error);
      throw error;
    }
  };

  return {
    // Gmail access state
    hasGmailAccess,
    gmailEmail,
    isLoading,
    error,

    // Actions
    sendEmail,
    refreshGmailToken,

    // Mutation states
    isSending: sendEmailMutation.isPending,
    isRefreshing: refreshTokenMutation.isPending,

    // Last operation results
    sendResult: sendEmailMutation.data,
    sendError: sendEmailMutation.error,
    refreshResult: refreshTokenMutation.data,
    refreshError: refreshTokenMutation.error,

    // Raw query data for advanced use cases
    gmailAccess,
  };
};
