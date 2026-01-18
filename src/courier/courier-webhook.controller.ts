import { Body, Controller, Post } from '@nestjs/common';
import { CourierWebhookService } from './courier-webhook.service';

@Controller('webhooks/courier')
export class CourierWebhookController {
  constructor(private readonly courierWebhookService: CourierWebhookService) {}
  @Post()
  handle(@Body() body) {
    return this.courierWebhookService.handle(body);
  }
}
