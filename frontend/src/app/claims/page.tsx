'use client';

import React from 'react';
import { ClaimForm } from '@/components/claims/ClaimForm';
import {
  IClaimCreateRequest,
  IClaimMetadata,
  ClaimCategory,
  ClaimStatus,
} from '@project/types';

/**
 * Demo claim page showing integration between ClaimForm and attachment components
 * This demonstrates how the attachment upload and management integrates with claim workflow
 */
export default function ClaimsPage() {
  // Mock claim data to demonstrate editing an existing claim
  const mockClaim: IClaimMetadata = {
    id: 'demo-claim-id-123',
    userId: 'user-123',
    category: ClaimCategory.TELCO,
    claimName: 'Demo Telecommunications Claim',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    totalAmount: 150.5,
    status: ClaimStatus.DRAFT,
    submissionDate: null,
    attachments: [], // Will be populated by AttachmentList component
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const handleSave = async (claimData: IClaimCreateRequest) => {
    // eslint-disable-next-line no-console
    console.log('Saving claim as draft:', claimData);
    // In a real implementation, this would call the API
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
  };

  const handleSubmit = async (claimData: IClaimCreateRequest) => {
    // eslint-disable-next-line no-console
    console.log('Submitting claim:', claimData);
    // In a real implementation, this would call the API
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate API call
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <ClaimForm
        claim={mockClaim}
        onSave={handleSave}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
