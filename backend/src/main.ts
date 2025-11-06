import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ZodValidationPipe } from './utils/zod-validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  const configService = app.get(ConfigService);
  const rawOrigins =
    configService.get<string>('BACKEND_ALLOWED_ORIGINS') ?? process.env.BACKEND_ALLOWED_ORIGINS ?? '';
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
  app.useGlobalFilters(new HttpExceptionFilter());
  const port = Number(
    configService.get<string>('PORT') ??
      process.env.PORT ??
      configService.get<string>('NEST_PORT') ??
      3000
  );
  await app.listen(port);

  console.log(`🚀 Backend running on port ${port}`);
}

void bootstrap();
