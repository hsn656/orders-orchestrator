import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { EventStoreEntity } from './event-store.entity';

@Injectable()
export class EventStoreRepository {
  constructor(
    @InjectRepository(EventStoreEntity)
    private readonly repo: Repository<EventStoreEntity>,
  ) {}

  getRepository(entityManager?: EntityManager) {
    return entityManager
      ? entityManager.getRepository(EventStoreEntity)
      : this.repo;
  }

  save(event: Partial<EventStoreEntity>, entityManager?: EntityManager) {
    const repo = this.getRepository(entityManager);
    return repo.save(event);
  }

  markAsProcessed(event: EventStoreEntity, entityManager?: EntityManager) {
    const repo = this.getRepository(entityManager);
    return repo.update(event.id, { processedAt: new Date() });
  }
}
