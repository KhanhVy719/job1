
export type Transaction = {
  _id?: string;
  MGD?: number;
  amount: number;
  status: string;
  paymentMethod?: string | null;
  transactionId?: string | null;
  createdAt?: string | Date;
  [k: string]: unknown;
};
