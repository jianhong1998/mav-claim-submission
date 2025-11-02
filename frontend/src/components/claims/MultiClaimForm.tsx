'use client';

import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  ClaimCategory,
  IClaimCreateRequest,
  IClaimResponse,
  IClaimMetadata,
} from '@project/types';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Plus, DollarSign } from 'lucide-react';
import { CategorySelect } from './category-select';
import { MonthYearPicker } from './month-year-picker';
import { FormActions } from './form-actions';
import { MONTHLY_LIMITS } from '@/lib/claim-utils';

interface MultiClaimFormProps {
  onClaimCreated?: (claim: IClaimMetadata) => void;
  existingDraftClaims?: IClaimMetadata[];
  className?: string;
}

interface FormData {
  category: ClaimCategory;
  claimName: string;
  month: number;
  year: number;
  totalAmount: number;
}

/**
 * Validates monthly limits across existing and new claims
 */
const validateMonthlyLimits = (
  newClaim: FormData,
  existingClaims: IClaimMetadata[] = [],
): string | null => {
  const categoryLimit =
    MONTHLY_LIMITS[newClaim.category as keyof typeof MONTHLY_LIMITS];
  if (!categoryLimit) return null; // No limit for this category

  // Calculate existing amount for this category/month/year
  const existingAmount = existingClaims
    .filter(
      (claim) =>
        claim.category === newClaim.category &&
        claim.month === newClaim.month &&
        claim.year === newClaim.year,
    )
    .reduce((total, claim) => total + claim.totalAmount, 0);

  const totalAmount = existingAmount + newClaim.totalAmount;

  if (totalAmount > categoryLimit) {
    const monthYear = new Date(
      newClaim.year,
      newClaim.month - 1,
    ).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return `Total claims for ${monthYear} (SGD ${totalAmount.toFixed(2)}) exceed monthly limit (SGD ${categoryLimit}). Please adjust amounts.`;
  }

  return null;
};

/**
 * MultiClaimForm component for creating individual claims in a multi-claim workflow
 * Following requirements 1.1 and 2.1 for draft claim creation with validation
 */
export const MultiClaimForm: React.FC<MultiClaimFormProps> = ({
  onClaimCreated,
  existingDraftClaims = [],
  className,
}) => {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  const form = useForm<FormData>({
    defaultValues: {
      category: ClaimCategory.TELCO,
      claimName: '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      totalAmount: 0,
    },
  });

  // Mutation for creating draft claims
  const createClaimMutation = useMutation({
    mutationFn: (claimData: IClaimCreateRequest) =>
      apiClient.post<IClaimResponse>('/claims', claimData),
    onSuccess: (response) => {
      if (response.success && response.claim) {
        void queryClient.invalidateQueries({ queryKey: ['claims', 'draft'] });
        onClaimCreated?.(response.claim);
        form.reset({
          category: ClaimCategory.TELCO,
          claimName: '',
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          totalAmount: 0,
        });
        toast.success('Claim added to draft list');
      } else {
        toast.error(response.error || 'Failed to create claim');
      }
    },
    onError: (error: Error) => {
      // Display the error message from the API
      toast.error(error.message || 'Failed to create claim. Please try again.');
    },
    onSettled: () => {
      setIsCreating(false);
    },
  });

  const handleSubmit = useCallback(
    async (data: FormData) => {
      setIsCreating(true);

      // Client-side validation for business rules
      const limitError = validateMonthlyLimits(data, existingDraftClaims);
      if (limitError) {
        toast.error(limitError);
        setIsCreating(false);
        return;
      }

      // Basic validation
      if (data.totalAmount <= 0) {
        toast.error('Please enter a valid amount greater than 0');
        setIsCreating(false);
        return;
      }

      if (data.category === ClaimCategory.OTHERS && !data.claimName.trim()) {
        toast.error('Please enter a claim name for Others category');
        setIsCreating(false);
        return;
      }

      // Create the draft claim via API
      const claimRequest: IClaimCreateRequest = {
        category: data.category,
        claimName: data.claimName.trim() || undefined,
        month: data.month,
        year: data.year,
        totalAmount: data.totalAmount,
      };

      createClaimMutation.mutate(claimRequest);
    },
    [createClaimMutation, existingDraftClaims],
  );

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add New Claim
        </CardTitle>
        <CardDescription>
          Create draft claims that will be submitted together. Claims with
          monthly limits (telco, fitness) are validated across your existing
          drafts.
        </CardDescription>
      </CardHeader>

      <CardContent>
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
                    Claim Name
                    {form.watch('category') === ClaimCategory.OTHERS && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={
                        form.watch('category') === ClaimCategory.OTHERS
                          ? 'Enter a descriptive name (required)'
                          : 'Optional descriptive name'
                      }
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
            <FormActions isSubmitting={isCreating} />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
