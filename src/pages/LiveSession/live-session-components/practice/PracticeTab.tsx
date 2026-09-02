import { useEffect, useMemo, useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  getPracticeSets,
  type PracticeSet,
  type PracticeQuestion,
} from '../../../../services/practice.service';
import { getMaterials, type LearningMaterialResponse } from '../../../../services/materials.service';
import MathText from './MathText';
import type { PracticeGeneration } from './usePracticeGeneration';

/**
 * Hạn mức câu hỏi mỗi BUỔI HỌC
 */
const MAX_QUESTIONS_PER_SESSION = 10;
import styles from '../../styles.module.css';

interface PracticeTabProps {
  bookingId: number | null;
  classSessionId: number | null;
  isTutor: boolean;
  onOpenQuestion: (set: PracticeSet, question: PracticeQuestion) => void;
  /** Tăng lên mỗi khi modal sửa/gửi/trả lời xong -> tab tải lại danh sách. */
  refreshToken: number;
  /**
   * Tiến trình sinh đề, sở hữu bởi LiveSession chứ không phải tab này — để trạng thái
   * "Đang tạo câu hỏi" và prompt đang gõ không mất khi đổi tab hoặc đóng panel.
   */
  generation: PracticeGeneration;
}

/**
 * Tab thứ 3 của panel Chat.
 */
