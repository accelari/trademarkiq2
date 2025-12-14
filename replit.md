# TrademarkIQ - KI-gestützte Markenrecherche

## Overview
TrademarkIQ is an AI-powered trademark research tool for the German market by ACCELARI. It features a voice assistant (Markenberater) using Hume AI, integrated into a multi-page website with a comprehensive customer dashboard. The application provides full backend integration with PostgreSQL, NextAuth v5 authentication, and real API endpoints, offering capabilities from trademark search and risk analysis to application management and expert consultation. The project aims to provide an end-to-end solution for trademark registration and monitoring in Germany.

## User Preferences
- Language: German UI throughout
- Design: ACCELARI Teal color scheme, clean modern design
- Layout: Full-width sections with contained content
- Accessibility: High contrast, ARIA labels

## System Architecture
The application is built with Next.js 16 (App Router) and TypeScript, utilizing a multi-page structure with distinct routes for public access, authentication, and the protected dashboard. Data is managed via PostgreSQL with Drizzle ORM and fetched using SWR hooks. Authentication is handled by NextAuth v5 with a JWT strategy and email verification.

### Design System (ACCELARI)
- **Primary Color**: Teal #0D9488
- **Secondary Color**: Blue #0067b8
- **Font**: Open Sans (Google Fonts)
- **Component Classes**: s-button, s-button-secondary, s-badge, s-container

### Key Features
- **Markenberatung (Voice CoPilot)**: AI-powered voice/text assistant (Hume AI + Claude). Always-on session tracking with timer. "Meine Markenfälle" popup accessible from multiple pages to view/manage all trademark cases. AI-generated summaries with Markdown formatting. One-click save functionality.
  - **Conversation Continuity**: When resuming an incomplete consultation, the assistant receives full context from prior sessions (summary, extracted data, missing fields)
  - **Automatic Decision Persistence**: Extracted trademark data (name, countries, Nice classes) is automatically saved to caseDecisions when consultations are saved. Follow-up consultations update existing decisions (upsert), and the case's updatedAt timestamp is refreshed to show when data was last modified.
  - **Research Prefill**: When navigating to Recherche, forms are automatically prefilled with consultation data; missing fields are highlighted with a link back to continue the consultation
- **Markenrecherche**: AI-powered trademark search with `tmsearch.ai` integration, including accuracy scores, office badges, and detailed modals. Features include:
  - World-class international search strategy generation using Claude Opus 4.1
  - Multilingual phonetic analysis (EN, DE, FR, ES, ZH, JP, KR, AR)
  - Famous marks detection with dilution protection warnings
  - Jurisdiction-specific risk assessment (USPTO DuPont factors, EUIPO case law, CNIPA first-to-file)
  - Goods/services similarity analysis beyond Nice classes
  - Traffic light risk system (🔴 ≥80%, 🟡 60-79%, 🟢 <60%)
  - Enhanced WIPO coverage: Country searches also include WIPO marks designating that country
  - Custom similarity algorithm: Levenshtein + phonetic + visual analysis (replaces unreliable API scores)
  - Multi-word trademark handling: Best pairwise word matching for accurate conflict detection
  - False positive filtering: Drops high-API-score results with low actual similarity
  - Customer-friendly progress UI: OpenAI-style animation synced with real API progress, elapsed time counter with remaining estimate, cancel button with proper abort handling, success banner with auto-scroll to results
  - Live feedback system: Granular SSE progress events for each search term, heartbeat pings every 8s during long operations, real-time stats (Suchen X/Y, Treffer), search progress bar, idle watchdog after 12s shows "Warten auf tmsearch.ai-Antwort..."
  - Hybrid search strategy: Deterministic base variants (German/English phonetic rules, visual similarity, common misspellings, root extraction) with LRU caching for reproducible results, plus optional "Tiefere Recherche mit KI" button for Claude-enhanced creative variants
  - Used search terms display: Tag cloud showing all search variants used in the analysis
