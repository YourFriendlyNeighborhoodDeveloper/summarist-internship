"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { GrBackTen, GrForwardTen } from "react-icons/gr";
import { IoPauseSharp, IoPlaySharp } from "react-icons/io5";
import BookCover from "@/components/books/BookCover";
import Spinner from "@/components/ui/Spinner";
import useAudioDuration from "@/hooks/useAudioDuration";
import { formatTime } from "@/lib/format";
import styles from "./AudioPlayer.module.css";

const SKIP_SECONDS = 10;
const PLAYBACK_RATES = [1, 1.25, 1.5, 2, 0.75];

export default function AudioPlayer({ book, onEnded, locked = false, onLockedAction }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [status, setStatus] = useState("loading");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const previewDuration = useAudioDuration(locked ? book.audioLink : null);

  useLayoutEffect(() => {
    const audio = audioRef.current;
    return () => audio?.pause();
  }, []);

  useEffect(() => {
    if (!isPlaying) return undefined;
    let frame = 0;
    const tick = () => {
      if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying]);

  const ready = status === "ready";
  const totalDuration = locked ? previewDuration ?? 0 : duration;
  const progress = totalDuration > 0 ? Math.min((currentTime / totalDuration) * 100, 100) : 0;

  async function togglePlay() {
    if (locked) {
      onLockedAction?.();
      return;
    }
    const audio = audioRef.current;
    if (!audio || status === "error") return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    try {
      await audio.play();
    } catch (error) {
      if (error?.name !== "AbortError") setStatus("error");
    }
  }

  function seekTo(seconds) {
    if (locked) {
      onLockedAction?.();
      return;
    }
    const audio = audioRef.current;
    if (!audio || !ready) return;
    const target = Math.min(Math.max(seconds, 0), duration || audio.duration || 0);
    audio.currentTime = target;
    setCurrentTime(target);
  }

  function changeRate() {
    const next = PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(rate) + 1) % PLAYBACK_RATES.length];
    if (audioRef.current) audioRef.current.playbackRate = next;
    setRate(next);
  }

  function retry() {
    setStatus("loading");
    audioRef.current?.load();
  }

  const skipDisabled = !locked && !ready;

  return (
    <section className={styles.player} aria-label="Audio player">
      {!locked && (
        <audio
          ref={audioRef}
          src={book.audioLink}
          preload="metadata"
          onLoadedMetadata={(event) => {
            const { duration: length } = event.currentTarget;
            setDuration(Number.isFinite(length) ? length : 0);
            event.currentTarget.playbackRate = rate;
            setStatus("ready");
          }}
          onDurationChange={(event) => {
            const { duration: length } = event.currentTarget;
            if (Number.isFinite(length)) setDuration(length);
          }}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onWaiting={() => setBuffering(true)}
          onPlaying={() => setBuffering(false)}
          onCanPlay={() => setBuffering(false)}
          onEnded={(event) => {
            setIsPlaying(false);
            setCurrentTime(event.currentTarget.duration || currentTime);
            onEnded?.();
          }}
          onError={() => {
            setIsPlaying(false);
            setBuffering(false);
            setStatus("error");
          }}
        />
      )}

      <div className={styles.track}>
        <BookCover src={book.imageLink} size={48} />
        <div className={styles.trackDetails}>
          <div className={styles.trackTitle}>{book.title}</div>
          <div className={styles.trackAuthor}>{book.author}</div>
        </div>
      </div>

      <div className={styles.controls}>
        {status === "error" && !locked ? (
          <div className={styles.error} role="alert">
            <span>Audio couldn&apos;t be loaded.</span>
            <button type="button" className={styles.retry} onClick={retry}>
              Retry
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              className={styles.controlButton}
              onClick={() => seekTo(currentTime - SKIP_SECONDS)}
              disabled={skipDisabled}
              aria-label={`Rewind ${SKIP_SECONDS} seconds`}
            >
              <GrBackTen aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`${styles.controlButton} ${styles.playButton}`}
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {buffering || (status === "loading" && isPlaying) ? (
                <Spinner size={20} label="Loading audio" className={styles.playSpinner} />
              ) : isPlaying ? (
                <IoPauseSharp aria-hidden="true" />
              ) : (
                <IoPlaySharp aria-hidden="true" className={styles.playIcon} />
              )}
            </button>
            <button
              type="button"
              className={styles.controlButton}
              onClick={() => seekTo(currentTime + SKIP_SECONDS)}
              disabled={skipDisabled}
              aria-label={`Forward ${SKIP_SECONDS} seconds`}
            >
              <GrForwardTen aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      <div className={styles.progressWrapper}>
        <span className={styles.time} data-testid="current-time">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          className={styles.progress}
          min={0}
          max={totalDuration || 0}
          step={1}
          value={Math.min(currentTime, totalDuration || 0)}
          onChange={(event) => seekTo(Number(event.target.value))}
          disabled={locked || !ready}
          aria-label="Seek"
          aria-valuetext={`${formatTime(currentTime)} of ${formatTime(totalDuration)}`}
          style={{
            background: `linear-gradient(to right, #2bd97c ${progress}%, #6d787d ${progress}%)`,
          }}
        />
        <span className={styles.time} data-testid="duration">
          {totalDuration > 0 ? formatTime(totalDuration) : "--:--"}
        </span>
        {!locked && (
          <button
            type="button"
            className={styles.rate}
            onClick={changeRate}
            aria-label={`Playback speed ${rate}x. Change speed`}
          >
            {rate}x
          </button>
        )}
      </div>
    </section>
  );
}