const PracticeTab = ({
  bookingId,
  classSessionId,
  isTutor,
  onOpenQuestion,
  refreshToken,
  generation,
}: PracticeTabProps) => {
  const [sets, setSets] = useState<PracticeSet[]>([]);
  const [materials, setMaterials] = useState<LearningMaterialResponse[]>([]);
  const [loading, setLoading] = useState(bookingId != null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { generating, prompt, setPrompt, selectedIds, setSelectedIds, reloadToken, generate } =
    generation;

  useEffect(() => {
    if (!bookingId) return;
    // `cancelled` chặn setState sau khi panel đã đóng/đổi tab — nếu không, response
    // về muộn sẽ ghi vào component đã unmount.
    let cancelled = false;

    (async () => {
      try {
        const [setList, materialRes] = await Promise.all([
          getPracticeSets(bookingId),
          isTutor ? getMaterials(bookingId) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setSets(setList);
        if (materialRes) setMaterials(materialRes.content ?? []);
      } catch {
        if (!cancelled) toast.error('Không tải được bài tập.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bookingId, isTutor, refreshToken, reloadToken]);

  // Mặc định tick tài liệu ready mới nhất — thường là cái gia sư vừa dạy. Tính khi
  // render thay vì setState trong effect (tránh cascading render).
  const effectiveSelectedIds = useMemo(() => {
    if (selectedIds !== null) return selectedIds;
    const ready = materials.find((m) => m.contentStatus === 'ready');
    return ready ? [ready.materialId] : [];
  }, [selectedIds, materials]);

  const toggleMaterial = (id: number) =>
    setSelectedIds(
      effectiveSelectedIds.includes(id)
        ? effectiveSelectedIds.filter((x) => x !== id)
        : [...effectiveSelectedIds, id],
    );

  // Số câu đã tạo trong ĐÚNG buổi học này — buổi phụ có hạn mức riêng nên không
  // đếm gộp cả khoá.
  const usedCount = useMemo(
    () =>
      sets
        .filter((s) => classSessionId == null || s.classSessionId === classSessionId)
        .reduce((total, s) => total + s.questions.length, 0),
    [sets, classSessionId],
  );
  const quotaReached = usedCount >= MAX_QUESTIONS_PER_SESSION;

  // Danh sách phẳng: gia sư thấy cả nháp, học sinh chỉ nhận bộ đã gửi từ BE.
  const questions = useMemo(
    () => sets.flatMap((set) => set.questions.map((q) => ({ set, q }))),
    [sets],
  );

  const chosen = materials.filter((m) => effectiveSelectedIds.includes(m.materialId));

  const handleGenerate = () => {
    if (!bookingId || effectiveSelectedIds.length === 0 || !prompt.trim()) return;
    // Toàn bộ vòng đời request nằm trong hook ở LiveSession -> đổi tab / đóng panel
    // giữa chừng vẫn không mất trạng thái.
    void generate(bookingId, {
      materialIds: effectiveSelectedIds,
      prompt: prompt.trim(),
      classSessionId: classSessionId ?? undefined,
    });
  };

  if (loading) {
    return (
      <div className={styles.practiceEmpty}>
        <Loader2 size={18} className={styles.practiceSpin} />
        <p>Đang tải bài tập…</p>
      </div>
    );
  }

  if (!bookingId) {
    return <div className={styles.practiceEmpty}><p>Không xác định được khoá học.</p></div>;
  }

  return (
    <div className={styles.practiceScroll}>
      {isTutor && (
        <section className={styles.practiceCompose}>
          <p className={styles.practiceQuotaNote}>
            <span>
              Đã tạo {usedCount}/{MAX_QUESTIONS_PER_SESSION} câu cho buổi này
            </span>
          </p>
          <div className={styles.materialPickerRow}>
            <span className={styles.materialPickerInfo}>
              <span className={styles.materialPickerLabel}>Tài liệu nguồn</span>
              <span className={styles.materialPickerValue}>
                {chosen.length === 0
                  ? 'Chưa chọn tài liệu'
                  : chosen.length === 1
                    ? chosen[0].title
                    : `${chosen.length} tài liệu`}
              </span>
            </span>
            <button
              type="button"
              className={styles.practiceSmallBtn}
              onClick={() => setPickerOpen((v) => !v)}
            >
              Chọn
            </button>
          </div>

          {pickerOpen && (
            <ul className={styles.materialPickerList}>
              {materials.map((m) => {
                const disabled = m.contentStatus !== 'ready';
                const on = effectiveSelectedIds.includes(m.materialId);
                return (
                  <li key={m.materialId}>
                    <button
                      type="button"
                      disabled={disabled}
                      className={styles.materialPickerItem}
                      onClick={() => toggleMaterial(m.materialId)}
                    >
                      <span className={`${styles.materialCheckbox} ${on ? styles.materialCheckboxOn : ''}`}>
                        {on && <Check size={11} />}
                      </span>
                      <span className={styles.materialPickerName}>{m.title}</span>
                      {disabled && <span className={styles.materialPickerHint}>đang xử lý</span>}
                    </button>
                  </li>
                );
              })}
              {materials.length === 0 && (
                <li className={styles.materialPickerHint}>Chưa có tài liệu nào.</li>
              )}
            </ul>
          )}

          <textarea
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ví dụ: 5 câu trắc nghiệm về đạo hàm hàm hợp, mức vận dụng"
            className={styles.practicePrompt}
          />

          <button
            type="button"
            className={styles.practicePrimaryBtn}
            disabled={
              generating || quotaReached || effectiveSelectedIds.length === 0 || !prompt.trim()
            }
            onClick={handleGenerate}
          >
            {generating ? (
              <>
                <Loader2 size={14} className={styles.practiceSpin} />
                Đang tạo câu hỏi…
              </>
            ) : (
              <>
                Tạo câu hỏi
              </>
            )}
          </button>
        </section>
      )}

      <p className={styles.practiceSectionLabel}>
        {isTutor ? 'Câu hỏi trong buổi này' : 'Bài tập gia sư gửi'}
      </p>

      <ul className={styles.practiceList}>
        {questions.map(({ set, q }, i) => {
          const answered = q.myAnswer != null;
          // Trạng thái theo TỪNG CÂU: cùng một bộ có thể vừa có câu đã gửi vừa có nháp.
          const statusText = isTutor
            ? q.sentAt ? 'đã gửi' : 'nháp'
            : !answered
              ? 'chưa làm'
              : q.questionFormat === 'essay'
                ? 'đã làm'
                : q.myAnswer?.isCorrect ? 'đúng' : 'chưa đúng';

          return (
            <li key={q.id} className={styles.practiceItem}>
              <button
                type="button"
                className={styles.practiceItemBtn}
                onClick={() => onOpenQuestion(set, q)}
              >
                <span className={styles.practiceIndex}>{String(i + 1).padStart(2, '0')}</span>
                <span className={styles.practiceItemBody}>
                  <span className={styles.practiceItemContent}>
                    <MathText>{q.content}</MathText>
                  </span>
                  <span className={styles.practiceItemMeta}>
                    {q.questionFormat === 'mc' ? 'Trắc nghiệm' : 'Tự luận'}
                    {q.sourcePage ? ` · trang ${q.sourcePage}` : ''}
                    {` · ${statusText}`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {questions.length === 0 && (
        <div className={styles.practiceEmpty}>
          <img src="/images/icons/empty-question.png" alt="" className={styles.emptyStateIcon} />
          <p>
            {isTutor
              ? 'Chưa có câu hỏi nào. Chọn tài liệu và mô tả yêu cầu để tạo.'
              : 'Chưa có bài tập nào. Gia sư sẽ gửi trong buổi học.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default PracticeTab;
