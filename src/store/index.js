import { combineReducers, configureStore } from "@reduxjs/toolkit";
import toastReducer from "@/store/toastSlice";
import uiReducer from "@/store/uiSlice";

const rootReducer = combineReducers({
  ui: uiReducer,
  toasts: toastReducer,
});

export function makeStore() {
  return configureStore({ reducer: rootReducer });
}
