import type { User } from "@/types/User";
export type Orders = {
  _id: string;
  orderId?: number;
  productId?: string | null;
  UserId?: string | null;
  shop?: string | null;
  name?: string | null;
  sku?: string | null;
  path?: string | null;
  price?: number | null;
  menu?: Record<string, unknown> | null;
  discount?: string | null;
  category?: Record<string, unknown> | null;
  content?: string | null;
  description?: string | null;
  thumbnail?: string | null;
  data?: any[];
  box?: string | null;
  quantity?: number;
  unitPrice?: number;
  lineTotal?: number;
  status?: string;
  API_CRON?: string;
  discountCode?: string;
  discountAmount?: string;
  totalAfterDiscount?: string;
  pay?: Payment;
  user?: User;
  createdAt?: Date;
  updatedAt?: Date;
};
export interface Payment {
  type: string;
  MGD: string;
  transactionId: string;
  status: string;
  refundAmount: Number;
  refundNote: string;
}

export type Status = "success" | "failed" | "pending" | "refunded";
