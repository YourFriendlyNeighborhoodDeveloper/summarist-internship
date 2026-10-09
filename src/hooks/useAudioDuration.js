"use client";

import { useEffect, useState } from "react";

const durations = new Map();

function probeDuration(src) {
  if (!durations.has(src)) {
    const probe = new Promise((resolve) => {
      const audio = new Audio();
      const finish = (value) => {
        audio.removeAttribute("src");
        audio.load();
        resolve(value);
      };
      audio.preload = "metadata";
      audio.addEventListener(
        "loadedmetadata",
        () => finish(Number.isFinite(audio.duration) ? audio.duration : null),
        { once: true },
      );
      audio.addEventListener(
        "error",
        () => {
          durations.delete(src);
          finish(null);
        },
        { once: true },
      );
      audio.src = src;
    });
    durations.set(src, probe);
  }
  return durations.get(src);
}

export default function useAudioDuration(src) {
  const [result, setResult] = useState({ src: null, duration: null });

  useEffect(() => {
    if (!src) return undefined;
    let active = true;
    probeDuration(src).then((duration) => {
      if (active) setResult({ src, duration });
    });
    return () => {
      active = false;
    };
  }, [src]);

  return result.src === src ? result.duration : null;
}
