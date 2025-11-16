'use client'

import { Invoice } from '@/store/invoice-builder'
import { formatDate } from '@/lib/utils'
import { Card } from '@/components/ui/card'

interface InvoicePreviewProps {
  invoice: Invoice
}

export function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const subtotal = invoice.lineItems.reduce((sum, item) => sum + (item.amount || 0), 0)
  const taxAmount = subtotal * ((invoice.taxPercent || 0) / 100)
  const discountFlat = invoice.discountFlat || 0
  const total = subtotal + taxAmount - discountFlat

  // Format date to mm/dd/yyyy
  const formatShortDate = (date: string) => {
    const d = new Date(date)
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const year = d.getFullYear()
    return `${month}/${day}/${year}`
  }

  return (
    <Card className="invoice-preview-card p-8 sm:p-12 md:p-16 bg-white shadow-lg print:shadow-none print:p-6">
      {/* Header with Logo */}
      <div className="mb-12 print:mb-8">
        <div className="flex items-center gap-3 mb-12 print:mb-6">
          <div 
            className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-black text-xl"
            style={{ backgroundColor: invoice.brandColor || '#1e293b' }}
          >
            IN
          </div>
          <span className="text-3xl font-bold tracking-tight">INVOICER</span>
        </div>
        
        {/* Invoice Details Grid */}
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Invoice #</span>
            <span className="font-bold text-lg">{invoice.manualInvoiceNumber || invoice.number}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Reference #</span>
            <span className="font-bold text-lg">{invoice.number}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Date</span>
            <span className="font-semibold">{formatDate(invoice.issueDate)}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Due</span>
            <span className="font-semibold">{formatDate(invoice.dueDate)}</span>
          </div>
        </div>
      </div>

      {/* From and Bill To */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12 print:mb-8">
        <div className="border rounded-xl p-6 bg-gray-50/50">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">From</h3>
          <div className="text-sm">
            {invoice.freelancerName && <p className="font-bold text-base mb-1">{invoice.freelancerName}</p>}
            {invoice.freelancerEmail && <p className="text-muted-foreground">{invoice.freelancerEmail}</p>}
            {invoice.freelancerAddress && <p className="text-muted-foreground whitespace-pre-line text-xs mt-2">{invoice.freelancerAddress}</p>}
          </div>
        </div>

        <div className="border rounded-xl p-6 bg-gray-50/50">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Bill To</h3>
          <div className="text-sm">
            {invoice.clientName && <p className="font-bold text-base mb-1">{invoice.clientName}</p>}
            {invoice.clientCompany && invoice.clientCompany !== invoice.clientName && <p className="text-muted-foreground">{invoice.clientCompany}</p>}
            {invoice.clientEmail && <p className="text-muted-foreground">{invoice.clientEmail}</p>}
            {invoice.clientAddress && <p className="text-muted-foreground whitespace-pre-line text-xs mt-2">{invoice.clientAddress}</p>}
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="mb-12 print:mb-8 overflow-x-auto">
        {/* Desktop Table */}
        <div className="hidden sm:block min-w-full rounded-xl overflow-hidden border">
          <div 
            className="grid grid-cols-[2fr,2fr,0.8fr,0.8fr,1fr,1.2fr] gap-4 p-4 text-xs font-bold uppercase tracking-wide text-white"
            style={{ backgroundColor: invoice.brandColor || '#1e293b' }}
          >
            <div>Description</div>
            <div>Period</div>
            <div className="text-center">Days</div>
            <div className="text-center">Hours</div>
            <div className="text-center">Rate</div>
            <div className="text-right">Amount</div>
          </div>

          {invoice.lineItems.map((item, index) => (
            <div
              key={item.id}
              className="grid grid-cols-[2fr,2fr,0.8fr,0.8fr,1fr,1.2fr] gap-4 p-4 text-sm bg-white"
            >
              <div className="font-medium">{item.description || '—'}</div>
              <div className="text-sm">
                {item.periodFrom && item.periodTo ? (
                  <span>
                    {formatShortDate(item.periodFrom)} to {formatShortDate(item.periodTo)}
                  </span>
                ) : item.periodFrom ? formatShortDate(item.periodFrom) : item.periodTo ? formatShortDate(item.periodTo) : '—'}
              </div>
              <div className="text-center">{item.days || '—'}</div>
              <div className="text-center">{item.totalHours || 0}</div>
              <div className="text-center">
                {invoice.currency === 'USD' && '$'}
                {item.hourlyRate?.toFixed(2) || '0.00'}
              </div>
              <div className="text-right font-bold">
                {invoice.currency === 'USD' && '$'}
                {item.amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Cards */}
        <div className="sm:hidden px-4 space-y-3">
          {invoice.lineItems.map((item, index) => (
            <div
              key={item.id}
              className="bg-secondary/5 rounded-lg p-3 space-y-2 text-sm"
            >
              <div className="font-semibold">{item.description || '—'}</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {(item.periodFrom || item.periodTo) && (
                  <div>
                    <span className="text-muted-foreground">Period: </span>
                    {item.periodFrom && formatShortDate(item.periodFrom)}
                    {item.periodFrom && item.periodTo && ' — '}
                    {item.periodTo && formatShortDate(item.periodTo)}
                  </div>
                )}
                {item.days && (
                  <div>
                    <span className="text-muted-foreground">Days: </span>
                    {item.days}
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Hours: </span>
                  {item.totalHours || 0}
                </div>
                <div>
                  <span className="text-muted-foreground">Rate: </span>
                  {invoice.currency === 'USD' && '$'}
                  {item.hourlyRate?.toFixed(2) || '0.00'}
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-bold">
                  {invoice.currency === 'USD' && '$'}
                  {item.amount?.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="border rounded-xl p-6 space-y-0 mb-12 print:mb-8">
        <div className="flex justify-between py-4 text-base">
          <span className="font-medium">Subtotal</span>
          <span className="font-bold">
            {invoice.currency === 'USD' && '$'}
            {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {(invoice.taxPercent || 0) > 0 && (
          <div className="flex justify-between py-4 text-base border-b">
            <span className="font-medium">Tax</span>
            <span className="font-bold">
              {invoice.taxPercent}% ({invoice.currency === 'USD' && '$'}
              {taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
            </span>
          </div>
        )}

        {(invoice.discountFlat || 0) > 0 && (
          <div className="flex justify-between py-4 text-base border-b">
            <span className="font-medium">Discount</span>
            <span className="font-bold">
              {invoice.currency === 'USD' && '$'}
              {discountFlat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}

        <div 
          className="flex justify-between py-5 px-6 rounded-lg text-white font-bold text-lg -mx-6 -mb-6 mt-4"
          style={{ backgroundColor: invoice.brandColor || '#1e293b' }}
        >
          <span>Total Due</span>
          <span className="text-xl">
            {invoice.currency === 'USD' && '$'}
            {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Footer Notes */}
      {invoice.notes && (
        <div className="mb-12 print:mb-6">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
            {invoice.notes}
          </p>
        </div>
      )}

      {/* Powered by */}
      <div className="pt-8 border-t text-center">
        <p className="text-sm text-muted-foreground">
          Powered by <span className="font-semibold">Invoicer</span>
        </p>
      </div>
    </Card>
  )
}
