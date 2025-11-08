'use client';

import React, { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ClaimCategory, IClaimMetadata } from '@project/types';
import { DollarSign } from 'lucide-react';
import { CategorySelect } from './category-select';
import { MonthYearPicker } from './month-year-picker';
import { FormActions } from './form-actions';
import { useMultiClaimForm } from '@/hooks/claims/useMultiClaimForm';

interface ClaimFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaimCreated?: (claim: IClaimMetadata) => void;
  existingDraftClaims?: IClaimMetadata[];
  initialValues?: Partial<IClaimMetadata>;
}

/**
 * ClaimFormModal component for creating and editing claims in a modal dialog
 * Supports both create mode (no initialValues) and edit mode (with initialValues)
 * Following REQ-004 for unified form with create/edit functionality
 */
export const ClaimFormModal: React.FC<ClaimFormModalProps> = ({
  isOpen,
  onClose,
  onClaimCreated,
  existingDraftClaims = [],
  initialValues,
}) => {
  const { form, isCreating, handleSubmit } = useMultiClaimForm({
    onClaimCreated: (claim) => {
      onClaimCreated?.(claim);
      onClose();
    },
    existingDraftClaims,
    claimId: initialValues?.id,
  });

  // Determine if we're in edit mode
  const isEditMode = !!initialValues?.id;

  // Pre-fill form when initialValues are provided (edit mode)
  useEffect(() => {
    if (initialValues && isOpen) {
      form.reset({
        category: initialValues.category || ClaimCategory.TELCO,
        claimName: initialValues.claimName || '',
        month: initialValues.month || new Date().getMonth() + 1,
        year: initialValues.year || new Date().getFullYear(),
        totalAmount: initialValues.totalAmount || 0,
      });
    } else if (isOpen && !isEditMode) {
      // Reset to default values for create mode
      form.reset({
        category: ClaimCategory.TELCO,
        claimName: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        totalAmount: 0,
      });
    }
  }, [initialValues, isOpen, form, isEditMode]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onClose}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Claim' : 'Add New Claim'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the claim details below.'
              : 'Create draft claims that will be submitted together. Claims with monthly limits (telco, fitness) are validated across your existing drafts.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              rules={{ required: 'Please select a category' }}
              render={({ field }) => (
                <FormItem>
                  <CategorySelect
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isCreating}
                  />
                </FormItem>
              )}
            />

            {/* Claim Name (required for Others category) */}
            <FormField
              control={form.control}
              name="claimName"
              rules={{
                required:
                  form.watch('category') === ClaimCategory.OTHERS
                    ? 'Please enter a claim name for Others category'
                    : false,
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {form.watch('category') !== ClaimCategory.OTHERS &&
                      '(Optional) '}
                    Claim Name
                    {form.watch('category') === ClaimCategory.OTHERS && (
                      <span className="text-destructive">*</span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={'Descriptive name'}
                      disabled={isCreating}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Month and Year */}
            <MonthYearPicker
              month={form.watch('month')}
              year={form.watch('year')}
              onMonthChange={(month) => form.setValue('month', month)}
              onYearChange={(year) => form.setValue('year', year)}
              disabled={isCreating}
            />

            {/* Total Amount */}
            <FormField
              control={form.control}
              name="totalAmount"
              rules={{
                required: 'Please enter an amount',
                min: { value: 0.01, message: 'Amount must be greater than 0' },
                max: { value: 999999, message: 'Amount is too large' },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Total Amount (SGD)
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="999999"
                      placeholder="0.00"
                      disabled={isCreating}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <FormActions
              isSubmitting={isCreating}
              submitLabel={isEditMode ? 'Update Draft' : 'Add to Draft List'}
              submittingLabel={isEditMode ? 'Updating...' : 'Creating...'}
              showIcon={!isEditMode}
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
