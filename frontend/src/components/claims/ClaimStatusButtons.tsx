'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ClaimStatus } from '@project/types';
import type { ClaimStatus as ClaimStatusType } from '@project/types';
import { apiClient } from '@/lib/api-client';
import { CheckCircle, Edit2Icon, Mail, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ClaimStatusButtonsProps {
  claimId: string;
  currentStatus: ClaimStatus;
  onStatusChange: () => void;
}

type ButtonConfig = {
  label: string;
  icon: React.ReactNode;
  variant: 'default' | 'outline' | 'secondary';
  action: 'mark-paid' | 'resend-email' | 'mark-sent' | 'continue-edit';
  visible: boolean;
};

const getButtonsForStatus = (status: ClaimStatus): ButtonConfig[] => {
  const buttonConfigs: Record<ClaimStatusType, ButtonConfig[]> = {
    [ClaimStatus.DRAFT]: [
      {
        label: 'Continue Edit',
        icon: <Edit2Icon className="h-4 w-4" />,
        variant: 'default' as const,
        action: 'continue-edit' as const,
        visible: true,
      },
    ],
    [ClaimStatus.SENT]: [
      {
        label: 'Mark as Paid',
        icon: <CheckCircle className="h-4 w-4" />,
        variant: 'default' as const,
        action: 'mark-paid' as const,
        visible: true,
      },
    ],
    [ClaimStatus.FAILED]: [
      {
        label: 'Mark as Paid',
        icon: <CheckCircle className="h-4 w-4" />,
        variant: 'default' as const,
        action: 'mark-paid' as const,
        visible: true,
      },
      {
        label: 'Resend Email',
        icon: <Mail className="h-4 w-4" />,
        variant: 'outline' as const,
        action: 'resend-email' as const,
        visible: true,
      },
    ],
    [ClaimStatus.PAID]: [
      {
        label: 'Revert to Sent',
        icon: <Send className="h-4 w-4" />,
        variant: 'secondary' as const,
        action: 'mark-sent' as const,
        visible: true,
      },
    ],
  };

  return buttonConfigs[status] || [];
};

export const ClaimStatusButtons: React.FC<ClaimStatusButtonsProps> = ({
  claimId,
  currentStatus,
  onStatusChange,
}) => {
  const [loadingAction, setLoadingAction] = React.useState<string | null>(null);

  const availableButtons = getButtonsForStatus(currentStatus);

  const router = useRouter();

  if (availableButtons.length === 0) {
    return null;
  }

  const handleButtonClick = async (action: string) => {
    setLoadingAction(action);
    try {
      switch (action) {
        case 'mark-paid':
          await apiClient.updateClaimStatus(claimId, ClaimStatus.PAID);
          break;
        case 'mark-sent':
          await apiClient.updateClaimStatus(claimId, ClaimStatus.SENT);
          break;
        case 'resend-email':
          await apiClient.resendClaimEmail(claimId);
          break;
        case 'continue-edit':
          router.push('/');
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      onStatusChange();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to perform action:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {availableButtons.map((button) => (
        <Button
          key={button.action}
          variant={button.variant}
          size="sm"
          disabled={loadingAction !== null}
          onClick={() => handleButtonClick(button.action)}
          className="min-h-[32px] touch-manipulation flex-shrink-0 cursor-pointer"
        >
          {loadingAction === button.action ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-current" />
          ) : (
            button.icon
          )}
          <span className="ml-2">{button.label}</span>
        </Button>
      ))}
    </div>
  );
};
