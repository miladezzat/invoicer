import * as Joi from 'joi';

/**
 * Environment variable validation schema
 * This ensures all required environment variables are set before the app starts
 */
export const envValidationSchema = Joi.object({
  // Environment
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  
  // Server
  PORT: Joi.number().default(3001),
  
  // Database
  MONGODB_URI: Joi.string().required(),
  
  // JWT
  JWT_SECRET: Joi.string()
    .min(32)
    .required()
    .messages({
      'string.min': 'JWT_SECRET must be at least 32 characters long for security',
      'any.required': 'JWT_SECRET is required. Generate one with: openssl rand -base64 32',
    }),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  
  // Frontend URLs
  WEB_URL: Joi.string().uri().default('http://localhost:3000'),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),
  API_URL: Joi.string().uri().default('http://localhost:3001'),
  
  // Email (Optional - app will work without it, but email sending will be disabled)
  RESEND_API_KEY: Joi.string().optional().allow(''),
  
  // Stripe (Optional)
  STRIPE_SECRET_KEY: Joi.string().optional(),
  STRIPE_MONTHLY_PRICE_ID: Joi.string().optional(),
  STRIPE_YEARLY_PRICE_ID: Joi.string().optional(),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional(),
  STRIPE_CONNECT_WEBHOOK_SECRET: Joi.string().optional(),
  PLATFORM_FEE_PERCENTAGE: Joi.number().min(0).max(1).default(0.01),
  
  // Rate Limiting
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),
  
  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),
});

/**
 * Validate environment variables
 * Throws an error if validation fails
 */
export function validateEnv(config: Record<string, any>) {
  const { error, value } = envValidationSchema.validate(config, {
    allowUnknown: true, // Allow other env vars
    abortEarly: false, // Show all errors
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message).join('\n  - ');
    throw new Error(
      `Environment variable validation failed:\n  - ${errorMessages}\n\n` +
        'Please check your .env file or environment variables.',
    );
  }

  return value;
}

