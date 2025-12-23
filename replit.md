# TrademarkIQ - KI-gestützte Markenrecherche

## Overview
TrademarkIQ by ACCELARI is an AI-powered trademark research tool for the German market. It provides an end-to-end solution for trademark registration and monitoring, featuring a voice assistant (Markenberater), a comprehensive customer dashboard, full backend integration with PostgreSQL, and NextAuth v5 authentication. Key capabilities include AI-powered trademark search, risk analysis, application management, and expert consultation.

## User Preferences
- Language: German UI throughout
- Design: ACCELARI Teal color scheme, clean modern design
- Layout: Full-width sections with contained content
- Accessibility: High contrast, ARIA labels

## System Architecture
The application is built with Next.js 16 (App Router) and TypeScript, utilizing a multi-page structure. Data is managed via PostgreSQL with Drizzle ORM, and authentication is handled by NextAuth v5 with a JWT strategy.

### Design System (ACCELARI)
- **Primary Color**: Teal #0D9488
- **Secondary Color**: Blue #0067b8
- **Font**: Open Sans (Google Fonts)
- **Component Classes**: `s-button`, `s-button-secondary`, `s-badge`, `s-container`

### Key Features
- **Markenberatung (Voice CoPilot)**: AI-powered voice/text assistant with long-term memory, session tracking, and automatic decision persistence. Integrates with Hume AI and Claude for AI-generated summaries and data extraction.
- **Markenprüfung**: A unified page combining AI-powered trademark search with `tmsearch.ai` integration and streaming risk analysis. Includes AI-generated alternative name suggestions (Empfehlungs-Werkbank), international search strategy generation, and a sophisticated conflict detection algorithm.
- **Markenanmeldung**: A 4-step wizard for trademark registration with status tracking.
- **Playbooks**: Step-by-step registration guides for various jurisdictions (DPMA, EUIPO, WIPO) with checklist tracking.
- **Watchlist**: Trademark monitoring with customizable alerts and real-time conflict checking.
- **Team Management**: Functionality for inviting members and managing roles.
- **Experten-Verzeichnis**: A directory for legal expert contact and scheduling.
- **Debug Console (TMview)**: Developer interface for inspecting API flows, AI strategies, and analysis results.
- **Security**: Server-side API keys, bcrypt hashing, JWT sessions, organization-scoped data, and DSGVO compliance.

### Journey System (Case Tracking)
A 4-step system (Beratung → Markenprüfung → Anmeldung → Watchlist) tracks user progress. Cases are automatically created at workflow initiation, with AI extracting key information (trademark name, countries, Nice classes) to prefill forms. Each case has a dedicated detail page (`/dashboard/case/[caseId]`).

### Database Schema
Includes tables for `users`, `organizations`, `searches`, `playbooks`, `watchlistItems`, `alerts`, `experts`, `trademarkApplications`, `consultations`, `trademarkCases`, `caseSteps`, `caseDecisions`, and `caseEvents`, supporting multi-tenancy and comprehensive journey tracking.

## External Dependencies
- **Hume AI**: Empathic Voice Interface and voice assistant.
- **PostgreSQL (Neon)**: Relational database.
- **Drizzle ORM**: Database interactions.
- **NextAuth v5**: Authentication system.
- **Resend**: Email service.
- **tmsearch.ai**: External API for trademark search.
- **Claude Opus 4.1 (via Replit AI Integrations)**: AI model for analysis, strategy generation, and risk assessment.
- **Tailwind CSS**: Utility-first styling.
- **Lucide React**: Icon library.
- **Google Fonts (Open Sans)**: Typography.