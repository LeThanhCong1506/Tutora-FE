import { STEPS } from "./constants";

interface Props {
    step: number;
}

const BookingStepper: React.FC<Props> = ({ step }) => (
    <div className="bm-stepper">
        {STEPS.map((s, i) => (
            <div key={s.key} className={`bm-stepper-item ${i === step ? "active" : ""} ${i < step ? "completed" : ""}`}>
                <div className="bm-stepper-dot">
                    {i < step ? "✓" : i + 1}
                </div>
                <span className="bm-stepper-label">{s.label}</span>
                {i < STEPS.length - 1 && <div className={`bm-stepper-line ${i < step ? "completed" : ""}`} />}
            </div>
        ))}
    </div>
);

export default BookingStepper;
