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
  paymentMethod: PaymentMethod;
  selections: Selection[];
  streetAddress: string;
}

export interface Confirmation {
  __ctor: "Confirmation";
  orderId: string;
}

/* CONSTANTS */

export enum PaymentMethod {
  Bitcoin,
  Credit
}

export enum Status {
  Received,
  Paid,
  Processing,
  Shipped,
  Confirming
}

export function sizeIndex(s: Size): number {
  switch (s) {
    case "S":
      return 0;
    case "M":
      return 1;
    case "L":
      return 2;
  }
}
