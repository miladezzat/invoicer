import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
});

async function setupCustomerPortal() {
  try {
    console.log('🔧 Setting up Stripe Customer Portal configuration...\n');

    // Check if a configuration already exists
    const existingConfigs = await stripe.billingPortal.configurations.list({
      limit: 1,
    });

    if (existingConfigs.data.length > 0) {
      console.log('✅ Customer Portal configuration already exists:');
      console.log(`   Configuration ID: ${existingConfigs.data[0].id}`);
      console.log(`   Active: ${existingConfigs.data[0].is_default ? 'Yes (Default)' : 'No'}`);
      console.log('\nTo update, visit: https://dashboard.stripe.com/settings/billing/portal\n');
      return;
    }

    // Get monthly and yearly price IDs from env
    const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID;
    const yearlyPriceId = process.env.STRIPE_YEARLY_PRICE_ID;

    if (!monthlyPriceId || !yearlyPriceId) {
      console.error('❌ Error: STRIPE_MONTHLY_PRICE_ID and STRIPE_YEARLY_PRICE_ID not found');
      console.log('\n💡 Run the Stripe product setup first:');
      console.log('   npm run setup:stripe\n');
      process.exit(1);
    }

    // Get the product ID from one of the prices
    console.log('🔍 Retrieving product information...');
    const price = await stripe.prices.retrieve(monthlyPriceId);
    const productId = typeof price.product === 'string' ? price.product : price.product.id;
    console.log(`✅ Found product: ${productId}\n`);

    // Create a new customer portal configuration
    console.log('⚙️  Creating customer portal configuration...');
    const configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'Manage your subscription and billing',
      },
      features: {
        customer_update: {
          enabled: true,
          allowed_updates: ['email', 'address'],
        },
        invoice_history: {
          enabled: true,
        },
        payment_method_update: {
          enabled: true,
        },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: {
            enabled: true,
            options: [
              'too_expensive',
              'missing_features',
              'switched_service',
              'unused',
              'other',
            ],
          },
        },
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price'],
          proration_behavior: 'create_prorations',
          products: [
            {
              product: productId,
              prices: [monthlyPriceId, yearlyPriceId],
            },
          ],
        },
      },
    });

    console.log('✅ Customer Portal configuration created successfully!\n');
    console.log(`   Configuration ID: ${configuration.id}`);
    console.log(`   Portal URL: https://dashboard.stripe.com/settings/billing/portal`);
    console.log('\n🎉 Customers can now manage their subscriptions!\n');
    console.log('Features enabled:');
    console.log('  ✓ Update email and address');
    console.log('  ✓ View invoice history');
    console.log('  ✓ Update payment methods');
    console.log('  ✓ Cancel subscriptions');
    console.log('  ✓ Switch between plans (Monthly/Yearly)\n');
  } catch (error: any) {
    console.error('❌ Error setting up customer portal:', error.message);
    
    if (error.code === 'resource_missing') {
      console.error('\n💡 Make sure you have run: npm run setup:stripe');
      console.error('   And that STRIPE_MONTHLY_PRICE_ID and STRIPE_YEARLY_PRICE_ID are in your .env');
    }
    
    process.exit(1);
  }
}

setupCustomerPortal();

