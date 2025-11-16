import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import { calculateInvoiceTotals, toCents } from '@/lib/currency'

export interface LineItem {
  id: string
  description: string
  periodFrom?: string
  periodTo?: string
  days?: number
  hoursPerDay?: number
  totalHours: number
  hourlyRate: number
  amount: number
}

export interface Invoice {
  id: string
  number: string
  manualInvoiceNumber?: string
  status: 'draft' | 'sent' | 'paid'
  issueDate: string
  dueDate: string
  currency: string
  paymentTerms?: string
  
  // Freelancer/From info
  freelancerName?: string
  freelancerEmail?: string
  freelancerAddress?: string
  
  // Client/Bill To info
  clientId?: string
  clientName?: string
  clientEmail?: string
  clientCompany?: string
  clientAddress?: string
  
  lineItems: LineItem[]
  
  // Totals
  subtotal?: number
  taxPercent?: number
  taxAmount?: number
  discountFlat?: number
  total?: number
  
  // Branding
  brandColor?: string
  
  notes?: string
  terms?: string
  createdAt: string
  updatedAt: string
}

export interface InvoiceTotals {
  subtotal: number
  taxAmount: number
  discountFlat: number
  total: number
}

interface InvoiceBuilderState {
  currentInvoice: Invoice | null
  guestInvoices: Invoice[]
  isGuest: boolean
  
  // Actions
  createNewInvoice: () => void
  updateInvoice: (updates: Partial<Invoice>) => void
  addLineItem: () => void
  updateLineItem: (id: string, updates: Partial<LineItem>) => void
  removeLineItem: (id: string) => void
  saveInvoice: () => void
  loadInvoice: (invoice: Invoice) => void
  clearCurrent: () => void
  getInvoiceTotals: () => InvoiceTotals
}

const createEmptyInvoice = (): Invoice => {
  const now = new Date().toISOString().split('T')[0]
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const year = new Date().getFullYear()
  const randomCounter = Math.floor(Math.random() * 9000) + 1000 // Random 4-digit number
  
  return {
    id: nanoid(),
    number: `INV-${year}-${randomCounter}`,
    status: 'draft',
    issueDate: now,
    dueDate,
    currency: 'USD',
    lineItems: [
      {
        id: nanoid(),
        description: '',
        totalHours: 0,
        hourlyRate: 100,
        amount: 0,
      },
    ],
    taxPercent: 0,
    discountFlat: 0,
    brandColor: '#1e293b',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export const useInvoiceBuilder = create<InvoiceBuilderState>()(
  persist(
    (set, get) => ({
      currentInvoice: null,
      guestInvoices: [],
      isGuest: true,

      createNewInvoice: () => {
        const newInvoice = createEmptyInvoice()
        set({ currentInvoice: newInvoice })
      },

      updateInvoice: (updates) => {
        set((state) => ({
          currentInvoice: state.currentInvoice
            ? {
                ...state.currentInvoice,
                ...updates,
                updatedAt: new Date().toISOString(),
              }
            : null,
        }))
      },

      addLineItem: () => {
        set((state) => {
          if (!state.currentInvoice) return state

          return {
            currentInvoice: {
              ...state.currentInvoice,
              lineItems: [
                ...state.currentInvoice.lineItems,
                {
                  id: nanoid(),
                  description: '',
                  totalHours: 0,
                  hourlyRate: 100,
                  amount: 0,
                },
              ],
              updatedAt: new Date().toISOString(),
            },
          }
        })
      },

      updateLineItem: (id, updates) => {
        set((state) => {
          if (!state.currentInvoice) return state

          return {
            currentInvoice: {
              ...state.currentInvoice,
              lineItems: state.currentInvoice.lineItems.map((item) =>
                item.id === id ? { ...item, ...updates } : item
              ),
              updatedAt: new Date().toISOString(),
            },
          }
        })
      },

      removeLineItem: (id) => {
        set((state) => {
          if (!state.currentInvoice) return state
          if (state.currentInvoice.lineItems.length === 1) return state

          return {
            currentInvoice: {
              ...state.currentInvoice,
              lineItems: state.currentInvoice.lineItems.filter((item) => item.id !== id),
              updatedAt: new Date().toISOString(),
            },
          }
        })
      },

      saveInvoice: () => {
        set((state) => {
          if (!state.currentInvoice) return state

          const existingIndex = state.guestInvoices.findIndex(
            (inv) => inv.id === state.currentInvoice!.id
          )

          if (existingIndex >= 0) {
            // Update existing
            const updatedInvoices = [...state.guestInvoices]
            updatedInvoices[existingIndex] = state.currentInvoice
            return { guestInvoices: updatedInvoices }
          } else {
            // Add new
            return {
              guestInvoices: [...state.guestInvoices, state.currentInvoice],
            }
          }
        })
      },

      loadInvoice: (invoice) => {
        set({ currentInvoice: invoice })
      },

      clearCurrent: () => {
        set({ currentInvoice: null })
      },

      getInvoiceTotals: () => {
        const { currentInvoice } = get()
        if (!currentInvoice) {
          return {
            subtotal: 0,
            taxAmount: 0,
            discountFlat: 0,
            total: 0,
          }
        }

        const subtotal = currentInvoice.lineItems.reduce((sum, item) => sum + (item.amount || 0), 0)
        const taxAmount = subtotal * ((currentInvoice.taxPercent || 0) / 100)
        const discountFlat = currentInvoice.discountFlat || 0
        const total = subtotal + taxAmount - discountFlat

        return {
          subtotal,
          taxAmount,
          discountFlat,
          total,
        }
      },
    }),
    {
      name: 'invoice-builder-storage',
      partialize: (state) => ({
        currentInvoice: state.currentInvoice,
        guestInvoices: state.guestInvoices,
        isGuest: state.isGuest,
      }),
    }
  )
)

