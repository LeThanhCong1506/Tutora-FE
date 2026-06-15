// Lấy danh sách môn học từ BE (GET /api/subjects, public) cho bộ lọc trang tìm kiếm.
import { useEffect, useState } from 'react';
import { getSubjects } from '../services/lookup.service';

export interface SubjectItem {
  subjectId: number;
  subjectName: string;
}

export function useSubjects() {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await getSubjects();
        if (cancelled) return;
        const list = (res.content ?? [])
          .filter((s) => !!s.subjectName)
          .map((s) => ({ subjectId: s.subjectId, subjectName: s.subjectName as string }));
        setSubjects(list);
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

  return { subjects, loading };
}
