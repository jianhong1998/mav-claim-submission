import { Injectable } from '@nestjs/common';

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ParsedRecipients {
  validEmails: string[];
  invalidEmails: string[];
  errors: string[];
}

@Injectable()
export class EmailValidationUtil {
  private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /**
   * Validates a single email address format
   * @param email The email address to validate
   * @returns EmailValidationResult with validation status and error message
   */
  public validateEmail(email: string): EmailValidationResult {
    if (!email) {
      return {
        isValid: false,
        error: 'Email address cannot be empty',
      };
    }

    const trimmedEmail = email.trim();

    if (trimmedEmail.length === 0) {
      return {
        isValid: false,
        error: 'Email address cannot be empty or whitespace only',
      };
    }

    if (trimmedEmail !== email) {
      return {
        isValid: false,
        error: 'Email address cannot have leading or trailing whitespace',
      };
    }

    if (!this.emailRegex.test(trimmedEmail)) {
      return {
        isValid: false,
        error: `Invalid email format: ${trimmedEmail}`,
      };
    }

    // Additional validation rules
    if (trimmedEmail.length > 254) {
      return {
        isValid: false,
        error: 'Email address exceeds maximum length of 254 characters',
      };
    }

    const [localPart, domainPart] = trimmedEmail.split('@');

    if (localPart.length > 64) {
      return {
        isValid: false,
        error: 'Email local part exceeds maximum length of 64 characters',
      };
    }

    if (domainPart.includes('..') || localPart.includes('..')) {
      return {
        isValid: false,
        error: 'Email address cannot contain consecutive dots',
      };
    }

    return {
      isValid: true,
    };
  }

  /**
   * Parses comma-separated email addresses and returns valid/invalid lists
   * @param emailsString Comma-separated email addresses
   * @returns ParsedRecipients with separated valid/invalid emails and errors
   */
  public parseRecipients(emailsString: string): ParsedRecipients {
    const result: ParsedRecipients = {
      validEmails: [],
      invalidEmails: [],
      errors: [],
    };

    if (!emailsString) {
      result.errors.push('Email recipients string cannot be empty');
      return result;
    }

    if (typeof emailsString !== 'string') {
      result.errors.push('Email recipients must be a string');
      return result;
    }

    const trimmedString = emailsString.trim();
    if (trimmedString.length === 0) {
      result.errors.push(
        'Email recipients string cannot be empty or whitespace only',
      );
      return result;
    }

    // Split by comma and filter out empty strings
    const emailCandidates = trimmedString
      .split(',')
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    if (emailCandidates.length === 0) {
      result.errors.push('No valid email addresses found after parsing');
      return result;
    }

    for (const email of emailCandidates) {
      const validation = this.validateEmail(email);

      if (validation.isValid) {
        result.validEmails.push(email);
      } else {
        result.invalidEmails.push(email);
        result.errors.push(validation.error || `Invalid email: ${email}`);
      }
    }

    return result;
  }

  /**
   * Validates comma-separated email addresses and throws if any are invalid
   * @param emailsString Comma-separated email addresses
   * @returns Array of validated email addresses
   * @throws Error if any email addresses are invalid
   */
  public validateRecipients(emailsString: string): string[] {
    const parsed = this.parseRecipients(emailsString);

    if (parsed.errors.length > 0) {
      throw new Error(`Email validation failed: ${parsed.errors.join('; ')}`);
    }

    if (parsed.validEmails.length === 0) {
      throw new Error('No valid email addresses found');
    }

    if (parsed.invalidEmails.length > 0) {
      throw new Error(
        `Invalid email addresses found: ${parsed.invalidEmails.join(', ')}`,
      );
    }

    return parsed.validEmails;
  }
}
