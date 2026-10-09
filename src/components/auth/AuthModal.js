"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { CgClose } from "react-icons/cg";
import { FaUser } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import googleIcon from "@/assets/google.png";
import { useAuth } from "@/components/providers/AuthProvider";
import Spinner from "@/components/ui/Spinner";
import {
  getAuthErrorMessage,
  loginAsGuest,
  loginWithEmail,
  loginWithGoogle,
  registerWithEmail,
  requestPasswordReset,
} from "@/lib/auth";
import { closeAuthModal, setAuthView } from "@/store/uiSlice";
import styles from "./AuthModal.module.css";

const COPY = {
  login: {
    title: "Log in to Summarist",
    submit: "Login",
    switchLabel: "Don't have an account?",
    switchTo: "register",
    google: "Login with Google",
  },
  register: {
    title: "Sign up to Summarist",
    submit: "Sign up",
    switchLabel: "Already have an account?",
    switchTo: "login",
    google: "Sign up with Google",
  },
  forgot: {
    title: "Reset your password",
    submit: "Send reset password link",
    switchLabel: "Go to login",
    switchTo: "login",
  },
};

const SILENT_ERRORS = new Set(["auth/popup-closed-by-user", "auth/cancelled-popup-request"]);

function Separator() {
  return (
    <div className={styles.separator} aria-hidden="true">
      <span className={styles.separatorText}>or</span>
    </div>
  );
}

function AuthPanel({ view, message, onClose }) {
  const dispatch = useDispatch();
  const { account } = useAuth();
  const id = useId();
  const emailRef = useRef(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);
  const [resetSent, setResetSent] = useState(false);
  const copy = COPY[view];
  const busy = pending !== null;
  const notice =
    message ||
    (view === "register" && account?.isAnonymous
      ? "You're using a guest account. Sign up to keep your library and subscribe."
      : "");

  useEffect(() => {
    if (emailRef.current?.closest("dialog")?.open) emailRef.current.focus();
  }, []);

  async function run(kind, action, { closeOnSuccess = true } = {}) {
    if (busy) return;
    setPending(kind);
    setError(null);
    try {
      await action();
      if (closeOnSuccess) dispatch(closeAuthModal());
    } catch (caught) {
      if (!SILENT_ERRORS.has(caught?.code)) {
        setError({ message: getAuthErrorMessage(caught), field: caught?.field ?? null });
      }
    } finally {
      setPending(null);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (view === "forgot") {
      run(
        "email",
        async () => {
          await requestPasswordReset(email);
          setResetSent(true);
        },
        { closeOnSuccess: false },
      );
      return;
    }
    run("email", () =>
      view === "login" ? loginWithEmail(email, password) : registerWithEmail(email, password),
    );
  }

  const errorId = `${id}-error`;

  return (
    <>
      <div className={styles.content}>
        <h2 id="auth-title" className={styles.title}>
          {copy.title}
        </h2>
        {notice && <p className={styles.notice}>{notice}</p>}
        {error && (
          <p id={errorId} role="alert" className={styles.error}>
            {error.message}
          </p>
        )}
        {view === "forgot" && resetSent && (
          <p role="status" className={styles.success}>
            Check your inbox. If an account exists for that email, a reset link is on its way.
          </p>
        )}

        {view === "login" && (
          <>
            <button
              type="button"
              className={`btn ${styles.providerButton} ${styles.guest}`}
              disabled={busy}
              onClick={() => run("guest", loginAsGuest)}
            >
              <span className={`${styles.providerIcon} ${styles.guestIcon}`} aria-hidden="true">
                <FaUser />
              </span>
              {pending === "guest" ? <Spinner label="Logging in as a guest" /> : "Login as a Guest"}
            </button>
            <Separator />
          </>
        )}

        {view !== "forgot" && (
          <>
            <button
              type="button"
              className={`btn ${styles.providerButton} ${styles.google}`}
              disabled={busy}
              onClick={() => run("google", loginWithGoogle)}
            >
              <span className={styles.providerIcon} aria-hidden="true">
                <Image src={googleIcon} alt="" width={24} height={24} />
              </span>
              {pending === "google" ? <Spinner label="Connecting to Google" /> : copy.google}
            </button>
            <Separator />
          </>
        )}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <label className="visually-hidden" htmlFor={`${id}-email`}>
            Email address
          </label>
          <input
            ref={emailRef}
            id={`${id}-email`}
            className={styles.input}
            type="email"
            name="email"
            autoComplete="email"
            placeholder="Email Address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={error?.field === "email" || undefined}
            aria-describedby={error ? errorId : undefined}
            disabled={busy}
          />
          {view !== "forgot" && (
            <>
              <label className="visually-hidden" htmlFor={`${id}-password`}>
                Password
              </label>
              <input
                id={`${id}-password`}
                className={styles.input}
                type="password"
                name="password"
                autoComplete={view === "login" ? "current-password" : "new-password"}
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={error?.field === "password" || undefined}
                aria-describedby={error ? errorId : undefined}
                disabled={busy}
              />
            </>
          )}
          <button type="submit" className="btn" disabled={busy}>
            {pending === "email" ? <Spinner label="Please wait" /> : copy.submit}
          </button>
        </form>
      </div>

      {view === "login" && (
        <button
          type="button"
          className={styles.forgot}
          onClick={() => dispatch(setAuthView("forgot"))}
        >
          Forgot your password?
        </button>
      )}
      <button
        type="button"
        className={styles.switch}
        onClick={() => dispatch(setAuthView(copy.switchTo))}
      >
        {copy.switchLabel}
      </button>
      <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
        <CgClose aria-hidden="true" />
      </button>
    </>
  );
}

export default function AuthModal() {
  const dispatch = useDispatch();
  const { open, view, message } = useSelector((state) => state.ui.authModal);
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const { style } = document.body;
    const previous = style.overflow;
    style.overflow = "hidden";
    return () => {
      style.overflow = previous;
    };
  }, [open]);

  const close = () => dispatch(closeAuthModal());

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="auth-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      {open && <AuthPanel key={view} view={view} message={message} onClose={close} />}
    </dialog>
  );
}
