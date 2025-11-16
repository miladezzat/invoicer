import { z } from 'zod'

export const lineItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, 'Description is required'),
  periodFrom: z.string().optional(),
  periodTo: z.string().optional(),
  days: z.coerce.number().min(0, 'Days must be positive').optional(),
  hoursPerDay: z.coerce.number().min(0, 'Hours per day must be positive').optional(),
  totalHours: z.coerce.number().min(0, 'Total hours must be positive').optional(),
  hourlyRate: z.coerce.number().min(0, 'Rate must be positive'),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
})

export const invoiceSchema = z.object({
  // Basic info
  freelancerName: z.string().min(1, 'Freelancer name is required'),
  freelancerEmail: z.string().email('Invalid email address'),
  freelancerAddress: z.string().optional(),
  
  // Client info
  clientName: z.string().min(1, 'Client name is required'),
  clientEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  clientCompany: z.string().optional(),
  clientAddress: z.string().optional(),
  
  // Invoice details
  manualInvoiceNumber: z.string().optional(),
  issueDate: z.string().refine((date) => {
    const parsed = new Date(date)
    return !isNaN(parsed.getTime())
  }, 'Invalid date'),
  dueDate: z.string().refine((date) => {
    const parsed = new Date(date)
    return !isNaN(parsed.getTime())
  }, 'Invalid date'),
  
  // Financial
  currency: z.string().min(1, 'Currency is required'),
  taxRate: z.coerce.number().min(0, 'Tax rate must be positive').max(100, 'Tax rate cannot exceed 100%').optional(),
  discount: z.coerce.number().min(0, 'Discount must be positive').optional(),
  
  // Line items
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  
  // Notes
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
}).refine((data) => {
  // Validate due date is after issue date
  const issueDate = new Date(data.issueDate)
  const dueDate = new Date(data.dueDate)
  return dueDate >= issueDate
}, {
  message: 'Due date must be on or after issue date',
  path: ['dueDate'],
})

export type InvoiceFormData = z.infer<typeof invoiceSchema>
export type LineItemFormData = z.infer<typeof lineItemSchema>
