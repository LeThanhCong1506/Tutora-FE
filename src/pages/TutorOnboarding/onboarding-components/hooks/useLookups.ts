import { useEffect, useState } from 'react';
import { getSubjects, getGradeLevels } from '../../../../services/lookup.service';
import { SUBJECTS, GRADE_LEVELS } from '../constants';

export interface SubjectOption {
  id: number;
  name: string;
  /** Khối lớp thấp nhất môn này áp dụng (levelOrder). Null = không giới hạn. */
  minGradeLevelOrder: number | null;
  /** Khối lớp cao nhất môn này áp dụng (levelOrder). Null = không giới hạn. */
  maxGradeLevelOrder: number | null;
}
export interface GradeOption {
  value: string; // 'grade_<gradeLevelId>' — giữ tương thích với gradeKeyToId
  label: string;
  levelOrder: number;
}

/**
 * Lấy danh sách môn học & khối lớp từ BE (GET /api/subjects, /api/grade-levels).
 * Khởi tạo bằng hằng số trong constants → UI có data ngay và fallback nếu API lỗi.
 * Grade map về `grade_<id>` để khớp với gradeKeyToId/gradeIdToKey trong api-mapping.
 */
export function useLookups() {
  const [subjects, setSubjects] = useState<SubjectOption[]>(SUBJECTS);
  const [gradeLevels, setGradeLevels] = useState<GradeOption[]>(GRADE_LEVELS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [subsR, gradesR] = await Promise.allSettled([getSubjects(), getGradeLevels()]);
      if (cancelled) return;

      // Subject.min/maxGradeLevelId là id, cần quy về levelOrder mới so sánh được (id không
      // đảm bảo tăng dần theo khối lớp). Nếu gradesR lỗi thì không tra được -> coi như không
      // giới hạn (không tệ hơn hành vi cũ).
      const gradeLevelOrderById = new Map<number, number>(
        gradesR.status === 'fulfilled'
          ? (gradesR.value.content ?? []).map((g) => [g.gradeLevelId, g.levelOrder])
          : [],
      );

      if (subsR.status === 'fulfilled' && subsR.value.content?.length) {
        setSubjects(
          subsR.value.content.map((s) => ({
            id: s.subjectId,
            name: s.subjectName ?? '',
            minGradeLevelOrder:
              s.minGradeLevelId != null ? (gradeLevelOrderById.get(s.minGradeLevelId) ?? null) : null,
            maxGradeLevelOrder:
              s.maxGradeLevelId != null ? (gradeLevelOrderById.get(s.maxGradeLevelId) ?? null) : null,
          })),
        );
      }
      if (gradesR.status === 'fulfilled' && gradesR.value.content?.length) {
        setGradeLevels(
          [...gradesR.value.content]
            .sort((a, b) => a.levelOrder - b.levelOrder)
            .map((g) => ({ value: `grade_${g.gradeLevelId}`, label: g.gradeName, levelOrder: g.levelOrder })),
        );
      }
      // Lỗi → giữ nguyên fallback hằng số (state khởi tạo).
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { subjects, gradeLevels };
}
