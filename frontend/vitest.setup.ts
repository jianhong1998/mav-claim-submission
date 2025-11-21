/* eslint-disable @typescript-eslint/no-explicit-any */
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import * as React from 'react';

// Make React globally available for JSX transform
(global as any).React = React;

// Mock global fetch to prevent network requests in tests
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    clone: () => ({ json: () => Promise.resolve({}) }),
  } as Response),
);

// Mock XMLHttpRequest to prevent network requests
class MockXMLHttpRequest {
  onreadystatechange: ((event: any) => void) | null = null;
  onload: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  readyState = 0;
  status = 200;
  statusText = 'OK';
  responseText = '';
  response = '';

  open() {
    return;
  }
  send() {
    this.readyState = 4;
    this.status = 200;
    if (this.onload) this.onload({} as any);
  }
  setRequestHeader() {
    return;
  }
  abort() {
    return;
  }
  getAllResponseHeaders() {
    return '';
  }
  getResponseHeader() {
    return null;
  }
}

global.XMLHttpRequest = MockXMLHttpRequest as any;

// Mock Next.js modules
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock Google APIs client
(global as any).gapi = {
  load: vi.fn((callback: () => void) => {
    if (callback) callback();
  }),
  client: {
    init: vi.fn().mockResolvedValue({}),
    drive: {
      files: {
        create: vi.fn(),
        get: vi.fn(),
        list: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
  },
  auth2: {
    getAuthInstance: vi.fn(() => ({
      isSignedIn: {
        get: vi.fn(() => false),
        listen: vi.fn(),
      },
      signIn: vi.fn().mockResolvedValue({}),
      signOut: vi.fn().mockResolvedValue({}),
      currentUser: {
        get: vi.fn(() => ({
          getAuthResponse: vi.fn(() => ({
            access_token: 'mock-access-token',
            expires_at: Date.now() + 3600000,
          })),
        })),
      },
    })),
    init: vi.fn().mockResolvedValue({}),
  },
};

// Mock window.google for Google Identity Services
Object.defineProperty(global, 'google', {
  value: {
    accounts: {
      oauth2: {
        initTokenClient: vi.fn(() => ({
          requestAccessToken: vi.fn(),
        })),
      },
    },
  },
  writable: true,
});
