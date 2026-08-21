// Gom khối lớp theo cấp học. BE (bảng grade_levels) không có cột "cấp" — chỉ có
// levelOrder 1..12 — nên cấp được suy ra ở FE từ levelOrder.
export interface GradeStage {
  key: string;
  label: string;
  minLevelOrder: number;
  maxLevelOrder: number;
}

export const GRADE_STAGES: GradeStage[] = [
  { key: 'primary', label: 'Cấp 1 · Tiểu học', minLevelOrder: 1, maxLevelOrder: 5 },
  { key: 'secondary', label: 'Cấp 2 · THCS', minLevelOrder: 6, maxLevelOrder: 9 },
  { key: 'high', label: 'Cấp 3 · THPT', minLevelOrder: 10, maxLevelOrder: 12 },
];

export interface GradeStageGroup<G> {
  stage: GradeStage;
  options: G[];
}

// Chỉ trả về cấp còn ít nhất 1 lớp sau khi đã lọc theo môn. Lớp có levelOrder nằm
// ngoài 1..12 (nếu BE thêm mới) rơi vào nhóm "Khác" thay vì biến mất khỏi dropdown.
export const groupGradesByStage = <G extends { levelOrder: number }>(grades: G[]): GradeStageGroup<G>[] => {
  const groups = GRADE_STAGES.map((stage) => ({
    stage,
    options: grades.filter((g) => g.levelOrder >= stage.minLevelOrder && g.levelOrder <= stage.maxLevelOrder),
  })).filter((group) => group.options.length > 0);

  const grouped = new Set(groups.flatMap((group) => group.options));
  const rest = grades.filter((g) => !grouped.has(g));
  if (rest.length > 0) {
    groups.push({
      stage: { key: 'other', label: 'Khác', minLevelOrder: -Infinity, maxLevelOrder: Infinity },
      options: rest,
    });
  }

  return groups;
};
