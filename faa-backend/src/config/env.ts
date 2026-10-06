import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';
const configuredAppUrl = process.env.APP_URL ?? process.env.FRONTEND_URL;

function getDefaultAppUrl(): string {
  const corsAppUrl = process.env.CORS_ORIGIN
    ?.split(',')
    .map((origin) => origin.trim())
    .find((origin) => origin && origin !== '*');
  if (corsAppUrl) return corsAppUrl.replace(/\/+$/, '');

  try {
    return new URL(process.env.STRIPE_SUCCESS_URL ?? 'http://localhost:3000/checkout/success').origin;
  } catch {
    return 'http://localhost:3000';
  }
}

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Falta la variable de entorno requerida: ${name}`);
  }
  return value;
}

const STRIPE_REQUIRED = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
] as const;

export function getMissingRequiredEnv(): string[] {
  if (!isProduction) return [];

  return ['MONGODB_URI', 'JWT_SECRET', ...STRIPE_REQUIRED].filter(
    (name) => !process.env[name]?.trim(),
  );
}

export const env = {
  nodeEnv,
  port: parseInt(process.env.PORT ?? '4000', 10),
  // Production configuration is checked by the request middleware. Deferring
  // this check lets Vercel return a useful 503 response instead of crashing the
  // whole function during module initialization.
  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/faa_exam'),
  jwtSecret: required('JWT_SECRET', 'dev-insecure-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  appUrl: (configuredAppUrl ?? getDefaultAppUrl()).replace(/\/+$/, ''),
  adminEmail: process.env.ADMIN_EMAIL ?? 'admin@jjaeronautic.com',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'Cambia_Esta_Clave_123',

  mailer: {
    // Namecheap Private Email defaults. These can be overridden for another
    // SMTP provider without changing application code.
    host: process.env.SMTP_HOST ?? 'mail.privateemail.com',
    port: parseInt(process.env.SMTP_PORT ?? '465', 10),
    secure: (process.env.SMTP_SECURE ?? 'true').toLowerCase() === 'true',
    user: process.env.SMTP_USER ?? '',
    password: process.env.SMTP_PASSWORD ?? '',
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? '',
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
    priceId: process.env.STRIPE_PRICE_ID ?? '',
    subscriptionAmount: parseInt(process.env.STRIPE_SUBSCRIPTION_AMOUNT ?? '999', 10),
    subscriptionCurrency: process.env.STRIPE_SUBSCRIPTION_CURRENCY ?? 'usd',
    productName: process.env.STRIPE_PRODUCT_NAME ?? 'SkyMentor Monthly',
    successUrl: process.env.STRIPE_SUCCESS_URL ?? 'http://localhost:3000/checkout/success',
    cancelUrl: process.env.STRIPE_CANCEL_URL ?? 'http://localhost:3000/checkout/cancel',
  },
};

export const isProd = isProduction;
