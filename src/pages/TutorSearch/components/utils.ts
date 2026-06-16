import type { TutorSearchResultResponse } from '../../../services/tutorSearch.service';
import type { Tutor, TutorType } from './types';

export const mapSubscriptionToType = (sub: string | null | undefined): TutorType => {
  const map: Record<string, TutorType> = {
    intensive: 'intensive',
    guided: 'guided',
    basic: 'basic',
    free: 'basic',
    elite: 'elite',
  };
  return map[(sub || '').toLowerCase()] || 'basic';
};

export const formatGradeLevelRanges = (grades: string[]): string => {
  if (grades.length === 0) return '';

  const nums = grades
    .map((g) => {
      const m = g.match(/\d+/);
      return m ? parseInt(m[0]) : 0;
    })
    .filter((n) => n > 0)
    .sort((a, b) => a - b);

  if (nums.length === 0) return '';

  const ranges: string[] = [];
  let start = nums[0];
  let end = nums[0];

  for (let i = 1; i < nums.length; i++) {
    if (nums[i] === end + 1) {
      end = nums[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = nums[i];
      end = nums[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);

  return `Lớp ${ranges.join(', ')}`;
};

export const mapApiTutorToUi = (apiTutor: TutorSearchResultResponse): Tutor => {
  const type = mapSubscriptionToType(apiTutor.subscriptionType);

  const subjects: string[] = [];
  const subjectGradeMap = new Map<string, Set<string>>();
  // BE trả gradeLevels theo TÊN ("Lớp 10") — gom trực tiếp, không suy diễn "Grade_N".
  const gradeLevelSet = new Set<string>();
  if (apiTutor.subjects) {
    apiTutor.subjects.forEach((s) => {
      const subjectName = (s.subjectName || '').trim();
      if (subjectName && !subjects.includes(subjectName)) {
        subjects.push(subjectName);
      }
      if (subjectName && !subjectGradeMap.has(subjectName)) {
        subjectGradeMap.set(subjectName, new Set<string>());
      }
      if (s.gradeLevels) {
        s.gradeLevels.forEach((gl) => {
          const name = (gl || '').trim();
          if (name) {
            gradeLevelSet.add(name);
            if (subjectName) subjectGradeMap.get(subjectName)?.add(name);
          }
        });
      }
    });
  }

  const sortedGradeLevels = Array.from(gradeLevelSet).sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)?.[0] ?? '0', 10);
    const numB = parseInt(b.match(/\d+/)?.[0] ?? '0', 10);
    return numA - numB;
  });

  const subjectGradeLevels = Array.from(subjectGradeMap.entries()).map(([subjectName, grades]) => {
    const gradeLevels = Array.from(grades).sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] ?? '0', 10);
      const numB = parseInt(b.match(/\d+/)?.[0] ?? '0', 10);
      return numA - numB;
    });

    return {
      subjectName,
      gradeLevels,
      gradeLabel: formatGradeLevelRanges(gradeLevels) || 'Chưa cập nhật lớp',
    };
  });

  return {
    id: apiTutor.tutorId,
    name: apiTutor.fullName || 'Gia sư',
    avatar: apiTutor.avatarUrl || 'https://randomuser.me/api/portraits/lego/1.jpg',
    type,
    credential: apiTutor.degreeLevel || '',
    bio: apiTutor.bio || '',
    rating: apiTutor.averageRating || 0,
    university: apiTutor.education || '',
    subjects: subjects.length > 0 ? subjects : ['Chưa cập nhật'],
    gradeLevels: sortedGradeLevels,
    subjectGradeLevels,
  };
};
