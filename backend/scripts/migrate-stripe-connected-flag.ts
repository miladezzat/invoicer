/**
 * Migration Script: Add 'connected' flag to existing Stripe accounts
 * 
 * This migration is CRITICAL to prevent duplicate account creation bug.
 * It sets connected=true for all existing Stripe accounts that don't have this field.
 * 
 * Background:
 * - Previously, disconnecting removed the entire stripeConnect object
 * - This caused new accounts to be created on reconnection
 * - Now we preserve the account ID and use a connected flag
 * 
 * Run with: npx ts-node scripts/migrate-stripe-connected-flag.ts
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

// User Schema (simplified for migration)
const userSchema = new mongoose.Schema({
  email: String,
  name: String,
  stripeConnect: {
    accountId: String,
    accountType: String,
    accountStatus: String,
    connected: Boolean,
    onboardingComplete: Boolean,
    chargesEnabled: Boolean,
    payoutsEnabled: Boolean,
    detailsSubmitted: Boolean,
    connectedAt: Date,
    disconnectedAt: Date,
    country: String,
    defaultCurrency: String,
  },
}, { timestamps: true });

const User = mongoose.model('User', userSchema, 'users');

async function migrateStripeConnectedFlag() {
  try {
    console.log('🔄 Starting Stripe connected flag migration...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/invoice-db';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Find all users with Stripe accounts but no connected flag
    const usersWithStripe = await User.find({
      'stripeConnect.accountId': { $exists: true, $ne: null },
      'stripeConnect.connected': { $exists: false },
    });

    console.log(`📊 Found ${usersWithStripe.length} users with Stripe accounts needing migration\n`);

    if (usersWithStripe.length === 0) {
      console.log('✨ No users need migration. All done!');
      return;
    }

    // Update each user
    let updatedCount = 0;
    let errorCount = 0;

    for (const user of usersWithStripe) {
      try {
        await User.updateOne(
          { _id: user._id },
          {
            $set: {
              'stripeConnect.connected': true,
            },
          }
        );
        updatedCount++;
        console.log(`✅ Updated user ${user.email} (Account: ${user.stripeConnect?.accountId})`);
      } catch (error: any) {
        errorCount++;
        console.error(`❌ Failed to update user ${user.email}: ${error.message}`);
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   Total users found: ${usersWithStripe.length}`);
    console.log(`   Successfully updated: ${updatedCount}`);
    console.log(`   Errors: ${errorCount}`);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n⚠️  IMPORTANT: Existing users can now safely disconnect and reconnect');
    console.log('   without creating duplicate Stripe accounts.');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run migration
migrateStripeConnectedFlag()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });



