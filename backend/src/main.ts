import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // ── Security headers
  app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));

  // ── CORS
  const originsEnv = process.env.CORS_ORIGINS || 'http://localhost:5173';
  const allowedOrigins = originsEnv.split(',').map(o => o.trim());
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origen no permitido → ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.setGlobalPrefix('api');

  // ── Global exception filter (hides stack traces from client)
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ── Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`🚀 http://localhost:${port}/api  [${process.env.NODE_ENV || 'development'}]`);
  logger.log(`🔗 CORS: ${allowedOrigins.join(', ')}`);
}

bootstrap().catch(err => {
  console.error('Error al iniciar el servidor:', err);
  process.exit(1);
});
