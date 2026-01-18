import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { OrderEntity } from 'src/orders/order.entity';
import { config } from '../config/config.service';
import { catchError, firstValueFrom, map } from 'rxjs';

@Injectable()
export class ShopifyAdminServiceCommunicator {
  private readonly logger = new Logger(ShopifyAdminServiceCommunicator.name);
  private readonly shopifyAdminServiceUrl = config.getString(
    'SHOPIFY_ADMIN_SERVICE_URL',
  );

  constructor(private readonly httpService: HttpService) {}

  notifyShopifyAdmin(order: OrderEntity) {
    const url = `${this.shopifyAdminServiceUrl}/update-shopify-order`;
    this.logger.log(`Notifying Shopify admin for order ${order.id}`);
    return firstValueFrom(
      this.httpService.post(url, order).pipe(
        map((res) => {
          this.logger.log(`Shopify admin notified for order ${order.id}`);
          return res.data;
        }),
        catchError((error) => {
          this.logger.error(`Error notifying Shopify admin: ${error}`);
          throw error;
        }),
      ),
    );
  }
}
