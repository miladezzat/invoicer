import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Client, ClientDocument } from '../src/schemas/client.schema';
import { Invoice, InvoiceDocument } from '../src/schemas/invoice.schema';

/**
 * Script to recalculate and fix client financial totals
 * based on their existing invoices
 */

async function fixClientTotals() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const clientModel = app.get<Model<ClientDocument>>('ClientModel');
  const invoiceModel = app.get<Model<InvoiceDocument>>('InvoiceModel');

  console.log('Starting client totals fix...\n');

  try {
    // Get all clients
    const clients = await clientModel.find({}).exec();
    console.log(`Found ${clients.length} clients to process\n`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const client of clients) {
      try {
        console.log(`Processing client: ${client.name} (${client._id})`);

        // Get all invoices for this client (excluding deleted ones)
        const invoices = await invoiceModel
          .find({
            clientId: client._id,
            isDeleted: { $ne: true },
          })
          .exec();

        console.log(`  Found ${invoices.length} invoices`);

        // Calculate totals
        // totalInvoiced = unpaid invoices (outstanding)
        // totalPaid = paid invoices
        let totalInvoiced = 0;
        let totalPaid = 0;

        for (const invoice of invoices) {
          if (invoice.status === 'paid') {
            // Paid invoices go to totalPaid
            totalPaid += invoice.total;
          } else {
            // Unpaid invoices (draft, sent, overdue, etc.) go to totalInvoiced
            totalInvoiced += invoice.total;
          }
        }

        // Update client
        await clientModel.findByIdAndUpdate(
          client._id,
          {
            $set: {
              totalInvoiced,
              totalPaid,
            },
          }
        ).exec();

        console.log(`  ✓ Updated: totalInvoiced = $${totalInvoiced.toFixed(2)}, totalPaid = $${totalPaid.toFixed(2)}`);
        updatedCount++;

      } catch (error) {
        console.error(`  ✗ Error processing client ${client.name}:`, error.message);
        errorCount++;
      }

      console.log(''); // Empty line for readability
    }

    console.log('\n=== Summary ===');
    console.log(`Total clients: ${clients.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Errors: ${errorCount}`);

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await app.close();
  }
}

// Run the script
fixClientTotals()
  .then(() => {
    console.log('\nScript completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript failed:', error);
    process.exit(1);
  });

