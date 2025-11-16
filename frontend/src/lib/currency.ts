/**
 * Currency calculation utilities using integer math to avoid floating point errors
 * All amounts are stored as cents (smallest currency unit)
 */

export type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY'

export interface MoneyAmount {
  amount: number // in cents
  currency: Currency
}

export const currencyConfig: Record<Currency, { symbol: string; decimals: number }> = {
  USD: { symbol: '$', decimals: 2 },
  EUR: { symbol: '€', decimals: 2 },
  GBP: { symbol: '£', decimals: 2 },
  JPY: { symbol: '¥', decimals: 0 },
}

/**
 * Convert dollars to cents
 */
export function toCents(dollars: number): number {
  return Math.round(dollars * 100)
}

/**
 * Convert cents to dollars
 */
export function toDollars(cents: number): number {
  return cents / 100
}

/**
 * Format money amount for display
 */
export function formatMoney(amount: number, currency: Currency = 'USD'): string {
  const config = currencyConfig[currency]
  const dollars = toDollars(amount)
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(dollars)
}

/**
 * Calculate line item total
 */
export function calculateLineItemTotal(
  quantity: number,
  unitPriceCents: number,
  discountCents: number = 0,
  taxRate: number = 0
): number {
  const subtotal = quantity * unitPriceCents
  const afterDiscount = subtotal - discountCents
  const tax = Math.round(afterDiscount * (taxRate / 100))
  return afterDiscount + tax
}

/**
 * Calculate invoice totals
 */
export interface InvoiceTotals {
  subtotalCents: number
  discountCents: number
  taxCents: number
  totalCents: number
}

export function calculateInvoiceTotals(
  lineItems: Array<{
    quantity: number
    unitPrice: number
    discount?: number
    taxRate?: number
  }>
): InvoiceTotals {
  let subtotalCents = 0
  let discountCents = 0
  let taxCents = 0

  for (const item of lineItems) {
    const itemSubtotal = item.quantity * toCents(item.unitPrice)
    const itemDiscount = item.discount ? toCents(item.discount) : 0
    const itemTax = Math.round((itemSubtotal - itemDiscount) * ((item.taxRate || 0) / 100))

    subtotalCents += itemSubtotal
    discountCents += itemDiscount
    taxCents += itemTax
  }

  const totalCents = subtotalCents - discountCents + taxCents

  return {
    subtotalCents,
    discountCents,
    taxCents,
    totalCents,
  }
}

