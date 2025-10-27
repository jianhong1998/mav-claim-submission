import { EnvironmentVariableUtil } from '../environment-variable.util';
import { ConfigService } from '@nestjs/config';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('EnvironmentVariableUtil', () => {
  let environmentVariableUtil: EnvironmentVariableUtil;
  let mockConfigService: ConfigService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getVariables - googleDriveClaimsFolderName', () => {
    describe('Valid environment variable', () => {
      it('should read BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME and return correct value', () => {
        const testFolderName = '[test] Mavericks Claims';

        mockConfigService = {
          get: vi
            .fn()
            .mockImplementation((key: string, defaultValue: unknown) => {
              const defaults: Record<string, unknown> = {
                NODE_ENV: 'test',
                BACKEND_BUILD_MODE: 'swc',
                BACKEND_PORT: 3001,
                BACKEND_CLIENT_HOST: 'http://localhost:3000',
                BACKEND_COOKIE_SECRET: 'test-secret',
                BACKEND_COOKIE_DOMAIN_NAME: 'localhost',
                BACKEND_GOOGLE_DRIVE_SCOPE:
                  'https://www.googleapis.com/auth/drive.file',
                BACKEND_JWT_SECRET: 'test-jwt-secret',
                DATABASE_HOST: 'localhost',
                DATABASE_PORT: 5432,
                DATABASE_USER: 'postgres',
                DATABASE_PASSWORD: 'postgres',
                DATABASE_DB: 'test_db',
              };
              return defaults[key] ?? defaultValue;
            }),
          getOrThrow: vi.fn().mockImplementation((key: string) => {
            const requiredValues: Record<string, string> = {
              BACKEND_GOOGLE_CLIENT_ID: 'test-client-id',
              BACKEND_GOOGLE_CLIENT_SECRET: 'test-client-secret',
              BACKEND_GOOGLE_REDIRECT_URI:
                'http://localhost:3001/auth/google/callback',
              BACKEND_GOOGLE_DRIVE_API_KEY: 'test-api-key',
              BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME: testFolderName,
              BACKEND_TOKEN_ENCRYPTION_KEY: 'test-encryption-key-32-chars-long',
              BACKEND_EMAIL_RECIPIENT: 'test@mavericks-consulting.com',
            };
            if (key in requiredValues) {
              return requiredValues[key];
            }
            throw new Error(`Configuration key "${key}" does not exist`);
          }),
        } as unknown as ConfigService;

        environmentVariableUtil = new EnvironmentVariableUtil(
          mockConfigService,
        );

        const result = environmentVariableUtil.getVariables();

        expect(result.googleDriveClaimsFolderName).toBe(testFolderName);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockConfigService.getOrThrow).toHaveBeenCalledWith(
          'BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME',
        );
      });

      it('should read production folder name correctly', () => {
        const prodFolderName = 'Mavericks Claims';

        mockConfigService = {
          get: vi
            .fn()
            .mockImplementation((key: string, defaultValue: unknown) => {
              const defaults: Record<string, unknown> = {
                NODE_ENV: 'production',
                BACKEND_BUILD_MODE: 'swc',
                BACKEND_PORT: 3001,
                BACKEND_CLIENT_HOST: 'https://claims.mavericks-consulting.com',
                BACKEND_COOKIE_SECRET: 'prod-secret',
                BACKEND_COOKIE_DOMAIN_NAME: 'mavericks-consulting.com',
                BACKEND_GOOGLE_DRIVE_SCOPE:
                  'https://www.googleapis.com/auth/drive.file',
                BACKEND_JWT_SECRET: 'prod-jwt-secret',
                DATABASE_HOST: 'prod-db',
                DATABASE_PORT: 5432,
                DATABASE_USER: 'postgres',
                DATABASE_PASSWORD: 'postgres',
                DATABASE_DB: 'prod_db',
              };
              return defaults[key] ?? defaultValue;
            }),
          getOrThrow: vi.fn().mockImplementation((key: string) => {
            const requiredValues: Record<string, string> = {
              BACKEND_GOOGLE_CLIENT_ID: 'prod-client-id',
              BACKEND_GOOGLE_CLIENT_SECRET: 'prod-client-secret',
              BACKEND_GOOGLE_REDIRECT_URI:
                'https://claims.mavericks-consulting.com/auth/google/callback',
              BACKEND_GOOGLE_DRIVE_API_KEY: 'prod-api-key',
              BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME: prodFolderName,
              BACKEND_TOKEN_ENCRYPTION_KEY: 'prod-encryption-key-32-chars-long',
              BACKEND_EMAIL_RECIPIENT: 'prod@mavericks-consulting.com',
            };
            if (key in requiredValues) {
              return requiredValues[key];
            }
            throw new Error(`Configuration key "${key}" does not exist`);
          }),
        } as unknown as ConfigService;

        environmentVariableUtil = new EnvironmentVariableUtil(
          mockConfigService,
        );

        const result = environmentVariableUtil.getVariables();

        expect(result.googleDriveClaimsFolderName).toBe(prodFolderName);
      });

      it('should read staging folder name correctly', () => {
        const stagingFolderName = '[staging] Mavericks Claims';

        mockConfigService = {
          get: vi
            .fn()
            .mockImplementation((key: string, defaultValue: unknown) => {
              const defaults: Record<string, unknown> = {
                NODE_ENV: 'staging',
                BACKEND_BUILD_MODE: 'swc',
                BACKEND_PORT: 3001,
                BACKEND_CLIENT_HOST:
                  'https://staging-claims.mavericks-consulting.com',
                BACKEND_COOKIE_SECRET: 'staging-secret',
                BACKEND_COOKIE_DOMAIN_NAME: 'mavericks-consulting.com',
                BACKEND_GOOGLE_DRIVE_SCOPE:
                  'https://www.googleapis.com/auth/drive.file',
                BACKEND_JWT_SECRET: 'staging-jwt-secret',
                DATABASE_HOST: 'staging-db',
                DATABASE_PORT: 5432,
                DATABASE_USER: 'postgres',
                DATABASE_PASSWORD: 'postgres',
                DATABASE_DB: 'staging_db',
              };
              return defaults[key] ?? defaultValue;
            }),
          getOrThrow: vi.fn().mockImplementation((key: string) => {
            const requiredValues: Record<string, string> = {
              BACKEND_GOOGLE_CLIENT_ID: 'staging-client-id',
              BACKEND_GOOGLE_CLIENT_SECRET: 'staging-client-secret',
              BACKEND_GOOGLE_REDIRECT_URI:
                'https://staging-claims.mavericks-consulting.com/auth/google/callback',
              BACKEND_GOOGLE_DRIVE_API_KEY: 'staging-api-key',
              BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME: stagingFolderName,
              BACKEND_TOKEN_ENCRYPTION_KEY:
                'staging-encryption-key-32-chars-long',
              BACKEND_EMAIL_RECIPIENT: 'staging@mavericks-consulting.com',
            };
            if (key in requiredValues) {
              return requiredValues[key];
            }
            throw new Error(`Configuration key "${key}" does not exist`);
          }),
        } as unknown as ConfigService;

        environmentVariableUtil = new EnvironmentVariableUtil(
          mockConfigService,
        );

        const result = environmentVariableUtil.getVariables();

        expect(result.googleDriveClaimsFolderName).toBe(stagingFolderName);
      });
    });

    describe('Missing environment variable', () => {
      it('should throw error when BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME is missing', () => {
        mockConfigService = {
          get: vi
            .fn()
            .mockImplementation((key: string, defaultValue: unknown) => {
              const defaults: Record<string, unknown> = {
                NODE_ENV: 'test',
                BACKEND_BUILD_MODE: 'swc',
                BACKEND_PORT: 3001,
                BACKEND_CLIENT_HOST: 'http://localhost:3000',
                BACKEND_COOKIE_SECRET: 'test-secret',
                BACKEND_COOKIE_DOMAIN_NAME: 'localhost',
                BACKEND_GOOGLE_DRIVE_SCOPE:
                  'https://www.googleapis.com/auth/drive.file',
                BACKEND_JWT_SECRET: 'test-jwt-secret',
                DATABASE_HOST: 'localhost',
                DATABASE_PORT: 5432,
                DATABASE_USER: 'postgres',
                DATABASE_PASSWORD: 'postgres',
                DATABASE_DB: 'test_db',
              };
              return defaults[key] ?? defaultValue;
            }),
          getOrThrow: vi.fn().mockImplementation((key: string) => {
            const requiredValues: Record<string, string> = {
              BACKEND_GOOGLE_CLIENT_ID: 'test-client-id',
              BACKEND_GOOGLE_CLIENT_SECRET: 'test-client-secret',
              BACKEND_GOOGLE_REDIRECT_URI:
                'http://localhost:3001/auth/google/callback',
              BACKEND_GOOGLE_DRIVE_API_KEY: 'test-api-key',
              // BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME is intentionally missing
              BACKEND_TOKEN_ENCRYPTION_KEY: 'test-encryption-key-32-chars-long',
              BACKEND_EMAIL_RECIPIENT: 'test@mavericks-consulting.com',
            };
            if (key in requiredValues) {
              return requiredValues[key];
            }
            throw new Error(`Configuration key "${key}" does not exist`);
          }),
        } as unknown as ConfigService;

        environmentVariableUtil = new EnvironmentVariableUtil(
          mockConfigService,
        );

        expect(() => environmentVariableUtil.getVariables()).toThrow(
          'Configuration key "BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME" does not exist',
        );
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockConfigService.getOrThrow).toHaveBeenCalledWith(
          'BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME',
        );
      });
    });

    describe('Caching behavior', () => {
      it('should cache environment variables and not call ConfigService on subsequent calls', () => {
        const testFolderName = '[test] Mavericks Claims';

        mockConfigService = {
          get: vi
            .fn()
            .mockImplementation((key: string, defaultValue: unknown) => {
              const defaults: Record<string, unknown> = {
                NODE_ENV: 'test',
                BACKEND_BUILD_MODE: 'swc',
                BACKEND_PORT: 3001,
                BACKEND_CLIENT_HOST: 'http://localhost:3000',
                BACKEND_COOKIE_SECRET: 'test-secret',
                BACKEND_COOKIE_DOMAIN_NAME: 'localhost',
                BACKEND_GOOGLE_DRIVE_SCOPE:
                  'https://www.googleapis.com/auth/drive.file',
                BACKEND_JWT_SECRET: 'test-jwt-secret',
                DATABASE_HOST: 'localhost',
                DATABASE_PORT: 5432,
                DATABASE_USER: 'postgres',
                DATABASE_PASSWORD: 'postgres',
                DATABASE_DB: 'test_db',
              };
              return defaults[key] ?? defaultValue;
            }),
          getOrThrow: vi.fn().mockImplementation((key: string) => {
            const requiredValues: Record<string, string> = {
              BACKEND_GOOGLE_CLIENT_ID: 'test-client-id',
              BACKEND_GOOGLE_CLIENT_SECRET: 'test-client-secret',
              BACKEND_GOOGLE_REDIRECT_URI:
                'http://localhost:3001/auth/google/callback',
              BACKEND_GOOGLE_DRIVE_API_KEY: 'test-api-key',
              BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME: testFolderName,
              BACKEND_TOKEN_ENCRYPTION_KEY: 'test-encryption-key-32-chars-long',
              BACKEND_EMAIL_RECIPIENT: 'test@mavericks-consulting.com',
            };
            if (key in requiredValues) {
              return requiredValues[key];
            }
            throw new Error(`Configuration key "${key}" does not exist`);
          }),
        } as unknown as ConfigService;

        environmentVariableUtil = new EnvironmentVariableUtil(
          mockConfigService,
        );

        const firstCall = environmentVariableUtil.getVariables();
        const secondCall = environmentVariableUtil.getVariables();
        const thirdCall = environmentVariableUtil.getVariables();

        expect(firstCall).toBe(secondCall);
        expect(secondCall).toBe(thirdCall);
        expect(firstCall.googleDriveClaimsFolderName).toBe(testFolderName);

        // getOrThrow should only be called once per env var during first call
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockConfigService.getOrThrow).toHaveBeenCalledWith(
          'BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME',
        );
        // Verify it was called exactly once for this env var
        const callsForFolderName = (
          mockConfigService.getOrThrow as ReturnType<typeof vi.fn>
        ).mock.calls.filter(
          (call) => call[0] === 'BACKEND_GOOGLE_DRIVE_CLAIMS_FOLDER_NAME',
        );
        expect(callsForFolderName).toHaveLength(1);
      });
    });
  });
});
