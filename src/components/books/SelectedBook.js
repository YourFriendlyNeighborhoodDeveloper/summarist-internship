"use client";

import Link from "next/link";
import { BsFillPlayFill } from "react-icons/bs";
import BookCover from "@/components/books/BookCover";
import useAudioDuration from "@/hooks/useAudioDuration";
import { formatDuration } from "@/lib/format";
import styles from "./SelectedBook.module.css";

export function SelectedBookSkeleton() {
  return <div className={`skeleton ${styles.skeleton}`} role="status" aria-label="Loading the selected book" />;
}

export default function SelectedBook({ book }) {
  const duration = useAudioDuration(book.audioLink);

  return (
    <Link href={`/book/${book.id}`} className={styles.selected}>
      <p className={styles.subTitle}>{book.subTitle}</p>
      <div className={styles.line} aria-hidden="true" />
      <div className={styles.content}>
        <BookCover src={book.imageLink} size={140} priority />
        <div className={styles.text}>
          <h3 className={styles.title}>{book.title}</h3>
          <p className={styles.author}>{book.author}</p>
          <div className={styles.durationWrapper}>
            <span className={styles.playIcon} aria-hidden="true">
              <BsFillPlayFill />
            </span>
            <span className={styles.duration}>{formatDuration(duration) ?? "-- mins -- secs"}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
