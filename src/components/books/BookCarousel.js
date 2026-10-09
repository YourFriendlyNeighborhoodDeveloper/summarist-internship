"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BsChevronLeft, BsChevronRight } from "react-icons/bs";
import BookCard from "@/components/books/BookCard";
import Skeleton from "@/components/ui/Skeleton";
import styles from "./BookCarousel.module.css";

const EDGE_TOLERANCE = 4;

export function BookCardSkeleton() {
  return (
    <div className={styles.skeletonCard} aria-hidden="true">
      <Skeleton height={240} marginBottom={8} />
      <Skeleton height={20} marginBottom={8} />
      <Skeleton width="90%" height={16} marginBottom={8} />
      <Skeleton width="80%" height={32} marginBottom={8} />
      <Skeleton width="90%" height={16} />
    </div>
  );
}

export function BookRowSkeleton({ count = 5, label = "Loading books" }) {
  return (
    <div className={styles.skeletonRow} role="status" aria-label={label}>
      {Array.from({ length: count }, (_, index) => (
        <BookCardSkeleton key={index} />
      ))}
    </div>
  );
}

export default function BookCarousel({ books, label, renderAction }) {
  const trackRef = useRef(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setEdges({
      atStart: track.scrollLeft <= EDGE_TOLERANCE,
      atEnd: track.scrollLeft + track.clientWidth >= track.scrollWidth - EDGE_TOLERANCE,
    });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    track.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      track.removeEventListener("scroll", measure);
    };
  }, [measure, books.length]);

  const scroll = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className={styles.carousel}>
      {!edges.atStart && (
        <button
          type="button"
          className={`${styles.arrow} ${styles.arrowLeft}`}
          aria-label={`Scroll ${label} left`}
          onClick={() => scroll(-1)}
        >
          <BsChevronLeft aria-hidden="true" />
        </button>
      )}
      <ul ref={trackRef} className={styles.track} aria-label={label}>
        {books.map((book) => (
          <li key={book.id} className={styles.item}>
            <BookCard book={book} />
            {renderAction?.(book)}
          </li>
        ))}
      </ul>
      {!edges.atEnd && (
        <button
          type="button"
          className={`${styles.arrow} ${styles.arrowRight}`}
          aria-label={`Scroll ${label} right`}
          onClick={() => scroll(1)}
        >
          <BsChevronRight aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
