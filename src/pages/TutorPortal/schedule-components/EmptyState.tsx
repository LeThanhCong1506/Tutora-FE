import styles from "../../../styles/pages/tutor-portal-schedule.module.css";
import { PlusIcon } from "./icons";

interface Props {
    icon: string;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
}

const EmptyState: React.FC<Props> = ({ icon, title, description, actionLabel, onAction }) => {
    return (
        <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>{icon}</div>
            <h3 className={styles.emptyTitle}>{title}</h3>
            <p className={styles.emptyDescription}>{description}</p>
            {actionLabel && onAction && (
                <button className={styles.emptyBtn} onClick={onAction}>
                    <PlusIcon />
                    <span>{actionLabel}</span>
                </button>
            )}
        </div>
    );
};

export default EmptyState;
