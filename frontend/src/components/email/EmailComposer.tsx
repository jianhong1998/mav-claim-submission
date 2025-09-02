'use client';

import { Button } from '@/components/ui/button';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { IEmailSendRequest, IEmailSendResponse } from '@project/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const emailSchema = z.object({
  to: z
    .string()
    .min(1, 'Recipient email is required')
    .email('Please enter a valid email address'),
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(200, 'Subject must be less than 200 characters'),
  body: z
    .string()
    .min(1, 'Email body is required')
    .max(10000, 'Email body must be less than 10,000 characters'),
  isHtml: z.boolean(),
});

type EmailFormData = {
  to: string;
  subject: string;
  body: string;
  isHtml: boolean;
};

interface EmailComposerProps {
  onSend?: (emailData: IEmailSendRequest) => Promise<IEmailSendResponse>;
  className?: string;
  disabled?: boolean;
}

export function EmailComposer({
  onSend,
  className,
  disabled = false,
}: EmailComposerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [sendResult, setSendResult] = useState<IEmailSendResponse | null>(null);

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      to: '',
      subject: '',
      body: '',
      isHtml: false,
    },
  });

  const handleSubmit = async (data: EmailFormData) => {
    if (!onSend) {
      console.warn('No onSend handler provided to EmailComposer');
      return;
    }

    try {
      setIsLoading(true);
      setSendResult(null);

      const emailData: IEmailSendRequest = {
        to: data.to.trim(),
        subject: data.subject.trim(),
        body: data.body.trim(),
        isHtml: data.isHtml,
      };

      const result = await onSend(emailData);
      setSendResult(result);

      if (result.success) {
        // Reset form on successful send
        form.reset();
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      setSendResult({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    form.reset();
    setSendResult(null);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Compose Email</CardTitle>
        <CardDescription>
          Send an email using your Gmail account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="recipient@example.com"
                      type="email"
                      disabled={disabled || isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the recipient&apos;s email address
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Email subject"
                      disabled={disabled || isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the email subject line
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Type your message here..."
                      className="min-h-32"
                      disabled={disabled || isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter your email message content
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isHtml"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border border-primary"
                      checked={field.value}
                      onChange={field.onChange}
                      disabled={disabled || isLoading}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Send as HTML</FormLabel>
                    <FormDescription>
                      Enable if your message contains HTML formatting
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Send Result Display */}
            {sendResult && (
              <div
                className={`rounded-md border p-4 ${
                  sendResult.success
                    ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200'
                    : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200'
                }`}
              >
                {sendResult.success ? (
                  <div className="flex items-center gap-2">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <div>
                      <p className="font-medium">Email sent successfully!</p>
                      {sendResult.messageId && (
                        <p className="text-sm opacity-75">
                          Message ID: {sendResult.messageId}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    <div>
                      <p className="font-medium">Failed to send email</p>
                      {sendResult.error && (
                        <p className="text-sm opacity-75">{sendResult.error}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Form Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={disabled || isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span>Sending...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                    <span>Send Email</span>
                  </div>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={disabled || isLoading}
              >
                Clear
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
