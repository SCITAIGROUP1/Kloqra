import { NestFactory } from "@nestjs/core";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { isAllowedBrowserOrigin } from "./common/auth/allowed-origins";
import { validateProductionCookieConfig } from "./common/auth/cookie-options";
import {
  loadPrismaEnvFile,
  logMissingProductionEnv,
  normalizeEnvQuotes,
  validateRequiredEnv
} from "./load-env";

normalizeEnvQuotes();
loadPrismaEnvFile();
normalizeEnvQuotes();
validateRequiredEnv(); // exits process if critical env vars are missing
logMissingProductionEnv();
validateProductionCookieConfig();

function isAllowedCorsOrigin(origin: string | undefined): boolean {
  return isAllowedBrowserOrigin(origin);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.useWebSocketAdapter(new IoAdapter(app));

  // ── Security ─────────────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"], // needed for Swagger UI inline scripts
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          upgradeInsecureRequests: null
        }
      },
      crossOriginEmbedderPolicy: false // allow Swagger UI to load external resources
    })
  );

  app.use(cookieParser());

  app.enableCors({
    origin: (origin, callback) => {
      callback(null, isAllowedCorsOrigin(origin));
    },
    credentials: true
  });

  // ── Global Rate Limiting Guard ────────────────────────────────────────────
  // ThrottlerGuard is registered as APP_GUARD in AppModule so NestJS DI handles
  // its dependencies (ThrottlerStorage). Individual auth endpoints use @SkipThrottle()
  // or @Throttle() overrides declared at the controller level.

  // ── OpenAPI / Swagger ─────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production" || process.env.ENABLE_SWAGGER === "true") {
    const config = new DocumentBuilder()
      .setTitle("Kloqra API")
      .setDescription("Next-gen time analytics engine — contract-first REST API")
      .setVersion("2.0")
      .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" }, "access-token")
      .addCookieAuth("access_token")
      .addTag("auth", "Authentication & session management")
      .addTag("timer", "Real-time timer engine")
      .addTag("timelogs", "Time log CRUD")
      .addTag("projects", "Project & team management")
      .addTag("tasks", "Task management")
      .addTag("reporting", "Analytics & reporting")
      .addTag("billing", "Billing rates")
      .addTag("export", "Data export")
      .addTag("presence", "Team live presence")
      .addTag("workspace", "Workspace management")
      .addTag("health", "Health checks")
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tagsSorter: "alpha"
      },
      customSiteTitle: "Kloqra API Docs"
    });
  }

  // ── Graceful Shutdown ─────────────────────────────────────────────────────
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, "0.0.0.0");
  console.log(`API listening on 0.0.0.0:${port}`);

  if (process.env.NODE_ENV !== "production" || process.env.ENABLE_SWAGGER === "true") {
    console.log(`Swagger UI: http://localhost:${port}/api/docs`);
  }
}

bootstrap().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error("Failed to start API:", message);
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});
