"use client";

import Link from "next/link";
import { AiOutlineStar } from "react-icons/ai";
import { BiTime } from "react-icons/bi";
import BookCover from "@/components/books/BookCover";
import PremiumPill from "@/components/books/PremiumPill";
import useAudioDuration from "@/hooks/useAudioDuration";
import { formatTime } from "@/lib/format";
import styles from "./BookCard.module.css";

export default function BookCard({ book }) {
  const duration = useAudioDuration(book.audioLink);

  return (
    <Link href={`/book/${book.id}`} className={styles.card}>
      <PremiumPill subscriptionRequired={book.subscriptionRequired} />
      <BookCover src={book.imageLink} className={styles.cover} />
      <h3 className={styles.title}>{book.title}</h3>
      {book.author && <p className={styles.author}>{book.author}</p>}
      {book.subTitle && <p className={styles.subTitle}>{book.subTitle}</p>}
      <div className={styles.details}>
        <span className={styles.detail}>
          <BiTime aria-hidden="true" />
          <span className="visually-hidden">Duration</span>
          {duration == null ? "--:--" : formatTime(duration)}
        </span>
        {book.averageRating != null && (
          <span className={styles.detail}>
            <AiOutlineStar aria-hidden="true" />
            <span className="visually-hidden">Rating</span>
            {book.averageRating}
          </span>
        )}
      </div>
    </Link>
  );
}
