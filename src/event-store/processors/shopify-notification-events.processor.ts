import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { EventStoreEntity } from 'src/event-store/event-store.entity';
import { EventStoreService } from 'src/event-store/event-store.service';
import { OrderService } from 'src/orders/order.service';
import { ProcessorQueue } from 'src/event-store/enums/processer-queue.enum';
import { ShopifyAdminServiceCommunicator } from 'src/shared/communicators/shopify-admin-service.communicator';
import { config } from 'src/shared/config/config.service';

@Processor(ProcessorQueue.SHOPIFY_ADMIN_NOTIFICATIONS, {
  limiter: {
    max: config.getNumber('SHOPIFY_ADMIN_NOTIFICATIONS_RATE_MAX'),
    duration: config.getNumber('SHOPIFY_ADMIN_NOTIFICATIONS_RATE_DURATION_MS'),
  },
})
export class ShopifyNotificationEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(ShopifyNotificationEventsProcessor.name);

  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly eventStoreService: EventStoreService,
    private readonly orderService: OrderService,
    private readonly shopifyAdminServiceCommunicator: ShopifyAdminServiceCommunicator,
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
        const order = await this.orderService.findByIdForUpdate(
          event.orderId,
          entityManager,
        );
        if (!order) {
          this.logger.warn(
            `Order not found for id ${event.orderId}, skipping Shopify admin notification event`,
          );
          return;
        }

        await this.shopifyAdminServiceCommunicator.notifyShopifyAdmin(order);
      } catch (error) {
        this.logger.error(
          `Error processing Shopify admin notification event: ${error}`,
        );
        throw error;
      }
    });
  }
}
