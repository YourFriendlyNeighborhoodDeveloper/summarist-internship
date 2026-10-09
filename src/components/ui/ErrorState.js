import { BiErrorCircle } from "react-icons/bi";
import styles from "./ErrorState.module.css";

export default function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try again",
  compact = false,
  children,
}) {
  return (
    <div role="alert" className={`${styles.error} ${compact ? styles.compact : ""}`.trim()}>
      <BiErrorCircle aria-hidden="true" className={styles.icon} />
      <div className={styles.title}>{title}</div>
      {message && <p className={styles.message}>{message}</p>}
      {onRetry && (
        <button type="button" className={`btn ${styles.retry}`} onClick={onRetry}>
          {retryLabel}
        </button>
      )}
      {children}
    </div>
  );
}
