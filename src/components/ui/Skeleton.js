export default function Skeleton({ width = "100%", height = 16, marginBottom, radius, className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton ${className}`.trim()}
      style={{ width, height, marginBottom, borderRadius: radius }}
    />
  );
}
