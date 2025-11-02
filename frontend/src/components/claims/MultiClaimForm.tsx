'use client';

import React from 'react';
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
import { ClaimCategory, IClaimMetadata } from '@project/types';
import { Plus, DollarSign } from 'lucide-react';
import { CategorySelect } from './category-select';
import { MonthYearPicker } from './month-year-picker';
import { FormActions } from './form-actions';
import { useMultiClaimForm } from '@/hooks/claims/useMultiClaimForm';

interface MultiClaimFormProps {
  onClaimCreated?: (claim: IClaimMetadata) => void;
  existingDraftClaims?: IClaimMetadata[];
  className?: string;
}

/**
 * MultiClaimForm component for creating individual claims in a multi-claim workflow
 * Following requirements 1.1 and 2.1 for draft claim creation with validation
 */
export const MultiClaimForm: React.FC<MultiClaimFormProps> = ({
  onClaimCreated,
  existingDraftClaims = [],
  className,
}) => {
  const { form, isCreating, handleSubmit } = useMultiClaimForm({
    onClaimCreated,
    existingDraftClaims,
  });

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
            <FormActions isSubmitting={isCreating} />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
