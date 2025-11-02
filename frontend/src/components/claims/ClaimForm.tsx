'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { FileUploadComponent } from '@/components/attachments/FileUploadComponent';
import { AttachmentList } from '@/components/attachments/AttachmentList';
import {
  ClaimCategory,
  ClaimStatus,
  IClaimCreateRequest,
  IClaimMetadata,
} from '@project/types';
import { toast } from 'sonner';
import {
  getCategoryDisplayName,
  getClaimStatusConfig,
} from '@/lib/claim-utils';

interface ClaimFormProps {
  claim?: IClaimMetadata;
  onSubmit?: (claimData: IClaimCreateRequest) => Promise<void>;
  onSave?: (claimData: IClaimCreateRequest) => Promise<void>;
  className?: string;
  disabled?: boolean;
}

/**
 * Enhanced claim form with integrated attachment upload and management
 * Demonstrates integration between claim data and attachment components
 */
export const ClaimForm: React.FC<ClaimFormProps> = ({
  claim,
  onSubmit,
  onSave,
  className,
  disabled = false,
}) => {
  const [formData, setFormData] = useState<IClaimCreateRequest>({
    category: claim?.category || ClaimCategory.TELCO,
    claimName: claim?.claimName || '',
    month: claim?.month || new Date().getMonth() + 1,
    year: claim?.year || new Date().getFullYear(),
    totalAmount: claim?.totalAmount || 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Whether the form is editable (draft claims only)
  const isEditable =
    !disabled && (!claim || claim.status === ClaimStatus.DRAFT);

  // Whether attachments can be modified
  const canModifyAttachments =
    isEditable || claim?.status === ClaimStatus.FAILED;

  const handleInputChange = useCallback(
    (field: keyof IClaimCreateRequest, value: unknown) => {
      if (!isEditable) return;

      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    [isEditable],
  );

  const handleSave = useCallback(async () => {
    if (!onSave || isSaving) return;

    // Basic validation
    if (!formData.claimName?.trim()) {
      toast.error('Please enter a claim name');
      return;
    }

    if (formData.totalAmount <= 0) {
      toast.error('Please enter a valid total amount');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      toast.success('Claim saved as draft');
    } catch (_error) {
      toast.error('Failed to save claim');
    } finally {
      setIsSaving(false);
    }
  }, [formData, onSave, isSaving]);

  const handleSubmit = useCallback(async () => {
    if (!onSubmit || isSubmitting) return;

    // Validation
    if (!formData.claimName?.trim()) {
      toast.error('Please enter a claim name');
      return;
    }

    if (formData.totalAmount <= 0) {
      toast.error('Please enter a valid total amount');
      return;
    }

    // Check if attachments are present (for demo purposes)
    const hasAttachments = claim?.attachments && claim.attachments.length > 0;
    if (!hasAttachments) {
      const confirmed = window.confirm(
        'This claim has no attachments. Submit anyway?',
      );
      if (!confirmed) return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      toast.success('Claim submitted successfully');
    } catch (_error) {
      toast.error('Failed to submit claim');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onSubmit, isSubmitting, claim?.attachments]);

  const handleAttachmentUploadSuccess = useCallback((fileName: string) => {
    toast.success(`${fileName} uploaded successfully`);
  }, []);

  const handleAttachmentUploadError = useCallback(
    (fileName: string, error: string) => {
      toast.error(`Failed to upload ${fileName}: ${error}`);
    },
    [],
  );

  const handleAttachmentDeleted = useCallback((_attachmentId: string) => {
    toast.success('Attachment deleted successfully');
  }, []);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {claim ? 'Edit Claim' : 'New Claim'}
          </h1>
          {claim && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <div
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                  getClaimStatusConfig(claim.status).bgColor,
                  getClaimStatusConfig(claim.status).color,
                )}
              >
                {getClaimStatusConfig(claim.status).label}
              </div>
              <span className="text-xs text-muted-foreground">
                Created{' '}
                {new Date(claim.createdAt).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Claim Details Form */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Claim Details
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Claim Name */}
          <div className="md:col-span-2">
            <Label htmlFor="claimName">Claim Name</Label>
            <Input
              id="claimName"
              type="text"
              value={formData.claimName}
              onChange={(e) => handleInputChange('claimName', e.target.value)}
              placeholder="Enter a descriptive name for this claim"
              disabled={!isEditable}
              className="mt-1"
            />
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) =>
                handleInputChange('category', e.target.value as ClaimCategory)
              }
              disabled={!isEditable}
              className={cn(
                'mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors',
                'file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                !isEditable && 'cursor-not-allowed opacity-50',
              )}
            >
              {Object.values(ClaimCategory).map((category) => (
                <option
                  key={category}
                  value={category}
                >
                  {getCategoryDisplayName(category)}
                </option>
              ))}
            </select>
          </div>

          {/* Total Amount */}
          <div>
            <Label htmlFor="totalAmount">Total Amount (SGD)</Label>
            <Input
              id="totalAmount"
              type="number"
              step="0.01"
              min="0"
              value={formData.totalAmount}
              onChange={(e) =>
                handleInputChange(
                  'totalAmount',
                  parseFloat(e.target.value) || 0,
                )
              }
              placeholder="0.00"
              disabled={!isEditable}
              className="mt-1"
            />
          </div>

          {/* Month */}
          <div>
            <Label htmlFor="month">Month</Label>
            <select
              id="month"
              value={formData.month}
              onChange={(e) =>
                handleInputChange('month', parseInt(e.target.value))
              }
              disabled={!isEditable}
              className={cn(
                'mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors',
                'file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                !isEditable && 'cursor-not-allowed opacity-50',
              )}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <option
                  key={month}
                  value={month}
                >
                  {new Date(0, month - 1).toLocaleString('en-US', {
                    month: 'long',
                  })}
                </option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div>
            <Label htmlFor="year">Year</Label>
            <Input
              id="year"
              type="number"
              min="2020"
              max="2100"
              value={formData.year}
              onChange={(e) =>
                handleInputChange(
                  'year',
                  parseInt(e.target.value) || new Date().getFullYear(),
                )
              }
              disabled={!isEditable}
              className="mt-1"
            />
          </div>
        </div>
      </Card>

      {/* Attachment Management */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Supporting Documents
        </h2>
        <div className="space-y-6">
          {/* File Upload */}
          {canModifyAttachments && claim?.id && (
            <FileUploadComponent
              claimId={claim.id}
              onUploadSuccess={handleAttachmentUploadSuccess}
              onUploadError={handleAttachmentUploadError}
              className="mb-6"
            />
          )}

          {/* Attachment List */}
          {claim?.id && (
            <AttachmentList
              claimId={claim.id}
              showActions={canModifyAttachments}
              onAttachmentDeleted={handleAttachmentDeleted}
            />
          )}

          {/* Upload Note for New Claims */}
          {!claim?.id && (
            <div className="p-4 rounded-lg bg-muted/25 border border-muted-foreground/25">
              <p className="text-sm text-muted-foreground">
                Save this claim as a draft first to enable file uploads. You can
                upload receipts, invoices, and other supporting documents.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {isEditable && (
          <>
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={isSaving || isSubmitting}
            >
              {isSaving ? 'Saving...' : 'Save Draft'}
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || isSaving}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Claim'}
            </Button>
          </>
        )}

        {claim?.status === ClaimStatus.FAILED && (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isSaving}
          >
            {isSubmitting ? 'Resubmitting...' : 'Resubmit Claim'}
          </Button>
        )}

        {!isEditable && claim?.status !== ClaimStatus.FAILED && (
          <div className="text-sm text-muted-foreground">
            This claim cannot be modified in its current status.
          </div>
        )}
      </div>

      {/* Status-specific messages */}
      {claim?.status === ClaimStatus.SENT && (
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-sm text-blue-600 dark:text-blue-400">
            This claim has been submitted and is being processed. You cannot
            modify it at this time.
          </p>
        </div>
      )}

      {claim?.status === ClaimStatus.FAILED && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-600 dark:text-red-400">
            This claim failed processing. You can modify the details and
            attachments, then resubmit.
          </p>
        </div>
      )}

      {claim?.status === ClaimStatus.PAID && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <p className="text-sm text-green-600 dark:text-green-400">
            This claim has been successfully processed and paid.
          </p>
        </div>
      )}
    </div>
  );
};
