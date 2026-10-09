"use client";

import BookCarousel, { BookRowSkeleton } from "@/components/books/BookCarousel";
import SelectedBook, { SelectedBookSkeleton } from "@/components/books/SelectedBook";
import ErrorState from "@/components/ui/ErrorState";
import { useRecommendedBooks, useSelectedBook, useSuggestedBooks } from "@/hooks/useBooks";
import styles from "./ForYou.module.css";

function BookSection({ id, title, subtitle, request }) {
  const { data: books, loading, error, retry } = request;

  return (
    <section aria-labelledby={id}>
      <h2 id={id} className={styles.title}>
        {title}
      </h2>
      <p className={styles.subtitle}>{subtitle}</p>
      {loading ? (
        <BookRowSkeleton label={`Loading ${title.toLowerCase()}`} />
      ) : error ? (
        <ErrorState title={`We couldn't load these books`} message={error.message} onRetry={retry} />
      ) : books.length ? (
        <BookCarousel books={books} label={title} />
      ) : (
        <p className={styles.empty}>No books found.</p>
      )}
    </section>
  );
}

export default function ForYou() {
  const selected = useSelectedBook();
  const recommended = useRecommendedBooks();
  const suggested = useSuggestedBooks();

  return (
    <div className="row">
      <div className="container">
        <h1 className="visually-hidden">For you</h1>
        <section aria-labelledby="selected-title">
          <h2 id="selected-title" className={styles.title}>
            Selected just for you
          </h2>
          {selected.loading ? (
            <SelectedBookSkeleton />
          ) : selected.error ? (
            <ErrorState
              title={
                selected.error.isNotFound
                  ? "No featured book today"
                  : "We couldn't load the selected book"
              }
              message={selected.error.message}
              onRetry={selected.retry}
            />
          ) : (
            <SelectedBook book={selected.data} />
          )}
        </section>
        <BookSection
          id="recommended-title"
          title="Recommended For You"
          subtitle="We think you’ll like these"
          request={recommended}
        />
        <BookSection
          id="suggested-title"
          title="Suggested Books"
          subtitle="Browse those books"
          request={suggested}
        />
      </div>
    </div>
  );
}
