'use client';

import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import { Plus, Calendar, DollarSign } from 'lucide-react';

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
 * Business rules for monthly limits (as per design document)
 */
const MONTHLY_LIMITS = {
  [ClaimCategory.TELCO]: 150, // SGD 150 monthly limit for telco
  [ClaimCategory.FITNESS]: 150, // SGD 150 monthly limit for fitness
} as const;

/**
 * Gets category display name for UI
 */
const getCategoryDisplayName = (category: ClaimCategory): string => {
  const categoryNames = {
    [ClaimCategory.TELCO]: 'Telecommunications',
    [ClaimCategory.FITNESS]: 'Fitness & Wellness',
    [ClaimCategory.DENTAL]: 'Dental Care',
    [ClaimCategory.SKILL_ENHANCEMENT]: 'Skill Enhancement',
    [ClaimCategory.COMPANY_EVENT]: 'Company Event',
    [ClaimCategory.COMPANY_LUNCH]: 'Company Lunch',
    [ClaimCategory.COMPANY_DINNER]: 'Company Dinner',
    [ClaimCategory.OTHERS]: 'Others',
  };
  return categoryNames[category] || category;
};

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
    const categoryName = getCategoryDisplayName(newClaim.category);
    const monthYear = new Date(
      newClaim.year,
      newClaim.month - 1,
    ).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return `Total ${categoryName.toLowerCase()} claims for ${monthYear} (SGD ${totalAmount.toFixed(2)}) exceed monthly limit (SGD ${categoryLimit}). Please adjust amounts.`;
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
    onError: () => {
      toast.error('Failed to create claim. Please try again.');
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
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      disabled={isCreating}
                      className={cn(
                        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors',
                        'file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground',
                        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                      )}
                    >
                      {Object.values(ClaimCategory).map((category) => (
                        <option
                          key={category}
                          value={category}
                        >
                          {getCategoryDisplayName(category)}
                          {MONTHLY_LIMITS[
                            category as keyof typeof MONTHLY_LIMITS
                          ] &&
                            ` (SGD ${MONTHLY_LIMITS[category as keyof typeof MONTHLY_LIMITS]} limit)`}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
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

            <div className="grid gap-4 md:grid-cols-2">
              {/* Month */}
              <FormField
                control={form.control}
                name="month"
                rules={{
                  required: 'Please select a month',
                  min: { value: 1, message: 'Invalid month' },
                  max: { value: 12, message: 'Invalid month' },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Month
                    </FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        disabled={isCreating}
                        className={cn(
                          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors',
                          'file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground',
                          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                        )}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value))
                        }
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(
                          (month) => (
                            <option
                              key={month}
                              value={month}
                            >
                              {new Date(0, month - 1).toLocaleString('en-US', {
                                month: 'long',
                              })}
                            </option>
                          ),
                        )}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Year */}
              <FormField
                control={form.control}
                name="year"
                rules={{
                  required: 'Please enter a year',
                  min: { value: 2020, message: 'Year must be 2020 or later' },
                  max: { value: 2100, message: 'Year must be before 2100' },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="2020"
                        max="2100"
                        disabled={isCreating}
                        onChange={(e) =>
                          field.onChange(
                            parseInt(e.target.value) ||
                              new Date().getFullYear(),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={isCreating}
                className="min-w-32"
              >
                {isCreating ? (
                  <>
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Draft List
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
