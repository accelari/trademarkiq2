# TrademarkIQ - Minimal Template

## Overview
This is a minimal template version of TrademarkIQ, containing only core authentication and trademark case management functionality. It serves as a foundation for building out additional features.

## User Preferences
- Language: German UI throughout
- Design: ACCELARI Teal color scheme, clean modern design
- Layout: Full-width sections with contained content
- Accessibility: High contrast, ARIA labels

## System Architecture
The application is built with Next.js 16 (App Router) and TypeScript. Data is managed via PostgreSQL with Drizzle ORM, and authentication is handled by NextAuth v5 with a JWT strategy.

### Design System (ACCELARI)
- **Primary Color**: Teal #0D9488
- **Secondary Color**: Blue #0067b8
- **Font**: Open Sans (Google Fonts)
- **Component Classes**: `s-button`, `s-button-secondary`, `s-badge`, `s-container`

### Core Features
- **Authentication**: Complete user registration, login, password reset, and email verification via NextAuth v5
- **Case Management**: CRUD operations for trademark cases with step tracking and status management
- **Dashboard**: Simple case listing and detail views

### Database Schema (Minimal)
Essential tables only:
- `users` - User accounts
- `accounts` - OAuth provider accounts
- `sessions` - User sessions
- `verification_tokens` - Email verification tokens
- `trademark_cases` - Core case data
- `case_steps` - Case progress tracking
- `case_decisions` - Case-related decisions
- `case_events` - Case activity log
- `case_analyses` - Analysis results storage
- `consultations` - Consultation records

### Project Structure
```
app/
├── (auth)/          # Auth pages (login, register, etc.)
├── api/
│   ├── auth/        # NextAuth API routes
│   ├── cases/       # Case CRUD API
│   └── user/        # User profile API
├── components/      # Shared UI components
├── contexts/        # React contexts
├── dashboard/
│   ├── cases/       # Case list page
│   └── case/[caseId]/ # Case detail page
├── hooks/           # Custom React hooks
├── stores/          # Zustand stores
├── layout.tsx       # Root layout
├── page.tsx         # Home redirect page
└── providers.tsx    # App providers
```

## External Dependencies
- **PostgreSQL (Neon)**: Relational database
- **Drizzle ORM**: Database interactions
- **NextAuth v5**: Authentication system
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Icon library
- **Resend**: Email service (for verification emails)

## Development Notes
- Branch: develop251223falltemlate
- This is a stripped-down version for building new features on top of
- All unused features (voice assistant, playbooks, watchlist, team, experts) have been removed
