import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

/**
 * Application bootstrap. Runs once at process start to build the Nest
 * application from AppModule, apply global middleware (CORS, validation),
 * and bind the HTTP server to a port.
 */
async function bootstrap() {
  // Build the Nest app graph by reading metadata from AppModule and all
  // its imports. This wires up controllers, providers, and DB connections.
  const app = await NestFactory.create(AppModule);

  // Allow the React dev server (Vite on port 5173) to call this API from
  // the browser. In production this should be the deployed frontend URL,
  // set via the CORS_ORIGINS env var on the hosting platform.
  app.enableCors({
    origin: ["http://localhost:5173"],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  });

  // Run every @Body() payload through class-validator before it reaches
  // the controller. `whitelist` strips unknown properties; `forbidNonWhitelisted`
  // rejects them with 400; `transform` converts plain JSON into instances
  // of the DTO class so validation decorators on the class work.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Every route is mounted under /api/v1, so the frontend hits e.g.
  // POST /api/v1/auth/signup instead of POST /auth/signup. Versioning
  // the API up front makes future breaking changes easier to manage.
  app.setGlobalPrefix('api/v1');

  // Read PORT from env (the host platform — Render, Heroku, etc. —
  // injects this at runtime). Falls back to 3000 for local dev.
  const configService = app.get(ConfigService);
  const port = Number(configService.get<string>('PORT', '3000'));

  // Start listening. Bind explicitly to the env-provided port so hosting
  // platforms can route traffic in.
  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();