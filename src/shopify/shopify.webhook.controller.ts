import { Body, Controller, Headers, Post } from '@nestjs/common';
import { ShopifyWebhookService } from './shopify.webhook.service';

@Controller('/webhooks/shopify')
export class ShopifyWebhookController {
  constructor(private readonly shopifyWebhookService: ShopifyWebhookService) {}

  @Post()
  handle(@Body() body, @Headers('x-shopify-topic') topic: string) {
    return this.shopifyWebhookService.handle(body, topic);
  }
}
