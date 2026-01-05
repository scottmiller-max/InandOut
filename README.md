# IN&OUT Moving App

A comprehensive, production-ready mobile and web application for managing residential and commercial moving services. Built with Expo, React Native, and Supabase, this application provides a full-featured platform for customers, administrators, and moving crews to coordinate and track moving jobs from initial quote to completion.

## 🎯 Project Overview

IN&OUT Moving App is an enterprise-grade solution that streamlines the entire moving process with features including:

- Customer portal for quotes, booking, and tracking
- Admin CRM for managing customers, jobs, and crew
- Real-time job tracking with 7-stage progress visualization
- AI-powered assistant (Riley) for customer support
- Integrated payment processing via Stripe
- Document management with digital signatures
- Slack-based team communication
- Comprehensive monitoring and error tracking

**Current Status:** 95% Production Ready | Active Development

## 🏗️ Technology Stack

### Frontend
- **Framework:** Expo SDK 54 with Expo Router
- **Language:** TypeScript
- **UI Framework:** React Native (Web, iOS, Android)
- **Navigation:** Expo Router with tab-based navigation
- **State Management:** React hooks and context
- **Styling:** React Native StyleSheet API
- **Icons:** Lucide React Native

### Backend & Services
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (email/password)
- **Storage:** Supabase Storage (documents, photos)
- **Payments:** Stripe
- **AI Assistant:** Vapi + ChatGPT integration
- **Messaging:** Slack API
- **Scheduling:** Calendly API
- **Monitoring:** Sentry

### Development Tools
- **Package Manager:** npm
- **Version Control:** Git
- **Code Formatting:** Prettier
- **Type Checking:** TypeScript 5.8.3

## 📁 Project Structure

```
inout-moving-app/
├── app/                          # Expo Router screens
│   ├── (tabs)/                   # Customer-facing tab navigation
│   │   ├── index.tsx            # Home/Dashboard
│   │   ├── quote.tsx            # Request quote
│   │   ├── services.tsx         # Services catalog
│   │   ├── track.tsx            # Track move
│   │   ├── messages.tsx         # Messaging
│   │   ├── profile.tsx          # User profile
│   │   └── crm.tsx              # Admin CRM
│   ├── admin/                    # Admin-only routes
│   │   ├── index.tsx            # Admin dashboard
│   │   ├── crm.tsx              # Customer management
│   │   └── profile.tsx          # Admin profile
│   ├── auth/                     # Auth flow screens
│   └── _layout.tsx              # Root layout
├── components/                   # Reusable React components
│   ├── ActiveJobTracker.tsx     # Real-time job tracking
│   ├── AdminDashboard.tsx       # Admin overview
│   ├── AIBookingModal.tsx       # AI-powered booking
│   ├── AuthScreen.tsx           # Login/signup
│   ├── ChatbotModal.tsx         # Riley AI interface
│   ├── DocumentsSection.tsx     # Document management
│   ├── MoveProgressTracker.tsx  # 7-stage progress UI
│   ├── PaymentSection.tsx       # Stripe integration
│   └── ...                      # 30+ additional components
├── services/                     # Business logic layer
│   ├── auth.ts                  # Authentication service
│   ├── authValidation.ts        # Email/password validation
│   ├── rbac.ts                  # Role-based access control
│   ├── database.ts              # Supabase client setup
│   ├── crm.ts                   # Customer management
│   ├── moves.ts                 # Move lifecycle
│   ├── payments.ts              # Payment processing
│   ├── stripe.ts                # Stripe integration
│   ├── documents.ts             # Document operations
│   ├── messaging.ts             # Internal messaging
│   ├── slackMessaging.ts        # Slack notifications
│   ├── rileyAI.ts              # AI assistant
│   ├── jobNumbering.ts         # Professional job IDs
│   ├── fob.ts                  # Bill of lading
│   └── ...                      # 20+ service modules
├── hooks/                        # React hooks
│   ├── useAuth.ts               # Authentication hook
│   ├── useRequireAdmin.ts       # Admin route protection
│   └── useFrameworkReady.ts     # App initialization
├── utils/                        # Utility functions
│   ├── errorHandling.ts         # Error management
│   ├── analytics.ts             # Usage tracking
│   └── bugReporting.ts          # Bug submission
├── types/                        # TypeScript definitions
│   └── supabase.ts              # Database types
├── lib/                          # External integrations
│   └── sentry.ts                # Error monitoring
├── supabase/                     # Database migrations
│   └── migrations/              # SQL migration files
├── assets/                       # Static assets
│   └── images/                  # App icons, splash
└── fixtures/                     # Test data
    └── dummyCustomers.ts        # Sample data

```

