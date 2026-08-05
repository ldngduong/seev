import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import type { Env } from './config/env.schema';
import { ConfiguredSocketIoAdapter } from './realtime/configured-socket-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<Env, true>);
  const clientUrl = config.get('CLIENT_URL', { infer: true });
  app.use(cookieParser());
  app.enableCors({
    origin: clientUrl,
    credentials: true,
  });
  app.useWebSocketAdapter(new ConfiguredSocketIoAdapter(app, clientUrl));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  await app.listen(config.get('PORT', { infer: true }));
}
void bootstrap();
