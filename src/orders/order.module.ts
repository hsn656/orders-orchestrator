import { Module, Global } from '@nestjs/common';
import { OrderRepository } from './order.repository';
import { OrderEntity } from './order.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderService } from './order.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([OrderEntity])],
  providers: [OrderRepository, OrderService],
  exports: [OrderRepository, OrderService],
})
export class OrderModule {}
