import { ImSpinner8 } from "react-icons/im";
import styles from "./Spinner.module.css";

export default function Spinner({ size = 24, label = "Loading", className = "" }) {
  return (
    <span role="status" className={`${styles.spinner} ${className}`.trim()}>
      <ImSpinner8 aria-hidden="true" style={{ width: size, height: size }} />
      <span className="visually-hidden">{label}</span>
    </span>
  );
}
