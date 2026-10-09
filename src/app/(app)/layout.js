import { Suspense } from "react";
import SearchBar from "@/components/layout/SearchBar";
import Sidebar, { SidebarFallback } from "@/components/layout/Sidebar";
import styles from "./layout.module.css";

export default function AppLayout({ children }) {
  return (
    <div className={styles.wrapper}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to content
      </a>
      <SearchBar />
      <Suspense fallback={<SidebarFallback />}>
        <Sidebar />
      </Suspense>
      <main id="main-content" className={styles.main} tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
