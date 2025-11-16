'use client'

import { useEffect, useState, Suspense, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useInvoiceBuilder } from '@/store/invoice-builder'
import { InvoiceBuilderForm } from '@/components/invoice/builder-form'
import { InvoicePreview } from '@/components/invoice/invoice-preview'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UpgradeModal } from '@/components/ui/upgrade-modal'
import { EmailModal } from '@/components/ui/email-modal'
import { FileText, Save, Share2, Printer, Plus, Mail, CheckCircle2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { UserDropdown } from '@/components/ui/user-dropdown'
import { useFeatures } from '@/contexts/features-context'
import { Feature } from '@/contexts/features-context'
import { invoicesAPI, clientsAPI } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { nanoid } from 'nanoid'

function BuilderContent() {
  const searchParams = useSearchParams()
  const invoiceId = searchParams.get('id')
  const clientId = searchParams.get('clientId')
  const { currentInvoice, createNewInvoice, saveInvoice, updateInvoice, loadInvoice } = useInvoiceBuilder()
  const { user, isAuthenticated, logout } = useAuth()
  const { hasFeature } = useFeatures()
  const { toast } = useToast()
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>()
  const previousInvoiceRef = useRef<string>()
  
  // Check if invoice is read-only (paid invoices cannot be edited)
  const isReadOnly = currentInvoice?.status === 'paid'

  // Auto-save functionality (only for authenticated users with existing invoices)
  useEffect(() => {
    if (!isAuthenticated || !invoiceId || !currentInvoice || isReadOnly) return

    const currentInvoiceString = JSON.stringify(currentInvoice)
    
    // Skip if invoice hasn't changed
    if (previousInvoiceRef.current === currentInvoiceString) return
    
    previousInvoiceRef.current = currentInvoiceString
    setSaveStatus('unsaved')

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    // Set new auto-save timeout (5 seconds)
    autoSaveTimeoutRef.current = setTimeout(() => {
      handleSave(true) // Pass true to indicate auto-save
    }, 5000)

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [currentInvoice, isAuthenticated, invoiceId])

  // Initialize new invoice or load client data
  useEffect(() => {
    const initializeInvoice = async () => {
      // If no invoiceId, create a fresh new invoice
      if (!invoiceId) {
        createNewInvoice()
        
        // Then load client data if clientId is present
        if (isAuthenticated && clientId) {
          try {
            const response = await clientsAPI.get(clientId)
            const client = response.data.client
            
            // Update the new invoice with client data from API
            updateInvoice({
              clientId: client._id,
              clientName: client.name,
              clientEmail: client.email,
              clientCompany: client.company,
              clientAddress: client.address,
            })
            
            toast({
              title: 'Client selected',
              description: `Creating invoice for ${client.name}`,
            })
          } catch (error) {
            console.error('Failed to load client:', error)
            toast({
              title: 'Error',
              description: 'Failed to load client data',
              variant: 'destructive',
            })
          }
        }
      }
    }

    initializeInvoice()
  }, [isAuthenticated, clientId, invoiceId])

  // Load existing invoice if ID is in URL
  useEffect(() => {
    const loadExistingInvoice = async () => {
      if (!invoiceId || !isAuthenticated) return
      
      setIsLoadingInvoice(true)
      try {
        const response = await invoicesAPI.get(invoiceId)
        const invoiceData = response.data.invoice || response.data
        
        // Transform backend data to frontend format
        const transformedInvoice = {
          id: invoiceData._id || invoiceData.id,
          number: invoiceData.number,
          status: invoiceData.status || 'draft',
          issueDate: invoiceData.issueDate?.split('T')[0] || new Date().toISOString().split('T')[0],
          dueDate: invoiceData.dueDate?.split('T')[0] || new Date().toISOString().split('T')[0],
          currency: invoiceData.currency || 'USD',
          paymentTerms: invoiceData.paymentTerms,
          
          // Freelancer info
          freelancerName: invoiceData.freelancerName,
          freelancerEmail: invoiceData.freelancerEmail,
          
          // Client info - extract _id if clientId is populated as object
          clientId: typeof invoiceData.clientId === 'object' && invoiceData.clientId?._id 
            ? invoiceData.clientId._id 
            : invoiceData.clientId,
          clientName: invoiceData.clientName,
          clientEmail: invoiceData.clientEmail,
          clientCompany: invoiceData.clientCompany,
          clientAddress: invoiceData.clientAddress,
          
          // Line items - ensure they have frontend IDs
          lineItems: (invoiceData.lineItems || []).map((item: any) => ({
            id: nanoid(), // Generate new frontend ID
            description: item.description || '',
            periodFrom: item.periodFrom?.split('T')[0],
            periodTo: item.periodTo?.split('T')[0],
            days: item.days,
            hoursPerDay: item.hoursPerDay,
            totalHours: item.totalHours || 0,
            hourlyRate: item.hourlyRate || 0,
            amount: item.amount || 0,
          })),
          
          // Totals
          subtotal: invoiceData.subtotal,
          taxPercent: invoiceData.taxPercent || 0,
          taxAmount: invoiceData.taxAmount,
          discountFlat: invoiceData.discountFlat || 0,
          total: invoiceData.total,
          
          // Branding
          brandColor: invoiceData.brandColor || '#1e293b',
          
          notes: invoiceData.notes,
          terms: invoiceData.terms,
          createdAt: invoiceData.createdAt || new Date().toISOString(),
          updatedAt: invoiceData.updatedAt || new Date().toISOString(),
        }
        
        loadInvoice(transformedInvoice)
        toast({
          title: 'Invoice loaded',
          description: `Loaded invoice ${invoiceData.number}`,
        })
      } catch (error: any) {
        console.error('Failed to load invoice:', error)
        toast({
          title: 'Error',
          description: 'Failed to load invoice. Please try again.',
          variant: 'destructive',
        })
        createNewInvoice()
      } finally {
        setIsLoadingInvoice(false)
      }
    }

    if (invoiceId) {
      loadExistingInvoice()
    }
  }, [invoiceId, isAuthenticated])

  const handleSave = useCallback(async (isAutoSave = false) => {
    if (!currentInvoice) return
    
    if (!isAuthenticated) {
      // Save locally for guest users
      saveInvoice()
      if (!isAutoSave) {
        toast({
          title: 'Saved locally',
          description: 'Invoice saved locally! Sign up to save to the cloud.',
        })
      }
      setSaveStatus('saved')
      return
    }
    
    setIsSaving(true)
    setSaveStatus('saving')
    
    // Rest of authenticated save logic
    try {
      // Check if user has permission to save invoices
      if (!hasFeature(Feature.SAVE_INVOICE)) {
        setShowUpgradeModal(true)
        setIsSaving(false)
        setSaveStatus('unsaved')
        return
      }
        // Prepare invoice data - remove frontend-specific and calculated fields
        const invoiceToSave = currentInvoice
        const { 
          id, 
          number,
          status, 
          createdAt, 
          updatedAt,
          subtotal,
          taxAmount,
          total,
          ...invoiceData 
        } = invoiceToSave
        
        // Remove 'id' from line items (backend doesn't use them)
        const cleanedLineItems = invoiceData.lineItems.map(({ id: itemId, ...item }) => item)
        
        // Ensure clientId is a string (extract _id if it's an object)
        let clientId = invoiceData.clientId
        if (typeof clientId === 'object' && (clientId as any)?._id) {
          clientId = (clientId as any)._id
        }
        
        // Remove undefined values to avoid validation errors
        const dataToSend = Object.entries({
          ...invoiceData,
          clientId,
          lineItems: cleanedLineItems,
          // Include custom number if the user has edited it
          customNumber: number && number !== `INV-${Date.now()}` 
            ? number 
            : undefined,
        }).reduce((acc, [key, value]) => {
          if (value !== undefined) {
            acc[key] = value
        }
          return acc
        }, {} as any)
        
        console.log('Sending to backend:', dataToSend)
        
        // Check if this is an update (has invoiceId) or create new
        let response
        if (invoiceId) {
          // Update existing invoice - include number field for updates
          response = await invoicesAPI.update(invoiceId, { ...dataToSend, number })
          toast({
            title: 'Invoice updated!',
            description: `Invoice ${invoiceToSave.number} has been updated successfully.`,
          })
        } else {
          // Create new invoice
          response = await invoicesAPI.create(dataToSend)
          const savedInvoice = response.data.invoice || response.data
          updateInvoice({
            id: savedInvoice._id?.toString() || savedInvoice.id,
            number: savedInvoice.number,
          })
          if (!isAutoSave) {
            toast({
              title: 'Invoice saved!',
              description: `Invoice ${savedInvoice.number} has been saved successfully.`,
            })
          }
        }
        
        console.log('Backend response:', response.data)
        saveInvoice() // Also save locally
        setSaveStatus('saved')
      } catch (error: any) {
        console.error('Save error:', error)
        let errorMessage = 'Failed to save invoice. Please try again.'
        
        if (error.response?.status === 409) {
          // Conflict - duplicate invoice number
          errorMessage = error.response?.data?.message || 'This invoice number already exists. Please try again.'
        } else if (error.response?.data?.message) {
          if (Array.isArray(error.response.data.message)) {
            errorMessage = error.response.data.message.join(', ')
          } else {
            errorMessage = error.response.data.message
          }
        } else if (error.message) {
          errorMessage = error.message
        }
        
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
        setSaveStatus('unsaved')
      } finally {
        setIsSaving(false)
      }
  }, [currentInvoice, isAuthenticated, hasFeature, invoiceId, toast, updateInvoice, saveInvoice, setShowUpgradeModal, setSaveStatus, setIsSaving])

  const handlePrint = () => {
    window.print()
  }

  const handleSendEmail = async (email: string) => {
    if (!invoiceId) {
      toast({
        title: 'Save invoice first',
        description: 'Please save the invoice before sending it via email.',
        variant: 'destructive',
      })
      return
    }

    if (!isAuthenticated) {
      toast({
        title: 'Login required',
        description: 'Please login to send invoices via email.',
        variant: 'destructive',
      })
      return
    }

    try {
      await invoicesAPI.sendEmail(invoiceId, email)
      toast({
        title: 'Email sent!',
        description: `Invoice sent successfully to ${email}`,
      })
    } catch (error: any) {
      console.error('Send email error:', error)
      toast({
        title: 'Failed to send email',
        description: error.response?.data?.message || 'An error occurred while sending the email.',
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleShare = async () => {
    if (!isAuthenticated) {
      toast({
        title: 'Authentication required',
        description: 'Please login to share your invoice.',
        variant: 'destructive',
      })
      return
    }

    if (!invoiceId) {
      toast({
        title: 'Save invoice first',
        description: 'Please save the invoice before sharing.',
        variant: 'destructive',
      })
      return
    }

    setIsSharing(true)
    try {
      const response = await invoicesAPI.enablePublicLink(invoiceId)
      const token = response.data.token
      const shareableUrl = `${window.location.origin}/i/${token}`
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareableUrl)
      
      toast({
        title: 'Link copied!',
        description: 'Shareable link has been copied to clipboard.',
      })
    } catch (error: any) {
      console.error('Share error:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to generate shareable link.',
        variant: 'destructive',
      })
    } finally {
      setIsSharing(false)
    }
  }

  const handleNewInvoice = () => {
    // Clear URL parameters and create new invoice
    window.history.pushState({}, '', '/builder')
    createNewInvoice()
    setSaveStatus('saved')
    toast({
      title: 'New invoice',
      description: 'Started a new invoice.',
    })
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

  if (!currentInvoice || isLoadingInvoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p>{isLoadingInvoice ? 'Loading invoice...' : 'Loading builder...'}</p>
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
              <Link href={isAuthenticated ? "/app/invoices" : "/"} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 rounded-lg bg-[#1e293b] flex items-center justify-center text-white font-black text-sm">
                  IN
                </div>
                <span className="text-xl font-bold">Invoicer</span>
              </Link>
              
              {/* Save Status Indicator */}
              {isAuthenticated && invoiceId && (
                <div className="flex items-center gap-1.5 text-sm">
                  {saveStatus === 'saving' && (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      <span className="text-muted-foreground">Saving...</span>
                    </>
                  )}
                  {saveStatus === 'saved' && (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-green-600 font-medium">Saved</span>
                    </>
                  )}
                  {saveStatus === 'unsaved' && (
                    <Badge variant="warning" className="text-xs">Unsaved changes</Badge>
                  )}
                </div>
              )}
            </div>
            
            {/* Desktop & Tablet Actions */}
            <div className="hidden md:flex items-center gap-2 flex-wrap">
              {invoiceId && (
                <Button variant="default" size="sm" onClick={handleNewInvoice} className="gap-2">
                  <Plus className="h-4 w-4" />
                  New
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleSave()} 
                isLoading={isSaving}
                disabled={isSaving}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Save
              </Button>
              {invoiceId && isAuthenticated && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowEmailModal(true)}
                  isLoading={isSendingEmail}
                  className="gap-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                >
                  <Mail className="h-4 w-4" />
                  Send Email
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleShare}
                isLoading={isSharing}
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
              
              {isAuthenticated ? (
                <>
                  <Link href="/app/invoices">
                    <Button variant="outline" size="sm">My Invoices</Button>
                  </Link>
                  <UserDropdown />
                </>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button variant="outline" size="sm">Login</Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button size="sm">Sign Up</Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Actions */}
            <div className="md:hidden flex items-center gap-2 flex-wrap w-full">
              {invoiceId && (
                <Button variant="default" size="sm" onClick={handleNewInvoice} className="gap-1 flex-1">
                  <Plus className="h-4 w-4" />
                  <span className="hidden xs:inline">New</span>
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleSave()}
                isLoading={isSaving}
                className="gap-1 flex-1"
              >
                <Save className="h-4 w-4" />
                <span className="hidden xs:inline">Save</span>
              </Button>
              {invoiceId && isAuthenticated && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowEmailModal(true)} 
                  className="gap-1 flex-1 bg-green-50 border-green-200 text-green-700"
                >
                  <Mail className="h-4 w-4" />
                  <span className="hidden xs:inline">Send</span>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1 flex-1">
                <Printer className="h-4 w-4" />
                <span className="hidden xs:inline">Print</span>
              </Button>
              
              {isAuthenticated ? (
                <>
                  <Link href="/app/invoices" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">Invoices</Button>
                  </Link>
                  <UserDropdown />
                </>
              ) : (
                <>
                  <Link href="/auth/login" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">Login</Button>
                  </Link>
                  <Link href="/auth/signup" className="flex-1">
                    <Button size="sm" className="w-full">Sign Up</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Form */}
          <div className="no-print">
            {/* Read-Only Warning Banner */}
            {isReadOnly && (
              <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl shadow-sm">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-green-900 mb-1">Invoice Paid - Read Only Mode</h3>
                    <p className="text-sm text-green-700">
                      This invoice has been marked as paid and cannot be edited. All fields are locked to preserve the payment record.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <InvoiceBuilderForm readOnly={isReadOnly} />
          </div>

          {/* Right: Preview */}
          <div className="invoice-container">
            <div className="sticky top-8 print:static">
              <h2 className="text-lg font-semibold mb-4 no-print">Preview</h2>
              <InvoicePreview invoice={currentInvoice} />
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="Save Invoices"
        description="Upgrade to Pro to save unlimited invoices to the cloud and access them from anywhere."
      />
      
      <EmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSend={handleSendEmail}
        defaultEmail={currentInvoice?.clientEmail || ''}
      />
    </div>
  )
}

export default function BuilderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p>Loading builder...</p>
        </div>
      </div>
    }>
      <BuilderContent />
    </Suspense>
  )
}

