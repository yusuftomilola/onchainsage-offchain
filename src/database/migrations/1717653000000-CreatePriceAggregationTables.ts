import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePriceAggregationTables1717653000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create price_data table
    await queryRunner.query(`
      CREATE TABLE "price_data" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tokenAddress" character varying NOT NULL,
        "chainId" character varying NOT NULL,
        "dexName" character varying NOT NULL,
        "priceUsd" numeric(24,8) NOT NULL,
        "volume24h" numeric(24,8),
        "liquidity" numeric(24,8),
        "slippageFor1000Usd" numeric(8,4),
        "slippageFor10000Usd" numeric(8,4),
        "slippageFor100000Usd" numeric(8,4),
        "fee" numeric(8,4),
        "rawData" jsonb,
        "reliabilityScore" numeric(5,2) DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_price_data" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_price_data_token_chain_dex" UNIQUE ("tokenAddress", "chainId", "dexName")
      )
    `);

    // Create arbitrage_opportunity table
    await queryRunner.query(`
      CREATE TABLE "arbitrage_opportunity" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tokenAddress" character varying NOT NULL,
        "sourceChainId" character varying NOT NULL,
        "sourceDexName" character varying NOT NULL,
        "targetChainId" character varying NOT NULL,
        "targetDexName" character varying NOT NULL,
        "sourcePriceUsd" numeric(24,8) NOT NULL,
        "targetPriceUsd" numeric(24,8) NOT NULL,
        "profitPercentage" numeric(8,4) NOT NULL,
        "estimatedProfitUsd" numeric(24,8) NOT NULL,
        "estimatedFeeUsd" numeric(24,8),
        "estimatedNetProfitUsd" numeric(24,8),
        "routeDetails" jsonb,
        "isCrossChain" boolean NOT NULL DEFAULT false,
        "isActive" boolean NOT NULL DEFAULT true,
        "detectedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_arbitrage_opportunity" PRIMARY KEY ("id")
      )
    `);

    // Create price_reliability table
    await queryRunner.query(`
      CREATE TABLE "price_reliability" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "dexName" character varying NOT NULL,
        "chainId" character varying NOT NULL,
        "reliabilityScore" numeric(5,2) DEFAULT 0,
        "averageDelayMs" integer,
        "priceDeviation" numeric(8,4),
        "failureCount" integer DEFAULT 0,
        "successCount" integer DEFAULT 0,
        "metricsHistory" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_price_reliability" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_price_reliability_dex_chain" UNIQUE ("dexName", "chainId")
      )
    `);

    // Create indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX "IDX_price_data_token" ON "price_data" ("tokenAddress");
      CREATE INDEX "IDX_price_data_chain" ON "price_data" ("chainId");
      CREATE INDEX "IDX_price_data_dex" ON "price_data" ("dexName");
      CREATE INDEX "IDX_price_data_active" ON "price_data" ("isActive");
      
      CREATE INDEX "IDX_arbitrage_token" ON "arbitrage_opportunity" ("tokenAddress");
      CREATE INDEX "IDX_arbitrage_active" ON "arbitrage_opportunity" ("isActive");
      CREATE INDEX "IDX_arbitrage_detected" ON "arbitrage_opportunity" ("detectedAt");
      CREATE INDEX "IDX_arbitrage_profit" ON "arbitrage_opportunity" ("profitPercentage");
      
      CREATE INDEX "IDX_reliability_dex" ON "price_reliability" ("dexName");
      CREATE INDEX "IDX_reliability_chain" ON "price_reliability" ("chainId");
      CREATE INDEX "IDX_reliability_score" ON "price_reliability" ("reliabilityScore");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_price_data_token";
      DROP INDEX IF EXISTS "IDX_price_data_chain";
      DROP INDEX IF EXISTS "IDX_price_data_dex";
      DROP INDEX IF EXISTS "IDX_price_data_active";
      
      DROP INDEX IF EXISTS "IDX_arbitrage_token";
      DROP INDEX IF EXISTS "IDX_arbitrage_active";
      DROP INDEX IF EXISTS "IDX_arbitrage_detected";
      DROP INDEX IF EXISTS "IDX_arbitrage_profit";
      
      DROP INDEX IF EXISTS "IDX_reliability_dex";
      DROP INDEX IF EXISTS "IDX_reliability_chain";
      DROP INDEX IF EXISTS "IDX_reliability_score";
    `);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "price_reliability"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "arbitrage_opportunity"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "price_data"`);
  }
}
