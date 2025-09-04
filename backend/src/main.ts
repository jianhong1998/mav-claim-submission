import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app/app.module';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import session from 'express-session';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(cookieParser(configService.get('BACKEND_COOKIE_SECRET', 'secret')));

  // Configure session middleware
  app.use(
    session({
      secret: configService.get<string>('BACKEND_COOKIE_SECRET', 'secret'),
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    }),
  );

  app.useGlobalPipes(new ValidationPipe({ transform: true, always: true }));

  app.enableCors({
    origin: [
      ...configService
        .get<string>('BACKEND_CLIENT_HOST', 'http://localhost:3000')
        .split(','),
    ],
    credentials: true,
  });

  await app.listen(process.env.BACKEND_PORT ?? 3001);
}
void bootstrap();
