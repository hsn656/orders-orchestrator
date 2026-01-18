import { ShippingStatus } from 'src/shared/enums/shipping-status.enum';

export class CourierEventDto {
  tracking_number: string;
  status: ShippingStatus;
  courier: string;
  timestamp: string;
}
