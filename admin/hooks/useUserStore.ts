import { create } from "zustand";
import { User } from "@/types/User";
import { IShop } from "@/types/Shop";

export interface UserState {
  user: User | null;
  shop: IShop | null;
  settings: Record<string, string>;
  loading: boolean;
  ADS:Record<string, string>;
  setAds: (ads: Record<string, string>) => void;
  setUser: (user: User | null) => void;
  setShop: (shop: IShop | null) => void;
  setSettings: (settings: Record<string, string>) => void;
  setLoading: (loading: boolean) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  ADS:{},
  shop: null,
  settings: {},
  loading: true,
  setAds: (ADS) => set({ ADS }),
  setUser: (user) => set({ user }),
  setShop: (shop) => set({ shop }),
  setSettings: (settings) => set({ settings }),
  setLoading: (loading) => set({ loading }),
}));
