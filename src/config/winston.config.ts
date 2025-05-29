import { ConfigService } from '@nestjs/config';
import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';  

export const winstonConfig = (configService: ConfigService): WinstonModuleOptions => {
  const logLevel = configService.get<string>('LOG_LEVEL', 'info');
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const logFileEnabled = configService.get<boolean>('LOG_FILE_ENABLED', true);

  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ level, message, timestamp, stack, context, ...meta }) => {
      let log = `${timestamp} [${level.toUpperCase()}]`;
      if (context) log += ` [${context}]`;
      log += ` ${message}`;
      if (stack) log += `\n${stack}`;
      if (Object.keys(meta).length > 0) log += `\n${JSON.stringify(meta, null, 2)}`;
      return log;
    }),
  );

  const consoleTransport = new winston.transports.Console({
    level: logLevel,
    format: winston.format.combine(winston.format.colorize(), logFormat),
  });

  const transports: (winston.transport | DailyRotateFile)[] = [consoleTransport];

  if (logFileEnabled && (nodeEnv === 'production' || nodeEnv === 'development')) {
    transports.push(
      new DailyRotateFile({
        filename: 'logs/app-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: logLevel,
        format: logFormat,
        maxSize: configService.get<string>('LOG_MAX_SIZE', '10m'),
        maxFiles: configService.get<string>('LOG_MAX_FILES', '5d'),
        auditFile: 'logs/audit.json',
      }),
    );

    transports.push(
      new DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        format: logFormat,
        maxSize: configService.get<string>('LOG_MAX_SIZE', '10m'),
        maxFiles: configService.get<string>('LOG_MAX_FILES', '14d'),
        auditFile: 'logs/error-audit.json',
      }),
    );

    transports.push(
      new DailyRotateFile({
        filename: 'logs/combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        format: logFormat,
        maxSize: configService.get<string>('LOG_MAX_SIZE', '10m'),
        maxFiles: configService.get<string>('LOG_MAX_FILES', '7d'),
        auditFile: 'logs/combined-audit.json',
      }),
    );
  }

  return {
    level: logLevel,
    format: logFormat,
    transports,
    exceptionHandlers: [
      new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
      }),
      ...(logFileEnabled
        ? [
            new winston.transports.File({
              filename: 'logs/exceptions.log',
              format: logFormat,
            }),
          ]
        : []),
    ],
    rejectionHandlers: [
      new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
      }),
      ...(logFileEnabled
        ? [
            new winston.transports.File({
              filename: 'logs/rejections.log',
              format: logFormat,
            }),
          ]
        : []),
    ],
    exitOnError: false,
  };
};
