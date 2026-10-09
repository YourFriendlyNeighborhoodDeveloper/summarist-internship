"use client";

import Image from "next/image";
import { useState } from "react";
import { BsBook } from "react-icons/bs";
import styles from "./BookCover.module.css";

const OPTIMIZED_SOURCE = "https://firebasestorage.googleapis.com/v0/b/summaristt.appspot.com/o/";

export default function BookCover({ src, alt = "", size = 172, priority = false, className = "" }) {
  const [state, setState] = useState({ src: null, status: "loading" });
  const status = !src ? "error" : state.src === src ? state.status : "loading";

  return (
    <figure
      className={`${styles.cover} ${className}`.trim()}
      style={{ width: size }}
    >
      {status === "loading" && <div className={`skeleton ${styles.placeholder}`} aria-hidden="true" />}
      {status === "error" && (
        <div className={styles.fallback} aria-hidden="true">
          <BsBook />
        </div>
      )}
      {src && status !== "error" && (
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          sizes={`${size}px`}
          priority={priority}
          unoptimized={!src.startsWith(OPTIMIZED_SOURCE)}
          className={styles.image}
          data-loaded={status === "loaded"}
          onLoad={() => setState({ src, status: "loaded" })}
          onError={() => setState({ src, status: "error" })}
        />
      )}
    </figure>
  );
}
