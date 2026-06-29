import { configureStore, Middleware } from "@reduxjs/toolkit";
import cartReducer from "./cartSlice";
import adsReducer from "./adsSlice";

import { fancyLogger } from "./loggerMiddleware";

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    ads: adsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(fancyLogger as Middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
if (typeof window !== "undefined") {
  store.subscribe(() => {
    const state = store.getState();
    const items = state.cart.items ?? [];
    const step = items.length === 0 ? 0 : state.cart.step ?? 0;

    localStorage.setItem("cart", JSON.stringify(items));
    localStorage.setItem("cart_step", String(step));
  });
}
