import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventStoreEntity } from './event-store.entity';
import { EventStoreRepository } from './event-store.repository';
import { EventStoreService } from './event-store.service';
import { BullModule } from '@nestjs/bullmq';
import { ProcessorQueue } from './enums/processer-queue.enum';
import { ShopifyEventsProcessor } from './processors/shopify.events-processor';
import { InternalBookingEventsProcessor } from './processors/internal-booking-events.processor';
import { CourierUpdateEventsProcessor } from './processors/courier-update-events.processor';
import { defaultJobOptions } from './default-job.options';
import { ShopifyNotificationEventsProcessor } from './processors/shopify-notification-events.processor';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([EventStoreEntity]),
    BullModule.registerQueue({
      name: ProcessorQueue.SHOPIFY_EVENTS,
      defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: ProcessorQueue.INTERNAL_BOOKING_EVENTS,
      defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: ProcessorQueue.COURIER_EVENTS,
      defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: ProcessorQueue.SHOPIFY_ADMIN_NOTIFICATIONS,
      defaultJobOptions,
    }),
  ],
  providers: [
    EventStoreRepository,
    EventStoreService,
    ShopifyEventsProcessor,
    InternalBookingEventsProcessor,
    CourierUpdateEventsProcessor,
    ShopifyNotificationEventsProcessor,
  ],
  exports: [EventStoreRepository, EventStoreService],
})
export class EventStoreModule {}
