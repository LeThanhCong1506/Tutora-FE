import type { FunctionComponent } from 'react';
import { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { useFormDraft } from '../../../hooks/useFormDraft';
import styles from './RescheduleModal.module.css';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  currentDate: string;
  currentTime: string;
}

const RescheduleModal: FunctionComponent<RescheduleModalProps> = ({
  isOpen,
  onClose,
  studentName,
  currentDate: _currentDate,
  currentTime: _currentTime,
}) => {
  const [alternativeDate, setAlternativeDate] = useState('');
  const [alternativeTime, setAlternativeTime] = useState('');
  const [note, setNote] = useState('');
  const { saveDraft, loadDraft, clearDraft } = useFormDraft<{
    alternativeDate: string; alternativeTime: string; note: string;
  }>('draft_reschedule');

  // Load draft on open
  useEffect(() => {
    if (isOpen) {
      const draft = loadDraft();
      if (draft) {
        setAlternativeDate(draft.alternativeDate || '');
        setAlternativeTime(draft.alternativeTime || '');
        setNote(draft.note || '');
      }
    }
  }, [isOpen, loadDraft]);

  // Auto-save draft on field changes
  useEffect(() => {
    if (isOpen) {
      saveDraft({ alternativeDate, alternativeTime, note });
    }
  }, [alternativeDate, alternativeTime, note, isOpen, saveDraft]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement reschedule logic
    console.log('Reschedule request:', { alternativeDate, alternativeTime, note });
    clearDraft();
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContainer}>
        <div className={styles.header}>
          <div className={styles.iconContainer}>
            <div className={styles.iconWrapper}>
              <Calendar size={28} strokeWidth={2} />
            </div>
          </div>
          <div className={styles.headerContent}>
            <h3 className={styles.title}>Reschedule Lesson</h3>
            <p className={styles.subtitle}>
              Suggest a new time for your session with {studentName}.
            </p>
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formFields}>
            {/* Alternative Date */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Alternative Date</label>
              <div className={styles.inputWrapper}>
                <div className={styles.inputIcon}>
                  <Calendar size={14} strokeWidth={2} />
                </div>
                <input
                  type="date"
                  className={styles.input}
                  value={alternativeDate}
                  onChange={(e) => setAlternativeDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Alternative Time */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Alternative Time</label>
              <div className={styles.inputWrapper}>
                <div className={styles.inputIcon}>
                  <Clock size={14} strokeWidth={2} />
                </div>
                <input
                  type="time"
                  className={styles.input}
                  value={alternativeTime}
                  onChange={(e) => setAlternativeTime(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Note to Student */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Note to Student (Optional)</label>
              <textarea
                className={styles.textarea}
                placeholder="Reason for rescheduling..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <div className={styles.actions}>
            <button type="submit" className={styles.primaryBtn}>
              Send Reschedule Request
            </button>
            <button type="button" className={styles.secondaryBtn} onClick={onClose}>
              Go Back
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RescheduleModal;
