import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('event_store')
export class EventStoreEntity {
  constructor(event: Partial<EventStoreEntity>) {
    Object.assign(this, event);
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', nullable: true })
  source: string;

  @Column({ type: 'varchar' })
  type: string;

  @Column({ type: 'varchar', nullable: true, name: 'ref_id' })
  refId: string;

  @Column({ type: 'uuid', nullable: true, name: 'order_id' })
  orderId: string;

  @Column({ type: 'jsonb', name: 'payload' })
  payload: { date: Date } & Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz', name: 'received_at' })
  receivedAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'processed_at' })
  processedAt: Date | null;
}
