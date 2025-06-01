import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  name: process.env.APP_NAME || 'OnChain Sage Backend',
  version: process.env.APP_VERSION || '1.0.0',
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    methods: process.env.CORS_METHODS?.split(',') || [
      'GET',
      'HEAD',
      'PUT',
      'PATCH',
      'POST',
      'DELETE',
      'OPTIONS',
    ],
    credentials: process.env.CORS_CREDENTIALS === 'true' || true,
  },

  // Rate Limiting
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL ?? '60', 10),
    limit: parseInt(process.env.RATE_LIMIT_LIMIT ?? '100', 10),
  },

  // Security
  security: {
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10),
    sessionSecret: process.env.SESSION_SECRET || 'your-session-secret',
  },

  // Swagger
  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false',
    path: process.env.SWAGGER_PATH || 'api/docs',
  },

  // File Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE ?? '10485760', 10), // 10MB
    dest: process.env.UPLOAD_DEST || './uploads',
  },

  // External APIs
  externalApis: {
    twitter: {
      apiKey: process.env.TWITTER_API_KEY || '',
      apiSecret: process.env.TWITTER_API_SECRET || '',
      accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
      accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET || '',
      bearerToken: process.env.TWITTER_BEARER_TOKEN || '',
    },
    dexScreener: {
      apiKey: process.env.DEX_SCREENER_API_KEY || '',
    },
    raydium: {
      apiKey: process.env.RAYDIUM_API_KEY || '',
    },
    coingecko: {
      apiKey: process.env.COINGECKO_API_KEY || '',
    },
  },

  // StarkNet
  starknet: {
    rpcUrl: process.env.STARKNET_RPC_URL || 'https://starknet-mainnet.public.blastapi.io',
    privateKey: process.env.STARKNET_PRIVATE_KEY || '',
    accountAddress: process.env.STARKNET_ACCOUNT_ADDRESS || '',
    network: process.env.STARKNET_NETWORK || 'mainnet',
  },

  // WebSocket
  websocket: {
    port: parseInt(process.env.WS_PORT ?? '3001', 10),
    corsOrigin: process.env.WS_CORS_ORIGIN || 'http://localhost:3000',
  },

  // Email
  email: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },

  // Monitoring
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN || '',
    googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID || '',
  },
}));
