"use client";

import { useId, useState } from "react";
import { BsChevronDown } from "react-icons/bs";
import styles from "./FaqAccordion.module.css";

const FAQS = [
  {
    question: "How does the free 7-day trial work?",
    answer:
      "Begin your complimentary 7-day trial with a Summarist annual membership. You are under no obligation to continue your subscription, and you will only be billed when the trial period expires. With Premium access, you can learn at your own pace and as frequently as you desire, and you may terminate your subscription prior to the conclusion of the 7-day free trial.",
  },
  {
    question: "Can I switch subscriptions from monthly to yearly, or yearly to monthly?",
    answer:
      "While an annual plan is active, it is not feasible to switch to a monthly plan. However, once the current month ends, transitioning from a monthly plan to an annual plan is an option.",
  },
  {
    question: "What's included in the Premium plan?",
    answer:
      "Premium membership provides you with the ultimate Summarist experience, including unrestricted entry to many best-selling books high-quality audio, the ability to download titles for offline reading, and the option to send your reads to your Kindle.",
  },
  {
    question: "Can I cancel during my trial or subscription?",
    answer:
      "You will not be charged if you cancel your trial before its conclusion. While you will not have complete access to the entire Summarist library, you can still expand your knowledge with one curated book per day.",
  },
];

export default function FaqAccordion() {
  const id = useId();
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className={styles.faq}>
      {FAQS.map(({ question, answer }, index) => {
        const open = openIndex === index;
        const buttonId = `${id}-button-${index}`;
        const panelId = `${id}-panel-${index}`;
        return (
          <div key={question} className={styles.card}>
            <h3 className={styles.heading}>
              <button
                id={buttonId}
                type="button"
                className={styles.header}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : index)}
              >
                <span className={styles.title}>{question}</span>
                <BsChevronDown
                  aria-hidden="true"
                  className={`${styles.icon} ${open ? styles.iconOpen : ""}`.trim()}
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={`${styles.panel} ${open ? styles.panelOpen : ""}`.trim()}
              inert={!open}
            >
              <div className={styles.panelInner}>
                <p className={styles.body}>{answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
