"use client";

import { useState } from "react";
import { Provider } from "react-redux";
import AuthModal from "@/components/auth/AuthModal";
import AuthProvider from "@/components/providers/AuthProvider";
import Toaster from "@/components/ui/Toaster";
import { makeStore } from "@/store";

export default function Providers({ children }) {
  const [store] = useState(makeStore);

  return (
    <Provider store={store}>
      <AuthProvider>
        {children}
        <AuthModal />
        <Toaster />
      </AuthProvider>
    </Provider>
  );
}
