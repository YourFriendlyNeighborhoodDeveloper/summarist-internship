"use client";

import Image from "next/image";
import { useDispatch } from "react-redux";
import loginImage from "@/assets/login.png";
import { openAuthModal } from "@/store/uiSlice";
import styles from "./LoginPrompt.module.css";

export default function LoginPrompt({ text }) {
  const dispatch = useDispatch();

  return (
    <div className={styles.wrapper}>
      <Image src={loginImage} alt="" sizes="(max-width: 520px) 100vw, 460px" priority />
      <h2 className={styles.text}>{text}</h2>
      <button type="button" className={`btn ${styles.button}`} onClick={() => dispatch(openAuthModal())}>
        Login
      </button>
    </div>
  );
}
