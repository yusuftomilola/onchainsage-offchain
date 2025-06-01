import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import helmet from 'helmet';
import compression from 'compression';


import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Get configuration service
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Use Winston logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  const logger = new Logger('Bootstrap');

  // Security middleware
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        imgSrc: ["'self'", "data:", "validator.swagger.io"],
        scriptSrc: ["'self'"],
        manifestSrc: ["'self'"],
        frameSrc: ["'self'"],
      },
    },
  }));

  // Compression middleware
  app.use(compression());

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS configuration
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', 'http://localhost:3000').split(','),
    methods: configService.get<string>('CORS_METHODS', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS').split(','),
    credentials: configService.get<boolean>('CORS_CREDENTIALS', true),
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: nodeEnv === 'production',
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters();

  // Global interceptors
  app.useGlobalInterceptors(
   
  );

  // Swagger documentation
  if (configService.get<boolean>('SWAGGER_ENABLED', true)) {
    const config = new DocumentBuilder()
      .setTitle('OnChain Sage API')
      .setDescription('Decentralized Trading Intelligence Platform API')
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Authentication', 'User authentication and wallet integration')
      .addTag('Trading', 'Trading signals and bot configurations')
      .addTag('Community', 'Forum and social features')
      .addTag('Data', 'Market data and analytics')
      .addTag('Notifications', 'Real-time alerts and notifications')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(
      configService.get<string>('SWAGGER_PATH', 'api/docs'),
      app,
      document,
      {
        swaggerOptions: {
          persistAuthorization: true,
        },
      },
    );

    logger.log(`Swagger documentation available at: http://localhost:${port}/${configService.get<string>('SWAGGER_PATH', 'api/docs')}`);
  }


  // Graceful shutdown
  app.enableShutdownHooks();

  await app.listen(port);
  
  logger.log(`🚀 OnChain Sage Backend is running on: http://localhost:${port}`);
  logger.log(`🌍 Environment: ${nodeEnv}`);
  logger.log(`📊 Health check: http://localhost:${port}/api/v1/health`);
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('❌ Error starting the application', error);
  process.exit(1);
});