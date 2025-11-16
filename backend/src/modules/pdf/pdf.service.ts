import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';

@Injectable()
export class PdfService {
  async generateInvoicePdf(invoiceHtml: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    try {
      const page = await browser.newPage();
      
      await page.setContent(invoiceHtml, {
        waitUntil: 'networkidle0',
      });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  generateInvoiceHtml(invoice: any): string {
    // Helper function to build full address HTML
    const buildAddressHtml = (addressObj: any): string => {
      if (!addressObj) return '';
      
      const lines = [];
      if (addressObj.address) {
        lines.push(`<p class="address-line">${addressObj.address}</p>`);
      }
      
      const cityStateZip = [];
      if (addressObj.city) cityStateZip.push(addressObj.city);
      if (addressObj.state) cityStateZip.push(addressObj.state);
      if (addressObj.postalCode) cityStateZip.push(addressObj.postalCode);
      
      if (cityStateZip.length > 0) {
        lines.push(`<p class="address-line">${cityStateZip.join(', ')}</p>`);
      }
      
      if (addressObj.country) {
        lines.push(`<p class="address-line">${addressObj.country}</p>`);
      }
      
      return lines.join('');
    };

    // Build client address from populated clientId or fallback to clientAddress
    const clientAddressHtml = invoice.clientId 
      ? buildAddressHtml(invoice.clientId)
      : (invoice.clientAddress ? `<p class="address-line">${invoice.clientAddress.replace(/\n/g, '<br>')}</p>` : '');
    
    // Format freelancer address
    const freelancerAddressHtml = invoice.freelancerAddress 
      ? `<p class="address-line">${invoice.freelancerAddress.replace(/\n/g, '<br>')}</p>` 
      : '';

    // Generate a professional HTML template for the invoice
    const lineItemsHtml = invoice.lineItems
      .map(
        (item: any) => {
          const periodFrom = item.periodFrom ? new Date(item.periodFrom).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '';
          const periodTo = item.periodTo ? new Date(item.periodTo).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '';
          const period = periodFrom && periodTo ? `${periodFrom} to ${periodTo}` : '';
          
          return `
        <tr>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px;">${item.description || ''}</td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 9px;">${period}</td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 10px;">${item.days || ''}</td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 10px;">${item.totalHours || item.quantity || 0}</td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 10px;">$${((item.hourlyRate || item.unitPrice || 0) / 100).toFixed(2)}</td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; font-size: 10px;">$${((item.amount || item.total || 0) / 100).toFixed(2)}</td>
        </tr>
      `;
        }
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @page {
              margin: 0;
              size: A4;
            }
            * { 
              margin: 0; 
              padding: 0; 
              box-sizing: border-box; 
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              color: #1f2937;
              line-height: 1.5;
              background: #f5f5f5;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
              display: flex;
              justify-content: center;
              align-items: flex-start;
              min-height: 100vh;
              padding: 20px;
            }
            .page {
              width: 210mm;
              min-height: 297mm;
              max-height: 297mm;
              padding: 8mm 12mm;
              margin: 0 auto;
              background: white;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 16px;
            }
            .logo-section {
              flex: 0 0 auto;
            }
            .logo {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              background: #1e293b;
              color: white;
              padding: 8px 14px;
              border-radius: 6px;
              font-weight: 700;
              font-size: 16px;
              letter-spacing: 0.5px;
            }
            .logo-icon {
              width: 24px;
              height: 24px;
              background: white;
              color: #1e293b;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 4px;
              font-size: 13px;
              font-weight: 800;
            }
            .invoice-meta {
              text-align: right;
              display: grid;
              grid-template-columns: auto auto;
              gap: 6px 16px;
              align-items: center;
            }
            .meta-label {
              font-size: 10px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #64748b;
              text-align: right;
            }
            .meta-value {
              font-size: 12px;
              font-weight: 600;
              color: #1e293b;
              text-align: right;
            }
            .info-section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 18px;
            }
            .info-card {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 4px;
              padding: 10px 12px;
            }
            .info-card h3 {
              font-size: 9px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              color: #64748b;
              margin-bottom: 6px;
            }
            .info-card p {
              font-size: 10px;
              color: #475569;
              margin-bottom: 2px;
              line-height: 1.4;
            }
            .info-card .name {
              font-weight: 600;
              color: #1e293b;
              font-size: 11px;
              margin-bottom: 2px;
            }
            .info-card .address-line {
              color: #64748b;
              font-size: 9px;
              line-height: 1.3;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 16px;
            }
            thead tr {
              background: #1e293b;
              color: white;
            }
            th {
              text-align: left;
              padding: 8px 10px;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }
            th.center {
              text-align: center;
            }
            th.right {
              text-align: right;
            }
            td {
              font-size: 10px;
              color: #475569;
              vertical-align: top;
            }
            tbody tr:last-child td {
              border-bottom: 2px solid #e5e7eb;
            }
            .totals-section {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 16px;
            }
            .totals-table {
              width: 280px;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              padding: 7px 0;
              font-size: 11px;
            }
            .totals-row .label {
              color: #475569;
              font-weight: 500;
            }
            .totals-row .value {
              color: #1e293b;
              font-weight: 600;
            }
            .totals-row.subtotal {
              border-bottom: 1px solid #e2e8f0;
            }
            .totals-row.total {
              background: #1e293b;
              color: white;
              padding: 10px 14px;
              margin-top: 2px;
              border-radius: 4px;
              font-size: 13px;
            }
            .totals-row.total .label {
              color: white;
              font-weight: 700;
            }
            .totals-row.total .value {
              color: white;
              font-weight: 700;
            }
            .notes-section {
              margin-top: 16px;
              padding-top: 12px;
              border-top: 1px solid #e5e7eb;
            }
            .note-block {
              margin-bottom: 10px;
            }
            .note-block:last-child {
              margin-bottom: 0;
            }
            .note-block h4 {
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              color: #64748b;
              margin-bottom: 5px;
            }
            .note-block p {
              font-size: 10px;
              color: #475569;
              line-height: 1.4;
              white-space: pre-wrap;
            }
            .footer {
              margin-top: 12px;
              text-align: center;
              padding-top: 10px;
              border-top: 1px solid #e5e7eb;
            }
            .footer p {
              font-size: 9px;
              color: #94a3b8;
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div class="logo-section">
                <div class="logo">
                  <div class="logo-icon">IN</div>
                  <span>INVOICER</span>
                </div>
              </div>
              <div class="invoice-meta">
                <span class="meta-label">Invoice #</span>
                <span class="meta-value">${invoice.manualInvoiceNumber || invoice.number}</span>
                <span class="meta-label">Reference #</span>
                <span class="meta-value">${invoice.number}</span>
                <span class="meta-label">Date</span>
                <span class="meta-value">${new Date(invoice.issueDate).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                <span class="meta-label">Due</span>
                <span class="meta-value">${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) : 'N/A'}</span>
              </div>
            </div>

            <div class="info-section">
              <div class="info-card">
                <h3>From</h3>
                ${invoice.freelancerName ? `<p class="name">${invoice.freelancerName}</p>` : ''}
                ${invoice.freelancerEmail ? `<p>${invoice.freelancerEmail}</p>` : ''}
                ${freelancerAddressHtml}
              </div>
              <div class="info-card">
                <h3>Bill To</h3>
                ${invoice.clientId?.name || invoice.clientName ? `<p class="name">${invoice.clientId?.name || invoice.clientName}</p>` : ''}
                ${((invoice.clientId?.company || invoice.clientCompany) && (invoice.clientId?.company !== invoice.clientId?.name) && (invoice.clientCompany !== invoice.clientName)) ? `<p>${invoice.clientId?.company || invoice.clientCompany}</p>` : ''}
                ${invoice.clientId?.email || invoice.clientEmail ? `<p>${invoice.clientId?.email || invoice.clientEmail}</p>` : ''}
                ${clientAddressHtml}
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>DESCRIPTION</th>
                  <th class="center">PERIOD</th>
                  <th class="center">DAYS</th>
                  <th class="center">HOURS</th>
                  <th class="right">RATE</th>
                  <th class="right">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                ${lineItemsHtml}
              </tbody>
            </table>

            <div class="totals-section">
              <div class="totals-table">
                <div class="totals-row subtotal">
                  <span class="label">Subtotal</span>
                  <span class="value">$${((invoice.subtotal || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                ${
                  (invoice.taxAmount || 0) > 0
                    ? `
                <div class="totals-row">
                  <span class="label">Tax (${invoice.taxPercent || 0}%)</span>
                  <span class="value">$${((invoice.taxAmount || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                `
                    : ''
                }
                ${
                  (invoice.discountFlat || 0) > 0
                    ? `
                <div class="totals-row">
                  <span class="label">Discount</span>
                  <span class="value">-$${((invoice.discountFlat || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                `
                    : ''
                }
                <div class="totals-row total">
                  <span class="label">Total Due</span>
                  <span class="value">$${((invoice.total || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            ${
              invoice.notes || invoice.terms
                ? `
            <div class="notes-section">
              ${
                invoice.notes
                  ? `
                <div class="note-block">
                  <h4>Notes</h4>
                  <p>${invoice.notes}</p>
                </div>
              `
                  : ''
              }
              ${
                invoice.terms
                  ? `
                <div class="note-block">
                  <h4>Payment Terms</h4>
                  <p>${invoice.terms}</p>
                </div>
              `
                  : ''
              }
            </div>
            `
                : ''
            }

            <div class="footer">
              <p>Powered by Invoicer</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

