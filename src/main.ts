import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new FastifyAdapter());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, errorHttpStatusCode: 422 }),
  );
  await app.listen(process.env.PORT || 8080);
}
bootstrap().then(() => console.log('API is running...'));
