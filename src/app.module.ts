import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// Configuration
import { databaseConfig } from '@config/database.config';
import { redisConfig } from '@config/redis.config';
import { appConfig } from '@config/app.config';
import { winstonConfig } from '@config/winston.config';

// Modules
import { AuthModule } from '@modules/auth/auth.module';
import { TradingModule } from '@modules/trading/trading.module';
import { DataIngestionModule } from '@modules/data-ingestion/data-ingestion.module';
import { AiProcessingModule } from '@modules/ai-processing/ai-processing.module';
import { CommunityModule } from '@modules/community/community.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { HealthModule } from '@modules/health/health.module';
import { ReputationModule } from './modules/reputation/reputation.module';
import { UsersModule } from './modules/users/users.module';
import { RedisModule } from '@nestjs-modules/ioredis';


@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [appConfig, databaseConfig, redisConfig],
      cache: true,
      expandVariables: true,
    }),

    // Winston Logger
    WinstonModule.forRootAsync({
      useFactory: (configService: ConfigService) => winstonConfig(configService),
      inject: [ConfigService],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USERNAME'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        ssl: configService.get<boolean>('DATABASE_SSL', false) ? { rejectUnauthorized: false } : false,
        synchronize: configService.get<boolean>('DATABASE_SYNCHRONIZE', false),
        logging: configService.get<boolean>('DATABASE_LOGGING', false),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        subscribers: [__dirname + '/**/*.subscriber{.ts,.js}'],
        autoLoadEntities: true,
        retryAttempts: 3,
        retryDelay: 3000,
      }),
      inject: [ConfigService],
    }),

    // Redis Cache & Bull Queue
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT'),
          password: configService.get<string>('REDIS_PASSWORD'),
          db: configService.get<number>('BULL_REDIS_DB', 1),
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      }),
      inject: [ConfigService],
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('RATE_LIMIT_TTL', 60) * 1000,
          limit: configService.get<number>('RATE_LIMIT_LIMIT', 100),
        },
      ],
      inject: [ConfigService],
    }),

   

    // Task Scheduling
    ScheduleModule.forRoot(),

    // Feature Modules
    HealthModule,
    AuthModule,
    TradingModule,
    DataIngestionModule,
    AiProcessingModule,
    CommunityModule,
    NotificationsModule,
    ReputationModule,
    UsersModule,
    // RedisModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
