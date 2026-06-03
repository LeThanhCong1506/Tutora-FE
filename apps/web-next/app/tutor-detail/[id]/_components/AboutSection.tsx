import type { TutorFullProfile } from '@/services/tutorDetail.types';
import { formatTeachingMode, formatCity } from './utils';

/** Server Component — pure display, không state. */
export default function AboutSection({ profile }: { profile: TutorFullProfile }) {
  return (
    <section className="about-section">
      <h2 className="section-title">Về Mentor {profile.fullName?.split(' ').pop()}</h2>
      <div className="about-content">
        <div className="about-text">
          <p className="about-intro">{profile.bio || 'Gia sư chưa cập nhật giới thiệu.'}</p>
          <p className="about-experience">
            {profile.experience || 'Chưa cập nhật kinh nghiệm giảng dạy.'}
          </p>
        </div>
        <div className="credentials-card">
          <div className="credential-item">
            <div className="credential-icon-row">
              <span className="credential-icon">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
              </span>
              <span className="credential-label">Học vấn</span>
            </div>
            <b className="credential-institution">{profile.education || '—'}</b>
            <i className="credential-detail">
              GPA: {profile.gpa || '—'}/{profile.gpaScale || '—'}
            </i>
          </div>
          <div className="credential-divider"></div>
          <div className="credential-item">
            <div className="credential-icon-row">
              <span className="credential-icon">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <span className="credential-label">Hình thức &amp; khu vực</span>
            </div>
            <b className="credential-institution">{formatTeachingMode(profile.teachingMode)}</b>
            <i className="credential-detail">{formatCity(profile.teachingAreaCity)}</i>
          </div>
        </div>
      </div>
    </section>
  );
}
