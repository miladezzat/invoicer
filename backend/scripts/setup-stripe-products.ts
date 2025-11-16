/**
 * Stripe Product Setup Script
 * 
 * This script creates the Pro Plan product with monthly and yearly pricing on Stripe.
 * 
 * Usage:
 *   1. Make sure you have your STRIPE_SECRET_KEY in backend/.env
 *   2. Run: npm run setup:stripe
 *   Or: npx ts-node scripts/setup-stripe-products.ts
 * 
 * The script will output the Price IDs you need to add to your .env file.
 */

import 'dotenv/config';
import Stripe from 'stripe';

// Configuration - Edit these values as needed
interface ProductConfig {
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
}

const PRODUCT_CONFIG: ProductConfig = {
  name: 'Pro Plan',
  description: 'Premium invoice features with unlimited saved invoices, client management, and payment integrations',
  monthlyPrice: 15.00, // USD
  yearlyPrice: 153.00, // USD (15% discount)
  currency: 'usd',
};

async function setupStripeProducts(): Promise<void> {
  console.log('🚀 Starting Stripe Product Setup...\n');

  // Check for Stripe Secret Key
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!stripeSecretKey) {
    console.error('❌ Error: STRIPE_SECRET_KEY not found in .env file');
    console.log('\n📝 Please add your Stripe Secret Key to backend/.env:');
    console.log('   STRIPE_SECRET_KEY=sk_test_your_key_here\n');
    console.log('💡 Get it from: https://dashboard.stripe.com/test/apikeys\n');
    process.exit(1);
  }

  if (!stripeSecretKey.startsWith('sk_test_') && !stripeSecretKey.startsWith('sk_live_')) {
    console.error('❌ Error: Invalid STRIPE_SECRET_KEY format');
    console.log('   Should start with sk_test_ or sk_live_\n');
    process.exit(1);
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2025-10-29.clover',
  });

  const isTestMode = stripeSecretKey.startsWith('sk_test_');
  console.log(`🔑 Using Stripe ${isTestMode ? 'TEST' : 'LIVE'} mode\n`);

  try {
    // Step 1: Check if product already exists
    console.log('🔍 Checking for existing Pro Plan product...');
    const existingProducts = await stripe.products.search({
      query: `name:'${PRODUCT_CONFIG.name}' AND active:'true'`,
    });

    let product: Stripe.Product;
    let monthlyPrice: Stripe.Price | undefined;
    let yearlyPrice: Stripe.Price | undefined;

    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0];
      console.log(`✅ Found existing product: ${product.name} (${product.id})`);
      
      // Get existing prices
      const prices = await stripe.prices.list({
        product: product.id,
        active: true,
      });

      monthlyPrice = prices.data.find(p => p.recurring?.interval === 'month');
      yearlyPrice = prices.data.find(p => p.recurring?.interval === 'year');

      if (monthlyPrice && yearlyPrice) {
        console.log('✅ Found existing monthly and yearly prices\n');
      }
    } else {
      // Step 2: Create product if it doesn't exist
      console.log('📦 Creating Pro Plan product...');
      product = await stripe.products.create({
        name: PRODUCT_CONFIG.name,
        description: PRODUCT_CONFIG.description,
        metadata: {
          created_by: 'setup-script',
          app: 'invoice-app',
        },
      });
      console.log(`✅ Product created: ${product.name} (${product.id})\n`);
    }

    // Step 3: Create Monthly Price
    if (!monthlyPrice) {
      console.log(`💰 Creating monthly price: $${PRODUCT_CONFIG.monthlyPrice}/month...`);
      monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(PRODUCT_CONFIG.monthlyPrice * 100), // Convert to cents
        currency: PRODUCT_CONFIG.currency,
        recurring: {
          interval: 'month',
          interval_count: 1,
        },
        metadata: {
          plan: 'pro',
          interval: 'monthly',
        },
      });
      console.log(`✅ Monthly price created: ${monthlyPrice.id}`);
    } else {
      console.log(`✅ Monthly price exists: ${monthlyPrice.id}`);
    }

    // Step 4: Create Yearly Price
    if (!yearlyPrice) {
      console.log(`💰 Creating yearly price: $${PRODUCT_CONFIG.yearlyPrice}/year...`);
      yearlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(PRODUCT_CONFIG.yearlyPrice * 100), // Convert to cents
        currency: PRODUCT_CONFIG.currency,
        recurring: {
          interval: 'year',
          interval_count: 1,
        },
        metadata: {
          plan: 'pro',
          interval: 'yearly',
        },
      });
      console.log(`✅ Yearly price created: ${yearlyPrice.id}`);
    } else {
      console.log(`✅ Yearly price exists: ${yearlyPrice.id}`);
    }

    // Step 5: Output results
    console.log('\n' + '='.repeat(70));
    console.log('🎉 SUCCESS! Your Stripe products are ready!');
    console.log('='.repeat(70) + '\n');

    console.log('📋 Add these to your backend/.env file:\n');
    console.log('# Stripe Price IDs');
    console.log(`STRIPE_MONTHLY_PRICE_ID=${monthlyPrice.id}`);
    console.log(`STRIPE_YEARLY_PRICE_ID=${yearlyPrice.id}\n`);

    console.log('📊 Product Details:');
    console.log(`   Name: ${product.name}`);
    console.log(`   Product ID: ${product.id}`);
    console.log(`   Monthly: $${PRODUCT_CONFIG.monthlyPrice}/month (${monthlyPrice.id})`);
    console.log(`   Yearly: $${PRODUCT_CONFIG.yearlyPrice}/year (${yearlyPrice.id})`);
    console.log(`   Dashboard: https://dashboard.stripe.com/${isTestMode ? 'test/' : ''}products/${product.id}\n`);

    // Calculate savings
    const monthlyCostPerYear = PRODUCT_CONFIG.monthlyPrice * 12;
    const savings = monthlyCostPerYear - PRODUCT_CONFIG.yearlyPrice;
    const savingsPercent = ((savings / monthlyCostPerYear) * 100).toFixed(0);
    console.log('💡 Pricing Summary:');
    console.log(`   Monthly: $${PRODUCT_CONFIG.monthlyPrice}/month → $${monthlyCostPerYear.toFixed(2)}/year`);
    console.log(`   Yearly: $${PRODUCT_CONFIG.yearlyPrice}/year (Save $${savings.toFixed(2)} - ${savingsPercent}% off!)\n`);

    console.log('✅ Next steps:');
    console.log('   1. Copy the Price IDs above to your backend/.env file');
    console.log('   2. Set up your webhook endpoint to get STRIPE_WEBHOOK_SECRET');
    console.log('   3. Start your backend and frontend servers');
    console.log('   4. Test the subscription flow!\n');

  } catch (error: any) {
    console.error('\n❌ Error creating Stripe products:');
    console.error(`   ${error.message}\n`);
    
    if (error.type === 'StripeAuthenticationError') {
      console.log('💡 Your STRIPE_SECRET_KEY might be invalid or expired.');
      console.log('   Get a new one from: https://dashboard.stripe.com/test/apikeys\n');
    }
    
    process.exit(1);
  }
}

// Run the setup
setupStripeProducts().catch(console.error);

