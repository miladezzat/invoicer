import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { Invoice, InvoiceDocument } from '../../schemas/invoice.schema';
import { Client, ClientDocument } from '../../schemas/client.schema';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Client.name) private _clientModel: Model<ClientDocument>,
  ) {}

  async signup(signupDto: SignupDto) {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(signupDto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(signupDto.password, 10);

    // Create user
    const user = await this.usersService.create({
      email: signupDto.email,
      name: signupDto.name,
      passwordHash,
    });

    // Migrate guest data if provided
    if (signupDto.guestBundle && Array.isArray(signupDto.guestBundle)) {
      await this.migrateGuestData(String(user._id), signupDto.guestBundle);
    }

    // Generate token
    const token = this.generateToken(user);

    return {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        settings: user.settings,
      },
      token,
    };
  }

  private async migrateGuestData(userId: string, guestBundle: any[]): Promise<void> {
    try {
      // Validate and sanitize guest bundle
      if (!Array.isArray(guestBundle) || guestBundle.length === 0) {
        return;
      }
      
      // Limit number of invoices to migrate to prevent abuse
      const maxInvoices = 50;
      const invoicesToMigrate = guestBundle.slice(0, maxInvoices);
      
      // Migrate guest invoices
      for (const guestInvoice of invoicesToMigrate) {
        if (!guestInvoice || typeof guestInvoice !== 'object' || !guestInvoice.id) {
          continue; // Skip invalid entries
        }
          // Create a new invoice for the user
          const invoice = new this.invoiceModel({
            userId,
            number: guestInvoice.number,
            status: guestInvoice.status || 'draft',
            issueDate: guestInvoice.issueDate,
            dueDate: guestInvoice.dueDate,
            currency: guestInvoice.currency || 'USD',
            lineItems: guestInvoice.lineItems || [],
            subtotal: this.calculateSubtotal(guestInvoice.lineItems || []),
            taxTotal: this.calculateTax(guestInvoice.lineItems || []),
            discountTotal: 0,
            total: this.calculateTotal(guestInvoice.lineItems || []),
            balanceDue: this.calculateTotal(guestInvoice.lineItems || []),
            notes: guestInvoice.notes,
            terms: guestInvoice.terms,
            activity: [{ at: new Date(), type: 'created', meta: { source: 'guest_migration' } }],
          });

          await invoice.save();
      }
    } catch (error) {
      console.error('Error migrating guest data:', error);
      // Don't fail signup if migration fails
    }
  }

  private calculateSubtotal(lineItems: any[]): number {
    return lineItems.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
  }

  private calculateTax(lineItems: any[]): number {
    return lineItems.reduce((sum, item) => {
      const itemSubtotal = (item.quantity || 0) * (item.unitPrice || 0);
      const tax = itemSubtotal * ((item.taxRate || 0) / 100);
      return sum + tax;
    }, 0);
  }

  private calculateTotal(lineItems: any[]): number {
    return this.calculateSubtotal(lineItems) + this.calculateTax(lineItems);
  }

  async login(loginDto: LoginDto) {
    // Find user
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      const minutesRemaining = Math.ceil((user.accountLockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(`Account is locked. Please try again in ${minutesRemaining} minutes.`);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isValidPassword) {
      // Increment failed login attempts
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const maxAttempts = 5;
      const lockoutDuration = 15 * 60 * 1000; // 15 minutes

      if (failedAttempts >= maxAttempts) {
        // Lock the account
        await this.usersService.update(String(user._id), {
          failedLoginAttempts: failedAttempts,
          accountLockedUntil: new Date(Date.now() + lockoutDuration),
        });
        throw new UnauthorizedException(`Too many failed login attempts. Account locked for 15 minutes.`);
      } else {
        // Update failed attempts count
        await this.usersService.update(String(user._id), {
          failedLoginAttempts: failedAttempts,
        });
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    // Reset failed login attempts on successful login
    if (user.failedLoginAttempts && user.failedLoginAttempts > 0) {
      await this.usersService.update(String(user._id), {
        failedLoginAttempts: 0,
        accountLockedUntil: undefined,
      });
    }

    // Generate token
    const token = this.generateToken(user);

    return {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        settings: user.settings,
      },
      token,
    };
  }

  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }

  private generateToken(user: any): string {
    const payload = { sub: user._id, email: user.email };
    return this.jwtService.sign(payload);
  }
}

