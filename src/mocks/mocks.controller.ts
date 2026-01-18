import { Controller, Post } from '@nestjs/common';

@Controller('mocks')
export class MocksController {
  @Post('request-shipping-booking')
  requestShippingBooking() {
    return {
      message: 'Shipping booking requested',
    };
  }

  @Post('update-shopify-order')
  updateShopifyOrder() {
    return {
      message: 'Shopify order updated',
    };
  }
}
