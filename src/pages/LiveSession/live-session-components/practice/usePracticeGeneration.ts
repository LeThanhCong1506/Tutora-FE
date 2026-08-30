import { useCallback, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { generatePracticeSet, type GeneratePracticePayload } from '../../../../services/practice.service';

export interface PracticeGeneration {
  /** True khi AI đang sinh đề — dùng để khoá nút và hiện trạng thái. */
  generating: boolean;
  /** Prompt gia sư đang gõ; giữ ở đây để không mất khi đổi tab / đóng panel. */
  prompt: string;
  setPrompt: (value: string) => void;
  /** Tài liệu đang tick; null = chưa chọn tay, dùng mặc định suy từ danh sách. */
  selectedIds: number[] | null;
  setSelectedIds: (ids: number[]) => void;
  /** Tăng lên mỗi khi có thay đổi cần tải lại danh sách câu hỏi. */
  reloadToken: number;
  reload: () => void;
  generate: (bookingId: number, payload: GeneratePracticePayload) => Promise<void>;
}

/**
 * Quản lý việc AI sinh đề, đặt Ở NGOÀI cây component của panel.
 *
 * Vì sao không để state trong PracticeTab: panel bên bị unmount khi gia sư đóng nó
 * (nút X) hoặc chuyển sang panel Ghi chú/Theo dõi. Lúc đó `generating` mất, nút quay
 * về trạng thái thường trong khi request vẫn đang chạy — gia sư tưởng hỏng nên bấm
 * lại, tạo ra 2 bộ đề trùng.
 *
 * Đặt hook này ở LiveSession (luôn mount suốt buổi học) thì tiến trình sống độc lập
 * với việc mở/đóng panel.
 */
export const usePracticeGeneration = (): PracticeGeneration => {
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[] | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // Chặn bấm lặp: state cập nhật bất đồng bộ nên hai cú bấm liên tiếp có thể cùng
  // đọc được generating = false.
  const inFlight = useRef(false);

  const reload = useCallback(() => setReloadToken((v) => v + 1), []);

  const generate = useCallback(async (bookingId: number, payload: GeneratePracticePayload) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setGenerating(true);

    try {
      await generatePracticeSet(bookingId, payload);
      setPrompt('');
      setReloadToken((v) => v + 1);
      toast.success('Đã tạo câu hỏi. Đọc lại rồi gửi cho học sinh nhé.');
    } catch (e) {
      // BE trả lý do CỤ THỂ khi AI từ chối (yêu cầu lạc đề, chat chit, đòi lộ prompt).
      // Lý do thường dài 1-2 câu nên cho toast đứng lâu hơn mặc định để đọc kịp.
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Không tạo được câu hỏi.';
      toast.error(message, { autoClose: 7000 });
    } finally {
      inFlight.current = false;
      setGenerating(false);
    }
  }, []);

  return {
    generating,
    prompt,
    setPrompt,
    selectedIds,
    setSelectedIds,
    reloadToken,
    reload,
    generate,
  };
};
