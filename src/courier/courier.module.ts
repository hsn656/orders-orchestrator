import { Module } from '@nestjs/common';
import { CourierWebhookService } from './courier-webhook.service';
import { CourierWebhookController } from './courier-webhook.controller';
import { ProcessorQueue } from 'src/event-store/enums/processer-queue.enum';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: ProcessorQueue.COURIER_EVENTS,
    }),
  ],
  controllers: [CourierWebhookController],
  providers: [CourierWebhookService],
  exports: [CourierWebhookService],
})
export class CourierModule {}
