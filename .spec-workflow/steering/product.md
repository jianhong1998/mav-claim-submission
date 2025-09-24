# Product Steering Guide

## Mission Statement

**Mavericks Claim Submission System** transforms manual expense claim workflows from email-based processes to a digital platform that integrates seamlessly with Google Workspace. The system prioritizes employee autonomy, administrative efficiency, and compliance tracking.

## Core Product Vision

### Problem Statement
- **Current Pain**: Manual email workflows for expense claims create administrative overhead, poor tracking, and compliance issues
- **Solution**: Digital platform that leverages existing Google Workspace infrastructure (Gmail + Google Drive)
- **Key Principle**: Maintain employee ownership of their files while enabling seamless administrative processing

### Target Users

**Primary**: Mavericks Consulting employees submitting expense claims
- Need: Simple, mobile-friendly claim submission
- Goal: Quick reimbursement with minimal friction
- Constraint: Must use company Google Workspace (@mavericks-consulting.com)

**Secondary**: Administrative staff processing claims
- Need: Efficient review and payment tracking
- Goal: Streamlined approval workflows
- Constraint: Must maintain audit trails and compliance

## Product Requirements

### Core Features

**1. Digital Claim Submission**
- Replace email attachments with Google Drive integration
- Support all claim categories: telco, fitness, dental, company events, lunches, dinners, others
- Mobile-responsive dark mode UI exclusively
- **Critical Workflow**: Claims created FIRST (draft state) → Files uploaded to claim-specific folders → Email sent and status updated to 'sent'
- Status tracking: draft → sent ↔ paid → failed (with resend capability)

**2. Google Workspace Integration**
- **Authentication**: Google OAuth with @mavericks-consulting.com domain restriction
- **File Storage**: Client-side uploads to employee's personal Google Drive (no S3)
- **Drive Folder Structure**: `Mavericks Claims/{claimUuid}/` for organized file management
- **Email Processing**: Synchronous Gmail API with shareable Drive URLs (no attachments)
- **Required Scopes**: Gmail send + Google Drive file access

**3. Compliance & Audit Trail**
- Immutable claim records with timestamps
- File metadata tracking via Google Drive APIs
- Email notification logs via Gmail API
- Status change auditing

### Critical Business Rules

**File Ownership**: Employees retain ownership of their files in personal Google Drive
- Benefit: No data migration concerns
- Constraint: Backend only handles metadata, never file content

**Sequential Workflow**: Claims must be created before file uploads to establish folder structure
- Benefit: Organized file management with claim-specific folders
- Constraint: Cannot upload files without valid claim UUID

**Synchronous Processing**: Real-time email sending via Gmail API
- Benefit: Immediate confirmation to users
- Constraint: No queuing or background processing

**Domain Restriction**: Only @mavericks-consulting.com Google accounts
- Benefit: Security and compliance
- Constraint: External contractors need alternative solution

## Success Metrics

### Primary KPIs
- **Efficiency**: Claim processing time reduction (target: 50% faster than email)
- **Adoption**: Employee usage rate (target: 100% within 3 months)
- **Compliance**: Audit trail completeness (target: 100% traceable)

### Secondary Metrics
- Mobile usage percentage (expect >70% given employee workflows)
- Google Drive API error rates (<1%)
- Email delivery success rate (>99%)

## Technical Constraints

### Must Haves
- **Security**: Google OAuth 2.0 with proper scope limitations
- **Performance**: Sub-2-second response times for claim submissions
- **Reliability**: 99.9% uptime during business hours
- **Mobile**: Touch-optimized interface for mobile claim submission

### Nice to Haves
- Offline claim drafting with sync
- Bulk claim processing for administrators
- Integration with accounting systems

## Competitive Positioning

**Advantage**: Seamless Google Workspace integration without data migration
**Differentiation**: Employee file ownership model vs. traditional expense platforms
**Market Fit**: Perfect for Google Workspace organizations wanting minimal workflow disruption

## Risk Mitigation

**Google API Dependencies**: 
- Risk: API changes or rate limiting
- Mitigation: Proper error handling and fallback mechanisms

**File Access Permissions**:
- Risk: Employees may revoke Drive access
- Mitigation: Clear communication about file sharing requirements

**Domain Restrictions**:
- Risk: Limits future expansion
- Mitigation: Designed as pilot for consulting firm model validation