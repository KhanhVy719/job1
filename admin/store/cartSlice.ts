import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type CartItem = {
  productId: string;
  product: any;
  quantity: number;
  box?: string;
  unitPrice: number;
  basePrice?: number;
  combinedPercent?: number;
};

interface CartState {
  items: CartItem[];
  step: number;
}

const loadFromStorage = (): CartState => {
  if (typeof window === "undefined") return { items: [], step: 0 };
  try {
    const items = JSON.parse(localStorage.getItem("cart") || "[]");
    const step = Number(localStorage.getItem("cart_step") || 0);
    return { items, step };
  } catch {
    return { items: [], step: 0 };
  }
};

const saveToStorage = (state: CartState) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("cart", JSON.stringify(state.items));
  localStorage.setItem("cart_step", String(state.step));
};

const initialState: CartState = loadFromStorage();

export const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<CartItem>) {
      // Nếu đang ở bước > 1 thì không cho phép thêm / tăng số lượng
      if (state.step > 1) {
        return;
      }

      const item = action.payload;
      if (!item || Number(item.quantity) <= 0) return;

      const idx = state.items.findIndex(
        (c) =>
          c.productId === item.productId && (c.box ?? "") === (item.box ?? "")
      );
      if (idx >= 0) {
        state.items[idx].quantity += item.quantity;
      } else {
        state.items.push(item);
      }
      saveToStorage(state);
    },

    setQuantity(
      state,
      action: PayloadAction<{
        productId: string;
        box?: string;
        quantity: number;
      }>
    ) {
      const { productId, box, quantity } = action.payload;
      const idx = state.items.findIndex(
        (c) => c.productId === productId && (c.box ?? "") === (box ?? "")
      );
      if (idx < 0) return;

      const prevQty = state.items[idx].quantity;

      // Nếu quantity <= 0 => xóa item
      if (quantity <= 0) {
        state.items.splice(idx, 1);
        saveToStorage(state);
        return;
      }

      // Nếu đang step > 1 thì KHÔNG cho phép tăng số lượng (chỉ cho giảm)
      if (state.step > 1 && quantity > prevQty) {
        return;
      }

      // set bình thường (cho phép giảm hoặc set trong step <= 1)
      state.items[idx].quantity = quantity;
      saveToStorage(state);
    },

    removeItem(
      state,
      action: PayloadAction<{ productId: string; box?: string }>
    ) {
      const { productId, box } = action.payload;
      state.items = state.items.filter(
        (c) => !(c.productId === productId && (c.box ?? "") === (box ?? ""))
      );
      saveToStorage(state);
    },

    clearCart(state) {
      state.items = [];
      saveToStorage(state);
    },
    setStep(state, action: PayloadAction<number>) {
      state.step = Math.max(0, Math.floor(action.payload));
      saveToStorage(state);
    },
    nextStep(state) {
      state.step = Math.min(2, state.step + 1);
      saveToStorage(state);
    },
    prevStep(state) {
      state.step = Math.max(0, state.step - 1);
      saveToStorage(state);
    },
  },
});

export const {
  addItem,
  setQuantity,
  removeItem,
  clearCart,
  setStep,
  nextStep,
  prevStep,
} = cartSlice.actions;

export default cartSlice.reducer;
