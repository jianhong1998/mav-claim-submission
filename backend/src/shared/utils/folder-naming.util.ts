export interface ClaimDataForFolderNaming {
  id: string;
  claimName: string | null;
  category: string;
  month: number;
  year: number;
  createdAt: Date;
  totalAmount: number;
}

export interface FolderNameGenerationResult {
  folderName: string;
  isValid: boolean;
  errors: string[];
}

const CLAIM_NAME_MAX_LENGTH = 30;
const TOTAL_PATH_MAX_LENGTH = 200;
const SANITIZATION_PATTERN = /[!@#$%^&*()+=[\]{}|;':",./<>?\\]/g;
const MULTIPLE_HYPHENS_PATTERN = /[-\s]+/g;

// Pre-computed regex for folder name validation - eliminates O(n) find operations
const FOLDER_NAME_PATTERN =
  /^(\d{4})-(0[1-9]|1[0-2])-(\d{10})-(telco|fitness|dental|skill-enhancement|company-event|company-lunch|company-dinner|others)(?:-(.+))?$/;

export class FolderNamingUtil {
  public static generateFolderName(
    claimData: ClaimDataForFolderNaming,
  ): FolderNameGenerationResult {
    const errors: string[] = [];

    try {
      const { year, month, category, claimName, createdAt } = claimData;

      const formattedMonth = month.toString().padStart(2, '0');
      const timestamp = Math.floor(createdAt.getTime() / 1000);
      const categoryCode = category; // Category is already a code string

      const processedClaimName = this.sanitizeClaimName(claimName);

      const baseFolder = `${year}-${formattedMonth}-${timestamp}-${categoryCode}`;
      let folderName = processedClaimName
        ? `${baseFolder}-${processedClaimName}`
        : baseFolder;

      if (folderName.length > TOTAL_PATH_MAX_LENGTH) {
        const availableSpace = TOTAL_PATH_MAX_LENGTH - baseFolder.length - 1;
        const truncatedClaimName = this.truncateClaimName(
          processedClaimName,
          availableSpace,
        );
        folderName = truncatedClaimName
          ? `${baseFolder}-${truncatedClaimName}`
          : baseFolder;
        errors.push('Folder name truncated due to length constraints');
      }

      const validationResult = this.validateClaimName(folderName);

      return {
        folderName,
        isValid: validationResult.isValid && errors.length === 0,
        errors: [...errors, ...validationResult.errors],
      };
    } catch (error) {
      return {
        folderName: `${claimData.year}-${claimData.month.toString().padStart(2, '0')}-${claimData.id}`,
        isValid: false,
        errors: [
          `Folder name generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
      };
    }
  }

  public static sanitizeClaimName(claimName: string | null): string {
    if (!claimName || typeof claimName !== 'string') {
      return '';
    }

    const sanitized = claimName
      .trim()
      .toLowerCase()
      .replace(SANITIZATION_PATTERN, '')
      .replace(MULTIPLE_HYPHENS_PATTERN, '-')
      .replace(/^-+|-+$/g, '');

    return this.truncateClaimName(sanitized, CLAIM_NAME_MAX_LENGTH);
  }

  public static validateClaimName(folderName: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!folderName || typeof folderName !== 'string') {
      return { isValid: false, errors: ['Folder name cannot be empty'] };
    }

    if (folderName.length > TOTAL_PATH_MAX_LENGTH) {
      errors.push(
        `Folder name exceeds maximum length of ${TOTAL_PATH_MAX_LENGTH} characters`,
      );
    }

    if (folderName.includes('..')) {
      errors.push('Folder name cannot contain path traversal sequences');
    }

    if (/[<>:"|?*\\/]/.test(folderName)) {
      errors.push('Folder name contains invalid characters for file systems');
    }

    // Single regex validates entire format: year, month, timestamp, category, optional claim name
    const match = FOLDER_NAME_PATTERN.exec(folderName);
    if (!match) {
      errors.push(
        'Folder name does not follow expected format: year-month-timestamp-category[-claimName]',
      );
    } else {
      const year = parseInt(match[1]);
      if (year < 2020 || year > 2100) {
        errors.push('Invalid year format or range');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  private static truncateClaimName(
    claimName: string,
    maxLength: number,
  ): string {
    if (!claimName || claimName.length <= maxLength) {
      return claimName;
    }

    if (maxLength <= 3) {
      return claimName.substring(0, maxLength);
    }

    return claimName.substring(0, maxLength - 3) + '...';
  }
}
