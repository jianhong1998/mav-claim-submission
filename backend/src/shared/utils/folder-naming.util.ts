import { ClaimCategory } from '../../modules/claims/enums/claim-category.enum';

export interface ClaimDataForFolderNaming {
  id: string;
  claimName: string | null;
  category: ClaimCategory;
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

const CategoryCodeMapping = Object.freeze({
  [ClaimCategory.TELCO]: 'telco',
  [ClaimCategory.FITNESS]: 'fitness',
  [ClaimCategory.DENTAL]: 'dental',
  [ClaimCategory.SKILL_ENHANCEMENT]: 'skill',
  [ClaimCategory.COMPANY_EVENT]: 'event',
  [ClaimCategory.COMPANY_LUNCH]: 'lunch',
  [ClaimCategory.COMPANY_DINNER]: 'dinner',
  [ClaimCategory.OTHERS]: 'others',
} as const);

const CLAIM_NAME_MAX_LENGTH = 30;
const TOTAL_PATH_MAX_LENGTH = 200;
const SANITIZATION_PATTERN = /[!@#$%^&*()+=[\]{}|;':",./<>?\\]/g;
const MULTIPLE_HYPHENS_PATTERN = /[-\s]+/g;

export class FolderNamingUtil {
  public static generateFolderName(
    claimData: ClaimDataForFolderNaming,
  ): FolderNameGenerationResult {
    const errors: string[] = [];

    try {
      const { year, month, category, claimName, createdAt } = claimData;

      const formattedMonth = month.toString().padStart(2, '0');
      const timestamp = Math.floor(createdAt.getTime() / 1000);
      const categoryCode = CategoryCodeMapping[category];

      let processedClaimName = this.sanitizeClaimName(claimName);
      if (!processedClaimName && category !== ClaimCategory.OTHERS) {
        processedClaimName = 'default';
      }

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
      errors.push('Folder name cannot be empty');
      return { isValid: false, errors };
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

    const parts = folderName.split('-');
    if (parts.length < 4) {
      errors.push(
        'Folder name does not follow expected format: year-month-timestamp-category[-claimName]',
      );
    } else {
      const [year, month, timestamp, category] = parts;

      if (
        !/^\d{4}$/.test(year) ||
        parseInt(year) < 2020 ||
        parseInt(year) > 2100
      ) {
        errors.push('Invalid year format or range');
      }

      if (!/^(0[1-9]|1[0-2])$/.test(month)) {
        errors.push('Invalid month format');
      }

      if (!/^\d{10}$/.test(timestamp)) {
        errors.push('Invalid timestamp format');
      }

      const validCategoryCodes = Object.values(
        CategoryCodeMapping,
      ) as readonly string[];
      if (!validCategoryCodes.includes(category)) {
        errors.push('Invalid category code');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
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
