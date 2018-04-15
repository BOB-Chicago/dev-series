/* DATA MODEL */

export type Size = "S" | "M" | "L";

export interface Selection {
  product: Product;
  quantity: number;
  size: Size;
}

export type Message = Confirmation | Order | PaymentAddress | Products;

export interface Confirmation {
  __ctor: "Confirmation";
  orderId: string;
}

export interface PaymentAddress {
  __ctor: "PaymentAddress";
  address: string;
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
