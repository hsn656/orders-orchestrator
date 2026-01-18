import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from './shared/config/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(config.getNumber('APP_PORT') ?? 3000);
}
bootstrap();
