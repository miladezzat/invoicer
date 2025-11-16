/**
 * Central Feature Configuration
 * 
 * This file defines all available features and which plans have access to them.
 * This is the single source of truth for feature access control.
 */

export enum Feature {
  // Invoice Features
  CREATE_INVOICE = 'create_invoice',
  SAVE_INVOICE = 'save_invoice',
  UNLIMITED_INVOICES = 'unlimited_invoices',
  EXPORT_PDF = 'export_pdf',
  SHARE_LINK = 'share_link',
  
  // Client Features
  MANAGE_CLIENTS = 'manage_clients',
  CLIENT_MANAGEMENT = 'client_management',
  CLIENT_PORTAL = 'client_portal',
  
  // Template Features
  USE_TEMPLATES = 'use_templates',
  CUSTOM_TEMPLATES = 'custom_templates',
  
  // Branding Features
  BASIC_BRANDING = 'basic_branding',
  ADVANCED_BRANDING = 'advanced_branding',
  CUSTOM_LOGO = 'custom_logo',
  
  // Payment Features
  PAYMENT_INTEGRATION = 'payment_integration',
  RECURRING_INVOICES = 'recurring_invoices',
  PAYMENT_REMINDERS = 'payment_reminders',
  
  // Analytics Features
  ANALYTICS = 'analytics',
  REPORTS = 'reports',
  
  // Support Features
  EMAIL_SUPPORT = 'email_support',
  PRIORITY_SUPPORT = 'priority_support',
  
  // API Features
  API_ACCESS = 'api_access',
}

export type PlanTier = 'free' | 'pro';

/**
 * Feature access configuration per plan
 */
export const PLAN_FEATURES: Record<PlanTier, Feature[]> = {
  free: [
    Feature.CREATE_INVOICE,
    Feature.UNLIMITED_INVOICES,
    Feature.EXPORT_PDF,
    Feature.SHARE_LINK,
    Feature.BASIC_BRANDING,
    Feature.USE_TEMPLATES,
    Feature.EMAIL_SUPPORT,
  ],
  pro: [
    // All free features
    ...Object.values(Feature),
  ],
};

/**
 * Check if a plan has access to a feature
 */
export function hasFeature(plan: PlanTier, feature: Feature): boolean {
  return PLAN_FEATURES[plan]?.includes(feature) ?? false;
}

/**
 * Get all features for a plan
 */
export function getPlanFeatures(plan: PlanTier): Feature[] {
  return PLAN_FEATURES[plan] || PLAN_FEATURES.free;
}

/**
 * Feature display names for frontend
 */
export const FEATURE_NAMES: Record<Feature, string> = {
  [Feature.CREATE_INVOICE]: 'Create Invoices',
  [Feature.SAVE_INVOICE]: 'Save Invoices',
  [Feature.UNLIMITED_INVOICES]: 'Unlimited Invoices',
  [Feature.EXPORT_PDF]: 'Export PDF',
  [Feature.SHARE_LINK]: 'Share Link',
  [Feature.MANAGE_CLIENTS]: 'Manage Clients',
  [Feature.CLIENT_MANAGEMENT]: 'Client Management',
  [Feature.CLIENT_PORTAL]: 'Client Portal',
  [Feature.USE_TEMPLATES]: 'Use Templates',
  [Feature.CUSTOM_TEMPLATES]: 'Custom Templates',
  [Feature.BASIC_BRANDING]: 'Basic Branding',
  [Feature.ADVANCED_BRANDING]: 'Advanced Branding',
  [Feature.CUSTOM_LOGO]: 'Custom Logo',
  [Feature.PAYMENT_INTEGRATION]: 'Payment Integration',
  [Feature.RECURRING_INVOICES]: 'Recurring Invoices',
  [Feature.PAYMENT_REMINDERS]: 'Payment Reminders',
  [Feature.ANALYTICS]: 'Analytics',
  [Feature.REPORTS]: 'Reports',
  [Feature.EMAIL_SUPPORT]: 'Email Support',
  [Feature.PRIORITY_SUPPORT]: 'Priority Support',
  [Feature.API_ACCESS]: 'API Access',
};

/**
 * Feature descriptions for frontend
 */
export const FEATURE_DESCRIPTIONS: Record<Feature, string> = {
  [Feature.CREATE_INVOICE]: 'Create professional invoices',
  [Feature.SAVE_INVOICE]: 'Save and manage your invoices',
  [Feature.UNLIMITED_INVOICES]: 'No limit on number of invoices',
  [Feature.EXPORT_PDF]: 'Download invoices as PDF',
  [Feature.SHARE_LINK]: 'Share invoices via public link',
  [Feature.MANAGE_CLIENTS]: 'Store and manage client information',
  [Feature.CLIENT_MANAGEMENT]: 'Full client relationship management system',
  [Feature.CLIENT_PORTAL]: 'Give clients access to their invoices',
  [Feature.USE_TEMPLATES]: 'Use pre-designed templates',
  [Feature.CUSTOM_TEMPLATES]: 'Create your own templates',
  [Feature.BASIC_BRANDING]: 'Add your business name and colors',
  [Feature.ADVANCED_BRANDING]: 'Full customization of invoice appearance',
  [Feature.CUSTOM_LOGO]: 'Upload your company logo',
  [Feature.PAYMENT_INTEGRATION]: 'Accept payments online',
  [Feature.RECURRING_INVOICES]: 'Set up automatic recurring invoices',
  [Feature.PAYMENT_REMINDERS]: 'Automatic payment reminders',
  [Feature.ANALYTICS]: 'Track invoice and payment analytics',
  [Feature.REPORTS]: 'Generate business reports',
  [Feature.EMAIL_SUPPORT]: 'Get help via email',
  [Feature.PRIORITY_SUPPORT]: 'Get priority support response',
  [Feature.API_ACCESS]: 'Access to developer API',
};

