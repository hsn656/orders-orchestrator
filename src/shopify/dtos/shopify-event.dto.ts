export class ShopifyEventDto {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  financial_status: string;
  fulfillment_status: string | null;
  cancelled_at: string | null;
  customer: { id: number; email: string };
  shipping_address: {
    name: string;
    address1: string;
    city: string;
    country: string;
  };
  total_price: string;
  currency: string;
}
