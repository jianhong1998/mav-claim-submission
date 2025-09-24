# Requirements Document

## Introduction

This specification outlines requirements for changing the Google Drive folder naming structure from UUID-based to a more descriptive format that includes year, month, timestamp, category code, and claim name. The new format ensures chronological sorting while providing meaningful context for payroll team when accessing claim documents.

## Alignment with Product Vision

This change supports the product vision of streamlining expense claim processing by:
- Improving document organization for both employees and payroll team
- Making folders instantly identifiable without cross-referencing claim IDs
- Enhancing searchability in Google Drive with human-readable folder names
- Reducing cognitive load when managing multiple claim submissions
- Maintaining chronological sorting for easy navigation

## Requirements

### Requirement 1: Descriptive Folder Naming with Chronological Sorting

**User Story:** As a payroll team member, I want claim folders to have descriptive names sorted chronologically, so that I can quickly identify and access specific claims in order.

#### Acceptance Criteria

1. WHEN a new claim is created THEN the system SHALL generate a folder name in format: `{year}-{month}-{timestamp}-{categoryCode}-{claimName}`
2. IF month value is single digit THEN the system SHALL pad it with zero (e.g., 09 for September)
3. WHEN generating the folder name THEN the system SHALL use the category code mapping (e.g., 'company-lunch' for Company Lunch category)
4. WHEN including the claim name field THEN the system SHALL normalize it to lowercase and replace spaces with hyphens
5. WHEN generating timestamp THEN the system SHALL use Unix timestamp in seconds (not milliseconds) for readability
6. IF claim name is not provided for non-'others' categories THEN the system SHALL use 'default' as the claim name
7. WHEN folders are listed in Google Drive THEN they SHALL appear in chronological order due to the timestamp placement

### Requirement 2: Character Limits and Sanitization

**User Story:** As a system administrator, I want folder names to respect Google Drive limits and be safe from injection attacks, so that the system remains stable and secure.

#### Acceptance Criteria

1. WHEN user inputs a claim name THEN the system SHALL limit it to maximum 30 characters
2. IF claim name exceeds 30 characters THEN the system SHALL truncate and append "..." (e.g., "very-long-claim-name-examp...")
3. WHEN sanitizing claim names THEN the system SHALL:
   - Remove special characters: `!@#$%^&*()+=[]{}|;':",./<>?`
   - Keep only alphanumeric characters, spaces, and hyphens
   - Replace multiple consecutive spaces/hyphens with single hyphen
   - Remove leading/trailing hyphens
4. WHEN generating complete folder name THEN the system SHALL ensure total path length stays under 200 characters
5. IF complete folder name would exceed limits THEN the system SHALL further truncate claim name portion

### Requirement 3: Category Code Mapping with Claim Name

**User Story:** As a developer, I want consistent category code mapping with proper claim name handling, so that folder names remain uniform across the system.

#### Acceptance Criteria

1. WHEN mapping categories THEN the system SHALL use these codes:
   - telco → telco
   - fitness → fitness
   - dental → dental
   - skill-enhancement → skill-enhancement
   - company-event → company-event
   - company-lunch → company-lunch
   - company-dinner → company-dinner
   - others → others
2. WHEN category is 'others' THEN the system SHALL require a claim_name field from the user
3. WHEN category is 'others' AND claim_name is provided THEN the system SHALL include both 'others' as the category code AND the claim_name in the folder name format
4. WHEN category is NOT 'others' AND user provides a claim_name THEN the system SHALL use the provided claim_name in the folder name
5. WHEN normalizing claim names THEN the system SHALL convert to lowercase and replace spaces with hyphens

### Requirement 4: Data Flow and Integration Points

**User Story:** As a developer, I want clear integration points for the folder naming change, so that I can implement it correctly across all components.

#### Acceptance Criteria

1. WHEN user submits claim form THEN the system SHALL store claim_name in the claims table before file upload
2. WHEN backend creates claim record THEN the system SHALL generate and store folder_name in claims table
3. WHEN frontend uploads files THEN the system SHALL use the pre-generated folder_name from backend
4. WHEN GoogleDriveClient.createClaimFolder() is called THEN it SHALL accept folder_name parameter instead of generating UUID
5. WHEN backend stores attachment metadata THEN it SHALL reference the descriptive folder_name
6. WHEN retrieving existing claims THEN the system SHALL use stored folder_name for file operations

### Requirement 5: Database Schema Updates

**User Story:** As a developer, I want proper database schema to support the new folder naming, so that folder names are persisted and retrievable.

#### Acceptance Criteria

1. WHEN claims table is updated THEN it SHALL include new column: `folder_name VARCHAR(255) NULL`
2. WHEN migrating existing claims THEN the system SHALL populate folder_name with existing UUID for backward compatibility
3. WHEN creating new claims THEN the system SHALL populate folder_name with descriptive format
4. WHEN querying claims THEN the system SHALL use folder_name for Google Drive operations
5. WHEN folder_name is NULL THEN the system SHALL fall back to using claim ID (UUID) for compatibility

### Requirement 6: Frontend Form Integration

**User Story:** As an employee submitting a claim, I want an intuitive form to input claim names with validation and preview, so that I understand how my folder will be named.

