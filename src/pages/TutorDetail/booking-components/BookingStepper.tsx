import { Check } from "lucide-react";
import styles from "./bookingModal.module.css";
import { STEPS } from "./constants";

interface Props {
    step: number; // 0-indexed
}

const BookingStepper: React.FC<Props> = ({ step }) => (
    <nav className={styles.modalStepper} aria-label="Tiến trình đặt lịch">
        {STEPS.map((item, index) => (
            <div
                key={item.key}
                className={`${styles.modalStep} ${step === index ? styles.modalStepActive : ""} ${
                    step > index ? styles.modalStepDone : ""
                }`}
            >
                <span>{step > index ? <Check size={15} /> : index + 1}</span>
                <strong>{item.label}</strong>
                {index < STEPS.length - 1 && <i />}
            </div>
        ))}
    </nav>
);

export default BookingStepper;
