"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { AiOutlineSearch } from "react-icons/ai";
import { BiTime } from "react-icons/bi";
import { CgClose } from "react-icons/cg";
import { RxHamburgerMenu } from "react-icons/rx";
import { useDispatch, useSelector } from "react-redux";
import BookCover from "@/components/books/BookCover";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import useAudioDuration from "@/hooks/useAudioDuration";
import { searchBooks } from "@/lib/books";
import { formatTime, pluralize } from "@/lib/format";
import { toggleSidebar } from "@/store/uiSlice";
import styles from "./SearchBar.module.css";

export const SEARCH_DEBOUNCE_MS = 300;

function SearchResult({ book, onSelect }) {
  const duration = useAudioDuration(book.audioLink);

  return (
    <li>
      <Link href={`/book/${book.id}`} className={styles.result} onClick={onSelect}>
        <BookCover src={book.imageLink} size={80} />
        <div>
          <div className={styles.resultTitle}>{book.title}</div>
          <div className={styles.resultAuthor}>{book.author}</div>
          <div className={styles.resultDuration}>
            <BiTime aria-hidden="true" />
            <span className="visually-hidden">Duration</span>
            {duration == null ? "--:--" : formatTime(duration)}
          </div>
        </div>
      </Link>
    </li>
  );
}

export default function SearchBar() {
  const dispatch = useDispatch();
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);
  const resultsId = useId();
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ key: null, books: [], error: null });

  const term = query.trim();
  const key = term ? `${term}#${attempt}` : null;

  useEffect(() => {
    if (!term) return undefined;
    const requestKey = `${term}#${attempt}`;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchBooks(term, { signal: controller.signal }).then(
        (books) => setResult({ key: requestKey, books, error: null }),
        (error) => {
          if (!controller.signal.aborted) setResult({ key: requestKey, books: [], error });
        },
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term, attempt]);

  const settled = key !== null && result.key === key;
  const showResults = open && key !== null;

  useEffect(() => {
    if (!showResults) return undefined;
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [showResults]);

  const clear = () => {
    setQuery("");
    setOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      if (showResults) {
        event.preventDefault();
        setOpen(false);
      } else {
        clear();
      }
    } else if (event.key === "ArrowDown" && showResults) {
      event.preventDefault();
      containerRef.current?.querySelector(`.${styles.result}`)?.focus();
    }
  };

  const status = !key
    ? ""
    : !settled
      ? "Searching…"
      : result.error
        ? "Search failed."
        : result.books.length
          ? `${pluralize(result.books.length, "result")} found.`
          : "No books found.";

  return (
    <header className={styles.background}>
      <div className={styles.wrapper} ref={containerRef}>
        <div className={styles.content}>
          <form className={styles.search} role="search" onSubmit={(event) => event.preventDefault()}>
            <label htmlFor={`${resultsId}-input`} className="visually-hidden">
              Search for books by title or author
            </label>
            <input
              ref={inputRef}
              id={`${resultsId}-input`}
              className={styles.input}
              type="search"
              placeholder="Search for books"
              autoComplete="off"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
            />
            <div className={styles.icon}>
              {query ? (
                <button
                  type="button"
                  className={styles.clear}
                  aria-label="Clear search"
                  onClick={() => {
                    clear();
                    inputRef.current?.focus();
                  }}
                >
                  <CgClose aria-hidden="true" />
                </button>
              ) : (
                <AiOutlineSearch aria-hidden="true" />
              )}
            </div>
          </form>
          <button
            id="sidebar-toggle"
            type="button"
            className={styles.toggle}
            aria-label={sidebarOpen ? "Close menu" : "Open menu"}
            aria-expanded={sidebarOpen}
            aria-controls="app-sidebar"
            onClick={() => dispatch(toggleSidebar())}
          >
            <RxHamburgerMenu aria-hidden="true" />
          </button>
        </div>

        <p className="visually-hidden" role="status" aria-live="polite">
          {showResults ? status : ""}
        </p>

        {showResults && (
          <div id={resultsId} className={styles.results} aria-label="Search results" role="region">
            {!settled ? (
              <div aria-hidden="true">
                {Array.from({ length: 5 }, (_, index) => (
                  <Skeleton key={index} height={120} marginBottom={index < 4 ? 8 : 0} />
                ))}
              </div>
            ) : result.error ? (
              <ErrorState
                compact
                title="Search isn't working right now"
                message={result.error.message}
                onRetry={() => setAttempt((count) => count + 1)}
              />
            ) : result.books.length ? (
              <ul>
                {result.books.map((book) => (
                  <SearchResult key={book.id} book={book} onSelect={clear} />
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>No books found for “{term}”.</p>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