## ✨ Key Features

### Customer Features
- **Quote Requests:** Multi-step form with move details, inventory, and date selection
- **Service Catalog:** Residential, commercial, storage, packing services
- **Real-time Tracking:** GPS-enabled tracking with 7-stage progress visualization
- **AI Assistant (Riley):** Voice and chat support for questions and booking
- **Document Access:** View contracts, BOL, receipts, insurance docs
- **Payment Portal:** Secure Stripe integration for deposits and final payments
- **Messaging:** Direct communication with crew and office
- **Review System:** Post-move feedback and ratings

### Admin Features
- **CRM Dashboard:** Customer lifecycle management
- **Job Management:** Create, assign, and track jobs
- **Crew Coordination:** Assign teams, track hours, manage equipment
- **Payment Processing:** Generate invoices, process payments, track balances
- **Document Management:** Upload, sign, and share documents
- **Analytics:** Job metrics, revenue tracking, customer insights
- **Workflow Automation:** Status transitions, notifications, reminders
- **Slack Integration:** Team notifications for job updates and alerts

### Technical Features
- **Role-Based Access Control:** Database-backed user roles (customer, admin, master_admin)
- **Professional Job Numbering:** INO-2601-0001 format (INO-{YYMM}-{XXXX})
- **Invoice System:** INV-YYMM-XXXX format with automatic generation
- **Digital Signatures:** e-signature support for documents
- **Secure File Storage:** Supabase Storage with signed URLs
- **Real-time Updates:** Live job status and location updates
- **Error Monitoring:** Sentry integration with breadcrumbs and user context
- **Cross-platform:** Web, iOS, and Android from single codebase

## 🗄️ Database Schema

### Core Tables
- **users:** User accounts (via Supabase Auth)
- **user_roles:** Role assignments (customer, admin, master_admin)
- **user_permissions:** Granular permission management
- **customers:** Customer profiles and preferences
- **moves:** Move job records
- **job_checklists:** Task tracking for each job
- **quotes:** Quote requests and estimates
- **payments:** Payment transactions
- **invoices:** Invoice generation and tracking
- **documents:** Document storage metadata
- **messages:** Internal messaging system
- **message_threads:** Conversation grouping
- **notifications:** User notifications
- **fob_entries:** Bill of lading line items
- **reviews:** Customer feedback
- **consultations:** Scheduled consultations

