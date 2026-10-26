import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: necesario para verificar la firma HMAC del webhook de pagos QR
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  app.setGlobalPrefix('api');
  app.use(helmet());
  const swaggerConfig = new DocumentBuilder()
    .setTitle('TransporteApp API')
    .setDescription(
      'API REST para boletería, encomiendas, pagos y operaciones de transporte.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearer',
    )
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument, { useGlobalPrefix: true });

  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
      .split(',')
      .map((s) => s.trim()),
    credentials: true,
  });
  app.set('trust proxy', 1);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  new Logger('Bootstrap').log(
    `API lista en http://localhost:${port}/api (Swagger: /api/docs)`,
  );
}
void bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap');
  logger.error(
    'No se pudo iniciar la API',
    error instanceof Error ? error.stack : String(error),
  );
  process.exitCode = 1;
});
