# Invoice Builder - Backend API

NestJS-based REST API for the Invoice Builder application.

## Tech Stack

- **Framework**: NestJS (TypeScript)
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JWT with Passport
- **Validation**: class-validator
- **Rate Limiting**: @nestjs/throttler
- **Security**: Helmet

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
MONGODB_URI=mongodb://localhost:27017/invoice-builder
JWT_SECRET=your-secret-key
RESEND_API_KEY=your-resend-key
```

### Running the API

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

The API will be available at `http://localhost:3001/api`

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/:id` - Get invoice
- `PATCH /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `POST /api/invoices/:id/public-link` - Enable public sharing

### Clients
- `GET /api/clients` - List clients
- `POST /api/clients` - Create client
- `GET /api/clients/:id` - Get client
- `PATCH /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Templates
- `GET /api/templates` - List templates
- `POST /api/templates` - Create template
- `GET /api/templates/:id` - Get template
- `PATCH /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template

### Public (No Auth)
- `GET /api/public/invoices/:token` - View public invoice

## Project Structure

```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/        # Authentication
│   │   ├── users/       # User management
│   │   ├── invoices/    # Invoice CRUD
│   │   ├── clients/     # Client management
│   │   ├── templates/   # Template management
│   │   └── public/      # Public endpoints
│   ├── schemas/         # Mongoose schemas
│   ├── app.module.ts    # Root module
│   └── main.ts          # Bootstrap
├── package.json
└── tsconfig.json
```

## Security

- JWT tokens for authentication
- Rate limiting (10 requests/minute by default)
- CORS enabled for frontend domain
- Input validation on all endpoints
- Helmet for security headers

## Testing

```bash
npm run test
npm run test:watch
npm run test:cov
```

