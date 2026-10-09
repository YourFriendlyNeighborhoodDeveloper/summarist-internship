import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/logo.png";
import styles from "./not-found.module.css";

export const metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <main className={styles.wrapper}>
      <Link href="/" className={styles.logo}>
        <Image src={logo} alt="Summarist home" sizes="200px" />
      </Link>
      <h1 className={styles.title}>We couldn&apos;t find that page</h1>
      <p className={styles.text}>The link may be broken, or the page may have moved.</p>
      <Link href="/for-you" className={`btn ${styles.button}`}>
        Browse books
      </Link>
    </main>
  );
}
