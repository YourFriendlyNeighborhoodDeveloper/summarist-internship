"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AiOutlineAudio,
  AiOutlineClockCircle,
  AiOutlineRead,
  AiOutlineStar,
} from "react-icons/ai";
import { BsBookmark, BsBookmarkFill } from "react-icons/bs";
import { HiOutlineLightBulb } from "react-icons/hi";
import { useDispatch } from "react-redux";
import BookCover from "@/components/books/BookCover";
import { useAuth } from "@/components/providers/AuthProvider";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import Spinner from "@/components/ui/Spinner";
import useAudioDuration from "@/hooks/useAudioDuration";
import useBookAccess from "@/hooks/useBookAccess";
import { useBook } from "@/hooks/useBooks";
import { useShelfEntry } from "@/hooks/useShelf";
import { formatTime } from "@/lib/format";
import { addToShelf, removeFromShelf } from "@/lib/library";
import { showToast } from "@/store/toastSlice";
import { openAuthModal } from "@/store/uiSlice";
import styles from "./BookDetails.module.css";

export function BookDetailsSkeleton() {
  return (
    <div className="row">
      <div className="container">
        <div className={styles.skeleton} role="status" aria-label="Loading book">
          <div className={styles.skeletonContent}>
            <Skeleton width="70%" height={32} marginBottom={16} />
            <Skeleton width="40%" height={32} marginBottom={16} />
            <Skeleton width="100%" height={32} marginBottom={16} />
            <Skeleton width="45%" height={64} marginBottom={16} />
            <Skeleton width="50%" height={32} marginBottom={16} />
            <Skeleton width="20%" height={32} marginBottom={16} />
            <Skeleton width="50%" height={64} marginBottom={16} />
            <Skeleton width="80%" height={180} marginBottom={16} />
            <Skeleton width="80%" height={268} />
          </div>
          <div className={styles.skeletonImage}>
            <div className={`skeleton ${styles.skeletonCover}`} aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function BookNotFound() {
  return (
    <div className="row">
      <div className="container">
        <ErrorState title="We couldn't find that book" message="The link may be broken or the book may have been removed.">
          <Link href="/for-you" className={`btn ${styles.backLink}`}>
            Browse books
          </Link>
        </ErrorState>
      </div>
    </div>
  );
}

export default function BookDetails({ id }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { account, isSubscribed, subscriptionLoading } = useAuth();
  const { data: book, loading, error, retry } = useBook(id);
  const access = useBookAccess(book);
  const saved = useShelfEntry("saved", book?.id);
  const duration = useAudioDuration(book?.audioLink);
  const [saving, setSaving] = useState(false);

  if (loading) return <BookDetailsSkeleton />;
  if (error?.isNotFound) return <BookNotFound />;
  if (error) {
    return (
      <div className="row">
        <div className="container">
          <ErrorState title="We couldn't load this book" message={error.message} onRetry={retry} />
        </div>
      </div>
    );
  }

  const showPremiumLabel = book.subscriptionRequired && !subscriptionLoading && !isSubscribed;

  function openBook() {
    if (access === "login") {
      dispatch(openAuthModal({ message: "Log in to read or listen to this book." }));
    } else if (access === "upgrade") {
      dispatch(
        showToast({
          message: `“${book.title}” is only available to Premium members.`,
          tone: "warning",
        }),
      );
      router.push("/choose-plan");
    } else if (access === "granted") {
      router.push(`/player/${book.id}`);
    }
  }

  async function toggleSaved() {
    if (!account) {
      dispatch(openAuthModal({ message: "Log in to save books to your library." }));
      return;
    }
    setSaving(true);
    try {
      if (saved.exists) {
        await removeFromShelf(account.uid, "saved", book.id);
        dispatch(showToast({ message: "Book removed from your library." }));
      } else {
        await addToShelf(account.uid, "saved", book);
        dispatch(showToast({ message: "Book added to your library." }));
      }
    } catch {
      dispatch(showToast({ message: "We couldn't update your library. Please try again.", tone: "error" }));
    } finally {
      setSaving(false);
    }
  }

  const checking = access === "checking";

  return (
    <div className="row">
      <div className="container">
        <div className={styles.wrapper}>
          <div className={styles.book}>
            <h1 className={styles.title}>
              {book.title}
              {showPremiumLabel && " (Premium)"}
            </h1>
            {book.author && <p className={styles.author}>{book.author}</p>}
            {book.subTitle && <p className={styles.subTitle}>{book.subTitle}</p>}

            <div className={styles.detailsWrapper}>
              <ul className={styles.details}>
                {book.averageRating != null && (
                  <li className={styles.detail}>
                    <AiOutlineStar aria-hidden="true" />
                    <span>
                      {book.averageRating.toFixed(1)}&nbsp;
                      {book.totalRating != null && `(${book.totalRating} ratings)`}
                    </span>
                  </li>
                )}
                <li className={styles.detail}>
                  <AiOutlineClockCircle aria-hidden="true" />
                  <span>
                    <span className="visually-hidden">Duration </span>
                    {duration == null ? "--:--" : formatTime(duration)}
                  </span>
                </li>
                {book.type && (
                  <li className={styles.detail}>
                    <AiOutlineAudio aria-hidden="true" />
                    <span>{book.type}</span>
                  </li>
                )}
                {book.keyIdeas != null && (
                  <li className={styles.detail}>
                    <HiOutlineLightBulb aria-hidden="true" />
                    <span>{book.keyIdeas} Key ideas</span>
                  </li>
                )}
              </ul>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.actionButton}
                onClick={openBook}
                disabled={checking}
                aria-busy={checking || undefined}
              >
                <AiOutlineRead aria-hidden="true" />
                Read
              </button>
              {book.audioLink && (
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={openBook}
                  disabled={checking}
                  aria-busy={checking || undefined}
                >
                  <AiOutlineAudio aria-hidden="true" />
                  Listen
                </button>
              )}
            </div>

            <button
              type="button"
              className={styles.bookmark}
              onClick={toggleSaved}
              disabled={saving || (Boolean(account) && saved.loading)}
              aria-pressed={account ? saved.exists : undefined}
            >
              {saving ? (
                <Spinner size={20} label="Updating your library" />
              ) : saved.exists ? (
                <BsBookmarkFill aria-hidden="true" />
              ) : (
                <BsBookmark aria-hidden="true" />
              )}
              {saved.exists ? "Saved in My Library" : "Add title to My Library"}
            </button>

            <h2 className={styles.secondaryTitle}>What&apos;s it about?</h2>
            {book.tags.length > 0 && (
              <ul className={styles.tags} aria-label="Tags">
                {book.tags.map((tag) => (
                  <li key={tag} className={styles.tag}>
                    {tag}
                  </li>
                ))}
              </ul>
            )}
            <p className={styles.description}>{book.bookDescription}</p>

            <h2 className={styles.secondaryTitle}>About the author</h2>
            <p className={styles.description}>{book.authorDescription}</p>
          </div>

          <div className={styles.imageWrapper}>
            <BookCover src={book.imageLink} alt={`Cover of ${book.title}`} size={300} priority />
          </div>
        </div>
      </div>
    </div>
  );
}
