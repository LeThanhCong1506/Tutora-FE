import styles from './styles.module.css';
import type { FocusHeroData } from './types';

type FocusHeroProps = {
  focus: FocusHeroData;
};

const FocusHero = ({ focus }: FocusHeroProps) => {
  return (
    <section className={styles.focusHero}>
      <div className={styles.sectionHeading}>
        <span className={styles.sectionHeadingIcon}>
          <img className='h-[100%]!' src={focus.headingIcon} alt="" />
        </span>
        <span className={styles.sectionHeadingText}>{focus.headingLabel}</span>
      </div>

      <div className={styles.focusCard}>
        <div className={styles.focusCardInner}>
          <div className={styles.focusSession}>
            <div className={styles.focusSessionHeader}>
              <div className={styles.focusSessionTitleBlock}>
                <span className={styles.focusBadge}>{focus.session.label}</span>
                <h3 className={styles.focusTitle}>{focus.session.title}</h3>
                <span className={styles.focusSubtitle}>{focus.session.instructor}</span>
              </div>
              <div className={styles.focusCountdown}>
                <span className={styles.focusCountdownTime}>{focus.session.countdown}</span>
                <span className={styles.focusCountdownLabel}>{focus.session.countdownLabel}</span>
              </div>
            </div>
            <div className={styles.focusSessionActions}>
              <button className={styles.primaryButton} type="button">
                <img src={focus.session.joinIcon} alt="" />
                {focus.session.buttons.joinLabel}
              </button>
              <button className={styles.secondaryButton} type="button">
                {focus.session.buttons.detailsLabel}
              </button>
              <button className={styles.iconButton} type="button" aria-label="More options">
                <img src={focus.session.moreIcon} alt="" />
              </button>
            </div>
            <div className={styles.focusNote}>
              <img src={focus.session.note.icon} alt="" />
              <span>{focus.session.note.text}</span>
            </div>
          </div>

          <div className={styles.priorityTask}>
            <span className={styles.priorityBadge}>{focus.priorityTask.label}</span>
            <h3 className={styles.priorityTitle}>{focus.priorityTask.title}</h3>
            <span className={styles.priorityDue}>{focus.priorityTask.dueLabel}</span>
            <div className={styles.priorityAttachment}>
              <img src={focus.priorityTask.attachmentIcon} alt="" />
              <span>{focus.priorityTask.attachmentLabel}</span>
            </div>
            <button className={styles.darkButton} type="button">
              <img src={focus.priorityTask.startIcon} alt="" />
              {focus.priorityTask.startLabel}
            </button>
            <button className={styles.outlineButton} type="button">
              <img src={focus.priorityTask.resourceIcon} alt="" />
              {focus.priorityTask.resourceLabel}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FocusHero;
