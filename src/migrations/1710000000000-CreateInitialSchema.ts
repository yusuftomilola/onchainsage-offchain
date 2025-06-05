import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialSchema1710000000000 implements MigrationInterface {
  name = 'CreateInitialSchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "walletAddress" character varying NOT NULL,
        "isSubscribed" boolean NOT NULL DEFAULT false,
        "preferences" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_walletAddress" UNIQUE ("walletAddress"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    // Create trading_signals table
    await queryRunner.query(`
      CREATE TABLE "trading_signals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "token" character varying NOT NULL,
        "action" character varying NOT NULL,
        "confidence" decimal(5,2) NOT NULL,
        "metadata" jsonb NOT NULL,
        "userId" uuid,
        "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
        "isExecuted" boolean NOT NULL DEFAULT false,
        "executionPrice" decimal(10,2),
        "profitLoss" decimal(10,2),
        CONSTRAINT "PK_trading_signals" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trading_signals_user" FOREIGN KEY ("userId") REFERENCES "users"("id")
      )
    `);

    // Create community_posts table
    await queryRunner.query(`
      CREATE TABLE "community_posts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "content" text NOT NULL,
        "authorId" uuid,
        "votes" integer NOT NULL DEFAULT 0,
        "metadata" jsonb,
        "parentPostId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_community_posts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_community_posts_author" FOREIGN KEY ("authorId") REFERENCES "users"("id"),
        CONSTRAINT "FK_community_posts_parent" FOREIGN KEY ("parentPostId") REFERENCES "community_posts"("id")
      )
    `);

    // Create performance_metrics table
    await queryRunner.query(`
      CREATE TABLE "performance_metrics" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid,
        "accuracy" decimal(5,2) NOT NULL,
        "totalProfit" decimal(10,2) NOT NULL,
        "totalLoss" decimal(10,2) NOT NULL,
        "totalTrades" integer NOT NULL,
        "metrics" jsonb NOT NULL,
        "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_performance_metrics" PRIMARY KEY ("id"),
        CONSTRAINT "FK_performance_metrics_user" FOREIGN KEY ("userId") REFERENCES "users"("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX "IDX_trading_signals_timestamp" ON "trading_signals" ("timestamp")`);
    await queryRunner.query(`CREATE INDEX "IDX_community_posts_createdAt" ON "community_posts" ("createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_performance_metrics_timestamp" ON "performance_metrics" ("timestamp")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_performance_metrics_timestamp"`);
    await queryRunner.query(`DROP INDEX "IDX_community_posts_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_trading_signals_timestamp"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "performance_metrics"`);
    await queryRunner.query(`DROP TABLE "community_posts"`);
    await queryRunner.query(`DROP TABLE "trading_signals"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
} 