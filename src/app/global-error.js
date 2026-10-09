"use client";

export default function GlobalError({ retry }) {
  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
          fontFamily: "Roboto, sans-serif",
          color: "#032b41",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: 24 }}>Summarist ran into a problem</h1>
        <p>Please try again. If the problem continues, reload the page.</p>
        <button
          type="button"
          onClick={() => retry()}
          style={{
            height: 40,
            padding: "0 24px",
            border: "none",
            borderRadius: 4,
            background: "#2bd97c",
            color: "#032b41",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
