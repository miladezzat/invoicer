import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invoice, InvoiceDocument } from '../../schemas/invoice.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { Client, ClientDocument } from '../../schemas/client.schema';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { ChangeLogsService } from '../change-logs/change-logs.service';
import { StripeConnectService } from '../stripe/connect.service';
import { ClientsService } from '../clients/clients.service';
import { WebhooksService } from '../developer/webhooks.service';
import { EmailService } from '../email/email.service';
import { PdfService } from '../pdf/pdf.service';
import { WebhookEvent } from '../../schemas/webhook.schema';
import { nanoid } from 'nanoid';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
    private changeLogsService: ChangeLogsService,
    private stripeConnectService: StripeConnectService,
    private clientsService: ClientsService,
    private webhooksService: WebhooksService,
    private emailService: EmailService,
    @Inject(forwardRef(() => PdfService))
    private pdfService: PdfService,
  ) {}

  async create(userId: string | null, createInvoiceDto: CreateInvoiceDto): Promise<InvoiceDocument> {
    // Get next sequence number
    const year = new Date().getFullYear();
    let sequence: number;
    let number: string;
    let clientPrefix = '';

    // If custom number is provided, use it (with validation for uniqueness)
    if (createInvoiceDto.customNumber) {
      number = createInvoiceDto.customNumber;
      
      // Check if custom invoice number already exists for this user
      const existingInvoice = await this.invoiceModel
        .findOne(userId ? { userId: new Types.ObjectId(userId), number } : { guestId: { $exists: true }, number })
        .exec();

      if (existingInvoice) {
        throw new ConflictException(`Invoice number ${number} already exists. Please use a different number.`);
      }
      
      // Use a default sequence of 0 for custom numbers (sequence is still required by schema)
      sequence = 0;
    } else if (createInvoiceDto.clientId && userId) {
      // Increment client's invoice counter
      const client = await this.clientModel.findById(createInvoiceDto.clientId).exec();
      if (client && String(client.userId) === String(userId)) {
        // Update client counter
        const updatedClient = await this.clientModel
          .findByIdAndUpdate(
            createInvoiceDto.clientId,
            { $inc: { invoiceCounter: 1 } },
            { new: true }
          )
          .exec();
        
        if (!updatedClient) {
          throw new BadRequestException('Failed to update client invoice counter');
        }
        
        sequence = updatedClient.invoiceCounter;
        // Use client initials or ID for prefix
        const clientInitials = client.name
          .split(' ')
          .map(word => word[0])
          .join('')
          .toUpperCase()
          .slice(0, 3);
        clientPrefix = clientInitials;
        number = `INV-${clientPrefix}-${year}-${String(sequence).padStart(4, '0')}`;
      } else {
        throw new NotFoundException('Client not found or does not belong to user');
      }
    } else {
      // Use global numbering for invoices without client
      const lastInvoice = await this.invoiceModel
        .findOne(userId ? { userId: new Types.ObjectId(userId), year, clientId: null } : { guestId: { $exists: true }, year })
        .sort({ sequence: -1 })
        .exec();

      sequence = lastInvoice ? lastInvoice.sequence + 1 : 1;
      number = `INV-${year}-${String(sequence).padStart(4, '0')}`;
      
      // Check if auto-generated invoice number already exists for this user (rare edge case)
      const existingInvoice = await this.invoiceModel
        .findOne(userId ? { userId: new Types.ObjectId(userId), number } : { guestId: { $exists: true }, number })
        .exec();

      if (existingInvoice) {
        throw new ConflictException(`Invoice number ${number} already exists for this user. Cannot create duplicate invoice.`);
      }
    }

    // Calculate totals
    const lineItems = createInvoiceDto.lineItems || [];
    
    const subtotal = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const taxPercent = createInvoiceDto.taxPercent || 0;
    const taxAmount = subtotal * (taxPercent / 100);
    const discountFlat = createInvoiceDto.discountFlat || 0;
    const total = subtotal + taxAmount - discountFlat;
    
    // Use provided issueDate or default to today
    const issueDate = createInvoiceDto.issueDate || new Date().toISOString().split('T')[0];

    const invoice = new this.invoiceModel({
      userId: userId ? new Types.ObjectId(userId) : undefined,
      guestId: userId ? undefined : nanoid(),
      clientId: createInvoiceDto.clientId ? new Types.ObjectId(createInvoiceDto.clientId) : undefined,
      number,
      sequence,
      year,
      status: 'draft',
      issueDate,
      dueDate: createInvoiceDto.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currency: createInvoiceDto.currency || 'USD',
      lineItems,
      subtotal,
      taxPercent,
      taxAmount,
      discountFlat,
      total,
      amountPaid: 0,
      balanceDue: total,
      freelancerName: createInvoiceDto.freelancerName,
      freelancerEmail: createInvoiceDto.freelancerEmail,
      freelancerAddress: createInvoiceDto.freelancerAddress,
      clientName: createInvoiceDto.clientName,
      clientEmail: createInvoiceDto.clientEmail,
      clientCompany: createInvoiceDto.clientCompany,
      clientAddress: createInvoiceDto.clientAddress,
      paymentTerms: createInvoiceDto.paymentTerms,
      brandColor: createInvoiceDto.brandColor || '#1e293b',
      manualInvoiceNumber: createInvoiceDto.manualInvoiceNumber,
      notes: createInvoiceDto.notes,
      terms: createInvoiceDto.terms,
      templateId: createInvoiceDto.templateId ? new Types.ObjectId(createInvoiceDto.templateId) : undefined,
      activity: [
        {
          at: new Date(),
          type: 'created',
          meta: {},
        },
      ],
    });

    const savedInvoice = await invoice.save();

    // Update client's totalInvoiced (unpaid invoices) if clientId is provided
    // New invoices are always 'draft' status, so they go to totalInvoiced
    if (createInvoiceDto.clientId && userId) {
      await this.clientModel.findByIdAndUpdate(
        createInvoiceDto.clientId,
        { $inc: { totalInvoiced: total } }
      ).exec();
    }

    // Log the invoice creation automatically
    if (userId) {
      await this.changeLogsService.logChange({
        collectionName: 'invoices',
        documentId: String(savedInvoice._id),
        operation: 'create',
        changeContext: `Invoice ${savedInvoice.number} created`,
        newData: savedInvoice.toObject(),
        userId,
        source: 'user',
      });

      // Trigger webhook
      this.webhooksService.triggerWebhooks(
        userId,
        WebhookEvent.INVOICE_CREATED,
        savedInvoice.toObject(),
      ).catch(err => this.logger.error('Failed to trigger webhook:', err));
    }

    return savedInvoice;
  }

  async findAll(userId: string, query: any): Promise<{ invoices: InvoiceDocument[]; total: number }> {
    const filter: any = {
      userId: new Types.ObjectId(userId),
      isDeleted: false,
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.clientId) {
      filter.clientId = new Types.ObjectId(query.clientId);
    }

    if (query.q && typeof query.q === 'string') {
      // Sanitize the search query to prevent NoSQL injection
      const sanitizedQuery = query.q.replace(/[$.]/g, '');
      filter.$or = [
        { number: new RegExp(sanitizedQuery, 'i') },
        { notes: new RegExp(sanitizedQuery, 'i') },
      ];
    }

    const limit = parseInt(query.limit) || 20;
    const skip = parseInt(query.skip) || 0;

    const [invoices, total] = await Promise.all([
      this.invoiceModel
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('clientId')
        .exec(),
      this.invoiceModel.countDocuments(filter).exec(),
    ]);

    return { invoices, total };
  }

  async findOne(id: string, userId?: string): Promise<InvoiceDocument> {
    const filter: any = { _id: id, isDeleted: false };
    if (userId) {
      filter.userId = new Types.ObjectId(userId);
    }

    const invoice = await this.invoiceModel.findOne(filter).populate('clientId').exec();
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return invoice;
  }

  async update(id: string, userId: string, updateInvoiceDto: UpdateInvoiceDto): Promise<InvoiceDocument> {
    const invoice = await this.findOne(id, userId);
    
    // Keep old data for change log
    const oldData = invoice.toObject();
    const oldTotal = invoice.total;

    // If updating invoice number, check for uniqueness
    if (updateInvoiceDto.number && updateInvoiceDto.number !== invoice.number) {
      const existingInvoice = await this.invoiceModel
        .findOne({
          userId: new Types.ObjectId(userId),
          number: updateInvoiceDto.number,
          _id: { $ne: id }, // Exclude current invoice
        })
        .exec();

      if (existingInvoice) {
        throw new ConflictException(`Invoice number ${updateInvoiceDto.number} already exists. Please use a different number.`);
      }
    }

    // Recalculate totals if line items or tax/discount changed
    if (updateInvoiceDto.lineItems || updateInvoiceDto.taxPercent !== undefined || updateInvoiceDto.discountFlat !== undefined) {
      const lineItems = updateInvoiceDto.lineItems || invoice.lineItems;
      const subtotal = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
      
      const taxPercent = updateInvoiceDto.taxPercent !== undefined ? updateInvoiceDto.taxPercent : invoice.taxPercent;
      const taxAmount = subtotal * (taxPercent / 100);
      
      const discountFlat = updateInvoiceDto.discountFlat !== undefined ? updateInvoiceDto.discountFlat : invoice.discountFlat;
      const total = subtotal + taxAmount - discountFlat;

      (updateInvoiceDto as any).subtotal = subtotal;
      (updateInvoiceDto as any).taxPercent = taxPercent;
      (updateInvoiceDto as any).taxAmount = taxAmount;
      (updateInvoiceDto as any).discountFlat = discountFlat;
      (updateInvoiceDto as any).total = total;
      (updateInvoiceDto as any).balanceDue = total - (invoice.amountPaid || 0);
    }

    Object.assign(invoice, updateInvoiceDto);
    const updatedInvoice = await invoice.save();

    // Update client totals if the amount changed and invoice has a clientId
    if (invoice.clientId && updatedInvoice.total !== oldTotal) {
      const difference = updatedInvoice.total - oldTotal;
      
      // Update the appropriate field based on invoice status
      if (updatedInvoice.status === 'paid') {
        // If invoice is paid, update totalPaid
        await this.clientModel.findByIdAndUpdate(
          invoice.clientId,
          { $inc: { totalPaid: difference } }
        ).exec();
      } else {
        // If invoice is unpaid, update totalInvoiced
        await this.clientModel.findByIdAndUpdate(
          invoice.clientId,
          { $inc: { totalInvoiced: difference } }
        ).exec();
      }
    }

    // Log the invoice update with automatic diff
    await this.changeLogsService.logChange({
      collectionName: 'invoices',
      documentId: String(updatedInvoice._id),
      operation: 'update',
      changeContext: `Invoice ${updatedInvoice.number} updated`,
      oldData,
      newData: updatedInvoice.toObject(),
      userId,
      source: 'user',
    });

    // Trigger webhook
    this.webhooksService.triggerWebhooks(
      userId,
      WebhookEvent.INVOICE_UPDATED,
      updatedInvoice.toObject(),
    ).catch(err => this.logger.error('Failed to trigger webhook:', err));

    return updatedInvoice;
  }

  async delete(id: string, userId: string): Promise<void> {
    const invoice = await this.findOne(id, userId);
    const oldData = invoice.toObject();
    
    invoice.isDeleted = true;
    await invoice.save();

    // Update client's financial totals when invoice is deleted
    if (invoice.clientId && invoice.total) {
      // Subtract from the appropriate field based on invoice status
      if (invoice.status === 'paid') {
        // If invoice was paid, subtract from totalPaid
        await this.clientModel.findByIdAndUpdate(
          invoice.clientId,
          { $inc: { totalPaid: -invoice.total } }
        ).exec();
      } else {
        // If invoice was unpaid, subtract from totalInvoiced
        await this.clientModel.findByIdAndUpdate(
          invoice.clientId,
          { $inc: { totalInvoiced: -invoice.total } }
        ).exec();
      }
    }

    // Log the invoice deletion
    await this.changeLogsService.logChange({
      collectionName: 'invoices',
      documentId: String(invoice._id),
      operation: 'delete',
      changeContext: `Invoice ${invoice.number} deleted`,
      oldData,
      newData: { isDeleted: true },
      userId,
      source: 'user',
    });

    // Trigger webhook
    this.webhooksService.triggerWebhooks(
      userId,
      WebhookEvent.INVOICE_DELETED,
      oldData,
    ).catch(err => this.logger.error('Failed to trigger webhook:', err));
  }

  /**
   * Update invoice status - example of patch operation logging
   */
  async updateStatus(
    id: string,
    userId: string,
    newStatus: string,
  ): Promise<InvoiceDocument> {
    const invoice = await this.findOne(id, userId);
    const oldStatus = invoice.status;

    invoice.status = newStatus;
    
    // If status changed to 'paid', update amountPaid and balanceDue
    if (newStatus === 'paid' && oldStatus !== 'paid') {
      invoice.amountPaid = invoice.total;
      invoice.balanceDue = 0;
    }
    
    invoice.activity.push({
      at: new Date(),
      type: newStatus,
      meta: {},
    });

    const updatedInvoice = await invoice.save();

    // Update client totals when status changes and invoice has a clientId
    if (invoice.clientId && newStatus !== oldStatus) {
      // Status changed from unpaid to paid
      if (newStatus === 'paid' && oldStatus !== 'paid') {
        await this.clientModel.findByIdAndUpdate(
          invoice.clientId,
          { 
            $inc: { 
              totalInvoiced: -invoice.total,  // Remove from unpaid
              totalPaid: invoice.total          // Add to paid
            } 
          }
        ).exec();
      }
      
      // Status changed from paid to unpaid
      if (oldStatus === 'paid' && newStatus !== 'paid') {
        await this.clientModel.findByIdAndUpdate(
          invoice.clientId,
          { 
            $inc: { 
              totalPaid: -invoice.total,        // Remove from paid
              totalInvoiced: invoice.total      // Add to unpaid
            } 
          }
        ).exec();
      }
    }

    // Log status change as a patch operation
    await this.changeLogsService.logChange({
      collectionName: 'invoices',
      documentId: String(updatedInvoice._id),
      operation: 'patch',
      changeContext: `Invoice status changed: ${oldStatus} → ${newStatus}`,
      oldData: { status: oldStatus },
      newData: { status: newStatus },
      userId,
      source: 'user',
    });

    // Trigger appropriate webhooks based on status change
    if (newStatus === 'paid' && oldStatus !== 'paid') {
      this.webhooksService.triggerWebhooks(
        userId,
        WebhookEvent.INVOICE_PAID,
        updatedInvoice.toObject(),
      ).catch(err => this.logger.error('Failed to trigger webhook:', err));
    }

    if (newStatus === 'sent' && oldStatus !== 'sent') {
      this.webhooksService.triggerWebhooks(
        userId,
        WebhookEvent.INVOICE_SENT,
        updatedInvoice.toObject(),
      ).catch(err => this.logger.error('Failed to trigger webhook:', err));
    }

    return updatedInvoice;
  }

  async enablePublicLink(id: string, userId: string): Promise<{ token: string }> {
    const invoice = await this.findOne(id, userId);
    
    if (!invoice.public || !invoice.public.token) {
      invoice.public = {
        token: nanoid(32),
        enabled: true,
      };
    } else {
      invoice.public.enabled = true;
    }

    await invoice.save();
    return { token: invoice.public.token };
  }

  async findByPublicToken(token: string): Promise<InvoiceDocument> {
    const invoice = await this.invoiceModel
      .findOne({
        'public.token': token,
        'public.enabled': true,
        isDeleted: false,
      })
      .populate('clientId')
      .exec();

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Track view
    if (invoice.public && !invoice.public.viewedAt) {
      invoice.public.viewedAt = new Date();
      invoice.activity.push({
        at: new Date(),
        type: 'viewed',
        meta: {},
      });
      await invoice.save();

      // Trigger invoice.viewed webhook
      if (invoice.userId) {
        this.webhooksService.triggerWebhooks(
          invoice.userId.toString(),
          WebhookEvent.INVOICE_VIEWED,
          invoice.toObject(),
        ).catch(err => this.logger.error('Failed to trigger webhook:', err));
      }
    }

    return invoice;
  }

  /**
   * Find invoice by public token and include user's plan info
   * Used by public invoice page to check if payment is allowed
   */
  async findByPublicTokenWithUser(token: string): Promise<{ invoice: InvoiceDocument; user: any }> {
    const invoice = await this.findByPublicToken(token);
    
    // Get the user to check their plan tier
    const user = await this.userModel.findById(invoice.userId).exec();
    
    return { invoice, user };
  }

  /**
   * Enable payment on an invoice
   * Creates a Stripe checkout session
   */
  async enablePayment(
    id: string,
    userId: string,
  ): Promise<{ sessionId: string; paymentUrl: string }> {
    const invoice = await this.findOne(id, userId);
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has Stripe Connect setup
    if (!user.stripeConnect?.accountId || user.stripeConnect?.connected === false) {
      throw new ForbiddenException(
        'Please connect your Stripe account first to accept payments'
      );
    }

    if (!user.stripeConnect?.chargesEnabled) {
      throw new ForbiddenException(
        'Please complete your Stripe onboarding to accept payments'
      );
    }

    // Check if payment already enabled
    if (invoice.payment?.enabled && invoice.payment?.stripeCheckoutSessionId) {
      throw new ConflictException('Payment already enabled for this invoice');
    }

    // Ensure invoice has a public link/token
    if (!invoice.public || !invoice.public.token) {
      invoice.public = {
        token: nanoid(32),
        enabled: true,
      };
      await invoice.save();
    }

    // Create checkout session
    const amountInCents = Math.round(invoice.total * 100);
    const { sessionId, url } = await this.stripeConnectService.createPaymentSession(
      String(invoice._id),
      amountInCents,
      invoice.currency,
      user.stripeConnect.accountId,
      invoice.public.token,
      {
        userId: userId,
        invoiceNumber: invoice.number,
        clientEmail: invoice.clientEmail,
      }
    );

    // Update invoice
    invoice.payment = {
      enabled: true,
      stripeCheckoutSessionId: sessionId,
      status: 'unpaid',
      paidAmount: 0,
      platformFee: this.stripeConnectService.calculatePlatformFee(amountInCents),
    };

    await invoice.save();

    // Log the action
    await this.changeLogsService.logChange({
      collectionName: 'invoices',
      documentId: String(invoice._id),
      operation: 'patch',
      changeContext: `Payment enabled for invoice ${invoice.number}`,
      oldData: { 'payment.enabled': false },
      newData: { 'payment.enabled': true },
      userId,
      source: 'user',
    });

    return {
      sessionId,
      paymentUrl: url,
    };
  }

  /**
   * Create payment checkout session for public invoice
   * Anyone with the link can pay
   */
  async createPublicPaymentSession(invoiceId: string): Promise<{ url: string }> {
    const invoice = await this.invoiceModel.findById(invoiceId).exec();

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (!invoice.payment?.enabled) {
      throw new ForbiddenException('Payment not enabled for this invoice');
    }

    if (invoice.status === 'paid' || invoice.payment?.status === 'paid') {
      throw new ConflictException('Invoice is already paid');
    }

    // Get the checkout session URL
    if (invoice.payment.stripeCheckoutSessionId) {
      // Return existing session URL (will need to fetch from Stripe if expired)
      const user = await this.userModel.findById(invoice.userId).exec();
      if (!user?.stripeConnect?.accountId || user.stripeConnect?.connected === false) {
        throw new ForbiddenException('Payment provider not configured');
      }

      // Ensure invoice has public token
      if (!invoice.public || !invoice.public.token) {
        throw new ForbiddenException('Invoice must have a public link enabled');
      }

      // Create a new session
      const amountInCents = Math.round(invoice.total * 100);
      const { url } = await this.stripeConnectService.createPaymentSession(
        String(invoice._id),
        amountInCents,
        invoice.currency,
        user.stripeConnect.accountId,
        invoice.public.token,
        {
          userId: String(user._id),
          invoiceNumber: invoice.number,
          clientEmail: invoice.clientEmail,
        }
      );

      return { url };
    }

    throw new ForbiddenException('Payment session not found');
  }

  /**
   * Handle successful payment (called by webhook)
   */
  async handlePaymentSuccess(
    invoiceId: string,
    paymentIntentId: string,
    amountReceived: number,
    platformFee: number,
    paymentMethod: string,
    receiptUrl?: string,
  ): Promise<void> {
    const invoice = await this.invoiceModel.findById(invoiceId).exec();

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const stripeFee = Math.round(amountReceived * 0.029 + 30); // Stripe's standard fee
    const netAmount = amountReceived - platformFee - stripeFee;

    invoice.status = 'paid';
    invoice.payment = {
      ...invoice.payment,
      enabled: true,
      stripePaymentIntentId: paymentIntentId,
      status: 'paid',
      paidAt: new Date(),
      paidAmount: amountReceived / 100,
      platformFee: platformFee / 100,
      stripeFee: stripeFee / 100,
      netAmount: netAmount / 100,
      paymentMethod,
      receiptUrl,
    };

    invoice.amountPaid = amountReceived / 100;
    invoice.balanceDue = 0;

    invoice.activity.push({
      at: new Date(),
      type: 'paid',
      meta: {
        amount: amountReceived / 100,
        method: paymentMethod,
      },
    });

    await invoice.save();

    // Update client totals if clientId is provided
    // Move invoice from totalInvoiced to totalPaid
    if (invoice.clientId && invoice.userId) {
      await this.clientModel.findByIdAndUpdate(
        invoice.clientId,
        { 
          $inc: { 
            totalInvoiced: -invoice.total,      // Remove from unpaid
            totalPaid: amountReceived / 100      // Add to paid (Stripe amount)
          } 
        }
      ).exec();
    }

    // Log the payment
    if (invoice.userId) {
      await this.changeLogsService.logChange({
        collectionName: 'invoices',
        documentId: String(invoice._id),
        operation: 'patch',
        changeContext: `Invoice ${invoice.number} paid via Stripe`,
        oldData: { status: 'sent', 'payment.status': 'unpaid' },
        newData: { status: 'paid', 'payment.status': 'paid' },
        userId: invoice.userId.toString(),
        source: 'integration',
        externalSystem: 'stripe',
      });

      // Trigger webhooks for payment received and invoice paid
      const userId = invoice.userId.toString();
      
      this.webhooksService.triggerWebhooks(
        userId,
        WebhookEvent.PAYMENT_RECEIVED,
        {
          invoiceId: String(invoice._id),
          invoiceNumber: invoice.number,
          amount: amountReceived / 100,
          currency: invoice.currency,
          paymentMethod,
          paymentIntentId,
          receiptUrl,
          paidAt: new Date(),
        },
      ).catch(err => this.logger.error('Failed to trigger payment.received webhook:', err));

      this.webhooksService.triggerWebhooks(
        userId,
        WebhookEvent.INVOICE_PAID,
        invoice.toObject(),
      ).catch(err => this.logger.error('Failed to trigger invoice.paid webhook:', err));
    }
  }

  /**
   * Handle failed payment (called by webhook)
   */
  async handlePaymentFailure(
    invoiceId: string,
    failureReason: string,
  ): Promise<void> {
    const invoice = await this.invoiceModel.findById(invoiceId).exec();

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    invoice.payment = {
      ...invoice.payment,
      status: 'failed',
      failureReason,
    };

    await invoice.save();

    // Trigger payment.failed webhook
    if (invoice.userId) {
      this.webhooksService.triggerWebhooks(
        invoice.userId.toString(),
        WebhookEvent.PAYMENT_FAILED,
        {
          invoiceId: String(invoice._id),
          invoiceNumber: invoice.number,
          amount: invoice.total,
          currency: invoice.currency,
          failureReason,
          failedAt: new Date(),
        },
      ).catch(err => this.logger.error('Failed to trigger payment.failed webhook:', err));
    }
  }

  /**
   * Send invoice via email with PDF attachment
   */
  async sendInvoiceEmail(
    invoiceId: string,
    userId: string,
    clientEmail: string,
  ): Promise<void> {
    // 1. Find invoice and verify ownership
    const invoice = await this.findOne(invoiceId, userId);

    // 2. Populate client data if needed
    await invoice.populate('clientId');

    // 3. Generate PDF HTML
    const invoiceHtml = this.pdfService.generateInvoiceHtml(invoice);

    // 4. Generate PDF buffer
    const pdfBuffer = await this.pdfService.generateInvoicePdf(invoiceHtml);

    // 5. Extract period from first line item (if it has dates)
    let period: string | undefined;
    const firstItem = invoice.lineItems?.[0];
    if (firstItem?.periodFrom && firstItem?.periodTo) {
      const formatDate = (date: Date) => {
        return new Date(date).toISOString().split('T')[0];
      };
      period = `${formatDate(firstItem.periodFrom)} to ${formatDate(firstItem.periodTo)}`;
    }

    // 6. Get client and freelancer names
    const clientName = (invoice.clientId as any)?.name || invoice.clientName || 'Client';
    const freelancerName = invoice.freelancerName || 'Freelancer';

    // 7. Format dates
    const dueDate = invoice.dueDate 
      ? new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'N/A';

    // 8. Format total (convert from cents to dollars if needed)
    const totalFormatted = (invoice.total / 100).toFixed(2);

    // 9. Generate PDF filename
    const pdfFilename = period
      ? `Invoice_${invoice.number}_${period.replace(/ to /g, '_to_')}.pdf`
      : `Invoice_${invoice.number}.pdf`;

    // 10. Send email with PDF attachment
    await this.emailService.sendInvoiceEmail({
      to: clientEmail,
      clientName,
      freelancerName,
      invoiceNumber: invoice.number,
      dueDate,
      total: totalFormatted,
      currency: invoice.currency,
      pdfBuffer,
      pdfFilename: pdfFilename.replace(/\s+/g, '_'),
      period,
    });

    // 11. Update invoice with email tracking
    await this.invoiceModel.findByIdAndUpdate(invoiceId, {
      status: invoice.status === 'draft' ? 'sent' : invoice.status,
      sentAt: new Date(),
      emailSentTo: clientEmail,
      $inc: { emailSentCount: 1 },
    });

    // 12. Log the action
    await this.changeLogsService.logChange({
      collectionName: 'invoices',
      documentId: String(invoice._id),
      operation: 'patch',
      changeContext: `Invoice ${invoice.number} sent via email to ${clientEmail}`,
      oldData: { status: invoice.status },
      newData: { status: 'sent', emailSentTo: clientEmail },
      userId,
      source: 'user',
    });

    this.logger.log(`Invoice ${invoice.number} sent to ${clientEmail}`);
  }

  /**
   * Duplicate an existing invoice
   */
  async duplicateInvoice(
    invoiceId: string,
    userId: string,
  ): Promise<InvoiceDocument> {
    // 1. Find original invoice
    const original = await this.findOne(invoiceId, userId);

    // 2. Get next invoice number
    const year = new Date().getFullYear();
    let sequence: number;
    let number: string;

    if (original.clientId) {
      // If invoice has a client, use client-based numbering
      const client = await this.clientModel.findById(original.clientId).exec();
      if (client && String(client.userId) === String(userId)) {
        // Update client counter
        const updatedClient = await this.clientModel
          .findByIdAndUpdate(
            original.clientId,
            { $inc: { invoiceCounter: 1 } },
            { new: true }
          )
          .exec();

        if (!updatedClient) {
          throw new BadRequestException('Failed to update client invoice counter');
        }

        sequence = updatedClient.invoiceCounter;
        const clientInitials = client.name
          .split(' ')
          .map(word => word[0])
          .join('')
          .toUpperCase()
          .slice(0, 3);
        number = `INV-${clientInitials}-${year}-${String(sequence).padStart(4, '0')}`;
      } else {
        throw new NotFoundException('Client not found');
      }
    } else {
      // Use global numbering
      const lastInvoice = await this.invoiceModel
        .findOne({ userId: new Types.ObjectId(userId), year, clientId: null })
        .sort({ sequence: -1 })
        .exec();

      sequence = lastInvoice ? lastInvoice.sequence + 1 : 1;
      number = `INV-${year}-${String(sequence).padStart(4, '0')}`;
    }

    // 3. Create duplicate invoice
    const duplicate = new this.invoiceModel({
      userId: new Types.ObjectId(userId),
      clientId: original.clientId,
      number,
      sequence,
      year,
      status: 'draft',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +14 days
      currency: original.currency,
      lineItems: original.lineItems,
      subtotal: original.subtotal,
      taxPercent: original.taxPercent,
      taxAmount: original.taxAmount,
      discountFlat: original.discountFlat,
      total: original.total,
      amountPaid: 0,
      balanceDue: original.total,
      freelancerName: original.freelancerName,
      freelancerEmail: original.freelancerEmail,
      clientName: original.clientName,
      clientEmail: original.clientEmail,
      clientCompany: original.clientCompany,
      clientAddress: original.clientAddress,
      paymentTerms: original.paymentTerms,
      brandColor: original.brandColor,
      notes: original.notes,
      terms: original.terms,
      templateId: original.templateId,
      activity: [
        {
          at: new Date(),
          type: 'created',
          meta: { duplicatedFrom: original.number },
        },
      ],
    });

    const savedDuplicate = await duplicate.save();

    // 4. Update client totals
    if (original.clientId) {
      await this.clientModel.findByIdAndUpdate(
        original.clientId,
        { $inc: { totalInvoiced: original.total } }
      ).exec();
    }

    // 5. Log the duplication
    await this.changeLogsService.logChange({
      collectionName: 'invoices',
      documentId: String(savedDuplicate._id),
      operation: 'create',
      changeContext: `Invoice ${savedDuplicate.number} created as duplicate of ${original.number}`,
      newData: savedDuplicate.toObject(),
      userId,
      source: 'user',
    });

    this.logger.log(`Invoice ${original.number} duplicated as ${savedDuplicate.number}`);

    return savedDuplicate;
  }
}

