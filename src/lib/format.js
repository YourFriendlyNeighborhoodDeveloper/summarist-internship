const pad = (value) => String(value).padStart(2, "0");

export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const total = Math.floor(seconds);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes} ${minutes === 1 ? "min" : "mins"} ${secs} ${secs === 1 ? "sec" : "secs"}`;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export function formatDate(milliseconds) {
  return Number.isFinite(milliseconds) ? dateFormatter.format(milliseconds) : null;
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
