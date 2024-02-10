import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, errorHttpStatusCode: 422 }),
  );
  await app.listen(process.env.PORT || 8080, '0.0.0.0');
}

bootstrap().then(() => console.log('API is running...'));
