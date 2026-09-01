import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Trash2, Pencil, Check, Sigma, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { ConfirmDialog } from '../../../../components/shared';
import {
  updatePracticeQuestion,
  deletePracticeQuestion,
  sendPracticeQuestion,
  submitPracticeAnswer,
  type PracticeSet,
  type PracticeQuestion,
  type PracticeAnswerOption,
} from '../../../../services/practice.service';
import MathText from './MathText';
import MathInputModal from './MathInputModal';
import styles from '../../styles.module.css';

interface QuestionModalProps {
  set: PracticeSet;
  question: PracticeQuestion;
  isTutor: boolean;
  onClose: () => void;
  /** Gọi sau mọi thay đổi để tab tải lại danh sách. */
  onChanged: () => void;
  /** Gọi riêng khi GỬI câu hỏi — để báo cho máy học sinh qua RTM. */
  onSent: () => void;
}

/**
 * Gia sư: xem/sửa/xoá 1 câu rồi gửi cả bộ.
 * Học sinh: làm câu đó — trắc nghiệm phản hồi ngay, tự luận lưu lại để hỏi gia sư.
 */
const QuestionModal = ({ set, question, isTutor, onClose, onChanged, onSent }: QuestionModalProps) => {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(question.content);
  const [options, setOptions] = useState<PracticeAnswerOption[]>(question.answerOptions ?? []);
  const [correctAnswer, setCorrectAnswer] = useState(question.correctAnswer ?? '');
  const [explanation, setExplanation] = useState(question.explanation ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [mathTarget, setMathTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Bài làm của học sinh — giữ tại chỗ để phản hồi ngay, không đợi tải lại cả danh sách.
  const [myAnswer, setMyAnswer] = useState(question.myAnswer);
  const [essayDraft, setEssayDraft] = useState(question.myAnswer?.answer ?? '');
  /**
   * Đáp án đúng BE trả VỀ SAU khi học sinh trả lời (trước đó luôn null để chống lộ đề).
   * Giữ riêng vì `question` là prop, không tự cập nhật khi vừa nộp xong.
   */
  const [revealedCorrect, setRevealedCorrect] = useState<string | null>(null);
  const [revealedExplanation, setRevealedExplanation] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirmDelete && !mathTarget) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, confirmDelete, mathTarget]);

  // Trạng thái gửi nằm ở TỪNG CÂU: bộ có thể đã 'sent' nhưng câu này vẫn còn nháp.
  const isSent = question.sentAt != null;
  // Đáp án/gợi ý: gia sư thấy luôn; học sinh chỉ thấy sau khi trả lời (BE cũng che).
  const shownCorrect = isTutor ? question.correctAnswer : revealedCorrect ?? question.correctAnswer;
  const shownExplanation = isTutor ? question.explanation : revealedExplanation ?? question.explanation;

  const insertMath = (latex: string) => {
    const token = `$${latex}$`;
    if (mathTarget === 'content') setContent((v) => `${v} ${token}`.trim());
    else if (mathTarget === 'explanation') setExplanation((v) => `${v} ${token}`.trim());
    else if (mathTarget) {
      setOptions((prev) =>
        prev.map((o) => (o.key === mathTarget ? { ...o, text: `${o.text} ${token}`.trim() } : o)),
      );
    }
    setMathTarget(null);
  };

  const mathBtn = (target: string, label: string) => (
    <button
      type="button"
      className={styles.practiceIconBtn}
      onClick={() => setMathTarget(target)}
      title={label}
      aria-label={label}
    >
      <Sigma size={13} />
    </button>
  );

  const withBusy = async (fn: () => Promise<void>, fallback: string) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const handleSave = () =>
    withBusy(async () => {
      await updatePracticeQuestion(question.id, {
        content,
        answerOptions: question.questionFormat === 'mc' ? options : undefined,
        correctAnswer: question.questionFormat === 'mc' ? correctAnswer : undefined,
        explanation,
      });
      setEditing(false);
      onChanged();
      toast.success('Đã lưu câu hỏi.');
    }, 'Không lưu được câu hỏi.');

  const handleDelete = () =>
    withBusy(async () => {
      await deletePracticeQuestion(question.id);
      onChanged();
      onClose();
      toast.success('Đã xoá câu hỏi.');
    }, 'Không xoá được câu hỏi.');

  const handleSend = () =>
    withBusy(async () => {
      await sendPracticeQuestion(question.id);
      onChanged();
      // Báo máy học sinh nạp lại ngay, khỏi phải tải lại cả phòng học.
      onSent();
      onClose();
      toast.success('Đã gửi câu hỏi cho học sinh.');
    }, 'Không gửi được câu hỏi.');

  const handleAnswer = (answer: string) =>
    withBusy(async () => {
      const result = await submitPracticeAnswer(question.id, answer);
      setMyAnswer(result);

      // BE che correctAnswer trong danh sách (chống lộ đề) nhưng TRẢ KÈM ở response
      // của lần nộp — dùng luôn để tô đúng/sai ngay, không phải tải lại.
      if (result.correctAnswer) setRevealedCorrect(result.correctAnswer);
      if (result.explanation) setRevealedExplanation(result.explanation);
      onChanged();
    }, 'Không lưu được bài làm.');

  // PHẢI portal ra body: modal nằm trong <aside> panel (width 340px, overflow hidden)
  // thì bị bó vào panel thay vì căn giữa màn hình.
  return createPortal(
    <>
      <div className={styles.practiceModalOverlay} onClick={onClose}>
        <div className={styles.practiceModal} onClick={(e) => e.stopPropagation()}>
          <header className={styles.practiceModalHeader}>
            <div className={styles.practiceModalTitleWrap}>
              <h2 className={styles.practiceModalTitle}>
                {question.questionFormat === 'mc' ? 'Câu trắc nghiệm' : 'Câu tự luận'}
              </h2>
              {/* Chỉ hiện tên bộ đề. Nguồn trích (tài liệu + trang) bỏ đi cho gọn —
                  gia sư đang duyệt đề không cần biết câu lấy từ trang nào. */}
              <p className={styles.practiceModalSub}>{set.title}</p>
            </div>

            {isTutor && !isSent && !editing && (
              <button
                type="button"
                className={styles.practiceIconBtn}
                onClick={() => setEditing(true)}
                title="Sửa câu hỏi"
                aria-label="Sửa câu hỏi"
              >
                <Pencil size={15} />
              </button>
            )}
            {isTutor && !isSent && (
              <button
                type="button"
                className={styles.practiceIconBtn}
                onClick={() => setConfirmDelete(true)}
                title="Xoá câu hỏi"
                aria-label="Xoá câu hỏi"
              >
                <Trash2 size={15} />
              </button>
            )}
            <button
              type="button"
              className={styles.practiceIconBtn}
              onClick={onClose}
              title="Đóng"
              aria-label="Đóng"
            >
              <X size={16} />
            </button>
          </header>

          <div className={styles.practiceModalBody}>
            {editing ? (
              <div className={styles.practiceFieldRow}>
                <textarea
                  rows={3}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className={styles.practicePrompt}
                />
                {mathBtn('content', 'Chèn công thức vào đề bài')}
              </div>
            ) : (
              <p className={styles.practiceQuestionText}>
                <MathText>{content}</MathText>
              </p>
            )}

            {question.questionFormat === 'mc' && (
              <ul className={styles.practiceOptions}>
                {options.map((opt) => {
                  const isCorrect = opt.key === shownCorrect;
                  const chosen = myAnswer?.answer === opt.key;
                  const answered = myAnswer != null;

                  let cls = styles.practiceOption;
                  if (!isTutor && answered) {
                    if (isCorrect) cls += ` ${styles.practiceOptionCorrect}`;
                    else if (chosen) cls += ` ${styles.practiceOptionWrong}`;
                  } else if (isTutor && isCorrect) {
                    cls += ` ${styles.practiceOptionCorrect}`;
                  }

                  return (
                    <li key={opt.key} className={styles.practiceOptionRow}>
                      {editing ? (
                        <>
                          <button
                            type="button"
                            className={`${styles.materialCheckbox} ${correctAnswer === opt.key ? styles.materialCheckboxOn : ''}`}
                            onClick={() => setCorrectAnswer(opt.key)}
                            title="Đặt làm đáp án đúng"
                          >
                            {correctAnswer === opt.key && <Check size={11} />}
                          </button>
                          <span className={styles.practiceOptionKey}>{opt.key}.</span>
                          <input
                            value={opt.text}
                            onChange={(e) =>
                              setOptions((prev) =>
                                prev.map((o) => (o.key === opt.key ? { ...o, text: e.target.value } : o)),
                              )
                            }
                            className={styles.practiceOptionInput}
                          />
                          {mathBtn(opt.key, `Chèn công thức vào phương án ${opt.key}`)}
                        </>
                      ) : (
                        <button
                          type="button"
                          className={cls}
                          disabled={isTutor || myAnswer != null || busy}
                          onClick={() => handleAnswer(opt.key)}
                        >
                          <span className={styles.practiceOptionKey}>{opt.key}</span>
                          <MathText>{opt.text}</MathText>
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {question.questionFormat === 'essay' && !isTutor && (
              <div className={styles.practiceEssay}>
                <textarea
                  rows={4}
                  value={essayDraft}
                  onChange={(e) => setEssayDraft(e.target.value)}
                  placeholder="Em trình bày bài làm ở đây…"
                  className={styles.practicePrompt}
                />
                <button
                  type="button"
                  className={styles.practicePrimaryBtn}
                  disabled={!essayDraft.trim() || busy}
                  onClick={() => handleAnswer(essayDraft.trim())}
                >
                  <Check size={14} />
                  Lưu bài làm
                </button>
                {myAnswer && (
                  <p className={styles.practiceNote}>
                    Đã lưu. Em nói với gia sư để được nhận xét trực tiếp nhé.
                  </p>
                )}
              </div>
            )}

            {question.questionFormat === 'essay' && isTutor && !editing && (
              <p className={styles.practiceNote}>
                Câu tự luận — học sinh trình bày, gia sư trao đổi trực tiếp.
              </p>
            )}

            {editing ? (
              <div className={styles.practiceFieldRow}>
                <textarea
                  rows={2}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Gợi ý ngắn"
                  className={styles.practicePrompt}
                />
                {mathBtn('explanation', 'Chèn công thức vào gợi ý')}
              </div>
            ) : (
              shownExplanation && (
                <p className={styles.practiceHint}>
                  <strong>Gợi ý: </strong>
                  <MathText>{shownExplanation}</MathText>
                </p>
              )
            )}
          </div>

          <footer className={styles.practiceModalFooter}>
            {isTutor ? (
              editing ? (
                <div className={styles.practiceFooterActions}>
                  <button
                    type="button"
                    className={styles.practiceGhostBtn}
                    onClick={() => {
                      setContent(question.content);
                      setOptions(question.answerOptions ?? []);
                      setCorrectAnswer(question.correctAnswer ?? '');
                      setExplanation(question.explanation ?? '');
                      setEditing(false);
                    }}
                  >
                    Huỷ
                  </button>
                  <button type="button" className={styles.practicePrimaryBtn} disabled={busy} onClick={handleSave}>
                    {busy ? <Loader2 size={14} className={styles.practiceSpin} /> : <Check size={14} />}
                    Lưu
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.practicePrimaryBtn}
                  disabled={isSent || busy}
                  onClick={handleSend}
                >
                  <Send size={14} />
                  {isSent ? 'Đã gửi' : 'Gửi câu này cho học sinh'}
                </button>
              )
            ) : (
              <span className={styles.practiceNote}>
                {myAnswer ? 'Em có thể làm lại sau buổi học.' : 'Chọn đáp án để xem kết quả ngay.'}
              </span>
            )}
          </footer>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        type="warning-strong"
        title="Xoá câu hỏi này?"
        message="Câu hỏi sẽ bị xoá khỏi buổi học và không khôi phục được."
        confirmText="Xoá"
        onConfirm={() => {
          setConfirmDelete(false);
          void handleDelete();
        }}
        onCancel={() => setConfirmDelete(false)}
      />

      {mathTarget && (
        <MathInputModal onInsert={insertMath} onClose={() => setMathTarget(null)} />
      )}
    </>,
    document.body,
  );
};

export default QuestionModal;
