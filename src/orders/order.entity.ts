import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ShippingStatus } from '../shared/enums/shipping-status.enum';
import { OrderSource } from '../shared/enums/order-source.enum';
import { PaymentStatus } from '../shared/enums/payment-status.enum';

@Entity('orders')
@Index(['refId', 'source'], { unique: true })
@Index(['courier', 'trackingNumber'], {
  where: 'courier IS NOT NULL AND tracking_number IS NOT NULL',
})
export class OrderEntity {
  constructor(order: Partial<OrderEntity>) {
    Object.assign(this, order);
  }

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', nullable: true, name: 'ref_id' })
  refId: string;

  @Column({ type: 'varchar', default: OrderSource.SHOPIFY })
  source: OrderSource;

  @Column({
    type: 'varchar',
    default: PaymentStatus.PENDING,
    name: 'payment_status',
  })
  paymentStatus: PaymentStatus;

  @Column({ type: 'timestamptz', nullable: true, name: 'business_updated_at' })
  businessUpdatedAt: Date;

  @Column({
    type: 'varchar',
    default: ShippingStatus.PENDING,
    name: 'shipping_status',
  })
  shippingStatus: ShippingStatus;

  @Column({ type: 'timestamptz', nullable: true, name: 'shipping_updated_at' })
  shippingUpdatedAt: Date;

  @Column({ type: 'boolean', default: true })
  placeholder: boolean;

  @Column({ type: 'varchar', nullable: true })
  courier: string;

  @Column({ type: 'varchar', nullable: true, name: 'tracking_number' })
  trackingNumber: string;

  @Column({ type: 'numeric', nullable: true, name: 'shipping_fee' })
  shippingFee: number;

  @Column({ type: 'timestamptz', nullable: true, name: 'delivery_at' })
  deliveryAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'cancelled_at' })
  cancelledAt: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'jsonb', nullable: true, name: 'customer' })
  customer: any;

  @Column({ type: 'varchar', nullable: true, name: 'total_price' })
  totalPrice: string;

  @Column({ type: 'varchar', nullable: true, name: 'currency' })
  currency: string;

  @Column({ type: 'jsonb', nullable: true, name: 'shipping_address' })
  shippingAddress: any;
}