#### Acceptance Criteria

1. WHEN displaying claim form THEN the system SHALL show claim_name input field
2. WHEN category is 'others' THEN the system SHALL mark claim_name as required with red asterisk
3. WHEN category is NOT 'others' THEN the system SHALL mark claim_name as optional
4. WHEN user types in claim_name THEN the system SHALL show real-time character count (30 max)
5. WHEN user inputs claim_name THEN the system SHALL display preview: "Folder will be named: 2025-09-1234567890-telco-my-phone-bill"
6. WHEN claim_name contains invalid characters THEN the system SHALL show inline validation error
7. WHEN form is submitted THEN the system SHALL validate claim_name on both frontend and backend

### Requirement 7: Backward Compatibility and Migration

**User Story:** As an employee with existing claims, I want my previous claim folders to remain accessible, so that historical data is preserved.

#### Acceptance Criteria

1. WHEN accessing existing claims THEN the system SHALL continue to support UUID-based folder paths
2. IF a claim was created before the change THEN the system SHALL NOT rename existing folders
3. WHEN retrieving file URLs THEN the system SHALL handle both folder naming conventions
4. WHEN GoogleDriveClient operates THEN it SHALL detect folder naming type from folder_name field format
5. WHEN folder_name starts with UUID pattern THEN use legacy UUID logic
6. WHEN folder_name starts with year pattern THEN use new descriptive logic

### Requirement 8: Error Handling and Fallback Strategy

**User Story:** As a system administrator, I want robust error handling for folder creation, so that claims never fail due to folder naming issues.

#### Acceptance Criteria

1. IF descriptive folder creation fails THEN the system SHALL fall back to UUID-based naming
2. WHEN fallback occurs THEN the system SHALL log warning and continue with UUID
3. WHEN Google Drive API returns folder name error THEN the system SHALL retry with sanitized name
4. IF both descriptive and UUID naming fail THEN the system SHALL return clear error message
5. WHEN folder uniqueness check fails THEN the system SHALL append random suffix and retry
6. WHEN folder_name generation fails THEN the system SHALL store NULL and use UUID for compatibility

### Requirement 9: Folder Uniqueness with Collision Handling

**User Story:** As a system administrator, I want guaranteed unique folder names with collision resolution, so that there are no conflicts or overwrites.

#### Acceptance Criteria

1. WHEN creating a folder THEN the system SHALL include timestamp to ensure uniqueness
2. IF folder already exists with same name THEN the system SHALL append random 4-digit suffix
3. WHEN checking for existing folders THEN the system SHALL verify uniqueness before creation
4. WHEN collision occurs THEN the system SHALL retry up to 3 times with different suffixes
5. IF all retry attempts fail THEN the system SHALL fall back to UUID naming
6. WHEN generating suffix THEN the system SHALL use format: `-1234` (hyphen + 4 digits)

### Requirement 10: User Input Validation and UX

**User Story:** As an employee submitting a claim, I want clear guidance and validation for claim names, so that I can create meaningful folder names without errors.

#### Acceptance Criteria

1. WHEN displaying claim_name field THEN the system SHALL show placeholder: "Brief description (e.g., 'Phone Bill Q3')"
2. WHEN user focuses on field THEN the system SHALL show tooltip: "Used for folder naming. Max 30 chars, letters/numbers/spaces only"
3. IF user enters invalid characters THEN the system SHALL show error: "Only letters, numbers, spaces, and hyphens allowed"
4. WHEN user exceeds character limit THEN the system SHALL show warning: "Claim name too long (30 max). Will be truncated."
5. WHEN user submits form THEN the system SHALL validate claim_name matches regex: `^[a-zA-Z0-9\s\-]{1,30}$`
6. WHEN validation fails THEN the system SHALL prevent form submission and highlight errors

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: Folder name generation should be isolated in a utility function
- **Modular Design**: Folder naming logic should be reusable across backend and frontend
- **Dependency Management**: Minimize dependencies on external libraries for name generation
- **Clear Interfaces**: Define clear contracts for folder name generation parameters
- **Database Abstraction**: Folder naming should work through repository pattern

### Performance
- Folder name generation must complete in under 10ms
- No additional API calls should be required for name generation
- Caching of category mappings to avoid repeated lookups
- Frontend validation should be debounced to avoid excessive processing
- Database queries should use indexed columns for folder_name lookups

### Security
- Claim names in folders must not expose sensitive information
- Folder names must be sanitized to prevent path traversal attacks
- Special characters must be properly escaped or removed
- Input validation must occur on both frontend and backend
- SQL injection protection through parameterized queries

### Reliability
- Folder creation must handle network failures with retry logic
- System must gracefully handle Google Drive API quota limits
- Folder name generation must never fail due to missing optional fields
- Fallback to UUID must be seamless and transparent
- Error states must be logged for debugging and monitoring

### Usability
- Folder names must be human-readable and self-explanatory
- Names must be searchable in Google Drive interface
- Format must be consistent across all new claims
- Example folder names should be displayed to users before submission
- Real-time validation feedback should guide user input
- Chronological sorting should be intuitive for payroll team navigation