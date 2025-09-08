import '@testing-library/jest-dom';

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
global.gapi = {
  load: vi.fn((name: string, callback: () => void) => {
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
