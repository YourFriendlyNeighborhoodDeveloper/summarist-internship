"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AiFillAudio, AiFillBulb, AiFillFileText } from "react-icons/ai";
import { BiCrown } from "react-icons/bi";
import { BsStarFill, BsStarHalf } from "react-icons/bs";
import { RiLeafLine } from "react-icons/ri";
import { useDispatch } from "react-redux";
import landingImage from "@/assets/landing.png";
import logo from "@/assets/logo.png";
import Statistics from "@/components/landing/Statistics";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/components/providers/AuthProvider";
import { openAuthModal } from "@/store/uiSlice";
import styles from "./Landing.module.css";

const FEATURES = [
  {
    icon: AiFillFileText,
    title: "Read or listen",
    text: "Save time by getting the core ideas from the best books.",
  },
  {
    icon: AiFillBulb,
    title: "Find your next read",
    text: "Explore book lists and personalized recommendations.",
  },
  {
    icon: AiFillAudio,
    title: "Briefcasts",
    text: "Gain valuable insights from briefcasts",
  },
];

const REVIEWS = [
  {
    name: "Hanna M.",
    body: (
      <>
        This app has been a <b>game-changer</b> for me! It&apos;s saved me so much time and
        effort in reading and comprehending books. Highly recommend it to all book lovers.
      </>
    ),
  },
  {
    name: "David B.",
    body: (
      <>
        I love this app! It provides <b>concise and accurate summaries</b> of books in a way
        that is easy to understand. It&apos;s also very user-friendly and intuitive.
      </>
    ),
  },
  {
    name: "Nathan S.",
    body: (
      <>
        This app is a great way to get the main takeaways from a book without having to read
        the entire thing. <b>The summaries are well-written and informative.</b> Definitely
        worth downloading.
      </>
    ),
  },
  {
    name: "Ryan R.",
    body: (
      <>
        If you&apos;re a busy person who <b>loves reading but doesn&apos;t have the time</b> to
        read every book in full, this app is for you! The summaries are thorough and provide a
        great overview of the book&apos;s content.
      </>
    ),
  },
];

function Stars({ count, half = false, className }) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <BsStarFill key={index} />
      ))}
      {half && <BsStarHalf />}
    </div>
  );
}

export default function Landing() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { account } = useAuth();

  useEffect(() => {
    if (account) router.replace("/for-you");
  }, [account, router]);

  const openLogin = () => dispatch(openAuthModal());

  return (
    <>
      <header className={styles.nav}>
        <nav className={styles.navWrapper} aria-label="Main">
          <figure className={styles.navLogo}>
            <Image src={logo} alt="Summarist" priority sizes="200px" />
          </figure>
          <ul className={styles.navList}>
            <li>
              <button type="button" className={`${styles.navItem} ${styles.navLogin}`} onClick={openLogin}>
                Login
              </button>
            </li>
            <li className={styles.navMobileHidden}>
              <button type="button" className={styles.navItem} aria-disabled="true">
                About
              </button>
            </li>
            <li className={styles.navMobileHidden}>
              <button type="button" className={styles.navItem} aria-disabled="true">
                Contact
              </button>
            </li>
            <li className={styles.navMobileHidden}>
              <button type="button" className={styles.navItem} aria-disabled="true">
                Help
              </button>
            </li>
          </ul>
        </nav>
      </header>

      <main>
        <section className="container">
          <div className="row">
            <div className={styles.landingWrapper}>
              <div className={styles.landingContent}>
                <h1 className={styles.landingTitle}>
                  Gain more knowledge <br className={styles.removeTablet} />
                  in less time
                </h1>
                <p className={styles.landingSubtitle}>
                  Great summaries for busy people,
                  <br className={styles.removeTablet} /> individuals who barely have time to
                  read,
                  <br className={styles.removeTablet} /> and even people who don’t like to read.
                </p>
                <button type="button" className={`btn ${styles.ctaButton}`} onClick={openLogin}>
                  Login
                </button>
              </div>
              <figure className={styles.landingImage}>
                <Image src={landingImage} alt="" priority sizes="400px" />
              </figure>
            </div>
          </div>
        </section>

        <section className="container" aria-labelledby="features-title">
          <div className="row">
            <h2 id="features-title" className="section-title">
              Understand books in few minutes
            </h2>
            <div className={styles.featuresWrapper}>
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <div key={title} className={styles.feature}>
                  <div className={styles.featureIcon} aria-hidden="true">
                    <Icon />
                  </div>
                  <h3 className={styles.featureTitle}>{title}</h3>
                  <p className={styles.featureText}>{text}</p>
                </div>
              ))}
            </div>
            <Statistics />
          </div>
        </section>

        <section className="container" aria-labelledby="reviews-title">
          <div className="row">
            <h2 id="reviews-title" className="section-title">
              What our members say
            </h2>
            <div className={styles.reviewsWrapper}>
              {REVIEWS.map((review) => (
                <figure key={review.name} className={styles.review}>
                  <figcaption className={styles.reviewHeader}>
                    <div className={styles.reviewName}>{review.name}</div>
                    <Stars count={5} className={styles.reviewStars} />
                    <span className="visually-hidden">rated 5 out of 5 stars</span>
                  </figcaption>
                  <blockquote className={styles.reviewBody}>{review.body}</blockquote>
                </figure>
              ))}
            </div>
            <div className={styles.reviewsButtonWrapper}>
              <button type="button" className={`btn ${styles.ctaButton}`} onClick={openLogin}>
                Login
              </button>
            </div>
          </div>
        </section>

        <section className="container" aria-labelledby="numbers-title">
          <div className="row">
            <h2 id="numbers-title" className="section-title">
              Start growing with Summarist now
            </h2>
            <div className={styles.numbersWrapper}>
              <div className={styles.numbers}>
                <div className={styles.numbersIcon} aria-hidden="true">
                  <BiCrown />
                </div>
                <div className={styles.numbersTitle}>3 Million</div>
                <div className={styles.numbersText}>Downloads on all platforms</div>
              </div>
              <div className={styles.numbers}>
                <Stars count={4} half className={`${styles.numbersIcon} ${styles.numbersStars}`} />
                <div className={styles.numbersTitle}>4.5 Stars</div>
                <div className={styles.numbersText}>Average ratings on iOS and Google Play</div>
              </div>
              <div className={styles.numbers}>
                <div className={styles.numbersIcon} aria-hidden="true">
                  <RiLeafLine />
                </div>
                <div className={styles.numbersTitle}>97%</div>
                <div className={styles.numbersText}>
                  Of Summarist members create a better reading habit
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
