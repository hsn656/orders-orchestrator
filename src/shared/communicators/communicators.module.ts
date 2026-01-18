import { Module } from '@nestjs/common';
import { CourierServiceCommunicator } from './courier-service.communicator';
import { HttpModule } from '@nestjs/axios';
import { Global } from '@nestjs/common';
import { ShopifyAdminServiceCommunicator } from './shopify-admin-service.communicator';

@Global()
@Module({
  imports: [HttpModule],
  providers: [CourierServiceCommunicator, ShopifyAdminServiceCommunicator],
  exports: [CourierServiceCommunicator, ShopifyAdminServiceCommunicator],
})
export class CommunicatorsModule {}
