"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BookNotFound } from "@/components/book/BookDetails";
import AudioPlayer from "@/components/player/AudioPlayer";
import { useAuth } from "@/components/providers/AuthProvider";
import ErrorState from "@/components/ui/ErrorState";
import LoginPrompt from "@/components/ui/LoginPrompt";
import Skeleton from "@/components/ui/Skeleton";
import Spinner from "@/components/ui/Spinner";
import useBookAccess from "@/hooks/useBookAccess";
import { useBook } from "@/hooks/useBooks";
import { addToShelf } from "@/lib/library";
import { showToast } from "@/store/toastSlice";
import { openAuthModal } from "@/store/uiSlice";
import styles from "./Player.module.css";

export function PlayerSkeleton() {
  return (
    <>
      <div className={styles.summary}>
        <div className={styles.spinner}>
          <Spinner size={64} label="Loading book" />
        </div>
      </div>
      <div className={styles.barSkeleton} aria-hidden="true">
        <div className={styles.barTrack}>
          <Skeleton width={48} height={48} />
          <div>
            <Skeleton width={50} height={16} marginBottom={8} />
            <Skeleton width={100} height={16} />
          </div>
        </div>
      </div>
    </>
  );
}

export default function Player({ id }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const fontSize = useSelector((state) => state.ui.fontSize);
  const { account } = useAuth();
  const { data: book, loading, error, retry } = useBook(id);
  const access = useBookAccess(book);

  useEffect(() => {
    if (access !== "upgrade" || !book) return;
    dispatch(
      showToast({
        message: `“${book.title}” is only available to Premium members.`,
        tone: "warning",
      }),
    );
    router.replace("/choose-plan");
  }, [access, book, dispatch, router]);

  if (loading) return <PlayerSkeleton />;
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
  if (access === "checking" || access === "upgrade") return <PlayerSkeleton />;

  if (access === "login") {
    return (
      <>
        <div className={styles.summary}>
          <div className={styles.content}>
            <h1 className={styles.title}>{book.title}</h1>
            <LoginPrompt text="Log in to your account to read and listen to the book" />
          </div>
        </div>
        {book.audioLink && (
          <AudioPlayer
            key={`${book.id}:locked`}
            book={book}
            locked
            onLockedAction={() =>
              dispatch(openAuthModal({ message: "Log in to read and listen to this book." }))
            }
          />
        )}
      </>
    );
  }

  async function recordFinished() {
    if (!account) return;
    try {
      await addToShelf(account.uid, "finished", book);
      dispatch(showToast({ message: "You finished this book! It's now in your library." }));
    } catch {
      dispatch(
        showToast({ message: "We couldn't save your progress. Please try again.", tone: "error" }),
      );
    }
  }

  return (
    <>
      <div className={styles.summary}>
        <article className={styles.content} style={{ fontSize }}>
          <h1 className={styles.title}>{book.title}</h1>
          <div className={styles.text}>{book.summary}</div>
        </article>
      </div>
      {book.audioLink ? (
        <AudioPlayer key={`${book.id}:live`} book={book} onEnded={recordFinished} />
      ) : (
        <div className={styles.noAudio} role="note">
          Audio isn&apos;t available for this book.
        </div>
      )}
    </>
  );
}
