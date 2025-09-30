# Requirements Document

## Introduction

The "View Claims" feature provides employees with a simple way to see all their expense claims in one place. This is a fundamental read operation that allows users to track their submission history, status, and amounts.

## Alignment with Product Vision

This feature directly supports the **Primary User Goal** from product.md: employees need "simple, mobile-friendly claim submission" workflows. Viewing existing claims is essential for:
- Tracking claim status (draft → sent → paid)
- Avoiding duplicate submissions
- Understanding reimbursement timeline
- Mobile-responsive dark mode UI exclusively

This feature eliminates the need for employees to search through emails or contact admin staff to check claim status.

## Requirements

### Requirement 1

**User Story:** As an authenticated employee, I want to view all my expense claims at `/claims`, so that I can track my submission history and status.

#### Acceptance Criteria

1. WHEN I navigate to `/claims` AND I am authenticated THEN the system SHALL display all my expense claims in a list
2. WHEN I am not authenticated AND I access `/claims` THEN the system SHALL redirect me to the login page
3. WHEN the claims list loads THEN the system SHALL show claim ID, category, amount, created date, and status for each claim
4. WHEN I have no claims THEN the system SHALL display "No claims found" message
5. WHEN the page loads on mobile THEN the system SHALL display claims in mobile-responsive format

### Requirement 2

**User Story:** As an employee, I want to see the most recent claims first, so that I can quickly find my latest submissions.

#### Acceptance Criteria

1. WHEN the claims list displays THEN the system SHALL order claims by creation date (newest first)
2. WHEN claims have the same creation date THEN the system SHALL order by claim ID descending

### Requirement 3

**User Story:** As an employee, I want to see claim status clearly, so that I can understand where each claim is in the process.

#### Acceptance Criteria

1. WHEN a claim has 'draft' status THEN the system SHALL display it with clear visual indication
2. WHEN a claim has 'sent' status THEN the system SHALL display it with appropriate styling
3. WHEN a claim has 'paid' status THEN the system SHALL display it with success styling

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: Claims listing component focuses only on display logic
- **Modular Design**: Reuse existing authentication, API client, and UI components
- **Dependency Management**: Use existing @project/types for consistent type definitions
- **Clear Interfaces**: Clean separation between API client and UI presentation

### Performance
- Page must load within 2 seconds as per technical steering requirements
- Claims list should handle up to 100 claims without pagination initially
- Mobile-first responsive design for >70% expected mobile usage

### Security
- Only authenticated users can access their own claims (enforced at API level)
- Use existing Google OAuth authentication flow
- Claims filtered by user_id server-side (never client-side filtering)

### Reliability
- Graceful error handling for API failures
- Loading states during data fetch
- Empty state handling when no claims exist

### Usability
- Dark mode UI exclusively as per product requirements
- Mobile-responsive design with touch-friendly interfaces
- Clear visual hierarchy for claim information
- Consistent with existing application UI patterns