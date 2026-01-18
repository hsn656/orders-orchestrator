import { Injectable } from '@nestjs/common';
import { OrderEntity } from './order.entity';
import { OrderRepository } from './order.repository';
import { EntityManager } from 'typeorm';
import { OrderSource } from 'src/shared/enums/order-source.enum';
import { PaymentStatus } from 'src/shared/enums/payment-status.enum';
import { ShippingStatus } from 'src/shared/enums/shipping-status.enum';
import { EventStoreEntity } from 'src/event-store/event-store.entity';

@Injectable()
export class OrderService {
  private readonly shippingStatusRank: Record<ShippingStatus, number> = {
    [ShippingStatus.PENDING]: 0,
    [ShippingStatus.FULFILLING]: 1,
    [ShippingStatus.SHIPPED]: 2,
    [ShippingStatus.DELIVERED]: 3,
  };
  constructor(private readonly orderRepository: OrderRepository) {}

  async createOrder(
    order: Partial<OrderEntity>,
    entityManager?: EntityManager,
  ) {
    return this.orderRepository.save(order, entityManager);
  }

  async findByRefIdForUpdate(
    refId: string,
    source: OrderSource,
    entityManager?: EntityManager,
  ) {
    return this.orderRepository.findByRefIdForUpdate(
      refId,
      source,
      entityManager,
    );
  }

  findByIdForUpdate(id: string, entityManager?: EntityManager) {
    return this.orderRepository.findByIdForUpdate(id, entityManager);
  }

  findByCourierAndTrackingNumberForUpdate(
    courier: string,
    trackingNumber: string,
    entityManager?: EntityManager,
  ) {
    return this.orderRepository.findByCourierAndTrackingNumberForUpdate(
      courier,
      trackingNumber,
      entityManager,
    );
  }

  isCreatedBefore(order: OrderEntity) {
    // placeholder is set to true, only if update event came first.
    return !order.placeholder;
  }

  isReadyForBooking(order: OrderEntity) {
    return (
      order.paymentStatus === PaymentStatus.PAID &&
      !order.placeholder &&
      order.shippingStatus === ShippingStatus.PENDING
    );
  }

  updateOrderById(
    orderId: string,
    order: Partial<OrderEntity>,
    entityManager?: EntityManager,
  ) {
    return this.orderRepository.updateOrderById(orderId, order, entityManager);
  }

  // dummy method to book order courier
  bookOrderCourier(order: OrderEntity) {
    order.courier = 'courier';
    order.shippingFee = 100;
    order.trackingNumber = Math.random().toString(36).substring(2, 15);
  }

  isValidShippingStatusTransition(order: OrderEntity, status: ShippingStatus) {
    return (
      this.shippingStatusRank[order.shippingStatus] <
      this.shippingStatusRank[status]
    );
  }

  isOrderCancelled(event: EventStoreEntity, order: OrderEntity) {
    return (
      event.payload.financialStatus === PaymentStatus.CANCELLED &&
      order.paymentStatus !== PaymentStatus.CANCELLED
    );
  }
}
