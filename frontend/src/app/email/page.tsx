'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmailComposer } from '@/components/email/EmailComposer';
import { AuthStatus } from '@/components/auth/AuthStatus';
import { useAuth } from '@/hooks/queries/auth/useAuth';
import { useEmail } from '@/hooks/queries/email/useEmail';

export default function EmailPage() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading: isAuthLoading, logout } = useAuth();

  const {
    hasGmailAccess,
    gmailEmail,
    isLoading: isEmailLoading,
    sendEmail,
    refreshGmailToken,
    isSending,
    isRefreshing,
  } = useEmail();

  // Redirect to auth page if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/auth');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  // Loading state
  if (isAuthLoading || isEmailLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
            <p className="text-muted-foreground">Loading email interface...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated - show message (will redirect)
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please sign in to access the email interface
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Redirecting to authentication page...
            </p>
            <div className="flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Email Composer</h1>
          <p className="text-muted-foreground">
            Send emails through your Gmail account
          </p>
        </div>

        {/* Auth Status Card */}
        <AuthStatus
          user={user}
          isAuthenticated={isAuthenticated}
          isLoading={isAuthLoading}
          onLogout={logout}
        />

        {/* Gmail Access Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Gmail Access Status</CardTitle>
            <CardDescription>
              Your Gmail integration status and permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasGmailAccess ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    Gmail Access Granted
                  </span>
                </div>
                {gmailEmail && (
                  <span className="text-sm text-muted-foreground">
                    {gmailEmail}
                  </span>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                  <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                    Gmail Access Pending
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  You can compose and send emails using your authenticated
                  Google account. The system will handle Gmail permissions
                  automatically.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refreshGmailToken()}
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? (
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                        <span>Refreshing...</span>
                      </div>
                    ) : (
                      'Refresh Access'
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      (window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/auth/google`)
                    }
                  >
                    Re-authenticate
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Composer */}
        <EmailComposer
          onSend={sendEmail}
          disabled={!isAuthenticated || isSending}
        />

        {/* Instructions Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground space-y-2">
              <h4 className="font-medium text-foreground">How to use:</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Fill in the recipient email, subject, and message</li>
                <li>Optionally enable HTML formatting for rich content</li>
                <li>Click &quot;Send Email&quot; to deliver your message</li>
                <li>The system will handle Gmail permissions automatically</li>
              </ul>
              <p className="pt-2">
                <strong>Note:</strong> Emails are sent from your authenticated
                Gmail account. Recipients will see your Gmail address as the
                sender.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
