/* DATA MODEL */

export type Size = "S" | "M" | "L";

export interface Selection {
  product: Product;
  quantity: number;
  size: Size;
}

export type Message = Confirmation | Order | PaymentDetails | Products;

export interface Confirmation {
  __ctor: "Confirmation";
  orderId: string;
}

export interface PaymentDetails {
  __ctor: "PaymentDetails";
  address: string;
  amount: number;
}

export interface Products {
  __ctor: "Products";
  data: Product[];
}

export interface Product {
  id: string;
  caption: string;
  price: number;
}

export interface Order {
  __ctor: "Order";
  data: Selection[];
  paymentMethod: "bitcoin" | "credit";
}
