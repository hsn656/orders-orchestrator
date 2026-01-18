import { EventStoreRepository } from './event-store.repository';
import { EntityManager } from 'typeorm';
import { EventStoreEntity } from './event-store.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EventStoreService {
  constructor(private readonly eventStoreRepository: EventStoreRepository) {}

  markAsProcessed(event: EventStoreEntity, entityManager?: EntityManager) {
    return this.eventStoreRepository.markAsProcessed(event, entityManager);
  }

  save(event: Partial<EventStoreEntity>, entityManager?: EntityManager) {
    return this.eventStoreRepository.save(event, entityManager);
  }
}
