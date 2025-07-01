import { registerAs } from "@nestjs/config"

export default registerAs("backfill", () => ({
  batchSize: Number.parseInt(process.env.BACKFILL_BATCH_SIZE, 10) || 100,
  concurrency: Number.parseInt(process.env.BACKFILL_CONCURRENCY, 10) || 5,
  retryAttempts: Number.parseInt(process.env.BACKFILL_RETRY_ATTEMPTS, 10) || 3,
  retryDelay: Number.parseInt(process.env.BACKFILL_RETRY_DELAY, 10) || 5000,
  rateLimit: {
    requests: Number.parseInt(process.env.RATE_LIMIT_REQUESTS, 10) || 100,
    windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
  },
  dataSources: {
    coingecko: {
      apiKey: process.env.COINGECKO_API_KEY,
      baseUrl: "https://api.coingecko.com/api/v3",
      rateLimit: 50, // requests per minute
    },
    uniswap: {
      subgraphUrl: "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3",
      rateLimit: 1000, // requests per minute
    },
    twitter: {
      bearerToken: process.env.TWITTER_BEARER_TOKEN,
      baseUrl: "https://api.twitter.com/2",
      rateLimit: 300, // requests per 15 minutes
    },
    reddit: {
      clientId: process.env.REDDIT_CLIENT_ID,
      clientSecret: process.env.REDDIT_CLIENT_SECRET,
      userAgent: process.env.REDDIT_USER_AGENT,
      baseUrl: "https://www.reddit.com/api/v1",
      rateLimit: 60, // requests per minute
    },
  },
  validation: {
    priceDeviationThreshold: 0.5, // 50% deviation threshold
    volumeThreshold: 1000, // minimum volume threshold
    requiredAccuracy: 0.95, // 95% accuracy requirement
  },
  monitoring: {
    metricsInterval: 30000, // 30 seconds
    alertThresholds: {
      failureRate: 0.1, // 10% failure rate
      processingTime: 300000, // 5 minutes
    },
  },
}))
