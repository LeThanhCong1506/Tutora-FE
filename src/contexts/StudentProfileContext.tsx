/* eslint-disable react-refresh/only-export-components -- provider + hook + gate colocated by design */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getMyLinkStatus } from '../services/student.service';
import type { StudentType } from '../types/student.type';

export const STUDENT_PROFILE_PATH = '/student-portal/profile';

interface StudentProfileContextValue {
  profile: StudentType | null;
  loading: boolean;
  /** Hồ sơ học tập đã đầy đủ các trường bắt buộc chưa. */
  isComplete: boolean;
  /** Tải lại trạng thái hồ sơ (gọi sau khi học sinh lưu hồ sơ). */
  refresh: () => Promise<void>;
}

const StudentProfileContext = createContext<StudentProfileContextValue | undefined>(undefined);

/**
 * Hồ sơ học sinh được coi là "đầy đủ" khi có đủ thông tin học tập bắt buộc:
 * họ tên, ngày sinh, trường, khối lớp. (Mục tiêu học tập là tuỳ chọn.)
 */
export const isStudentProfileComplete = (p: StudentType | null): boolean =>
  !!p && !!p.fullName?.trim() && !!p.birthDate && !!p.school?.trim() && p.gradeLevelId != null;

export const StudentProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<StudentType | null>(null);
  const [loading, setLoading] = useState(true);
  // Fail-open: mặc định coi là đủ để không "nhốt" học sinh nếu API trạng thái lỗi.
  const [isComplete, setIsComplete] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await getMyLinkStatus();
      const p = res.content?.studentProfile ?? null;
      setProfile(p);
      setIsComplete(isStudentProfileComplete(p));
    } catch {
      // Lỗi mạng/khác → không chặn học sinh.
      setIsComplete(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <StudentProfileContext.Provider value={{ profile, loading, isComplete, refresh }}>
      {children}
    </StudentProfileContext.Provider>
  );
};

export const useStudentProfile = (): StudentProfileContextValue => {
  const ctx = useContext(StudentProfileContext);
  if (!ctx) throw new Error('useStudentProfile must be used within StudentProfileProvider');
  return ctx;
};

/**
 * Gate bắt buộc hoàn tất hồ sơ ở lần đăng nhập đầu tiên: nếu hồ sơ học sinh chưa đầy đủ,
 * mọi route trong student-portal đều chuyển hướng về trang Hồ sơ học sinh cho tới khi
 * học sinh điền xong.
 */
export const StudentProfileGate = () => {
  const { loading, isComplete } = useStudentProfile();
  const location = useLocation();

  if (loading) {
    return <div style={{ padding: 48, textAlign: 'center', color: '#737373' }}>Đang tải hồ sơ...</div>;
  }

  if (!isComplete && location.pathname !== STUDENT_PROFILE_PATH) {
    return <Navigate to={STUDENT_PROFILE_PATH} replace />;
  }

  return <Outlet />;
};
