
import {IShop} from "@/types/Shop"
export interface VariantChild {
  name: string;
}
export interface VariantBox {
  box?: string;
  quantity?: number;
  original_price?: number;
  price?: number;
  total?: number;
  data?: string | null;
  discount?: string | number | null;
  type?: string | null;
}


export interface VariantGroup {
  name: string;
  data: VariantChild[];
}
export interface VariantSales {
  status?: string;
  quantity?: string | number;
}
export type NormResponse = {
  data: Product[];
  total: number;
  page: number;
  totalPages: number;
};
export type Product = {
  id?: string;
  _id?: string;
  code?: string;
  shop?: IShop| string;
  name?: string;
  sku?: string;
  path: string;
  price?: number;
  menu?: { _id?: string; name?: string;path?: string; };
  category?: { _id?: string; name?: string ;icon?: string; path?: string; };
  content?: string;
  description?: string;
  thumbnail?: string;
  total?: number;
  hasVariant?: boolean;
  items?: VariantGroup[];
  images?: string[];
  data?: VariantBox[] | VariantBox;
  status?: string;
  sales?: VariantSales ;
};

export type InitialProduct = {
  items?: VariantGroup[];
  hasVariant?: boolean;
  images?: ImageItem[];
};

export interface Item {
  name: string;
  data: { name: string }[];
}

export interface BoxData {
  hasVariant: boolean;
  items: Item[];
  data?: VariantBox[];
}

export interface ImageItem {
  id: number;
  src: string;
  uploadedSrc?: string | null;
}

