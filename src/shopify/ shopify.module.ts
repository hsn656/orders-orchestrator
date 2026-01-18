import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { ShopifyWebhookController } from './shopify.webhook.controller';
import { ShopifyWebhookService } from './shopify.webhook.service';
import { ProcessorQueue } from 'src/event-store/enums/processer-queue.enum';

@Module({
  imports: [
    InfrastructureModule,
    BullModule.registerQueue({
      name: ProcessorQueue.SHOPIFY_EVENTS,
    }),
  ],
  controllers: [ShopifyWebhookController],
  providers: [ShopifyWebhookService],
  exports: [],
})
export class ShopifyModule {}
