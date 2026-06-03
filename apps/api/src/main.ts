import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({
    origin: (process.env.FRONTEND_ORIGIN ?? "http://localhost:3000").split(","),
    credentials: true
  });
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, "0.0.0.0");
  console.log(`API listening on 0.0.0.0:${port}`);
}

bootstrap().catch((err) => {
  console.error("Failed to start API:", err);
  process.exit(1);
});