### Security
- Row Level Security (RLS) enabled on all tables
- 50+ RLS policies for fine-grained access control
- Automatic role assignment for new users
- Master admin auto-assignment for @inandoutmovin.com domain

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Expo CLI
- Supabase account
- (Optional) Stripe, Slack, Sentry, Vapi accounts for full features

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd inout-moving-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_CALENDLY_API_KEY=your_calendly_api_key
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   ```

4. **Set up Supabase database:**
   - Create a new Supabase project
   - Run migrations from `supabase/migrations/` in chronological order
   - Verify tables and RLS policies are created

5. **Start the development server:**
   ```bash
   npm run dev
   ```

6. **Open the app:**
   - Press `w` for web
   - Scan QR code with Expo Go app for mobile

## ⚙️ Configuration

### Required Services
- **Supabase:** Database, authentication, and storage (REQUIRED)
- **Stripe:** Payment processing (optional, required for payments)
- **Slack:** Team notifications (optional, recommended for ops)
- **Vapi:** AI assistant Riley (optional, enhances customer support)
- **Sentry:** Error monitoring (optional, recommended for production)
- **Calendly:** Consultation scheduling (optional)
- **Google Maps:** Location services (optional, enhances tracking)

### Service Configuration Files
- `services/supabase.ts` - Database client
- `services/stripe.ts` - Payment processing
- `services/slackMessaging.ts` - Team notifications
- `services/rileyAI.ts` - AI assistant
- `lib/sentry.ts` - Error tracking

## 🛠️ Development

### Running the App
```bash
npm run dev              # Start development server
npm run build:web        # Build for web
npm run build:production # Production build
npm run preview          # Preview production build
npm run lint             # Run linter
```

### Project Conventions
- **File Organization:** Single responsibility principle, modular architecture
- **Naming:** PascalCase for components, camelCase for functions/variables
- **Styling:** StyleSheet.create() for all styles
- **Icons:** Lucide React Native exclusively
- **Error Handling:** User-friendly inline errors, no Alert API
- **Platform:** Web-first with platform-specific code where needed

### Adding New Features
1. Check existing patterns in similar components/services
2. Follow established conventions (imports, naming, structure)
3. Use TypeScript for type safety
4. Implement proper error handling
5. Add RLS policies for any new database tables
6. Test on web and mobile platforms

## 📦 Key Dependencies

### Core
- `expo` - Framework and build tools
- `expo-router` - File-based routing
- `react-native` - Cross-platform UI framework
- `@supabase/supabase-js` - Database and auth client

### UI & UX
- `lucide-react-native` - Icon library
- `expo-linear-gradient` - Gradient backgrounds
- `expo-blur` - Blur effects
- `react-native-reanimated` - Animations

### Features
- `expo-camera` - Photo capture
- `expo-location` - GPS tracking
- `expo-notifications` - Push notifications
- `expo-secure-store` - Secure credential storage
- `expo-image-picker` - Gallery access

## 🔒 Security

### Authentication
- Supabase Auth with email/password
- Email validation with regex patterns
- Password strength requirements
- Secure session management

### Authorization
- Database-backed role system (not email domain checking)
- Row Level Security on all tables
- Admin route guards (`useRequireAdmin` hook)
- Permission-based access control

### Data Protection
- Encrypted storage for sensitive data
- Signed URLs for document access
- PII sanitization in logs
- Secure API key management

## 📊 Monitoring & Analytics

### Error Tracking (Sentry)
- Automatic error capture
- User context and breadcrumbs
- Transaction performance monitoring
- Custom event logging

### Usage Analytics
- Job lifecycle tracking
- Customer behavior analysis
- Payment transaction logging
- Feature usage metrics

## 🚢 Deployment

### Web Deployment
```bash
npm run build:production
npm run preview
```

### Mobile Deployment
1. Configure app identifiers in `app.json`
2. Set up EAS Build
3. Submit to App Store / Play Store
4. Follow Expo documentation for builds

### Pre-deployment Checklist
- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] RLS policies verified
- [ ] External services connected (Stripe, Slack, etc.)
- [ ] Error monitoring configured (Sentry)
- [ ] End-to-end testing completed
- [ ] Security audit performed
- [ ] Performance testing completed

## 🐛 Troubleshooting

### Common Issues

**Build Errors:**
- Ensure all dependencies are installed: `npm install`
- Clear cache: `expo start -c`
- Check TypeScript errors: `npx tsc --noEmit`

**Database Connection:**
- Verify Supabase URL and anon key in `.env`
- Check RLS policies are not blocking queries
- Confirm migrations are applied in order

**Authentication Issues:**
- Check Supabase Auth is enabled
- Verify email confirmation settings
- Check RLS policies on user_roles table

**Platform-Specific Issues:**
- Some features are web-only (check Platform.OS)
- Use platform-specific code with Platform.select()
- Test on actual devices, not just simulators

## 📝 Documentation Files

- `README.md` - This file (project overview)
- `SPRINT_FINAL_SUMMARY.md` - Phase 3 completion report
- `PHASE_3_CONTINUED_SPRINT_REPORT.md` - Detailed QA audit
- `SPRINT_CHECKPOINT.md` - Phase 3A deliverables
- `SPRINT_MEMORY_LOG.md` - Development timeline
- `squarespace-sections.md` - Landing page content guide

## 🤝 Contributing

### Development Workflow
1. Read this README and sprint reports for context
2. Check existing patterns before implementing
3. Follow code conventions and style guide
4. Test on web and mobile platforms
5. Update documentation as needed
6. Commit with descriptive messages

### Code Quality Standards
- Zero new TypeScript errors
- Proper error handling
- Inline documentation for complex logic
- Security best practices
- Performance optimization

## 📞 Support & Contact

For technical support or questions about the IN&OUT Moving App:
- Email: support@inandoutmovin.com
- Documentation: See sprint reports in project root
- Issues: Use built-in bug reporting feature

## 📄 License

Proprietary - IN&OUT Moving Company

## 🎯 Current Status & Roadmap

### Production Readiness: 95%

**Ready Now:**
- ✅ Core features (quotes, jobs, tracking)
- ✅ Authentication and RBAC
- ✅ Admin CRM and dashboard
- ✅ Database with RLS
- ✅ Document management
- ✅ AI assistant integration
- ✅ Payment processing structure

**Before Production Launch:**
1. Install Sentry and Stripe packages
2. Configure external service API keys
3. Fix adaptive-icon.png asset
4. Complete end-to-end testing
5. Professional security audit

**Future Enhancements:**
- Mobile-optimized UI refinements
- Advanced analytics dashboard
- Multi-language support
- Automated marketing integrations
- Crew mobile app
- Customer mobile app optimization

---

**Built with ❤️ for IN&OUT Moving**

*Last Updated: January 2026*
