import styles from "./Footer.module.css";

const LINK_GROUPS = [
  {
    title: "Actions",
    links: ["Summarist Magazine", "Cancel Subscription", "Help", "Contact us"],
  },
  {
    title: "Useful Links",
    links: ["Pricing", "Summarist Business", "Gift Cards", "Authors & Publishers"],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Partners", "Code of Conduct"],
  },
  {
    title: "Other",
    links: ["Sitemap", "Legal Notice", "Terms of Service", "Privacy Policies"],
  },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className="row">
          <div className={styles.top}>
            {LINK_GROUPS.map((group) => (
              <div key={group.title}>
                <h2 className={styles.title}>{group.title}</h2>
                <ul>
                  {group.links.map((link) => (
                    <li key={link} className={styles.linkWrapper}>
                      <span className={styles.link}>{link}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className={styles.copyright}>Copyright &copy; 2023 Summarist.</p>
        </div>
      </div>
    </footer>
  );
}
