import { useEffect, useState } from 'react';
import { getSubjects, getGradeLevels } from '../../../../services/lookup.service';
import { SUBJECTS, GRADE_LEVELS } from '../constants';

export interface SubjectOption {
  id: number;
  name: string;
}
export interface GradeOption {
  value: string; // 'grade_<gradeLevelId>' — giữ tương thích với gradeKeyToId
  label: string;
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

      if (subsR.status === 'fulfilled' && subsR.value.content?.length) {
        setSubjects(subsR.value.content.map((s) => ({ id: s.subjectId, name: s.subjectName ?? '' })));
      }
      if (gradesR.status === 'fulfilled' && gradesR.value.content?.length) {
        setGradeLevels(
          [...gradesR.value.content]
            .sort((a, b) => a.levelOrder - b.levelOrder)
            .map((g) => ({ value: `grade_${g.gradeLevelId}`, label: g.gradeName })),
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
