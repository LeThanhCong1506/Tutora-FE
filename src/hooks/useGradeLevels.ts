// Lấy danh sách cấp học từ BE (GET /api/grade-levels, public) cho bộ lọc trang tìm kiếm.
import { useEffect, useState } from 'react';
import { getGradeLevels } from '../services/lookup.service';

export interface GradeLevelItem {
  gradeLevelId: number;
  gradeName: string;
}

export function useGradeLevels() {
  const [gradeLevels, setGradeLevels] = useState<GradeLevelItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await getGradeLevels();
        if (cancelled) return;
        // BE đã sắp theo levelOrder; chỉ giữ id + tên ("Lớp 1".."Lớp 12").
        const list = (res.content ?? [])
          .filter((g) => !!g.gradeName)
          .map((g) => ({ gradeLevelId: g.gradeLevelId, gradeName: g.gradeName }));
        setGradeLevels(list);
      } catch {
        // Lỗi → giữ danh sách rỗng (FilterBar vẫn hiển thị "Tất cả").
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { gradeLevels, loading };
}
