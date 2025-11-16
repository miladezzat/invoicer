'use client'

import { useInvoiceBuilder } from '@/store/invoice-builder'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Copy } from 'lucide-react'
import { useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { ClientSelector } from './client-selector'

interface InvoiceBuilderFormProps {
  readOnly?: boolean
}

export function InvoiceBuilderForm({ readOnly = false }: InvoiceBuilderFormProps) {
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
      <Card className="border-2 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="text-lg font-bold">Basic Information</span>
            </div>
            {currentInvoice.status && (
              <Badge variant={currentInvoice.status === 'paid' ? 'success' : 'secondary'} className="text-sm px-3 py-1">
                {currentInvoice.status}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {/* Section: Your Information */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-blue-200 to-transparent"></div>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Your Information</span>
              <div className="h-px flex-1 bg-gradient-to-l from-blue-200 to-transparent"></div>
            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="freelancerName" required className="text-sm font-semibold flex items-center gap-1">
                Full Name
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="freelancerName"
                value={currentInvoice.freelancerName || ''}
                onChange={(e) => updateInvoice({ freelancerName: e.target.value })}
                placeholder="John Doe"
                required
                disabled={readOnly}
                className="h-11 mt-1.5 border-2 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <Label htmlFor="freelancerEmail" required className="text-sm font-semibold flex items-center gap-1">
                Email Address
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="freelancerEmail"
                type="email"
                value={currentInvoice.freelancerEmail || ''}
                onChange={(e) => updateInvoice({ freelancerEmail: e.target.value })}
                placeholder="john@example.com"
                required
                disabled={readOnly}
                className="h-11 mt-1.5 border-2 focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="text-xs text-slate-500 mt-1">Invoice will be sent from this email</p>
            </div>
          </div>
          <div>
            <Label htmlFor="freelancerAddress" className="text-sm font-semibold">Business Address</Label>
            <Input
              id="freelancerAddress"
              value={currentInvoice.freelancerAddress || ''}
              onChange={(e) => updateInvoice({ freelancerAddress: e.target.value })}
              placeholder="123 Business St, City, State, ZIP"
              disabled={readOnly}
              className="h-11 mt-1.5 border-2 focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="text-xs text-slate-500 mt-1">Optional: Will appear on invoice</p>
          </div>
          </div>

          {/* Section: Client Information */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-green-200 to-transparent"></div>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Client Information</span>
              <div className="h-px flex-1 bg-gradient-to-l from-green-200 to-transparent"></div>
            </div>
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
                disabled={readOnly}
              />
            ) : (
              <>
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  value={currentInvoice.clientName || ''}
                  onChange={(e) => updateInvoice({ clientName: e.target.value })}
                  placeholder="Company Name"
                  disabled={readOnly}
                />
              </>
            )}
          </div>
          </div>

          {/* Section: Invoice Details */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-purple-200 to-transparent"></div>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Invoice Details</span>
              <div className="h-px flex-1 bg-gradient-to-l from-purple-200 to-transparent"></div>
            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="manualInvoiceNumber" className="text-sm font-semibold">Invoice Number</Label>
              <Input
                id="manualInvoiceNumber"
                value={currentInvoice.manualInvoiceNumber || ''}
                onChange={(e) => updateInvoice({ manualInvoiceNumber: e.target.value })}
                placeholder="INV-001"
                disabled={readOnly}
                className="h-11 mt-1.5 border-2 focus:ring-2 focus:ring-purple-500/20"
              />
              <p className="text-xs text-slate-500 mt-1">
                Your custom invoice number
              </p>
            </div>
            <div>
              <Label htmlFor="invoiceNumber" className="text-sm font-semibold">Reference Number</Label>
              <div className="relative mt-1.5">
                <Input
                  id="invoiceNumber"
                  value={currentInvoice.number}
                  readOnly
                  disabled
                  className="bg-slate-100 cursor-not-allowed h-11 border-2 text-slate-600 font-mono"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Badge variant="outline" className="text-xs">Auto</Badge>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                System-generated unique ID
              </p>
            </div>
          </div>

          {/* Payment Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="paymentTerms" className="text-sm font-semibold">Payment Terms</Label>
              <Select
                id="paymentTerms"
                value={currentInvoice.paymentTerms || ''}
                onChange={(e) => updateInvoice({ paymentTerms: e.target.value })}
                disabled={readOnly}
                className="h-11 mt-1.5 border-2 focus:ring-2 focus:ring-purple-500/20"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="issueDate" required className="text-sm font-semibold flex items-center gap-1">
                Invoice Date
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="issueDate"
                type="date"
                value={currentInvoice.issueDate}
                onChange={(e) => updateInvoice({ issueDate: e.target.value })}
                required
                disabled={readOnly}
                className="h-11 mt-1.5 border-2 focus:ring-2 focus:ring-purple-500/20"
              />
              <p className="text-xs text-slate-500 mt-1">Date invoice was created</p>
            </div>
            <div>
              <Label htmlFor="dueDate" required className="text-sm font-semibold flex items-center gap-1">
                Due Date
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={currentInvoice.dueDate}
                onChange={(e) => updateInvoice({ dueDate: e.target.value })}
                required
                disabled={readOnly}
                className="h-11 mt-1.5 border-2 focus:ring-2 focus:ring-purple-500/20"
              />
              <p className="text-xs text-slate-500 mt-1">Payment deadline</p>
            </div>
          </div>

          {/* Currency and Brand Color */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="currency" required className="text-sm font-semibold flex items-center gap-1">
                Currency
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="currency"
                value={currentInvoice.currency}
                onChange={(e) => updateInvoice({ currency: e.target.value })}
                placeholder="USD"
                required
                disabled={readOnly}
                className="h-11 mt-1.5 border-2 focus:ring-2 focus:ring-purple-500/20 uppercase font-semibold"
              />
              <p className="text-xs text-slate-500 mt-1">3-letter currency code</p>
            </div>
            <div>
              <Label htmlFor="brandColor" className="text-sm font-semibold">Brand Color</Label>
              <div className="flex gap-2 mt-1.5">
                <div className="relative">
                  <Input
                    id="brandColor"
                    type="color"
                    value={currentInvoice.brandColor || '#1e293b'}
                    onChange={(e) => updateInvoice({ brandColor: e.target.value })}
                    disabled={readOnly}
                    className="w-16 h-11 cursor-pointer border-2"
                  />
                </div>
                <Input
                  value={currentInvoice.brandColor || '#1e293b'}
                  onChange={(e) => updateInvoice({ brandColor: e.target.value })}
                  placeholder="#1e293b"
                  disabled={readOnly}
                  className="flex-1 h-11 font-mono border-2 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Customize invoice accent color</p>
            </div>
          </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card className="border-2 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Line Items</CardTitle>
                <p className="text-xs text-slate-600 mt-0.5">{currentInvoice.lineItems.length} {currentInvoice.lineItems.length === 1 ? 'item' : 'items'}</p>
              </div>
            </div>
            {!readOnly && (
              <Button onClick={addLineItem} size="sm" className="gap-2 h-10 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-md">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline font-semibold">Add Item</span>
                <span className="sm:hidden font-semibold">Add</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {currentInvoice.lineItems.map((item, index) => (
            <div key={item.id} className="border-2 rounded-xl p-4 sm:p-6 space-y-4 bg-gradient-to-br from-white to-slate-50 hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 font-bold text-sm">
                    {index + 1}
                  </div>
                  {item.amount > 0 && (
                    <div className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200">
                      <span className="text-sm font-bold text-green-700">
                        {currentInvoice.currency} {item.amount.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
                {!readOnly && (
                  <div className="flex items-center gap-2">
                    {currentInvoice.lineItems.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(item.id)}
                        className="h-9 w-9 p-0 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <Label className="text-xs font-semibold text-foreground" required>Description</Label>
                <Input
                  value={item.description}
                  onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                  placeholder="e.g., Web Development Services"
                  disabled={readOnly}
                  className="mt-1 h-11"
                  required
                />
              </div>

              {/* Period */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Period From</Label>
                  <Input
                    type="date"
                    value={item.periodFrom || ''}
                    onChange={(e) => updateLineItem(item.id, { periodFrom: e.target.value })}
                    disabled={readOnly}
                    className="mt-1 h-11"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Period To</Label>
                  <Input
                    type="date"
                    value={item.periodTo || ''}
                    onChange={(e) => updateLineItem(item.id, { periodTo: e.target.value })}
                    disabled={readOnly}
                    className="mt-1 h-11"
                  />
                </div>
              </div>

              {/* Days, Hours/Day, Total Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Days</Label>
                  <Input
                    type="number"
                    min="0"
                    value={item.days || ''}
                    onChange={(e) => handleLineItemChange(item.id, 'days', Number(e.target.value))}
                    placeholder="15"
                    disabled={readOnly}
                    className="mt-1 h-11"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Hours/Day</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={item.hoursPerDay || ''}
                    onChange={(e) => handleLineItemChange(item.id, 'hoursPerDay', Number(e.target.value))}
                    placeholder="8"
                    disabled={readOnly}
                    className="mt-1 h-11"
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
                    disabled={readOnly}
                    className="mt-1 h-11"
                  />
                </div>
              </div>

              {/* Hourly Rate and Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-foreground" required>Hourly Rate</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.hourlyRate || ''}
                    onChange={(e) => handleLineItemChange(item.id, 'hourlyRate', Number(e.target.value))}
                    placeholder="100"
                    disabled={readOnly}
                    className="mt-1 h-11"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-foreground">Amount (Auto-calculated)</Label>
                  <div className="mt-1 h-11 bg-primary/5 border-2 border-primary/20 rounded-md flex items-center px-3 font-bold text-primary">
                    {currentInvoice.currency} {(item.amount || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Totals */}
      <Card className="border-2 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Totals & Adjustments</CardTitle>
              <p className="text-xs text-slate-600 mt-0.5">Optional tax and discounts</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="taxPercent" className="text-sm font-semibold">Tax Rate (%)</Label>
              <Input
                id="taxPercent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={currentInvoice.taxPercent || 0}
                onChange={(e) => updateInvoice({ taxPercent: Number(e.target.value) })}
                disabled={readOnly}
                placeholder="0.00"
                className="h-11 mt-1.5 border-2 focus:ring-2 focus:ring-amber-500/20"
              />
              <p className="text-xs text-slate-500 mt-1">Applied to subtotal</p>
            </div>
            <div>
              <Label htmlFor="discountFlat" className="text-sm font-semibold">Flat Discount ({currentInvoice.currency})</Label>
              <Input
                id="discountFlat"
                type="number"
                min="0"
                step="0.01"
                value={currentInvoice.discountFlat || 0}
                onChange={(e) => updateInvoice({ discountFlat: Number(e.target.value) })}
                disabled={readOnly}
                placeholder="0.00"
                className="h-11 mt-1.5 border-2 focus:ring-2 focus:ring-amber-500/20"
              />
              <p className="text-xs text-slate-500 mt-1">Deducted from total</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer Notes */}
      <Card className="border-2 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-100 rounded-lg">
              <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Footer Notes</CardTitle>
              <p className="text-xs text-slate-600 mt-0.5">Additional information for your client</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Textarea
            value={currentInvoice.notes || ''}
            onChange={(e) => updateInvoice({ notes: e.target.value })}
            placeholder="Add payment instructions, thank you message, or any other details...\n\nExample:\nThank you for your business!\nPayment is due within 30 days.\nPlease reference invoice number in your payment."
            disabled={readOnly}
            className="min-h-[140px] border-2 focus:ring-2 focus:ring-slate-500/20 resize-none"
          />
        </CardContent>
      </Card>
    </div>
  )
}
