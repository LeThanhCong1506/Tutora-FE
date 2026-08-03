export type StudentType = {
  studentId: string;
  parentId: string;
  fullName: string;
  birthDate: string;
  school: string | null;
  gradeLevelId: number | null;
  gradeLevel: string;
  learningGoals: string;
  avatarURL: string;
  createdAt: string;
  age: number;
  username: string;
  isIdentityVerified?: boolean;
};
