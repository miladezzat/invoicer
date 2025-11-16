# Backend Scripts

This directory contains setup and maintenance scripts for the invoice platform.

## 📋 Available Scripts

### 🚀 Setup Scripts
- `setup-stripe-products.ts` - Creates Stripe products and pricing
- `setup-customer-portal.ts` - Configures Stripe customer portal

### 🔧 Maintenance Scripts
- `migrate-stripe-connected-flag.ts` - **CRITICAL**: Fixes Stripe reconnection bug (see below)
- `fix-client-totals.ts` - Repairs client invoice totals
- `add-pro-features.ts` - Upgrades users to Pro plan

### 🧪 Testing Scripts
- `test-api-analytics.ts` - Tests API analytics functionality

---

## ⚠️ CRITICAL: Stripe Reconnection Bug Fix

**If you're upgrading from an earlier version**, you MUST run this migration to prevent users from creating duplicate Stripe accounts when reconnecting.

### The Problem
Previously, disconnecting a Stripe account deleted all connection data. When users reconnected, the system created a **new Stripe account** instead of reconnecting the existing one, causing:
- Multiple accounts per user
- Broken payment links
- Lost payment history

### The Fix
Run the migration script to add connection tracking to existing accounts:

```bash
cd backend
npx ts-node scripts/migrate-stripe-connected-flag.ts
```

This is **safe to run multiple times** and will only update accounts that need it.

**See `STRIPE_RECONNECTION_FIX.md` in the root directory for complete details.**

---

## 🚀 Stripe Setup & Quick Start

### 1. Get Your Stripe Secret Key

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/register)
2. Sign up or log in
3. Click **"Developers"** → **"API keys"**
4. Copy your **Secret key** (starts with `sk_test_`)

### 2. Add to `.env` File

Create or edit `backend/.env` and add:

```bash
STRIPE_SECRET_KEY=sk_test_your_key_here
```

### 3. Run the Setup Script

```bash
cd backend
npm run setup:stripe
```

Or directly with ts-node:
```bash
npx ts-node scripts/setup-stripe-products.ts
```

The script will:
- ✅ Create a "Pro Plan" product on Stripe
- ✅ Add monthly pricing ($15/month)
- ✅ Add yearly pricing ($153/year)
- ✅ Output the Price IDs you need

### 4. Copy the Price IDs

The script will output something like:

```bash
STRIPE_MONTHLY_PRICE_ID=price_1ABC123...
STRIPE_YEARLY_PRICE_ID=price_1XYZ789...
```

Add these to your `backend/.env` file.

### 5. Set Up Webhook

You still need to set up the webhook manually:

1. Go to [Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click **"+ Add endpoint"**
3. Set URL: `http://localhost:3001/stripe/webhook`
4. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Add to `.env`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
   ```

## 🎨 Customizing Prices

Edit the `PRODUCT_CONFIG` section in `setup-stripe-products.js`:

```javascript
const PRODUCT_CONFIG = {
  name: 'Pro Plan',
  description: 'Your description here',
  monthlyPrice: 15.00,  // Change this
  yearlyPrice: 153.00,  // Change this
  currency: 'usd',      // Or 'eur', 'gbp', etc.
};
```

Then run the script again.

## 🔄 Running Again

The script is **idempotent** - it won't create duplicates if you run it multiple times. It will find existing products and prices.

## 📚 Complete `.env` Example

After running the script and setting up webhooks, your `backend/.env` should have:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/invoice-db

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Stripe (all 4 required)
STRIPE_SECRET_KEY=sk_test_51ABC...xyz123
STRIPE_MONTHLY_PRICE_ID=price_1ABC...monthly123
STRIPE_YEARLY_PRICE_ID=price_1XYZ...yearly456
STRIPE_WEBHOOK_SECRET=whsec_ABC123...xyz789
```

## 🧪 Testing Locally

For local webhook testing, use Stripe CLI:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS

# Login
stripe login

# Forward webhooks
stripe listen --forward-to localhost:3001/stripe/webhook
```

Use the webhook secret from the CLI output in your `.env` file.

## ❓ Troubleshooting

**Error: STRIPE_SECRET_KEY not found**
- Make sure you created `backend/.env` file
- Make sure the key starts with `sk_test_` or `sk_live_`

**Error: Stripe authentication failed**
- Your secret key might be invalid
- Get a new one from the [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)

**Products already exist**
- The script will find and reuse existing products
- Check the [Products page](https://dashboard.stripe.com/test/products) to see them

## 🎯 Next Steps

After setup is complete:

1. ✅ Run the backend: `npm run start:dev`
2. ✅ Run the frontend: `npm run dev`
3. ✅ Visit `http://localhost:3000/pricing`
4. ✅ Test the subscription flow!

---

**Need help?** Check the [Stripe Documentation](https://stripe.com/docs) or ask in the project discussions.

