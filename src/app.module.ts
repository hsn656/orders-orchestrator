import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { ConfigModule } from './shared/config/config.module';
import { OrderModule } from './orders/order.module';
import { ShopifyModule } from './shopify/ shopify.module';
import { EventStoreModule } from './event-store/event-store.module';
import { MocksModule } from './mocks/mocks.module';
import { CommunicatorsModule } from './shared/communicators/communicators.module';
import { CourierModule } from './courier/courier.module';

@Module({
  imports: [
    InfrastructureModule,
    ConfigModule,
    OrderModule,
    ShopifyModule,
    EventStoreModule,
    // to mock server calls to shopify admin and courier services
    MocksModule,
    CommunicatorsModule,
    CourierModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
