"use client";

import {
  getBook,
  getRecommendedBooks,
  getSelectedBook,
  getSuggestedBooks,
} from "@/lib/books";
import useRemoteData from "@/hooks/useRemoteData";

export function useSelectedBook() {
  return useRemoteData("selected", (signal) => getSelectedBook({ signal }));
}

export function useRecommendedBooks() {
  return useRemoteData("recommended", (signal) => getRecommendedBooks({ signal }));
}

export function useSuggestedBooks() {
  return useRemoteData("suggested", (signal) => getSuggestedBooks({ signal }));
}

export function useBook(id) {
  return useRemoteData(id ? `book:${id}` : null, (signal) => getBook(id, { signal }));
}
