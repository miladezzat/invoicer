'use client'

import { useInvoiceBuilder } from '@/store/invoice-builder'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import { useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { ClientSelector } from './client-selector'

export function InvoiceBuilderForm() {
  const { currentInvoice, updateInvoice, addLineItem, updateLineItem, removeLineItem } =
    useInvoiceBuilder()
  const { isAuthenticated } = useAuth()

  if (!currentInvoice) return null

  // Auto-calculate line item amount when hours or rate changes
  const handleLineItemChange = (id: string, field: string, value: any) => {
    const item = currentInvoice.lineItems.find(i => i.id === id)
    if (!item) return

    const updates: any = { [field]: value }

    // Calculate total hours if days or hoursPerDay changed
    if (field === 'days' || field === 'hoursPerDay') {
      const days = field === 'days' ? value : (item.days || 0)
      const hoursPerDay = field === 'hoursPerDay' ? value : (item.hoursPerDay || 0)
      updates.totalHours = days * hoursPerDay
      updates.amount = updates.totalHours * (item.hourlyRate || 0)
    }
    
    // Calculate amount if totalHours or hourlyRate changed
    if (field === 'totalHours' || field === 'hourlyRate') {
      const totalHours = field === 'totalHours' ? value : (item.totalHours || 0)
      const hourlyRate = field === 'hourlyRate' ? value : (item.hourlyRate || 0)
      updates.amount = totalHours * hourlyRate
    }

    updateLineItem(id, updates)
  }

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Freelancer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="freelancerName">Freelancer Name</Label>
              <Input
                id="freelancerName"
                value={currentInvoice.freelancerName || ''}
                onChange={(e) => updateInvoice({ freelancerName: e.target.value })}
                placeholder="Your name"
              />
            </div>
            <div>
              <Label htmlFor="freelancerEmail">Email</Label>
              <Input
                id="freelancerEmail"
                type="email"
                value={currentInvoice.freelancerEmail || ''}
                onChange={(e) => updateInvoice({ freelancerEmail: e.target.value })}
                placeholder="your@email.com"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="freelancerAddress">Address</Label>
            <Input
              id="freelancerAddress"
              value={currentInvoice.freelancerAddress || ''}
              onChange={(e) => updateInvoice({ freelancerAddress: e.target.value })}
              placeholder="Your address"
            />
          </div>

          {/* Client Name - with search for authenticated users */}
          <div>
            {isAuthenticated ? (
              <ClientSelector
                selectedClient={{
                  id: currentInvoice.clientId,
                  name: currentInvoice.clientName,
                }}
                onSelect={(client) => {
                  if (client) {
                    console.log('Selected client:', client)
                    console.log('Client address:', client.address)
                    updateInvoice({
                      clientId: client._id,
                      clientName: client.name,
                      clientEmail: client.email,
                      clientCompany: client.company,
                      clientAddress: client.address,
                    })
                  } else {
                    updateInvoice({
                      clientId: undefined,
                      clientName: '',
                      clientEmail: undefined,
                      clientCompany: undefined,
                      clientAddress: undefined,
                    })
                  }
                }}
                onManualInput={(name) => {
                  updateInvoice({
                    clientId: undefined,
                    clientName: name,
                  })
                }}
              />
            ) : (
              <>
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  value={currentInvoice.clientName || ''}
                  onChange={(e) => updateInvoice({ clientName: e.target.value })}
                  placeholder="Company Name"
                />
              </>
            )}
          </div>

          {/* Invoice Numbers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="manualInvoiceNumber">Invoice Number</Label>
              <Input
                id="manualInvoiceNumber"
                value={currentInvoice.manualInvoiceNumber || ''}
                onChange={(e) => updateInvoice({ manualInvoiceNumber: e.target.value })}
                placeholder="Enter invoice number"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your custom invoice number
              </p>
            </div>
            <div>
              <Label htmlFor="invoiceNumber">Reference Number</Label>
              <Input
                id="invoiceNumber"
                value={currentInvoice.number}
                readOnly
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Auto-generated reference
              </p>
            </div>
          </div>

          {/* Payment Terms */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Select
                id="paymentTerms"
                value={currentInvoice.paymentTerms || ''}
                onChange={(e) => updateInvoice({ paymentTerms: e.target.value })}
              >
                <option value="">Select payment terms</option>
                <option value="Due on Receipt">Due on Receipt</option>
                <option value="Net 7">Net 7 (Payment due in 7 days)</option>
                <option value="Net 10">Net 10 (Payment due in 10 days)</option>
                <option value="Net 15">Net 15 (Payment due in 15 days)</option>
                <option value="Net 30">Net 30 (Payment due in 30 days)</option>
                <option value="Net 45">Net 45 (Payment due in 45 days)</option>
                <option value="Net 60">Net 60 (Payment due in 60 days)</option>
                <option value="Net 90">Net 90 (Payment due in 90 days)</option>
                <option value="Due End of Month">Due End of Month</option>
                <option value="Due End of Next Month">Due End of Next Month</option>
                <option value="50% Upfront, 50% on Completion">50% Upfront, 50% on Completion</option>
                <option value="Payment on Delivery">Payment on Delivery</option>
                <option value="Advance Payment Required">Advance Payment Required</option>
              </Select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="issueDate">Invoice Date</Label>
              <Input
                id="issueDate"
                type="date"
                value={currentInvoice.issueDate}
                onChange={(e) => updateInvoice({ issueDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={currentInvoice.dueDate}
                onChange={(e) => updateInvoice({ dueDate: e.target.value })}
              />
            </div>
          </div>

          {/* Currency and Brand Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={currentInvoice.currency}
                onChange={(e) => updateInvoice({ currency: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="brandColor">Brand Color</Label>
              <div className="flex gap-2">
                <Input
                  id="brandColor"
                  type="color"
                  value={currentInvoice.brandColor || '#1e293b'}
                  onChange={(e) => updateInvoice({ brandColor: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={currentInvoice.brandColor || '#1e293b'}
                  onChange={(e) => updateInvoice({ brandColor: e.target.value })}
                  placeholder="#1e293b"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          <Button onClick={addLineItem} variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentInvoice.lineItems.map((item, index) => (
            <div key={item.id} className="border rounded-lg p-4 space-y-4 bg-secondary/10">
              <div className="flex items-start justify-between">
                <span className="text-sm font-medium">Item {index + 1}</span>
                {currentInvoice.lineItems.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLineItem(item.id)}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>

              {/* Description */}
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Input
                  value={item.description}
                  onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                  placeholder="e.g., Web Development Services"
                  className="mt-1"
                />
              </div>

              {/* Period */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Period From</Label>
                  <Input
                    type="date"
                    value={item.periodFrom || ''}
                    onChange={(e) => updateLineItem(item.id, { periodFrom: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Period To</Label>
                  <Input
                    type="date"
                    value={item.periodTo || ''}
                    onChange={(e) => updateLineItem(item.id, { periodTo: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Days, Hours/Day, Total Hours */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Days (Optional)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={item.days || ''}
                    onChange={(e) => handleLineItemChange(item.id, 'days', Number(e.target.value))}
                    placeholder="15"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Hours/Day (Optional)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={item.hoursPerDay || ''}
                    onChange={(e) => handleLineItemChange(item.id, 'hoursPerDay', Number(e.target.value))}
                    placeholder="8"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Total Hours</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={item.totalHours || ''}
                    onChange={(e) => handleLineItemChange(item.id, 'totalHours', Number(e.target.value))}
                    placeholder="120"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Hourly Rate and Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Hourly Rate</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.hourlyRate || ''}
                    onChange={(e) => handleLineItemChange(item.id, 'hourlyRate', Number(e.target.value))}
                    placeholder="100"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Amount (Auto)</Label>
                  <Input
                    type="number"
                    value={item.amount || 0}
                    readOnly
                    className="mt-1 bg-muted"
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardHeader>
          <CardTitle>Totals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="taxPercent">Tax (%)</Label>
              <Input
                id="taxPercent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={currentInvoice.taxPercent || 0}
                onChange={(e) => updateInvoice({ taxPercent: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="discountFlat">Discount (Flat)</Label>
              <Input
                id="discountFlat"
                type="number"
                min="0"
                step="0.01"
                value={currentInvoice.discountFlat || 0}
                onChange={(e) => updateInvoice({ discountFlat: Number(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Footer Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={currentInvoice.notes || ''}
            onChange={(e) => updateInvoice({ notes: e.target.value })}
            placeholder="Optional text shown under totals"
          />
        </CardContent>
      </Card>
    </div>
  )
}
