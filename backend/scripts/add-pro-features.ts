import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
});

async function addProFeatures() {
  console.log('🔍 Looking for Pro Plan product in Stripe...\n');

  try {
    // Search for Pro Plan product
    const products = await stripe.products.list({
      active: true,
      limit: 100,
    });

    // Look for Pro, Premium, or similar product
    const proPlan = products.data.find(p => 
      p.name.toLowerCase().includes('pro') || 
      p.name.toLowerCase().includes('premium')
    );

    if (!proPlan) {
      console.error('❌ No Pro/Premium plan found in Stripe.');
      console.log('\nℹ️  Available products:');
      products.data.forEach(p => {
        console.log(`   - ${p.name} (${p.id})`);
      });
      console.log('\nPlease create a Pro Plan product first or update the script with your product ID.');
      process.exit(1);
    }

    console.log(`✅ Found product: "${proPlan.name}" (${proPlan.id})\n`);

    // Define Pro Plan features
    const proFeatures = [
      "Everything in Free, plus:",
      "Save unlimited invoices",
      "Client management",
      "Payment integrations",
      "Invoice templates",
      "Recurring invoices",
      "Payment reminders",
      "Client portal",
      "Analytics & reports",
      "Priority support",
      "API access",
      "Access all upcoming features at no extra cost"
    ];

    console.log('📝 Adding features to Pro Plan...\n');

    // Update the product with features
    const updatedProduct = await stripe.products.update(proPlan.id, {
      metadata: {
        features: JSON.stringify(proFeatures),
      },
    });

    console.log('✅ Features added successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Features added:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    proFeatures.forEach((feature, index) => {
      console.log(`${index + 1}. ${feature}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🎉 Done! Refresh your pricing page to see the features.\n');
    console.log(`🌐 View in Stripe: https://dashboard.stripe.com/products/${proPlan.id}\n`);

  } catch (error) {
    console.error('\n❌ Error updating Pro Plan:');
    console.error(error);
    process.exit(1);
  }
}

// Run the script
addProFeatures();

