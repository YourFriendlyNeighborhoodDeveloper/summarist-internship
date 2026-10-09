import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { parseBook } from "@/lib/books";
import { getFirebase } from "@/lib/firebase/client";

export const SHELVES = {
  saved: { collection: "library", timestampField: "savedAt" },
  finished: { collection: "finished", timestampField: "finishedAt" },
};

function requireDb() {
  const firebase = getFirebase();
  if (!firebase) throw new Error("Firebase isn't configured for this deployment.");
  return firebase.db;
}

function entryRef(uid, shelf, bookId) {
  return doc(requireDb(), "users", uid, SHELVES[shelf].collection, bookId);
}

function toEntry(book) {
  return {
    bookId: book.id,
    title: book.title,
    author: book.author,
    subTitle: book.subTitle,
    imageLink: book.imageLink,
    audioLink: book.audioLink,
    averageRating: book.averageRating,
    subscriptionRequired: book.subscriptionRequired,
  };
}

export function addToShelf(uid, shelf, book) {
  return setDoc(entryRef(uid, shelf, book.id), {
    ...toEntry(book),
    [SHELVES[shelf].timestampField]: serverTimestamp(),
  });
}

export function removeFromShelf(uid, shelf, bookId) {
  return deleteDoc(entryRef(uid, shelf, bookId));
}

export function watchShelf(uid, shelf, onChange, onError) {
  const { collection: name, timestampField } = SHELVES[shelf];
  const shelfQuery = query(
    collection(requireDb(), "users", uid, name),
    orderBy(timestampField, "desc"),
  );
  return onSnapshot(
    shelfQuery,
    (snapshot) =>
      onChange(
        snapshot.docs
          .map((entry) => parseBook({ ...entry.data(), id: entry.data().bookId }))
          .filter(Boolean),
      ),
    onError,
  );
}

export function watchShelfEntry(uid, shelf, bookId, onChange, onError) {
  return onSnapshot(entryRef(uid, shelf, bookId), (snapshot) => onChange(snapshot.exists()), onError);
}
