"use client";

import { useState } from "react";
import { CgClose } from "react-icons/cg";
import { useDispatch } from "react-redux";
import BookCarousel, { BookRowSkeleton } from "@/components/books/BookCarousel";
import { useAuth } from "@/components/providers/AuthProvider";
import ErrorState from "@/components/ui/ErrorState";
import LoginPrompt from "@/components/ui/LoginPrompt";
import Skeleton from "@/components/ui/Skeleton";
import { useShelf } from "@/hooks/useShelf";
import { pluralize } from "@/lib/format";
import { removeFromShelf } from "@/lib/library";
import { showToast } from "@/store/toastSlice";
import { openAuthModal } from "@/store/uiSlice";
import styles from "./Library.module.css";

function RemoveButton({ book, uid }) {
  const dispatch = useDispatch();
  const [removing, setRemoving] = useState(false);

  async function remove() {
    setRemoving(true);
    try {
      await removeFromShelf(uid, "saved", book.id);
      dispatch(showToast({ message: "Book removed from your library." }));
    } catch {
      setRemoving(false);
      dispatch(showToast({ message: "We couldn't remove that book. Please try again.", tone: "error" }));
    }
  }

  return (
    <button
      type="button"
      className={styles.remove}
      onClick={remove}
      disabled={removing}
      aria-label={`Remove ${book.title} from your library`}
    >
      <CgClose aria-hidden="true" />
    </button>
  );
}

function Shelf({ id, title, shelf, emptyTitle, emptyText, renderAction }) {
  const { books, loading, error, retry } = shelf;

  return (
    <section aria-labelledby={id} className={styles.shelf}>
      <h2 id={id} className={styles.title}>
        {title}
      </h2>
      {loading ? (
        <>
          <Skeleton width={100} height={20} marginBottom={24} />
          <BookRowSkeleton label={`Loading ${title.toLowerCase()}`} />
        </>
      ) : error ? (
        <ErrorState
          title={`We couldn't load your ${title.toLowerCase()}`}
          message="Check your connection and try again."
          onRetry={retry}
        />
      ) : books.length ? (
        <>
          <p className={styles.subtitle}>{pluralize(books.length, "item")}</p>
          <BookCarousel books={books} label={title} renderAction={renderAction} />
        </>
      ) : (
        <>
          <p className={styles.subtitle}>0 items</p>
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>{emptyTitle}</p>
            <p className={styles.emptyText}>{emptyText}</p>
          </div>
        </>
      )}
    </section>
  );
}

export default function Library() {
  const dispatch = useDispatch();
  const { account, initializing } = useAuth();
  const saved = useShelf("saved");
  const finished = useShelf("finished");

  if (!initializing && !account) {
    return (
      <div className="row">
        <div className="container">
          <LoginPrompt text="Log in to your account to see your library." />
        </div>
      </div>
    );
  }

  return (
    <div className="row">
      <div className="container">
        <h1 className="visually-hidden">My Library</h1>
        {account?.isAnonymous && (
          <div className={styles.guestNotice}>
            <p>You&apos;re browsing as a guest, so this library is temporary.</p>
            <button
              type="button"
              className={styles.guestButton}
              onClick={() =>
                dispatch(
                  openAuthModal({ view: "register", message: "Sign up to keep your library." }),
                )
              }
            >
              Sign up to keep it
            </button>
          </div>
        )}
        <Shelf
          id="saved-title"
          title="Saved Books"
          shelf={saved}
          emptyTitle="Save your favorite books!"
          emptyText="When you save a book, it will appear here."
          renderAction={account ? (book) => <RemoveButton book={book} uid={account.uid} /> : undefined}
        />
        <Shelf
          id="finished-title"
          title="Finished"
          shelf={finished}
          emptyTitle="Done and dusted!"
          emptyText="When you finish a book, you can find it here later."
        />
      </div>
    </div>
  );
}
