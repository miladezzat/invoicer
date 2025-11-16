'use client'

import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, User, Mail, Phone, Building, MapPin, Hash, FileText, Users, Sparkles } from 'lucide-react'
import { Button } from '../ui/button'
import { clientsAPI } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

interface Client {
  _id?: string
  clientType?: 'personal' | 'company'
  name: string
  email?: string
  phone?: string
  company?: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  taxId?: string
  notes?: string
  isActive?: boolean
}

interface ClientDialogProps {
  open: boolean
  onClose: () => void
  client?: Client | null
  onSaved: () => void
}

export function ClientDialog({ open, onClose, client, onSaved }: ClientDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Client>({
    clientType: 'personal',
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    taxId: '',
    notes: '',
    isActive: true,
  })

  useEffect(() => {
    if (client) {
      setFormData(client)
    } else {
      setFormData({
        clientType: 'personal',
        name: '',
        email: '',
        phone: '',
        company: '',
        address: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
        taxId: '',
        notes: '',
        isActive: true,
      })
    }
  }, [client, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Client name is required',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      // Only send editable fields, exclude system-managed fields
      const clientData = {
        clientType: formData.clientType,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        taxId: formData.taxId,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        postalCode: formData.postalCode,
        country: formData.country,
        notes: formData.notes,
        isActive: formData.isActive,
      }

      if (client?._id) {
        await clientsAPI.update(client._id, clientData)
        toast({
          title: 'Client updated',
          description: `${formData.name} has been updated successfully`,
        })
      } else {
        await clientsAPI.create(clientData)
        toast({
          title: 'Client added',
          description: `${formData.name} has been added successfully`,
        })
      }
      onSaved()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save client',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all sm:my-8 w-full max-w-2xl">
                <form onSubmit={handleSubmit}>
                  {/* Modern Gradient Header */}
                  <div className="relative px-6 py-6 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 overflow-hidden">
                    <div className="absolute inset-0 bg-black/5"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                          <Users className="h-6 w-6 text-white" />
                        </div>
                        <Dialog.Title as="h3" className="text-2xl font-bold text-white drop-shadow-sm">
                          {client ? 'Edit Client' : 'Add New Client'}
                        </Dialog.Title>
                      </div>
                      <button
                        type="button"
                        className="p-2 rounded-lg bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-colors"
                        onClick={onClose}
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <p className="relative mt-2 text-sm text-white/90">
                      {client ? 'Update client information and contact details' : 'Create a new client profile with contact and billing information'}
                    </p>
                  </div>

                  <div className="bg-white px-6 py-6 space-y-8">
                    {/* Client Type Selector */}
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-3">
                        Client Type <span className="text-red-500">*</span>
                      </label>
                      <p className="text-sm text-gray-500 mb-3">Choose whether this is a personal client or a company</p>
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, clientType: 'personal' })}
                          className={`group flex-1 flex items-center justify-center gap-3 px-5 py-4 rounded-xl border-2 transition-all shadow-sm hover:shadow-md ${
                            formData.clientType === 'personal'
                              ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-700 shadow-emerald-100'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-300'
                          }`}
                        >
                          <div className={`p-2 rounded-lg transition-colors ${
                            formData.clientType === 'personal'
                              ? 'bg-emerald-100'
                              : 'bg-gray-100 group-hover:bg-emerald-50'
                          }`}>
                            <User className="h-5 w-5" />
                          </div>
                          <span className="font-semibold">Personal</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, clientType: 'company' })}
                          className={`group flex-1 flex items-center justify-center gap-3 px-5 py-4 rounded-xl border-2 transition-all shadow-sm hover:shadow-md ${
                            formData.clientType === 'company'
                              ? 'border-cyan-500 bg-gradient-to-br from-cyan-50 to-blue-50 text-cyan-700 shadow-cyan-100'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-cyan-300'
                          }`}
                        >
                          <div className={`p-2 rounded-lg transition-colors ${
                            formData.clientType === 'company'
                              ? 'bg-cyan-100'
                              : 'bg-gray-100 group-hover:bg-cyan-50'
                          }`}>
                            <Building className="h-5 w-5" />
                          </div>
                          <span className="font-semibold">Company</span>
                        </button>
                      </div>
                    </div>

                    {/* Section Divider */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-white px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact Information
                        </span>
                      </div>
                    </div>

                    {/* Basic Information */}
                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 p-6">
                      <h4 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                        {formData.clientType === 'company' ? <Building className="h-5 w-5 text-cyan-500" /> : <User className="h-5 w-5 text-emerald-500" />}
                        {formData.clientType === 'company' ? 'Company Information' : 'Personal Information'}
                      </h4>
                      <p className="text-sm text-gray-500 mb-5">
                        {formData.clientType === 'company' 
                          ? 'Company details and primary contact person' 
                          : 'Full name and contact information'}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {formData.clientType === 'company' && (
                          <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-900 mb-2">
                              Company Name <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Building className="h-5 w-5 text-gray-400" />
                              </div>
                              <input
                                type="text"
                                required
                                value={formData.company}
                                onChange={(e) => setFormData({ ...formData, company: e.target.value, name: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                                placeholder="Acme Inc."
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Legal company name for invoicing</p>
                          </div>
                        )}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            {formData.clientType === 'company' ? 'Contact Person' : 'Full Name'} <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <User className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              required
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                              placeholder={formData.clientType === 'company' ? 'John Doe (Primary Contact)' : 'John Doe'}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {formData.clientType === 'company' ? 'Main point of contact at the company' : "Client's full legal name"}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            Email Address
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Mail className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                              placeholder="john@example.com"
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">For sending invoices and updates</p>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            Phone Number
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Phone className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="tel"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                              placeholder="+1 (555) 123-4567"
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Alternative contact method</p>
                        </div>
                        {formData.clientType === 'company' && (
                          <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-900 mb-2">
                              Tax ID / VAT Number
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Hash className="h-5 w-5 text-gray-400" />
                              </div>
                              <input
                                type="text"
                                value={formData.taxId}
                                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                placeholder="12-3456789 or VAT-123456"
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Required for tax reporting and compliance</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Section Divider */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-white px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location Details
                        </span>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 rounded-xl border border-blue-200 p-6">
                      <h4 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-blue-500" />
                        Billing Address
                      </h4>
                      <p className="text-sm text-gray-500 mb-5">Physical or mailing address for invoicing</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            Street Address
                          </label>
                          <input
                            type="text"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                            placeholder="123 Main Street, Suite 400"
                          />
                          <p className="text-xs text-gray-500 mt-1">Include apartment, suite, or unit number</p>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            City
                          </label>
                          <input
                            type="text"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                            placeholder="New York"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            State / Province
                          </label>
                          <input
                            type="text"
                            value={formData.state}
                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                            placeholder="NY"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            Postal Code
                          </label>
                          <input
                            type="text"
                            value={formData.postalCode}
                            onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                            placeholder="10001"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            Country
                          </label>
                          <input
                            type="text"
                            value={formData.country}
                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                            placeholder="United States"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section Divider */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-white px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Additional Information
                        </span>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 rounded-xl border border-amber-200 p-6">
                      <label className="flex items-center gap-2 text-base font-bold text-gray-900 mb-1">
                        <FileText className="h-5 w-5 text-amber-500" />
                        Notes & Remarks
                      </label>
                      <p className="text-sm text-gray-500 mb-4">Internal notes, preferences, or special instructions</p>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all resize-none bg-white"
                        placeholder="E.g., Prefers email communication, NET 30 payment terms, VIP client..."
                      />
                      <p className="text-xs text-gray-500 mt-2">These notes are for internal use only and won't appear on invoices</p>
                    </div>
                  </div>

                  {/* Enhanced Footer */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-5 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-emerald-500" />
                        <span>All changes are saved instantly</span>
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={onClose}
                          disabled={loading}
                          className="border-2 hover:bg-gray-100 font-semibold"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={loading}
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                        >
                          {loading ? (
                            <span className="flex items-center gap-2">
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Saving...
                            </span>
                          ) : client ? (
                            '✓ Update Client'
                          ) : (
                            '+ Add Client'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}

