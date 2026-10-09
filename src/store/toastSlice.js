import { createSlice, nanoid } from "@reduxjs/toolkit";

const MAX_TOASTS = 3;

const toastSlice = createSlice({
  name: "toasts",
  initialState: [],
  reducers: {
    showToast: {
      reducer(state, action) {
        state.push(action.payload);
        if (state.length > MAX_TOASTS) state.shift();
      },
      prepare({ message, tone = "success", duration = 5000 }) {
        return { payload: { id: nanoid(), message, tone, duration } };
      },
    },
    dismissToast(state, action) {
      return state.filter((toast) => toast.id !== action.payload);
    },
  },
});

export const { showToast, dismissToast } = toastSlice.actions;

export default toastSlice.reducer;
