import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { EventStoreEntity } from 'src/event-store/event-store.entity';
import { OrderEvent } from 'src/shared/enums/order-event.enum';
import { EventStoreService } from 'src/event-store/event-store.service';
import { OrderService } from 'src/orders/order.service';
import { OrderSource } from 'src/shared/enums/order-source.enum';
import { ProcessorQueue } from 'src/event-store/enums/processer-queue.enum';
import { InternalBookingEvent } from 'src/shared/enums/internal-booking-event.enum';
import { OrderEntity } from 'src/orders/order.entity';
import { ShippingStatus } from 'src/shared/enums/shipping-status.enum';
import { PaymentStatus } from 'src/shared/enums/payment-status.enum';
import { CourierServiceCommunicator } from 'src/shared/communicators/courier-service.communicator';

@Processor(ProcessorQueue.SHOPIFY_EVENTS)
export class ShopifyEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(ShopifyEventsProcessor.name);

  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly eventStoreService: EventStoreService,
    private readonly orderService: OrderService,
    @InjectQueue(ProcessorQueue.INTERNAL_BOOKING_EVENTS)
    private readonly internalBookingEventsQueue: Queue,
    private readonly courierServiceCommunicator: CourierServiceCommunicator,
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
    switch (event.type as OrderEvent) {
      case OrderEvent.OrderCreated:
        await this.processOrderCreated(event);
        break;
      case OrderEvent.OrderUpdated:
        await this.processOrderUpdated(event);
        break;
    }
    this.logger.log(
      `Shopify event ${event.id} (${job.name}) processed, refId=${event.refId}, type=${event.type}`,
    );
  }

  async processOrderCreated(event: EventStoreEntity): Promise<void> {
    await this.entityManager.transaction(async (entityManager) => {
      try {
        let order = await this.orderService.findByRefIdForUpdate(
          event.refId,
          OrderSource.SHOPIFY,
          entityManager,
        );

        if (!order) {
          order = await this.orderService.createOrder(
            {
              refId: event.refId,
              source: OrderSource.SHOPIFY,
              paymentStatus: event.payload.financialStatus,
              businessUpdatedAt: event.payload.date,
              customer: event.payload.customer,
              shippingAddress: event.payload.shippingAddress,
              totalPrice: event.payload.totalPrice,
              currency: event.payload.currency,
              placeholder: false,
            },
            entityManager,
          );
        } else if (this.orderService.isCreatedBefore(order)) {
          this.logger.warn(
            `duplicate order creation event received for order ${event.refId}, skipping update`,
          );
        } else {
          // in case update event came first, we need to make sure no data is lost
          Object.assign(order, {
            placeholder: false,
            ...(!order.customer && event.payload.customer
              ? { customer: event.payload.customer }
              : {}),
            ...(!order.shippingAddress && event.payload.shippingAddress
              ? { shippingAddress: event.payload.shippingAddress }
              : {}),
            ...(!order.totalPrice && event.payload.totalPrice
              ? { totalPrice: event.payload.totalPrice }
              : {}),
            ...(!order.currency && event.payload.currency
              ? { currency: event.payload.currency }
              : {}),
          });
          await this.orderService.updateOrderById(
            order.id,
            order,
            entityManager,
          );
        }

        await this.eventStoreService.markAsProcessed(event, entityManager);

        if (this.orderService.isReadyForBooking(order)) {
          await this.publishInternalBookingEvent(order, entityManager);
        }
      } catch (error) {
        this.logger.error(
          `error processing order created event for refId ${event.refId}, error: ${error.message}`,
        );
        throw error;
      }
    });
  }

  async processOrderUpdated(event: EventStoreEntity): Promise<void> {
    await this.entityManager.transaction(async (entityManager) => {
      try {
        let order = await this.orderService.findByRefIdForUpdate(
          event.refId,
          OrderSource.SHOPIFY,
          entityManager,
        );

        if (!order) {
          this.logger.warn(
            `order not found for refId ${event.refId}, creating placeholder order`,
          );
          order = await this.orderService.createOrder(
            {
              refId: event.refId,
              source: OrderSource.SHOPIFY,
              paymentStatus: event.payload.financialStatus,
              businessUpdatedAt: event.payload.date,
              customer: event.payload.customer,
              shippingAddress: event.payload.shippingAddress,
              totalPrice: event.payload.totalPrice,
              currency: event.payload.currency,
              cancelledAt: event.payload.cancelledAt,
              placeholder: true, // placeholder is set to true, only if update event came first.
            },
            entityManager,
          );
        } else if (
          new Date(event.payload.date) < new Date(order.businessUpdatedAt)
        ) {
          this.logger.warn(
            `old order update event received for order ${event.id}, skipping update`,
          );
        } else {
          const isOrderCancelled = this.orderService.isOrderCancelled(
            event,
            order,
          );
          Object.assign(order, {
            paymentStatus: event.payload.financialStatus,
            businessUpdatedAt: event.payload.date,
            ...(order.paymentStatus === PaymentStatus.PENDING
              ? {
                  customer: event.payload.customer,
                  shippingAddress: event.payload.shippingAddress,
                  totalPrice: event.payload.totalPrice,
                  currency: event.payload.currency,
                }
              : {}),
          });
          order = await this.orderService.updateOrderById(
            order.id,
            order,
            entityManager,
          );

          if (isOrderCancelled) {
            await this.notifyOrderPaymentCancelled(order);
          }
        }

        await this.eventStoreService.markAsProcessed(event, entityManager);

        if (this.orderService.isReadyForBooking(order)) {
          await this.publishInternalBookingEvent(order, entityManager);
        }
      } catch (error) {
        this.logger.error(
          `error processing order updated event for refId ${event.refId}, error: ${error.message}`,
        );
        throw error;
      }
    });
  }

  async publishInternalBookingEvent(
    order: OrderEntity,
    entityManager?: EntityManager,
  ): Promise<void> {
    const bookingEvent: Partial<EventStoreEntity> = new EventStoreEntity({
      type: InternalBookingEvent.BookingCreateRequest,
      orderId: order.id,
      refId: order.refId,
      source: order.source,
      payload: {
        orderId: order.id,
        date: new Date(),
      },
    });

    await this.eventStoreService.save(bookingEvent, entityManager);

    this.orderService.bookOrderCourier(order);

    await this.orderService.updateOrderById(
      order.id,
      {
        shippingStatus: ShippingStatus.FULFILLING,
        shippingUpdatedAt: new Date(),
        courier: order.courier,
        trackingNumber: order.trackingNumber,
        shippingFee: order.shippingFee,
      },
      entityManager,
    );

    await this.internalBookingEventsQueue.add(
      InternalBookingEvent.BookingCreateRequest,
      {
        eventStoreId: bookingEvent.id,
      },
      {
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
    this.logger.log(
      `Published internal booking event for order ${order.id}, eventStoreId=${bookingEvent.id}`,
    );
  }

  async notifyOrderPaymentCancelled(order: OrderEntity): Promise<void> {
    if (order.shippingStatus === ShippingStatus.PENDING) {
      this.logger.warn(
        `Order ${order.id} has pending shipping status, skipping order payment cancelled notification`,
      );
      return;
    }
    await this.courierServiceCommunicator.notifyOrderPaymentCancelled(order);
  }
}
