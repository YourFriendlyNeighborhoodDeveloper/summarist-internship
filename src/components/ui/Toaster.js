"use client";

import { useEffect } from "react";
import { AiFillCheckCircle, AiFillWarning, AiOutlineClose } from "react-icons/ai";
import { BiErrorCircle } from "react-icons/bi";
import { useDispatch, useSelector } from "react-redux";
import { dismissToast } from "@/store/toastSlice";
import styles from "./Toaster.module.css";

const ICONS = {
  success: AiFillCheckCircle,
  warning: AiFillWarning,
  error: BiErrorCircle,
};

function Toast({ toast }) {
  const dispatch = useDispatch();
  const Icon = ICONS[toast.tone] ?? ICONS.success;

  useEffect(() => {
    if (!toast.duration) return undefined;
    const timer = setTimeout(() => dispatch(dismissToast(toast.id)), toast.duration);
    return () => clearTimeout(timer);
  }, [dispatch, toast.duration, toast.id]);

  return (
    <div className={`${styles.toast} ${styles[toast.tone] ?? ""}`.trim()}>
      <Icon aria-hidden="true" className={styles.icon} />
      <p className={styles.message}>{toast.message}</p>
      <button
        type="button"
        className={styles.close}
        aria-label="Dismiss notification"
        onClick={() => dispatch(dismissToast(toast.id))}
      >
        <AiOutlineClose aria-hidden="true" />
      </button>
    </div>
  );
}

export default function Toaster() {
  const toasts = useSelector((state) => state.toasts);

  return (
    <div className={styles.region} role="status" aria-live="polite">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
