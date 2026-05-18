import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { AppModule } from './app.module';

/**
 * TLS / HTTPS strategy:
 *
 * - In production on a PaaS like Render, TLS is terminated at the edge.
 *   The platform forwards plain HTTP to this process. Leave HTTPS_KEY_PATH
 *   and HTTPS_CERT_PATH UNSET — the app stays HTTP and the user's browser
 *   still gets HTTPS because the platform handles it.
 *
 * - For local development, set HTTPS_KEY_PATH and HTTPS_CERT_PATH to a
 *   self-signed cert (see scripts/generate-dev-certs.sh) to serve HTTPS
 *   directly from Node.
 */
function loadHttpsOptions(logger: Logger) {
  const keyPath = process.env.HTTPS_KEY_PATH;
  const certPath = process.env.HTTPS_CERT_PATH;

  if (!keyPath || !certPath) return undefined;

  const resolvedKey = path.resolve(keyPath);
  const resolvedCert = path.resolve(certPath);

  if (!fs.existsSync(resolvedKey) || !fs.existsSync(resolvedCert)) {
    logger.warn(
      `HTTPS env vars set but files not found (${resolvedKey}, ${resolvedCert}). Starting in HTTP mode.`,
    );
    return undefined;
  }

  try {
    return {
      key: fs.readFileSync(resolvedKey),
      cert: fs.readFileSync(resolvedCert),
    };
  } catch (err) {
    logger.error(`Failed to read TLS material: ${(err as Error).message}`);
    return undefined;
  }
}

/**
 * CORS origins are read from a comma-separated env var so deployment
 * environments can pin them to exactly the frontend URL. Local-dev
 * defaults cover both http and https Vite ports.
 */
function loadCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS;
  if (raw && raw.trim()) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [
    'http://localhost:5173',
    'https://localhost:5173',
    'http://localhost:4173', // vite preview
  ];
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const httpsOptions = loadHttpsOptions(logger);

  const app = await NestFactory.create(AppModule, { httpsOptions });

  app.enableCors({
    origin: loadCorsOrigins(),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  // PORT is required by Render (and most PaaS). It's injected automatically.
  // We default to 3000 for local dev where it isn't set.
  const port = Number(process.env.PORT ?? 3000);

  // Bind to 0.0.0.0, NOT 'localhost' — Render's load balancer needs to
  // reach the process from outside the container. Listening on 'localhost'
  // would make the service appear unhealthy ("port not bound").
  await app.listen(port, '0.0.0.0');

  const protocol = httpsOptions ? 'https' : 'http';
  logger.log(
    `Listening on ${protocol}://0.0.0.0:${port} (mode: ${protocol.toUpperCase()})`,
  );
}

void bootstrap();
