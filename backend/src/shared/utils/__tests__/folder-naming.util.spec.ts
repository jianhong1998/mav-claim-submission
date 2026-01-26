import {
  FolderNamingUtil,
  ClaimDataForFolderNaming,
} from '../folder-naming.util';

describe('FolderNamingUtil', () => {
  const BASE_CLAIM_DATA: ClaimDataForFolderNaming = {
    id: 'test-claim-id-123',
    claimName: 'Test Claim',
    category: 'telco',
    month: 9,
    year: 2024,
    createdAt: new Date('2024-09-15T10:30:00Z'),
    totalAmount: 150.5,
  };

  const TIMESTAMP = Math.floor(
    new Date('2024-09-15T10:30:00Z').getTime() / 1000,
  );

  describe('generateFolderName', () => {
    describe('Requirement 1.1-1.7: Descriptive Folder Naming with Chronological Sorting', () => {
      it('should generate folder name in correct format: {year}-{month}-{timestamp}-{categoryCode}-{claimName}', () => {
        const result = FolderNamingUtil.generateFolderName(BASE_CLAIM_DATA);

        expect(result.folderName).toBe(`2024-09-${TIMESTAMP}-telco-test-claim`);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should pad single digit month with zero (Requirement 1.2)', () => {
        const claimData = {
          ...BASE_CLAIM_DATA,
          month: 3,
        };

        const result = FolderNamingUtil.generateFolderName(claimData);

        expect(result.folderName).toContain('2024-03-');
      });

      it('should use correct category code mapping (Requirement 1.3)', () => {
        const testCases = [
          { category: 'telco', expected: 'telco' },
          { category: 'fitness', expected: 'fitness' },
          { category: 'dental', expected: 'dental' },
          { category: 'skill-enhancement', expected: 'skill' },
          { category: 'company-event', expected: 'event' },
          { category: 'company-lunch', expected: 'lunch' },
          { category: 'company-dinner', expected: 'dinner' },
          { category: 'others', expected: 'others' },
        ];

        testCases.forEach(({ category, expected }) => {
          const claimData = {
            ...BASE_CLAIM_DATA,
            category,
          };

          const result = FolderNamingUtil.generateFolderName(claimData);

          expect(result.folderName).toContain(`-${expected}-`);
        });
      });

      it('should normalize claim name to lowercase and replace spaces with hyphens (Requirement 1.4)', () => {
        const claimData = {
          ...BASE_CLAIM_DATA,
          claimName: 'My Phone Bill Q3 2024',
        };

        const result = FolderNamingUtil.generateFolderName(claimData);

        expect(result.folderName).toContain('my-phone-bill-q3-2024');
      });

      it('should use Unix timestamp in seconds for readability (Requirement 1.5)', () => {
        const testDate = new Date('2024-09-15T10:30:00Z');
        const expectedTimestamp = Math.floor(testDate.getTime() / 1000);
        const claimData = {
          ...BASE_CLAIM_DATA,
          createdAt: testDate,
        };

        const result = FolderNamingUtil.generateFolderName(claimData);

        expect(result.folderName).toContain(`-${expectedTimestamp}-`);
        expect(expectedTimestamp.toString()).toHaveLength(10);
      });

      it('should generate folder name without suffix when claimName is null', () => {
        const claimData = {
          ...BASE_CLAIM_DATA,
          claimName: null,
          category: 'telco',
        };

        const result = FolderNamingUtil.generateFolderName(claimData);

        expect(result.folderName).toMatch(/^2024-09-\d{10}-telco$/);
      });

      it('should generate folder name without suffix when claimName is empty', () => {
        const claimData = {
          ...BASE_CLAIM_DATA,
          claimName: '',
          category: 'fitness',
        };

        const result = FolderNamingUtil.generateFolderName(claimData);

        expect(result.folderName).toMatch(/^2024-09-\d{10}-fitness$/);
      });

      it('should generate chronologically sortable folder names (Requirement 1.7)', () => {
        const claimData1 = {
          ...BASE_CLAIM_DATA,
          createdAt: new Date('2024-09-15T10:30:00Z'),
        };
        const claimData2 = {
          ...BASE_CLAIM_DATA,
          createdAt: new Date('2024-09-15T11:30:00Z'),
        };

        const result1 = FolderNamingUtil.generateFolderName(claimData1);
        const result2 = FolderNamingUtil.generateFolderName(claimData2);

        expect(result1.folderName < result2.folderName).toBe(true);
      });
    });

    describe('Requirement 2.1-2.5: Character Limits and Sanitization', () => {
      it('should truncate claim name to 30 characters and append "..." (Requirement 2.1-2.2)', () => {
        const longClaimName =
          'This is a very long claim name that exceeds thirty characters limit';
        const claimData = {
          ...BASE_CLAIM_DATA,
          claimName: longClaimName,
        };

        const result = FolderNamingUtil.generateFolderName(claimData);

        const claimNamePart = result.folderName.split('-').slice(4).join('-');
        expect(claimNamePart.length).toBeLessThanOrEqual(30);
        expect(claimNamePart).toContain('...');
      });

      it('should remove special characters and keep only alphanumeric, spaces, and hyphens (Requirement 2.3)', () => {
        const specialCharClaimName = 'Test!@#$%^&*()+=[]{}|;\':",./<>?Claim';
        const claimData = {
          ...BASE_CLAIM_DATA,
          claimName: specialCharClaimName,
        };

        const result = FolderNamingUtil.generateFolderName(claimData);

        expect(result.folderName).toContain('testclaim');
        expect(result.folderName).not.toMatch(
          /[!@#$%^&*()+=[\]{}|;':",./<>?\\]/,
        );
      });

      it('should replace multiple consecutive spaces/hyphens with single hyphen (Requirement 2.3)', () => {
        const multiSpaceClaimName = 'Test    Multiple   Spaces';
        const claimData = {
          ...BASE_CLAIM_DATA,
          claimName: multiSpaceClaimName,
        };

        const result = FolderNamingUtil.generateFolderName(claimData);

        expect(result.folderName).toContain('test-multiple-spaces');
        expect(result.folderName).not.toMatch(/[-\s]{2,}/);
      });

      it('should remove leading and trailing hyphens (Requirement 2.3)', () => {
        const hyphenClaimName = '---Leading and Trailing Hyphens---';
        const claimData = {
          ...BASE_CLAIM_DATA,
          claimName: hyphenClaimName,
        };

        const result = FolderNamingUtil.generateFolderName(claimData);

        const claimNamePart = result.folderName.split('-').slice(4).join('-');
        expect(claimNamePart).not.toMatch(/^-+|-+$/);
      });

      it('should ensure total path length stays under 200 characters (Requirement 2.4)', () => {
        const longClaimName = 'A'.repeat(200);
        const claimData = {
          ...BASE_CLAIM_DATA,
          claimName: longClaimName,
        };

        const result = FolderNamingUtil.generateFolderName(claimData);

        expect(result.folderName.length).toBeLessThanOrEqual(200);
      });

      it('should truncate claim name portion when complete folder name exceeds limits (Requirement 2.5)', () => {
        const veryLongClaimName = 'Very'.repeat(100);
        const claimData = {
          ...BASE_CLAIM_DATA,
          claimName: veryLongClaimName,
        };

        const result = FolderNamingUtil.generateFolderName(claimData);

        expect(result.folderName.length).toBeLessThanOrEqual(200);
        // Check if the claim name was truncated at the sanitization level (30 chars) or folder level
        const claimNamePart = result.folderName.split('-').slice(4).join('-');
        expect(claimNamePart.length).toBeLessThanOrEqual(30);
      });
    });

    describe('Requirement 3.1-3.5: Category Code Mapping with Claim Name', () => {
      it('should use correct category codes for all categories (Requirement 3.1)', () => {
        const categoryMappings = [
          { category: 'telco', expectedCode: 'telco' },
          { category: 'fitness', expectedCode: 'fitness' },
          { category: 'dental', expectedCode: 'dental' },
          { category: 'skill-enhancement', expectedCode: 'skill' },
          { category: 'company-event', expectedCode: 'event' },
          { category: 'company-lunch', expectedCode: 'lunch' },
          { category: 'company-dinner', expectedCode: 'dinner' },
          { category: 'others', expectedCode: 'others' },
        ];

        categoryMappings.forEach(({ category, expectedCode }) => {
          const claimData = {
            ...BASE_CLAIM_DATA,
            category,
            claimName: 'Test Claim',
          };

          const result = FolderNamingUtil.generateFolderName(claimData);

          expect(result.folderName).toContain(`-${expectedCode}-`);
        });
      });

      it('should include both category code and claim name for "others" category (Requirement 3.3)', () => {
        const claimData = {
          ...BASE_CLAIM_DATA,
          category: 'others',
          claimName: 'Custom Other Expense',
        };

        const result = FolderNamingUtil.generateFolderName(claimData);

        expect(result.folderName).toContain('-others-');
        expect(result.folderName).toContain('custom-other-expense');
      });

      it('should use provided claim name for non-others categories (Requirement 3.4)', () => {
        const claimData = {
          ...BASE_CLAIM_DATA,
          category: 'fitness',
          claimName: 'Gym Membership',
        };

        const result = FolderNamingUtil.generateFolderName(claimData);

        expect(result.folderName).toContain('-fitness-');
        expect(result.folderName).toContain('gym-membership');
      });

      it('should convert claim names to lowercase and replace spaces with hyphens (Requirement 3.5)', () => {
        const claimData = {
          ...BASE_CLAIM_DATA,
          claimName: 'My UPPERCASE Mixed Case',
        };

        const result = FolderNamingUtil.generateFolderName(claimData);

        expect(result.folderName).toContain('my-uppercase-mixed-case');
      });
    });

    describe('Error Handling and Edge Cases', () => {
      it('should handle null claim name gracefully', () => {
        const claimData = {
          ...BASE_CLAIM_DATA,
          claimName: null,
        };

        const result = FolderNamingUtil.generateFolderName(claimData);

        expect(result.isValid).toBe(true);
        expect(result.folderName).toMatch(/^2024-09-\d{10}-telco$/);
      });

      it('should handle empty claim name gracefully', () => {
        const claimData = {
          ...BASE_CLAIM_DATA,
          claimName: '',
        };

        const result = FolderNamingUtil.generateFolderName(claimData);

        expect(result.isValid).toBe(true);
        expect(result.folderName).toMatch(/^2024-09-\d{10}-telco$/);
      });

      it('should handle claim name with only special characters', () => {
        const claimData = {
          ...BASE_CLAIM_DATA,
          claimName: '!@#$%^&*()',
        };

        const result = FolderNamingUtil.generateFolderName(claimData);

        expect(result.isValid).toBe(true);
        expect(result.folderName).toMatch(/^2024-09-\d{10}-telco$/);
      });

      it('should handle claim name with only spaces', () => {
        const claimData = {
          ...BASE_CLAIM_DATA,
          claimName: '   ',
        };

        const result = FolderNamingUtil.generateFolderName(claimData);

        expect(result.isValid).toBe(true);
        expect(result.folderName).toMatch(/^2024-09-\d{10}-telco$/);
      });

      it('should handle exception during folder name generation', () => {
        const invalidClaimData: ClaimDataForFolderNaming = {
          ...BASE_CLAIM_DATA,
          createdAt: null as unknown as Date,
        };

        const result = FolderNamingUtil.generateFolderName(invalidClaimData);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('Folder name generation failed');
        expect(result.folderName).toContain(BASE_CLAIM_DATA.id);
      });

      it('should fall back to ID-based naming when generation fails', () => {
        const invalidClaimData: ClaimDataForFolderNaming = {
          ...BASE_CLAIM_DATA,
          createdAt: null as unknown as Date, // This will trigger the catch block
        };

        const result = FolderNamingUtil.generateFolderName(invalidClaimData);

        // The fallback uses year-month-id format with padded month
        const expectedMonth = BASE_CLAIM_DATA.month.toString().padStart(2, '0');
        expect(result.folderName).toBe(
          `${BASE_CLAIM_DATA.year}-${expectedMonth}-${BASE_CLAIM_DATA.id}`,
        );
        expect(result.isValid).toBe(false);
      });
    });

    describe('Performance Requirements', () => {
      it('should complete folder name generation in under 10ms', () => {
        const startTime = performance.now();

        for (let i = 0; i < 100; i++) {
          FolderNamingUtil.generateFolderName(BASE_CLAIM_DATA);
        }

        const endTime = performance.now();
        const averageTime = (endTime - startTime) / 100;

        expect(averageTime).toBeLessThan(10);
      });
    });
  });

  describe('sanitizeClaimName', () => {
    it('should return empty string for null input', () => {
      const result = FolderNamingUtil.sanitizeClaimName(null);
      expect(result).toBe('');
    });

    it('should return empty string for undefined input', () => {
      const result = FolderNamingUtil.sanitizeClaimName(
        undefined as unknown as string,
      );
      expect(result).toBe('');
    });

    it('should return empty string for non-string input', () => {
      const result = FolderNamingUtil.sanitizeClaimName(
        123 as unknown as string,
      );
      expect(result).toBe('');
    });

    it('should trim whitespace', () => {
      const result = FolderNamingUtil.sanitizeClaimName('  test  ');
      expect(result).toBe('test');
    });

    it('should convert to lowercase', () => {
      const result = FolderNamingUtil.sanitizeClaimName('UPPERCASE');
      expect(result).toBe('uppercase');
    });

    it('should remove special characters', () => {
      const input = 'test!@#$%^&*()+=[]{}|;\':",./<>?\\claim';
      const result = FolderNamingUtil.sanitizeClaimName(input);
      expect(result).toBe('testclaim');
    });

    it('should replace multiple spaces and hyphens with single hyphen', () => {
      const result = FolderNamingUtil.sanitizeClaimName(
        'test   multiple---spaces',
      );
      expect(result).toBe('test-multiple-spaces');
    });

    it('should remove leading and trailing hyphens', () => {
      const result = FolderNamingUtil.sanitizeClaimName('---test---');
      expect(result).toBe('test');
    });

    it('should truncate to maximum length and append ellipsis', () => {
      const longInput = 'a'.repeat(50);
      const result = FolderNamingUtil.sanitizeClaimName(longInput);
      expect(result.length).toBeLessThanOrEqual(30);
      expect(result).toMatch(/\.\.\.$/);
    });

    it('should not add ellipsis for short strings', () => {
      const shortInput = 'short';
      const result = FolderNamingUtil.sanitizeClaimName(shortInput);
      expect(result).toBe('short');
      expect(result).not.toContain('...');
    });
  });

  describe('validateClaimName', () => {
    it('should return invalid for empty folder name', () => {
      const result = FolderNamingUtil.validateClaimName('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Folder name cannot be empty');
    });

    it('should return invalid for null folder name', () => {
      const result = FolderNamingUtil.validateClaimName(
        null as unknown as string,
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Folder name cannot be empty');
    });

    it('should return invalid for non-string folder name', () => {
      const result = FolderNamingUtil.validateClaimName(
        123 as unknown as string,
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Folder name cannot be empty');
    });

    it('should return invalid for folder name exceeding 200 characters', () => {
      const longName = 'a'.repeat(201);
      const result = FolderNamingUtil.validateClaimName(longName);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Folder name exceeds maximum length of 200 characters',
      );
    });

    it('should return invalid for folder name containing path traversal sequences', () => {
      const result = FolderNamingUtil.validateClaimName(
        '2024-09-123456-telco-../hack',
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Folder name cannot contain path traversal sequences',
      );
    });

    it('should return invalid for folder name containing invalid file system characters', () => {
      const invalidChars = ['<', '>', ':', '"', '|', '?', '*', '\\', '/'];
      invalidChars.forEach((char) => {
        const result = FolderNamingUtil.validateClaimName(
          `2024-09-123456-telco-test${char}claim`,
        );
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Folder name contains invalid characters for file systems',
        );
      });
    });

    it('should return invalid for folder name not following expected format', () => {
      const result = FolderNamingUtil.validateClaimName('invalid-format');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Folder name does not follow expected format: year-month-timestamp-category[-claimName]',
      );
    });

    it('should validate year format and range', () => {
      // Format violations (caught by regex)
      const formatInvalid = ['202', '20244', 'abcd'];
      formatInvalid.forEach((year) => {
        const folderName = `${year}-09-1234567890-telco-test`;
        const result = FolderNamingUtil.validateClaimName(folderName);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Folder name does not follow expected format: year-month-timestamp-category[-claimName]',
        );
      });

      // Range violations (valid format but year out of range)
      const rangeInvalid = ['2019', '2101'];
      rangeInvalid.forEach((year) => {
        const folderName = `${year}-09-1234567890-telco-test`;
        const result = FolderNamingUtil.validateClaimName(folderName);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid year format or range');
      });
    });

    it('should validate month format', () => {
      const invalidMonths = ['9', '00', '13', 'ab'];
      invalidMonths.forEach((month) => {
        const folderName = `2024-${month}-1234567890-telco-test`;
        const result = FolderNamingUtil.validateClaimName(folderName);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Folder name does not follow expected format: year-month-timestamp-category[-claimName]',
        );
      });
    });

    it('should validate timestamp format', () => {
      const invalidTimestamps = ['123456789', '12345678901', 'abcdefghij'];
      invalidTimestamps.forEach((timestamp) => {
        const folderName = `2024-09-${timestamp}-telco-test`;
        const result = FolderNamingUtil.validateClaimName(folderName);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Folder name does not follow expected format: year-month-timestamp-category[-claimName]',
        );
      });
    });

    it('should validate category code', () => {
      const invalidCategories = ['invalid', 'unknown', 'test'];
      invalidCategories.forEach((category) => {
        const folderName = `2024-09-1234567890-${category}-test`;
        const result = FolderNamingUtil.validateClaimName(folderName);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Folder name does not follow expected format: year-month-timestamp-category[-claimName]',
        );
      });
    });

    it('should return valid for correctly formatted folder name', () => {
      const validFolderName = '2024-09-1234567890-telco-test-claim';
      const result = FolderNamingUtil.validateClaimName(validFolderName);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid for folder name without claim name part', () => {
      const validFolderName = '2024-09-1234567890-telco';
      const result = FolderNamingUtil.validateClaimName(validFolderName);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate all valid category codes', () => {
      const validCategories = [
        'telco',
        'fitness',
        'dental',
        'skill-enhancement',
        'company-event',
        'company-lunch',
        'company-dinner',
        'others',
      ];
      validCategories.forEach((category) => {
        const folderName = `2024-09-1234567890-${category}-test`;
        const result = FolderNamingUtil.validateClaimName(folderName);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe('Integration Tests with Real Claim Data', () => {
    const createRealisticClaimData = (
      overrides: Partial<ClaimDataForFolderNaming> = {},
    ): ClaimDataForFolderNaming => ({
      id: 'claim-uuid-12345678-90ab-cdef-1234-567890abcdef',
      claimName: 'Monthly Phone Bill Sep 2024',
      category: 'telco',
      month: 9,
      year: 2024,
      createdAt: new Date('2024-09-15T14:30:45.123Z'),
      totalAmount: 89.95,
      ...overrides,
    });

    it('should generate realistic telco claim folder name', () => {
      const claimData = createRealisticClaimData();
      const result = FolderNamingUtil.generateFolderName(claimData);

      expect(result.isValid).toBe(true);
      expect(result.folderName).toMatch(
        /^2024-09-\d{10}-telco-monthly-phone-bill-sep-2024$/,
      );
    });

    it('should generate realistic fitness claim folder name', () => {
      const claimData = createRealisticClaimData({
        category: 'fitness',
        claimName: 'Gym Membership Q3 2024',
      });
      const result = FolderNamingUtil.generateFolderName(claimData);

      expect(result.isValid).toBe(true);
      expect(result.folderName).toMatch(
        /^2024-09-\d{10}-fitness-gym-membership-q3-2024$/,
      );
    });

    it('should generate realistic company lunch claim folder name', () => {
      const claimData = createRealisticClaimData({
        category: 'company-lunch',
        claimName: 'Team Building Lunch',
      });
      const result = FolderNamingUtil.generateFolderName(claimData);

      expect(result.isValid).toBe(true);
      expect(result.folderName).toMatch(
        /^2024-09-\d{10}-company-lunch-team-building-lunch$/,
      );
    });

    it('should handle others category with custom claim name', () => {
      const claimData = createRealisticClaimData({
        category: 'others',
        claimName: 'Office Supplies and Equipment',
      });
      const result = FolderNamingUtil.generateFolderName(claimData);

      expect(result.isValid).toBe(true);
      expect(result.folderName).toMatch(
        /^2024-09-\d{10}-others-office-supplies-and-equipment$/,
      );
    });

    it('should handle multiple claims created in same minute with different timestamps', () => {
      const baseDate = new Date('2024-09-15T14:30:00.000Z');
      const claimData1 = createRealisticClaimData({
        createdAt: new Date(baseDate.getTime()),
      });
      const claimData2 = createRealisticClaimData({
        createdAt: new Date(baseDate.getTime() + 30000), // 30 seconds later
      });

      const result1 = FolderNamingUtil.generateFolderName(claimData1);
      const result2 = FolderNamingUtil.generateFolderName(claimData2);

      expect(result1.folderName).not.toBe(result2.folderName);
      expect(result1.folderName < result2.folderName).toBe(true);
    });

    it('should handle edge case month values', () => {
      const januaryData = createRealisticClaimData({ month: 1 });
      const decemberData = createRealisticClaimData({ month: 12 });

      const januaryResult = FolderNamingUtil.generateFolderName(januaryData);
      const decemberResult = FolderNamingUtil.generateFolderName(decemberData);

      expect(januaryResult.folderName).toContain('2024-01-');
      expect(decemberResult.folderName).toContain('2024-12-');
    });

    it('should handle real-world claim names with various complexities', () => {
      // Test each case individually to better understand validation behavior
      const testCases = [
        {
          claimName: 'Q3 2024 Mobile Data Plan',
          category: 'telco',
        },
        { claimName: 'Annual Dental Checkup', category: 'fitness' },
        { claimName: 'Team Building Event', category: 'telco' },
        { claimName: 'AWS Certification', category: 'fitness' },
        { claimName: null, category: 'telco' },
        { claimName: '   ', category: 'fitness' },
        {
          claimName: 'Very Long Name That Exceeds Limits',
          category: 'telco',
        },
      ];

      testCases.forEach(({ claimName, category }) => {
        const claimData = createRealisticClaimData({ claimName, category });
        const result = FolderNamingUtil.generateFolderName(claimData);

        // Should always generate a folder name
        expect(result.folderName).toBeDefined();
        expect(result.folderName.length).toBeGreaterThan(0);

        if (claimName && claimName.trim()) {
          expect(result.folderName).toMatch(
            /^2024-09-\d{10}-(telco|fitness)-.+$/,
          );
        } else {
          // For null/empty claim names, expect no suffix
          expect(result.folderName).toMatch(/^2024-09-\d{10}-(telco|fitness)$/);
        }
      });
    });
  });
});
