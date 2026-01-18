import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { ShopifyEvent } from './enums/shopify-event.enum';
import { OrderEvent } from 'src/shared/enums/order-event.enum';
import { ShopifyEventDto } from './dtos/shopify-event.dto';
import { OrderSource } from 'src/shared/enums/order-source.enum';
import { EventStoreEntity } from 'src/event-store/event-store.entity';
import { ProcessorQueue } from 'src/event-store/enums/processer-queue.enum';

@Injectable()
export class ShopifyWebhookService {
  private readonly logger = new Logger(ShopifyWebhookService.name);
  constructor(
    @InjectQueue(ProcessorQueue.SHOPIFY_EVENTS)
    private readonly shopifyEventsQueue: Queue,
    @InjectEntityManager() private readonly entityManager: EntityManager,
  ) {}

  async handle(body: ShopifyEventDto, topic: string) {
    let systemEvent = this.mapToSystemEvent(body, topic);
    await this.entityManager.transaction(async (entityManager) => {
      try {
        systemEvent = await entityManager.save(EventStoreEntity, systemEvent);
        await this.shopifyEventsQueue.add(
          topic,
          {
            eventStoreId: systemEvent.id,
          },
          {
            removeOnComplete: true,
            removeOnFail: false,
          },
        );
      } catch (error) {
        this.logger.error(error);
        throw error;
      }
    });
    return systemEvent;
  }

  private mapToSystemEvent(
    body: ShopifyEventDto,
    topic: string,
  ): EventStoreEntity {
    const eventType =
      topic === ShopifyEvent.OrdersCreate.toString()
        ? OrderEvent.OrderCreated
        : OrderEvent.OrderUpdated;
    return new EventStoreEntity({
      type: eventType,
      source: OrderSource.SHOPIFY,
      refId: body.id.toString(),
      payload: {
        refId: body.id.toString(),
        source: OrderSource.SHOPIFY,
        customer: body.customer,
        shippingAddress: body.shipping_address,
        totalPrice: body.total_price,
        currency: body.currency,
        financialStatus: body.financial_status,
        fulfillmentStatus: body.fulfillment_status,
        cancelledAt: body.cancelled_at ? new Date(body.cancelled_at) : null,
        date: new Date(body.updated_at),
      },
    });
  }
}
