import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EventStoreEntity } from 'src/event-store/event-store.entity';
import { ProcessorQueue } from 'src/event-store/enums/processer-queue.enum';
import { ShopifyWebhookService } from 'src/shopify/shopify.webhook.service';
import { CourierEventDto } from './dtos/courier-event.dto';

@Injectable()
export class CourierWebhookService {
  private readonly logger = new Logger(ShopifyWebhookService.name);
  constructor(
    @InjectQueue(ProcessorQueue.COURIER_EVENTS)
    private readonly courierEventsQueue: Queue,
    @InjectEntityManager() private readonly entityManager: EntityManager,
  ) {}

  async handle(body: CourierEventDto) {
    let systemEvent = this.mapToSystemEvent(body);
    await this.entityManager.transaction(async (entityManager) => {
      try {
        systemEvent = await entityManager.save(EventStoreEntity, systemEvent);
        await this.courierEventsQueue.add(
          ProcessorQueue.COURIER_EVENTS,
          {
            eventStoreId: systemEvent.id,
          },
          {
            removeOnComplete: true,
            removeOnFail: false,
          },
        );
        this.logger.log(`Added courier event to queue: ${systemEvent.id}`);
      } catch (error) {
        this.logger.error(`Error handling courier event: ${error}`);
        throw error;
      }
    });
    return systemEvent;
  }

  private mapToSystemEvent(body: CourierEventDto): EventStoreEntity {
    return new EventStoreEntity({
      type: ProcessorQueue.COURIER_EVENTS,
      payload: {
        trackingNumber: body.tracking_number,
        status: body.status,
        courier: body.courier,
        date: new Date(body.timestamp),
      },
    });
  }
}
