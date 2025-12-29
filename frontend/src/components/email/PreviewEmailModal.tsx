'use client';

import React, { useState, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useEmailPreview } from '@/hooks/email/useEmailPreview';

/**
 * PreviewEmailModal component for displaying email preview in a modal
 *
 * Responsibilities:
 * - Display email preview with subject, recipients, and HTML body
 * - Handle loading, error, and success states
 * - Sanitize HTML content before rendering for security
 * - Provide collapsible recipients section
 * - Support mobile responsive design with full-screen on mobile
 * - Accessible with ARIA attributes
 *
 * Requirements: Requirement 2 (Modal), Requirement 3 (Recipients),
 * Requirement 4 (HTML), Requirement 5 (Loading), Requirement 6 (Error),
 * Requirement 7 (Mobile), Requirement 8 (Accessibility)
 *
 * Design: Uses existing Dialog components with three distinct states,
 * DOMPurify for HTML sanitization, and collapsible UI for better UX
 */

interface PreviewEmailModalProps {
  claimId: string | null;
  onClose: () => void;
}

export const PreviewEmailModal: React.FC<PreviewEmailModalProps> = ({
  claimId,
  onClose,
}) => {
  const [isRecipientsExpanded, setIsRecipientsExpanded] = useState(false);
  const { data, isLoading, isError, error, refetch } = useEmailPreview(claimId);

  // Sanitize HTML content with DOMPurify
  const sanitizedHtml = useMemo(() => {
    if (!data?.htmlBody) return '';
    return DOMPurify.sanitize(data.htmlBody);
  }, [data?.htmlBody]);

  // Check if there are any CC or BCC recipients
  const hasCC = data?.cc && data.cc.length > 0;
  const hasBCC = data?.bcc && data.bcc.length > 0;

  return (
    <Dialog
      open={claimId !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto sm:max-h-[85vh] w-[95vw] sm:w-full"
        aria-describedby="email-preview-description"
      >
        <DialogHeader>
          <DialogTitle>Email Preview</DialogTitle>
          <p
            id="email-preview-description"
            className="sr-only"
          >
            Preview of the email that will be sent for this claim
          </p>
        </DialogHeader>

        {/* Loading State */}
        {isLoading && (
          <div
            className="space-y-4"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-20 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div
            className="space-y-4"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
          >
            <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-md">
              <p className="text-sm text-destructive font-medium">
                Failed to load email preview
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {error?.message || 'An unexpected error occurred'}
              </p>
            </div>
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="w-full sm:w-auto"
              aria-label="Retry loading email preview"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        )}

        {/* Success State */}
        {!isLoading && !isError && data && (
          <div
            className="space-y-4"
            aria-live="polite"
          >
            {/* Subject */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Subject
              </h3>
              <p className="text-base font-medium">{data.subject}</p>
            </div>

            {/* Recipients Section - Collapsible */}
            <div>
              <button
                onClick={() => setIsRecipientsExpanded(!isRecipientsExpanded)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
                aria-expanded={isRecipientsExpanded}
                aria-controls="recipients-content"
              >
                {isRecipientsExpanded ? (
                  <ChevronDown
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                ) : (
                  <ChevronRight
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                )}
                <span>
                  Recipients ({data.recipients.length}
                  {hasCC && ` + ${data.cc.length} CC`}
                  {hasBCC && ` + ${data.bcc.length} BCC`})
                </span>
              </button>

              {isRecipientsExpanded && (
                <div
                  id="recipients-content"
                  className="mt-2 space-y-3 pl-6 text-sm"
                >
                  {/* To Recipients */}
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">
                      To:
                    </p>
                    <ul className="space-y-1">
                      {data.recipients.map((recipient, index) => (
                        <li
                          key={`to-${index}`}
                          className="text-foreground"
                        >
                          {recipient}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CC Recipients */}
                  {hasCC && (
                    <div>
                      <p className="font-medium text-muted-foreground mb-1">
                        CC:
                      </p>
                      <ul className="space-y-1">
                        {data.cc.map((recipient, index) => (
                          <li
                            key={`cc-${index}`}
                            className="text-foreground"
                          >
                            {recipient}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* BCC Recipients */}
                  {hasBCC && (
                    <div>
                      <p className="font-medium text-muted-foreground mb-1">
                        BCC:
                      </p>
                      <ul className="space-y-1">
                        {data.bcc.map((recipient, index) => (
                          <li
                            key={`bcc-${index}`}
                            className="text-foreground"
                          >
                            {recipient}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Email Body - HTML Content */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Email Content
              </h3>
              <div
                className="border rounded-md p-4 bg-background prose prose-sm dark:prose-invert max-w-none overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                aria-label="Email body content"
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
