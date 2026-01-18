import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { OrderEntity } from 'src/orders/order.entity';
import { config } from '../config/config.service';
import { catchError, firstValueFrom, map } from 'rxjs';

@Injectable()
export class CourierServiceCommunicator {
  private readonly logger = new Logger(CourierServiceCommunicator.name);
  private readonly courierServiceUrl = config.getString('COURIER_SERVICE_URL');

  constructor(private readonly httpService: HttpService) {
    this.logger.log('CourierServiceCommunicator initialized');
  }

  requestShippingBooking(order: OrderEntity) {
    const url = `${this.courierServiceUrl}/request-shipping-booking`;
    this.logger.log(`Requesting shipping booking for order ${order.id}`);
    return firstValueFrom(
      this.httpService.post(url, order).pipe(
        map((res) => {
          this.logger.log(`Shipping booking requested for order ${order.id}`);
          return res.data;
        }),
        catchError((error) => {
          this.logger.error(`Error requesting shipping booking: ${error}`);
          throw error;
        }),
      ),
    );
  }

  notifyOrderPaymentCancelled(order: OrderEntity) {
    const url = `${this.courierServiceUrl}/notify-order-payment-cancelled`;
    this.logger.log(`Notifying order payment cancelled for order ${order.id}`);
    return firstValueFrom(
      this.httpService.post(url, order).pipe(
        map((res) => {
          this.logger.log(
            `Order payment cancelled notified for order ${order.id}`,
          );
          return res.data;
        }),
        catchError((error) => {
          this.logger.error(
            `Error notifying order payment cancelled: ${error}`,
          );
          throw error;
        }),
      ),
    );
  }
}
