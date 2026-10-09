import { createSlice } from "@reduxjs/toolkit";

export const AUTH_VIEWS = ["login", "register", "forgot"];
export const FONT_SIZES = [16, 18, 22, 26];

const initialState = {
  authModal: { open: false, view: "login", message: "" },
  sidebarOpen: false,
  fontSize: FONT_SIZES[0],
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    openAuthModal(state, action) {
      const { view = "login", message = "" } = action.payload ?? {};
      state.authModal = { open: true, view: AUTH_VIEWS.includes(view) ? view : "login", message };
      state.sidebarOpen = false;
    },
    closeAuthModal(state) {
      state.authModal.open = false;
      state.authModal.message = "";
    },
    setAuthView(state, action) {
      if (AUTH_VIEWS.includes(action.payload)) {
        state.authModal.view = action.payload;
        state.authModal.message = "";
      }
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    closeSidebar(state) {
      state.sidebarOpen = false;
    },
    setFontSize(state, action) {
      if (FONT_SIZES.includes(action.payload)) state.fontSize = action.payload;
    },
  },
});

export const {
  openAuthModal,
  closeAuthModal,
  setAuthView,
  toggleSidebar,
  closeSidebar,
  setFontSize,
} = uiSlice.actions;

export default uiSlice.reducer;
