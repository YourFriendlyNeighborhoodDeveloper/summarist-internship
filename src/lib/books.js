const API_BASE = "https://us-central1-summaristt.cloudfunctions.net";
const REQUEST_TIMEOUT_MS = 15000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const BOOK_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export class BookApiError extends Error {
  constructor(message, { status = 0, cause } = {}) {
    super(message, { cause });
    this.name = "BookApiError";
    this.status = status;
  }

  get isNotFound() {
    return this.status === 404;
  }
}

export function isAbortError(error) {
  return error?.name === "AbortError";
}

export function isValidBookId(id) {
  return typeof id === "string" && BOOK_ID_PATTERN.test(id);
}

const asString = (value) => (typeof value === "string" ? value : "");

function asNumber(value) {
  const number = typeof value === "string" && value.trim() ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number) ? number : null;
}

function asHttpUrl(value) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

export function parseBook(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const id = asString(raw.id).trim();
  const title = asString(raw.title).trim();
  if (!isValidBookId(id) || !title) return null;

  return {
    id,
    title,
    author: asString(raw.author).trim(),
    subTitle: asString(raw.subTitle).trim(),
    imageLink: asHttpUrl(raw.imageLink),
    audioLink: asHttpUrl(raw.audioLink),
    totalRating: asNumber(raw.totalRating),
    averageRating: asNumber(raw.averageRating),
    keyIdeas: asNumber(raw.keyIdeas),
    type: asString(raw.type).trim(),
    status: asString(raw.status).trim(),
    subscriptionRequired: raw.subscriptionRequired !== false,
    summary: asString(raw.summary),
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((tag) => typeof tag === "string" && tag.trim())
      : [],
    bookDescription: asString(raw.bookDescription),
    authorDescription: asString(raw.authorDescription),
  };
}

function parseBookList(data) {
  if (!Array.isArray(data)) {
    throw new BookApiError("The book service sent an unexpected response.");
  }
  return data.map(parseBook).filter(Boolean);
}

function linkSignal(signal) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new DOMException("Request timed out", "TimeoutError")),
    REQUEST_TIMEOUT_MS,
  );
  const forwardAbort = () => controller.abort(signal.reason);
  if (signal?.aborted) forwardAbort();
  else signal?.addEventListener("abort", forwardAbort, { once: true });

  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", forwardAbort);
    },
  };
}

async function requestJson(path, { signal } = {}) {
  const linked = linkSignal(signal);
  try {
    const response = await fetch(`${API_BASE}/${path}`, {
      signal: linked.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new BookApiError(
        `The book service returned an error (${response.status}). Please try again.`,
        { status: response.status },
      );
    }
    const text = await response.text();
    if (!text.trim()) return null;
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new BookApiError("The book service sent an invalid response.", { cause: error });
    }
  } catch (error) {
    if (error instanceof BookApiError) throw error;
    if (signal?.aborted) throw error;
    if (linked.signal.aborted) {
      throw new BookApiError("The book service took too long to respond.", { cause: error });
    }
    throw new BookApiError(
      "We couldn't reach the book service. Check your connection and try again.",
      { cause: error },
    );
  } finally {
    linked.dispose();
  }
}

const cache = new Map();

function cachedRequest(path, parse) {
  const hit = cache.get(path);
  if (hit && hit.expiresAt > Date.now()) return hit.promise;

  const promise = requestJson(path).then(parse);
  promise.catch(() => {
    if (cache.get(path)?.promise === promise) cache.delete(path);
  });
  cache.set(path, { promise, expiresAt: Date.now() + CACHE_TTL_MS });
  return promise;
}

function abortable(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

export function getSelectedBook({ signal } = {}) {
  const request = cachedRequest("getBooks?status=selected", (data) => {
    const candidates = Array.isArray(data) ? data : [data];
    const book = candidates.map(parseBook).find(Boolean);
    if (!book) {
      throw new BookApiError("There is no featured book right now.", { status: 404 });
    }
    return book;
  });
  return abortable(request, signal);
}

export function getRecommendedBooks({ signal } = {}) {
  return abortable(cachedRequest("getBooks?status=recommended", parseBookList), signal);
}

export function getSuggestedBooks({ signal } = {}) {
  return abortable(cachedRequest("getBooks?status=suggested", parseBookList), signal);
}

export function getBook(id, { signal } = {}) {
  if (!isValidBookId(id)) {
    return Promise.reject(new BookApiError("We couldn't find that book.", { status: 404 }));
  }
  const request = cachedRequest(`getBook?id=${encodeURIComponent(id)}`, (data) => {
    const book = parseBook(data);
    if (!book) throw new BookApiError("We couldn't find that book.", { status: 404 });
    return book;
  });
  return abortable(request, signal);
}

export async function searchBooks(term, { signal } = {}) {
  const query = typeof term === "string" ? term.trim() : "";
  if (!query) return [];
  const data = await requestJson(
    `getBooksByAuthorOrTitle?search=${encodeURIComponent(query)}`,
    { signal },
  );
  return data === null ? [] : parseBookList(data);
}
