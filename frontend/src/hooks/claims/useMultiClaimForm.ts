import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import {
  IClaimCreateRequest,
  IClaimResponse,
  IClaimMetadata,
  IClaimCategory,
} from '@project/types';

interface FormData {
  category: string;
  claimName: string;
  month: number;
  year: number;
  totalAmount: number;
}

interface UseMultiClaimFormOptions {
  onClaimCreated?: (claim: IClaimMetadata) => void;
  existingDraftClaims?: IClaimMetadata[];
  claimId?: string;
  categories?: IClaimCategory[];
}

/**
 * Validates monthly limits across existing and new claims
 */
const validateMonthlyLimits = (
  newClaim: FormData,
  existingClaims: IClaimMetadata[] = [],
  categories: IClaimCategory[] = [],
  excludeClaimId?: string,
): string | null => {
  const category = categories.find((cat) => cat.code === newClaim.category);
  const categoryLimit =
    category?.limit?.type === 'monthly' ? category.limit.amount : null;
  if (!categoryLimit) return null; // No limit for this category

  // Calculate existing amount for this category/month/year
  // Exclude the claim being edited to avoid counting it twice
  const existingAmount = existingClaims
    .filter(
      (claim) =>
        claim.id !== excludeClaimId &&
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

export const useMultiClaimForm = ({
  onClaimCreated,
  existingDraftClaims = [],
  claimId,
  categories = [],
}: UseMultiClaimFormOptions) => {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  // Get default category code (first category or empty string)
  const defaultCategory = categories.length > 0 ? categories[0].code : '';

  const form = useForm<FormData>({
    defaultValues: {
      category: defaultCategory,
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
          category: defaultCategory,
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

  // Mutation for updating draft claims
  const updateClaimMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: IClaimCreateRequest }) =>
      apiClient.put<IClaimResponse>(`/claims/${id}`, data),
    onSuccess: (response) => {
      if (response.success && response.claim) {
        void queryClient.invalidateQueries({ queryKey: ['claims', 'draft'] });
        onClaimCreated?.(response.claim);
        toast.success('Claim updated successfully');
      } else {
        toast.error(response.error || 'Failed to update claim');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update claim. Please try again.');
    },
    onSettled: () => {
      setIsCreating(false);
    },
  });

  const handleSubmit = useCallback(
    async (data: FormData) => {
      setIsCreating(true);

      // Client-side validation for business rules
      // When editing, exclude the current claim from limit validation
      const limitError = validateMonthlyLimits(
        data,
        existingDraftClaims,
        categories,
        claimId,
      );
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

      if (data.category === 'others' && !data.claimName.trim()) {
        toast.error('Please enter a claim name for Others category');
        setIsCreating(false);
        return;
      }

      // Create or update the draft claim via API
      const claimRequest: IClaimCreateRequest = {
        category: data.category,
        claimName: data.claimName.trim() || undefined,
        month: data.month,
        year: data.year,
        totalAmount: data.totalAmount,
      };

      if (claimId) {
        updateClaimMutation.mutate({ id: claimId, data: claimRequest });
      } else {
        createClaimMutation.mutate(claimRequest);
      }
    },
    [
      createClaimMutation,
      updateClaimMutation,
      existingDraftClaims,
      claimId,
      categories,
    ],
  );

  return {
    form,
    isCreating,
    handleSubmit,
  };
};
