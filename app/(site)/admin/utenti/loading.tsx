import styles from "./page.module.css";

export default function AdminUsersLoading() {
  return (
    <main className={styles.page} aria-busy="true" aria-label="Caricamento utenti">
      <div className={styles.shell}>
        <header className={`${styles.hero} ${styles.loadingHero}`}>
          <span className={`${styles.skeleton} ${styles.loadingEyebrow}`} />
          <span className={`${styles.skeleton} ${styles.loadingTitle}`} />
          <span className={`${styles.skeleton} ${styles.loadingSubtitle}`} />
        </header>

        <section className={styles.statsGrid} aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <div className={styles.statCard} key={index}>
              <span className={`${styles.skeleton} ${styles.loadingStatIcon}`} />
              <div className={styles.loadingStatCopy}>
                <span className={`${styles.skeleton} ${styles.loadingStatLabel}`} />
                <span className={`${styles.skeleton} ${styles.loadingStatValue}`} />
              </div>
            </div>
          ))}
        </section>

        <section className={`${styles.toolbarCard} ${styles.loadingToolbar}`} aria-hidden="true">
          <span className={`${styles.skeleton} ${styles.loadingSearch}`} />
          <span className={`${styles.skeleton} ${styles.loadingAction}`} />
          <span className={`${styles.skeleton} ${styles.loadingAction}`} />
        </section>

        <section className={styles.resultsCard} aria-hidden="true">
          <div className={styles.loadingResultsHeader}>
            <span className={`${styles.skeleton} ${styles.loadingResultsTitle}`} />
          </div>
          <div className={styles.loadingRows}>
            {Array.from({ length: 6 }, (_, index) => (
              <div className={styles.loadingRow} key={index}>
                <span className={`${styles.skeleton} ${styles.loadingAvatar}`} />
                <span className={`${styles.skeleton} ${styles.loadingLine}`} />
                <span className={`${styles.skeleton} ${styles.loadingLineWide}`} />
                <span className={`${styles.skeleton} ${styles.loadingBadge}`} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
