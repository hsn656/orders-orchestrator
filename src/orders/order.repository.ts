import { Injectable } from '@nestjs/common';
import { OrderEntity } from './order.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { PaymentStatus } from '../shared/enums/payment-status.enum';
import { ShippingStatus } from '../shared/enums/shipping-status.enum';
import { OrderSource } from '../shared/enums/order-source.enum';

@Injectable()
export class OrderRepository {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly repo: Repository<OrderEntity>,
    private readonly dataSource: DataSource,
  ) {}

  getRepository(entityManager?: EntityManager) {
    return entityManager ? entityManager.getRepository(OrderEntity) : this.repo;
  }

  async findByRefIdForUpdate(
    refId: string,
    source: OrderSource,
    entityManager?: EntityManager,
  ) {
    const repo = this.getRepository(entityManager);
    return repo.findOne({
      where: { refId, source },
      lock: { mode: 'pessimistic_write' },
    });
  }

  async findByIdForUpdate(id: string, entityManager?: EntityManager) {
    const repo = this.getRepository(entityManager);
    return repo.findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
  }

  async createPlaceholder(
    refId: string,
    businessUpdatedAt: Date,
    entityManager?: EntityManager,
  ) {
    const repo = this.getRepository(entityManager);
    const order = new OrderEntity({
      refId,
      paymentStatus: PaymentStatus.PENDING,
      businessUpdatedAt,
      shippingStatus: ShippingStatus.PENDING,
      placeholder: true,
    });
    return repo.save(order);
  }

  save(order: Partial<OrderEntity>, entityManager?: EntityManager) {
    const repo = this.getRepository(entityManager);
    return repo.save(order);
  }

  async tx<T>(fn: () => Promise<T>): Promise<T> {
    return this.dataSource.transaction(fn);
  }

  updateOrderById(
    orderId: string,
    order: Partial<OrderEntity>,
    entityManager?: EntityManager,
  ) {
    const repo = this.getRepository(entityManager);
    return repo.save({ id: orderId, ...order });
  }

  findByCourierAndTrackingNumberForUpdate(
    courier: string,
    trackingNumber: string,
    entityManager?: EntityManager,
  ) {
    const repo = this.getRepository(entityManager);
    return repo.findOne({
      where: { courier, trackingNumber },
    });
  }
}
