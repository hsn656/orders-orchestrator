import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from './database/database.module';
import { config } from 'src/shared/config/config.service';

@Module({
  imports: [
    DatabaseModule,
    BullModule.forRoot({
      connection: {
        host: config.getString('REDIS_HOST'),
        port: config.getNumber('REDIS_PORT'),
        password: config.hasKey('REDIS_PASSWORD')
          ? config.getString('REDIS_PASSWORD') || undefined
          : undefined,
      },
    }),
  ],
  exports: [DatabaseModule, BullModule],
})
export class InfrastructureModule {}
