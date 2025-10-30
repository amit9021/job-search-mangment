import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { ZodValidationPipe } from './utils/zod-validation.pipe';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  const configService = app.get(ConfigService);
  const frontendOrigin =
    configService.get<string>('FRONTEND_ORIGIN') ?? process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
  app.enableCors({
    origin: frontendOrigin,
    credentials: true
  });
  app.useGlobalPipes(new ZodValidationPipe());
  const port = Number(
    configService.get<string>('PORT') ?? process.env.PORT ?? configService.get<string>('NEST_PORT') ?? 3000
  );
  await app.listen(port);
  
  console.log(`🚀 Backend running on port ${port}`);
}

void bootstrap();
