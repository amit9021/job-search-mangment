import * as crypto from 'node:crypto';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { RequestContextService } from './common/context/request-context.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ZodValidationPipe } from './utils/zod-validation.pipe';

type CryptoWithNode = typeof globalThis extends { crypto: infer C }
  ? (C extends object ? C & typeof crypto : typeof crypto)
  : typeof crypto;
type GlobalWithCrypto = typeof globalThis & { crypto?: CryptoWithNode };

// Polyfill for @nestjs/schedule crypto issue - remove when @nestjs/schedule is fixed
const globalRef = globalThis as GlobalWithCrypto;
if (!globalRef.crypto) {
  globalRef.crypto = crypto as CryptoWithNode;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  const configService = app.get(ConfigService);
  const rawOrigins =
    configService.get<string>('BACKEND_ALLOWED_ORIGINS') ??
    process.env.BACKEND_ALLOWED_ORIGINS ??
    '';
  const parsedOrigins = rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  const allowedOrigins = parsedOrigins.length > 0 ? parsedOrigins : ['http://localhost:5174'];
  const allowedOriginsSet = new Set(allowedOrigins);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOriginsSet.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    credentials: true
  });
  app.useGlobalPipes(new ZodValidationPipe());
  const requestContext = app.get(RequestContextService);
  app.useGlobalFilters(new HttpExceptionFilter(requestContext));
  const port = Number(
    configService.get<string>('PORT') ??
      process.env.PORT ??
      configService.get<string>('NEST_PORT') ??
      3000
  );
  await app.listen(port);

  console.log(
    `🚀 Backend running on port ${port}, and DB ${configService.get<string>('DATABASE_URL')}`
  );
}

void bootstrap();
