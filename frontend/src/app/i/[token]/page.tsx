'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { publicAPI } from '@/lib/api'
import { InvoicePreview } from '@/components/invoice/invoice-preview'
import { Button } from '@/components/ui/button'
import { Printer, Download, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function PublicInvoicePage() {
  const params = useParams()
  const token = params.token as string
  const { toast } = useToast()
  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

  useEffect(() => {
    // Check if redirected from successful payment
    const urlParams = new URLSearchParams(window.location.search)
    const paymentStatus = urlParams.get('payment')
    
    if (paymentStatus === 'success') {
      setShowSuccessMessage(true)
      // Remove query params from URL
      window.history.replaceState({}, '', window.location.pathname)
    }

    const fetchInvoice = async () => {
      try {
        const response = await publicAPI.getInvoice(token)
        setInvoice(response.data.invoice)
      } catch (err: any) {
        setError(err.response?.data?.message || 'Invoice not found')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchInvoice()
    }
  }, [token])

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    // In a real implementation, this would download the PDF from the server
    window.print()
  }

  const handlePayNow = async () => {
    if (!invoice?._id) return

    setPaymentLoading(true)
    try {
      const response = await publicAPI.createPaymentSession(invoice._id)
      // Redirect to Stripe Checkout
      window.location.href = response.data.url
    } catch (err: any) {
      toast({
        title: 'Payment Error',
        description: err.response?.data?.message || 'Failed to initiate payment. Please try again.',
        variant: 'destructive',
      })
      setPaymentLoading(false)
    }
  }

  const isPaid = invoice?.status === 'paid' || invoice?.payment?.status === 'paid'
  // Only show "Pay Now" if invoice owner is Pro plan
  const isProUser = invoice?.userPlanTier === 'pro'
  const canPay = invoice?.payment?.enabled && !isPaid && isProUser

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p>Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Invoice Not Found</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card no-print">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">Invoice {invoice.number}</h1>
              {isPaid && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  <CheckCircle2 className="h-3 w-3" />
                  Paid
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Payment Banner */}
      {canPay && (
        <div className="bg-blue-50 border-b border-blue-200 no-print">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-start gap-3 max-w-4xl mx-auto">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900">Online Payment Available</h3>
                <p className="text-sm text-blue-700 mt-1">
                  You can pay this invoice securely online using your credit or debit card.
                  Click "Pay Now" to proceed to checkout.
                </p>
              </div>
              <Button 
                onClick={handlePayNow} 
                disabled={paymentLoading}
                className="gap-2 flex-shrink-0"
              >
                <CreditCard className="h-4 w-4" />
                {paymentLoading ? 'Processing...' : 'Pay Now'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Success Banner */}
      {showSuccessMessage && !isPaid && (
        <div className="bg-blue-50 border-b border-blue-200 no-print">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-3 max-w-4xl mx-auto">
              <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900">Payment Successful!</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Your payment is being processed. The invoice status will update shortly.
                  You will receive a receipt via email.
                </p>
              </div>
              <button
                onClick={() => setShowSuccessMessage(false)}
                className="text-blue-600 hover:text-blue-800"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paid Banner */}
      {isPaid && (
        <div className="bg-green-50 border-b border-green-200 no-print">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-3 max-w-4xl mx-auto">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-900">Payment Received</h3>
                <p className="text-sm text-green-700 mt-1">
                  This invoice has been paid.
                  {invoice.payment?.paidAt && (
                    <> Paid on {new Date(invoice.payment.paidAt).toLocaleDateString()}.</>
                  )}
                  {invoice.payment?.receiptUrl && (
                    <> <a href={invoice.payment.receiptUrl} target="_blank" rel="noopener noreferrer" className="underline">View Receipt</a></>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Content */}
      <div className="container mx-auto px-4 py-8 print:p-0">
        <div className="max-w-4xl mx-auto invoice-container">
          <InvoicePreview invoice={invoice} />
        </div>
      </div>
    </div>
  )
}

