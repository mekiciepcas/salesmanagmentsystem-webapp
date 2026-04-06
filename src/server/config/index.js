const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error(
    'JWT_SECRET is required. Set JWT_SECRET in environment before loading config.'
  );
}
const excelBasePathRaw = process.env.EXCEL_BASE_PATH;
if (!excelBasePathRaw) {
  throw new Error(
    'EXCEL_BASE_PATH is required. Set EXCEL_BASE_PATH before loading config.'
  );
}
const excelBasePath = String(excelBasePathRaw).replace(
  /^EXCEL_BASE_PATH\s*=\s*/i,
  ''
);

const config = {
  app: {
    name: 'PowerCRM',
    version: '1.0.0',
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3001, // Web API için farklı port
  },

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'pricing_pro',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true',
    pool: {
      min: 2,
      max: 10,
    },
  },

  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || [
      'http://localhost:3110',
      'http://localhost:3001',
    ],
    credentials: true,
  },

  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 100, // Her IP için maksimum istek sayısı
    standardHeaders: true,
    legacyHeaders: false,
  },

  subscription: {
    plans: {
      starter: {
        id: 'starter',
        name: 'Starter',
        price: 299,
        currency: 'TRY',
        maxUsers: 1,
        maxQuotes: -1, // unlimited - sınır kaldırıldı
        features: ['basic_support', 'pdf_export'],
      },
      pro: {
        id: 'pro',
        name: 'Pro',
        price: 799,
        currency: 'TRY',
        maxUsers: 5,
        maxQuotes: -1, // unlimited
        features: [
          'priority_support',
          'pdf_export',
          'excel_export',
          'analytics',
        ],
      },
      enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        price: 0, // Custom pricing
        currency: 'TRY',
        maxUsers: -1, // unlimited
        maxQuotes: -1, // unlimited
        features: [
          '24_7_support',
          'pdf_export',
          'excel_export',
          'analytics',
          'custom_branding',
          'api_access',
        ],
      },
    },
    trialDays: 7,
  },

  payment: {
    iyzico: {
      apiKey: process.env.IYZICO_API_KEY,
      secretKey: process.env.IYZICO_SECRET_KEY,
      baseUrl: process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com',
    },
  },

  excel: {
    basePath: excelBasePath,
  },
};

module.exports = config;