- **Markenanmeldung**: Dedicated menu item in navigation for trademark registration wizard.
  - 4-step wizard (Mark info → Office selection → Nice classes → Summary) with expert assignment
  - Status tracking (draft, pending, submitted, expert_review, approved, rejected)
- **Playbooks**: Step-by-step registration guides for DPMA, EUIPO, WIPO jurisdictions.
  - Active trademark applications overview with status badges
  - Statistics cards showing active/completed playbooks and running applications
  - Quick-start button linking to new application wizard
  - Checklist tracking with automatic progress saving
- **Watchlist**: Trademark monitoring with customizable alerts and notifications.
  - Real-time conflict checking via tmsearch.ai API integration
  - "Check all trademarks" batch processing for all watchlist items
  - Color-coded risk levels (red >=90%, orange 80-89%, yellow 70-79%)
  - Activity history timeline showing chronological alerts and status changes
  - Accordion-style expandable history with type-specific icons
- **Risiko-Analyse**: Comprehensive multi-dimensional risk assessment dashboard featuring:
  - Circular risk score visualization (0-100%)
  - 4-dimensional analysis: Phonetic, Visual, Conceptual, Industry-specific
  - Interactive conflict map per trademark office (DPMA, EUIPO, WIPO, etc.)
  - AI-generated alternative name suggestions with lower risk scores
  - Voice explanation feature using Hume AI for empathetic risk communication
  - PDF report generation with email delivery via Resend
  - Traffic light system (🔴 High ≥80%, 🟡 Medium 60-79%, 🟢 Low <60%)
- **Team Management**: Features for inviting members and managing roles within an organization.
- **Experten-Verzeichnis**: A directory of legal experts with contact and appointment scheduling features.
- **Debug Console (TMview)**: Developer interface showing complete API flow with step-by-step debugging:
  - AI search strategy generation with all variants
  - Raw tmsearch.ai API responses
  - Similarity calculation details (phonetic/visual/combined scores)
  - Filter decisions with inclusion/exclusion reasons
  - Claude prompt and response inspection
  - Final conflict analysis results
- **Security**: API keys stored server-side, bcrypt for password hashing, JWT for sessions, organization-scoped data, and DSGVO compliance.

### Journey System (Case Tracking)
A comprehensive 5-step journey system tracks user progress through the trademark registration process:
- **Steps**: Beratung → Recherche → Risikoanalyse → Anmeldung → Watchlist
- **Case Numbers**: Format TM-YYYY-XXXXXX (e.g., TM-2025-000001)
- **Decision Extraction**: AI (Claude) extracts trademark names, countries, and Nice classes from consultation summaries
- **Prefill Feature**: Extracted decisions automatically prefill the Recherche form
- **Skip Tracking**: Users can skip steps with documented reasons
- **Timeline UI**: Horizontal progress indicator shown across journey pages

### Database Schema
The database schema includes tables for `users`, `organizations`, `memberships`, `invitations`, `searches`, `playbooks`, `watchlistItems`, `alerts`, `experts`, `expertContacts`, `trademarkApplications`, `consultations`, `trademarkCases`, `caseSteps`, `caseDecisions`, and `caseEvents`, supporting multi-tenancy and comprehensive journey tracking.

## External Dependencies
- **Hume AI**: For the Empathic Voice Interface and voice assistant functionalities.
- **PostgreSQL (Neon)**: Relational database for all application data.
- **Drizzle ORM**: Object-Relational Mapper for database interactions.
- **NextAuth v5**: Authentication system for user management and session handling.
- **Resend**: Email service for verification emails, consultation summaries, and notifications.
- **tmsearch.ai**: External API for trademark search and information.
- **Claude Opus 4.1 (via Replit AI Integrations)**: AI model used for trademark analysis, search strategy generation, and risk assessment.
- **Tailwind CSS**: For utility-first styling.
- **Lucide React**: Icon library.
- **Google Fonts (Open Sans)**: Typography.