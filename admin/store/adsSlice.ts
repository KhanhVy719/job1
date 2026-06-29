// store/adsSlice.ts
import { createSlice } from "@reduxjs/toolkit";

const adsSlice = createSlice({
  name: "ads",
  initialState: {
    banner: [],
    recommend: [],
    others: [],
  },
  reducers: {
    setAdsData: (state, action) => ({ ...state, ...action.payload }),
  },
});

export const { setAdsData } = adsSlice.actions;
export default adsSlice.reducer;
