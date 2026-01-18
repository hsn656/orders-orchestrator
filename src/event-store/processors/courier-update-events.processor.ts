import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { EventStoreEntity } from 'src/event-store/event-store.entity';
import { EventStoreService } from 'src/event-store/event-store.service';
import { OrderService } from 'src/orders/order.service';
import { ProcessorQueue } from 'src/event-store/enums/processer-queue.enum';
import { ShippingStatus } from 'src/shared/enums/shipping-status.enum';
import { OrderEntity } from 'src/orders/order.entity';

@Processor(ProcessorQueue.COURIER_EVENTS)
export class CourierUpdateEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(CourierUpdateEventsProcessor.name);

  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly eventStoreService: EventStoreService,
    private readonly orderService: OrderService,
    @InjectQueue(ProcessorQueue.SHOPIFY_ADMIN_NOTIFICATIONS)
    private readonly shopifyAdminNotificationsQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<{ eventStoreId: number }>): Promise<void> {
    const event = await this.entityManager.findOne(EventStoreEntity, {
      where: { id: job.data.eventStoreId },
    });

    if (!event) {
      this.logger.warn(
        `Shopify event not found for job ${job.id}, eventStoreId=${job.data.eventStoreId}`,
      );
      return;
    }

    this.logger.log(
      `Processing Shopify event ${event.id} (${job.name}) from queue`,
    );

    await this.entityManager.transaction(async (entityManager) => {
      try {
        await this.eventStoreService.markAsProcessed(event, entityManager);
        const order =
          await this.orderService.findByCourierAndTrackingNumberForUpdate(
            event.payload.courier,
            event.payload.trackingNumber,
            entityManager,
          );

        if (!order) {
          this.logger.warn(
            `Order not found for tracking number ${event.payload.trackingNumber} and courier ${event.payload.courier}, skipping event`,
          );
          return;
        }

        if (new Date(event.payload.date) < new Date(order.shippingUpdatedAt)) {
          this.logger.warn(
            `Order shipping updated at ${order.shippingUpdatedAt.toISOString()} is before the courier event date ${new Date(event.payload.date).toISOString()}, skipping  event`,
          );
          return;
        }

        if (
          !this.orderService.isValidShippingStatusTransition(
            order,
            event.payload.status,
          )
        ) {
          this.logger.warn(
            `Invalid shipping status transition from ${order.shippingStatus} to ${event.payload.status}, skipping event`,
          );
          return;
        }

        if (this.shouldNotifyShopifyAdmin(event, order)) {
          let notifyShopifyAdminEvent = this.prepareNotifyShopifyAdminEvent(
            event,
            order,
          );
          notifyShopifyAdminEvent = await this.eventStoreService.save(
            notifyShopifyAdminEvent,
            entityManager,
          );
          await this.shopifyAdminNotificationsQueue.add(
            ProcessorQueue.SHOPIFY_ADMIN_NOTIFICATIONS,
            {
              eventStoreId: notifyShopifyAdminEvent.id,
            },
            {
              removeOnComplete: true,
              removeOnFail: false,
            },
          );
          this.logger.log(
            `Notifying Shopify admin for order ${order.id}, eventStoreId=${notifyShopifyAdminEvent.id}`,
          );
        }

        await this.orderService.updateOrderById(
          order.id,
          {
            shippingStatus: event.payload.status,
            shippingUpdatedAt: event.payload.date,
          },
          entityManager,
        );
      } catch (error) {
        this.logger.error(`Error processing courier update event: ${error}`);
        throw error;
      }
    });
  }

  shouldNotifyShopifyAdmin(event: EventStoreEntity, order: OrderEntity) {
    if (
      event.payload.status === ShippingStatus.SHIPPED &&
      order.shippingStatus === ShippingStatus.FULFILLING
    ) {
      return true;
    }
    if (
      event.payload.status === ShippingStatus.DELIVERED &&
      order.shippingStatus !== ShippingStatus.DELIVERED
    ) {
      return true;
    }
  }

  prepareNotifyShopifyAdminEvent(event: EventStoreEntity, order: OrderEntity) {
    return new EventStoreEntity({
      type: ProcessorQueue.SHOPIFY_ADMIN_NOTIFICATIONS,
      orderId: order.id,
      refId: order.refId,
      source: order.source,
      payload: {
        orderId: order.id,
        status: event.payload.status,
        date: new Date(),
      },
    });
  }
}
