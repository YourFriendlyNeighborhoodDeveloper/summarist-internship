"use client";

import { useEffect, useState } from "react";
import styles from "./Landing.module.css";

const ROTATION_MS = 2000;

const FIRST_HEADINGS = [
  "Enhance your knowledge",
  "Achieve greater success",
  "Improve your health",
  "Develop better parenting skills",
  "Increase happiness",
  "Be the best version of yourself!",
];

const SECOND_HEADINGS = [
  "Expand your learning",
  "Accomplish your goals",
  "Strengthen your vitality",
  "Become a better caregiver",
  "Improve your mood",
  "Maximize your abilities",
];

function Headings({ items, active, className = "" }) {
  return (
    <div className={`${styles.statisticsHeader} ${className}`.trim()}>
      {items.map((heading, index) => (
        <div
          key={heading}
          className={`${styles.statisticsHeading} ${index === active ? styles.statisticsHeadingActive : ""}`.trim()}
        >
          {heading}
        </div>
      ))}
    </div>
  );
}

export default function Statistics() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((index) => (index + 1) % FIRST_HEADINGS.length);
    }, ROTATION_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <div className={styles.statisticsWrapper}>
        <Headings items={FIRST_HEADINGS} active={active} />
        <div className={styles.statisticsDetails}>
          <div className={styles.statisticsData}>
            <div className={styles.statisticsNumber}>93%</div>
            <div className={styles.statisticsText}>
              of Summarist members <b>significantly increase</b> reading frequency.
            </div>
          </div>
          <div className={styles.statisticsData}>
            <div className={styles.statisticsNumber}>96%</div>
            <div className={styles.statisticsText}>
              of Summarist members <b>establish better</b> habits.
            </div>
          </div>
          <div className={styles.statisticsData}>
            <div className={styles.statisticsNumber}>90%</div>
            <div className={styles.statisticsText}>
              have made <b>significant positive</b> change to their lives.
            </div>
          </div>
        </div>
      </div>
      <div className={styles.statisticsWrapper}>
        <div className={`${styles.statisticsDetails} ${styles.statisticsDetailsSecond}`}>
          <div className={styles.statisticsData}>
            <div className={styles.statisticsNumber}>91%</div>
            <div className={styles.statisticsText}>
              of Summarist members <b>report feeling more productive</b> after incorporating
              the service into their daily routine.
            </div>
          </div>
          <div className={styles.statisticsData}>
            <div className={styles.statisticsNumber}>94%</div>
            <div className={styles.statisticsText}>
              of Summarist members have <b>noticed an improvement</b> in their overall
              comprehension and retention of information.
            </div>
          </div>
          <div className={styles.statisticsData}>
            <div className={styles.statisticsNumber}>88%</div>
            <div className={styles.statisticsText}>
              of Summarist members <b>feel more informed</b> about current events and industry
              trends since using the platform.
            </div>
          </div>
        </div>
        <Headings
          items={SECOND_HEADINGS}
          active={active}
          className={styles.statisticsHeaderSecond}
        />
      </div>
    </>
  );
}
