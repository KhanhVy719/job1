import type { Address } from "@/types/Address";

export interface Referral {
  code: string[];
  receive: number;
  me_receive: number;
  member: string;
  balance: string;
}

export interface Wallet {
  balance: number;
  total: number;
}

export interface User {
  _id: string;
  avatar?: string;
  username: string;
  fullname: string;
  phone?: string;
  email: string;
  cccd?: string;
  gender?: string;
  password: string;
  role: string;
  status?: string;
  wallet: Wallet;
  referral?: Referral;
  address?: Address;
  createdAt?: Date;
  updatedAt?: Date;
  balance?: number;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
}
