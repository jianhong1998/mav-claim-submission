import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Sign In - Mavericks Claims',
  description:
    'Sign in to your Mavericks Consulting account to access the claim submission system',
};

interface AuthLayoutProps {
  children: React.ReactNode;
}

/**
 * Authentication layout that provides a clean, distraction-free environment
 * for authentication flows without the main application header navigation.
 *
 * This layout is used for all routes under the (auth) group, including:
 * - /login
 * - /callback (if needed)
 * - Other authentication-related pages
 *
 * Features:
 * - No header navigation for focused authentication experience
 * - Full viewport height layout
 * - Responsive design that works across all devices
 * - Maintains project's dark mode theme consistency
 */
const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Authentication pages content without header navigation */}
      <main className="min-h-screen">{children}</main>
    </div>
  );
};

export default AuthLayout;
