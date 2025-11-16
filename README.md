# Invoicer – Professional Invoice Generator

A modern, full-stack invoice management application with guest mode, cloud sync, and professional invoice generation.

## Overview

Invoice Builder lets you create, manage, and share professional invoices quickly. Start as a guest without signing up, or create an account to sync across devices and unlock advanced features.

## Features

### Core Features (MVP)
- ✅ **Guest Mode**: Create invoices instantly without signup
- ✅ **Invoice Builder**: Intuitive UI with live preview
- ✅ **Client Management**: Save and reuse client information
- ✅ **Custom Templates**: Multiple professional themes
- ✅ **Print/PDF**: One-click PDF generation and printing
- ✅ **Public Links**: Shareable invoice links
- ✅ **Status Tracking**: Draft, sent, paid, overdue
- ✅ **Search & Filter**: Find invoices quickly
- ✅ **Currency Support**: Multi-currency with accurate calculations

### Coming Soon (v2)
- 🔄 Payment Integration (Stripe)
- 🔄 Email Sending & Reminders
- 🔄 Recurring Invoices
- 🔄 Analytics Dashboard
- 🔄 RTL Support (Arabic/Hebrew)
- 🔄 Mobile App

## Tech Stack

### Backend
- **NestJS** (TypeScript)
- **MongoDB** (Mongoose ODM)
- **JWT** authentication
- **Puppeteer** (PDF generation)
- **Resend** (Email)

### Frontend
- **Next.js 14** (App Router)
- **React** with TypeScript
- **Tailwind CSS** + **shadcn/ui**
- **Zustand** (State management)
- **TanStack Query** (Data fetching)

### Infrastructure
- **Vercel** (Frontend hosting)
- **Cloud Run / Fly.io** (Backend)
- **MongoDB Atlas** (Database)
- **Better Stack** (Monitoring)

## Project Structure

```
invoice/
├── backend/           # NestJS API
│   ├── src/
│   │   ├── modules/  # Feature modules
│   │   └── schemas/  # Mongoose schemas
│   └── package.json
├── frontend/          # Next.js app
│   ├── src/
│   │   ├── app/      # Pages (App Router)
│   │   ├── components/
│   │   ├── lib/
│   │   └── store/
│   └── package.json
├── project-plan.md    # Detailed project plan
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### Quick Start

1. **Clone the repository**

```bash
git clone <repo-url>
cd invoice
```

2. **Setup Backend**

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and secrets
npm run start:dev
```

Backend will run on `http://localhost:3001`

3. **Setup Frontend**

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api" > .env.local
npm run dev
```

Frontend will run on `http://localhost:3000`

4. **Open the app**

Visit `http://localhost:3000` and start creating invoices!

## Environment Variables

### Backend (`backend/.env`)

```bash
MONGODB_URI=mongodb://localhost:27017/invoice-builder
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d
RESEND_API_KEY=your-resend-key
PORT=3001
```

### Frontend (`frontend/.env.local`)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/:id` - Get invoice
- `PATCH /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `POST /api/invoices/:id/public-link` - Generate public link

### Clients
- `GET /api/clients` - List clients
- `POST /api/clients` - Create client
- (CRUD operations available)

### Templates
- `GET /api/templates` - List templates
- `POST /api/templates` - Create template
- (CRUD operations available)

### Public (No Auth)
- `GET /api/public/invoices/:token` - View public invoice

## Usage

### As a Guest

1. Visit the homepage
2. Click "Try as Guest"
3. Create your invoice using the builder
4. Print or save locally
5. Optionally sign up to save to cloud

### As a Registered User

1. Sign up for a free account
2. Create invoices in the builder
3. Save clients for reuse
4. Track invoice status
5. Generate public shareable links
6. Search and filter your invoices

## Development

### Backend Development

```bash
cd backend
npm run start:dev  # Watch mode
npm run test       # Run tests
npm run lint       # Lint code
```

### Frontend Development

```bash
cd frontend
npm run dev        # Dev server
npm run build      # Production build
npm run lint       # Lint code
```

## Deployment

### Frontend (Vercel)

```bash
cd frontend
vercel
```

### Backend (Cloud Run / Fly.io)

See deployment guides in `backend/README.md`

## Security

- JWT tokens in httpOnly cookies
- Input validation with Zod/class-validator
- Rate limiting (10 req/min by default)
- CORS enabled for frontend only
- Helmet security headers
- MongoDB injection protection

## Performance

- Guest invoices stored in localStorage
- Server-side rendering with Next.js
- Edge caching for public invoices
- Lazy loading for heavy components
- Optimistic updates with React Query

## Contributing

This is currently a solo project. Feedback and suggestions are welcome via issues.

## Roadmap

See `project-plan.md` for detailed milestones and feature breakdown.

### M0 - Foundation ✅
- [x] Backend setup
- [x] Frontend setup
- [x] Database schemas

### M1 - Guest Builder ✅
- [x] Invoice builder UI
- [x] Local state management
- [x] Currency calculations
- [x] Print support

### M2 - Auth & Cloud Sync (In Progress)
- [x] Authentication
- [x] CRUD APIs
- [ ] Guest migration
- [ ] PDF generation

### M3 - Sharing & Email
- [ ] Public invoice pages
- [ ] Email sending
- [ ] Basic analytics

### M4 - Polish
- [ ] Multiple templates
- [ ] RTL support
- [ ] Mobile optimization
- [ ] Accessibility improvements

### M5 - Payments (v2)
- [ ] Stripe integration
- [ ] Payment tracking
- [ ] Automated reminders

## License

MIT License - feel free to use for your own projects!

## Support

For questions or issues, please open a GitHub issue.

---

Built with ❤️ using modern web technologies

