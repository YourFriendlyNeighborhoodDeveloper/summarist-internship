"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { AiOutlineHome, AiOutlineSearch } from "react-icons/ai";
import { BsBookmark } from "react-icons/bs";
import { FiHelpCircle, FiLogOut } from "react-icons/fi";
import { RiBallPenLine, RiFontSize } from "react-icons/ri";
import { RxGear } from "react-icons/rx";
import { useDispatch, useSelector } from "react-redux";
import logo from "@/assets/logo.png";
import { useAuth } from "@/components/providers/AuthProvider";
import { logout } from "@/lib/auth";
import { showToast } from "@/store/toastSlice";
import { FONT_SIZES, closeSidebar, openAuthModal, setFontSize } from "@/store/uiSlice";
import styles from "./Sidebar.module.css";

const subscribeToNothing = () => () => {};

function useHydrated() {
  return useSyncExternalStore(subscribeToNothing, () => true, () => false);
}

function ItemContent({ icon: Icon, label, active }) {
  return (
    <>
      <span className={`${styles.line} ${active ? styles.lineActive : ""}`.trim()} />
      <span className={styles.icon} aria-hidden="true">
        <Icon />
      </span>
      <span className={styles.text}>{label}</span>
    </>
  );
}

function NavItem({ href, icon, label, active, onNavigate, linkRef }) {
  return (
    <li>
      <Link
        ref={linkRef}
        href={href}
        className={styles.item}
        aria-current={active ? "page" : undefined}
        onClick={onNavigate}
      >
        <ItemContent icon={icon} label={label} active={active} />
      </Link>
    </li>
  );
}

function DisabledItem({ icon, label }) {
  return (
    <li>
      <button type="button" className={`${styles.item} ${styles.notAllowed}`} aria-disabled="true">
        <ItemContent icon={icon} label={label} />
      </button>
    </li>
  );
}

function ActionItem({ icon, label, onClick }) {
  return (
    <li>
      <button type="button" className={styles.item} onClick={onClick}>
        <ItemContent icon={icon} label={label} />
      </button>
    </li>
  );
}

function FontSizeControls() {
  const dispatch = useDispatch();
  const fontSize = useSelector((state) => state.ui.fontSize);

  return (
    <li>
      <div className={styles.fontSizes} role="group" aria-label="Summary text size">
        {FONT_SIZES.map((size, index) => (
          <button
            key={size}
            type="button"
            className={`${styles.fontSize} ${fontSize === size ? styles.fontSizeActive : ""}`.trim()}
            aria-pressed={fontSize === size}
            aria-label={`Text size ${index + 1} of ${FONT_SIZES.length}`}
            onClick={() => dispatch(setFontSize(size))}
          >
            <RiFontSize aria-hidden="true" style={{ width: 20 + index * 4, height: 20 + index * 4 }} />
          </button>
        ))}
      </div>
    </li>
  );
}

function SidebarView({ section }) {
  const dispatch = useDispatch();
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);
  const { account } = useAuth();
  const signedIn = useHydrated() && Boolean(account);
  const firstLinkRef = useRef(null);
  const isPlayer = section === "player";
  const close = () => dispatch(closeSidebar());

  useEffect(() => {
    if (!sidebarOpen) return undefined;
    firstLinkRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      dispatch(closeSidebar());
      document.getElementById("sidebar-toggle")?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen, dispatch]);

  async function handleLogout() {
    close();
    try {
      await logout();
      dispatch(showToast({ message: "You have logged out successfully." }));
    } catch {
      dispatch(showToast({ message: "We couldn't log you out. Please try again.", tone: "error" }));
    }
  }

  return (
    <>
      <div
        className={`${styles.overlay} ${sidebarOpen ? "" : styles.overlayHidden}`.trim()}
        onClick={close}
        aria-hidden="true"
      />
      <aside
        id="app-sidebar"
        className={[styles.sidebar, sidebarOpen && styles.opened, isPlayer && styles.withPlayer]
          .filter(Boolean)
          .join(" ")}
        aria-label="Sidebar"
      >
        <div className={styles.logo}>
          <Image src={logo} alt="Summarist" sizes="160px" />
        </div>
        <nav className={styles.wrapper} aria-label="App">
          <ul className={styles.top}>
            <NavItem
              href="/for-you"
              icon={AiOutlineHome}
              label="For you"
              active={section === "for-you"}
              onNavigate={close}
              linkRef={firstLinkRef}
            />
            <NavItem
              href="/library"
              icon={BsBookmark}
              label="My Library"
              active={section === "library"}
              onNavigate={close}
            />
            <DisabledItem icon={RiBallPenLine} label="Highlights" />
            <DisabledItem icon={AiOutlineSearch} label="Search" />
            {isPlayer && <FontSizeControls />}
          </ul>
          <ul>
            <NavItem
              href="/settings"
              icon={RxGear}
              label="Settings"
              active={section === "settings"}
              onNavigate={close}
            />
            <DisabledItem icon={FiHelpCircle} label="Help & Support" />
            {signedIn ? (
              <ActionItem icon={FiLogOut} label="Logout" onClick={handleLogout} />
            ) : (
              <ActionItem icon={FiLogOut} label="Login" onClick={() => dispatch(openAuthModal())} />
            )}
          </ul>
        </nav>
      </aside>
    </>
  );
}

export function SidebarFallback() {
  return <SidebarView section={null} />;
}

export default function Sidebar() {
  const pathname = usePathname();
  return <SidebarView section={pathname.split("/")[1] ?? ""} />;
}
