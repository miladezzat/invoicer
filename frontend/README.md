# Invoice Builder - Frontend

Modern Next.js web application for creating and managing professional invoices.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand (with localStorage persistence)
- **Forms**: React Hook Form + Zod validation
- **Data Fetching**: TanStack Query (React Query)
- **Currency**: Custom integer-based math (no float drift)

## Features

### Guest Mode
- Create invoices without signup
- Auto-save to localStorage
- Print-ready invoices
- Shareable links (coming soon)

### Account Mode
- Save invoices to cloud
- Track invoice status (draft/sent/paid)
- Manage clients
- Custom templates
- Search and filter

## Getting Started

### Prerequisites

- Node.js 18+
- Backend API running (see `/backend` directory)

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### Running the App

```bash
# Development
npm run dev

# Production build
npm run build
npm run start
```

The app will be available at `http://localhost:3000`

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Landing page
│   │   ├── builder/           # Invoice builder
│   │   ├── auth/              # Login/Signup
│   │   └── app/               # Authenticated app pages
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   └── invoice/           # Invoice-specific components
│   ├── lib/
│   │   ├── api.ts             # API client
│   │   ├── currency.ts        # Currency calculations
│   │   └── utils.ts           # Utilities
│   └── store/
│       └── invoice-builder.ts # Zustand store
├── public/
├── package.json
└── tailwind.config.ts
```

## Key Pages

- `/` - Landing page
- `/builder` - Invoice builder (guest-friendly)
- `/auth/login` - Login
- `/auth/signup` - Sign up
- `/app/invoices` - Invoice list (authenticated)

## State Management

The app uses Zustand for state management with localStorage persistence:

```typescript
const { currentInvoice, updateInvoice, addLineItem } = useInvoiceBuilder()
```

Guest invoices are stored locally and can be migrated to the cloud on signup.

## Currency Handling

All currency calculations use integer math (cents) to avoid floating-point errors:

```typescript
import { toCents, formatMoney, calculateInvoiceTotals } from '@/lib/currency'

const priceCents = toCents(99.99) // 9999
const formatted = formatMoney(9999, 'USD') // "$99.99"
```

## Styling

The app uses Tailwind CSS with a custom design system based on shadcn/ui:

- Responsive design
- Dark mode support (coming soon)
- Print-optimized styles
- RTL support (coming soon)

## Print Functionality

Invoices are print-ready with optimized styles:

```css
@media print {
  .no-print {
    display: none !important;
  }
}
```

Use `window.print()` or Ctrl/Cmd+P to print.

## Contributing

This is a solo project but feedback is welcome!

## License

MIT

