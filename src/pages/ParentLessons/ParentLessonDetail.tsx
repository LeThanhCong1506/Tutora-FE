import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { isZaloMiniApp } from '../../services/zalo-env';

const inMiniApp = isZaloMiniApp();
import { ArrowLeft, Video } from 'lucide-react';
import { getParentLessonDetail } from '../../services/parent-lesson.service';
import { isJitsiFallbackLink } from '../../services/googleAuth.service';
import { useLessonStartedListener } from '../../hooks/useLessonStartedListener';
import { Spin, Tag, Button } from 'antd';
import { toast } from 'react-toastify';
import CountdownTimer from './components/CountdownTimer';
import ConfirmLessonModal from './components/ConfirmLessonModal';
import CreateDisputeForm from './components/CreateDisputeForm';
import ReportNoShowModal from './components/ReportNoShowModal';
import NoShowActionModal from './components/NoShowActionModal';
import CreateFeedbackModal from './components/CreateFeedbackModal';


const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Đã lên lịch', color: '#1890ff' },
  checked_in: { label: 'Đang diễn ra', color: '#52c41a' },
  checked_out: { label: 'Chờ báo cáo', color: '#faad14' },
  pending_confirmation: { label: 'Chờ xác nhận', color: '#722ed1' },
  completed: { label: 'Hoàn thành', color: '#52c41a' },
  disputed: { label: 'Khiếu nại', color: '#ff4d4f' },
  cancelled: { label: 'Đã hủy', color: '#999' },
  no_show: { label: 'Vắng mặt', color: '#ff4d4f' },
};

const ParentLessonDetail: React.FC = () => {
  const navigate = useNavigate();
  const { lessonId } = useParams();
  const id = lessonId ? parseInt(lessonId) : 0;

  const [lesson, setLesson] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [showNoShowModal, setShowNoShowModal] = useState(false);
  const [showNoShowActionModal, setShowNoShowActionModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);


  const fetchLesson = async () => {
    try {
      setLoading(true);
      const response = await getParentLessonDetail(id);
      setLesson(response.content);
    } catch (error: any) {
      toast.error('Không thể tải chi tiết buổi học.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchLesson();
  }, [id]);

  // Tutor check-in → notification "Buổi học đã bắt đầu" → tự refetch để render banner Join
  useLessonStartedListener(() => { if (id) fetchLesson(); });

  const handleActionSuccess = () => {
    setShowConfirmModal(false);
    setShowDisputeForm(false);
    setShowNoShowModal(false);
    setShowNoShowActionModal(false);
    fetchLesson();
  };

  // Check if no-show report is available (15 min past scheduledStart, tutor not checked in)
  // MVP Phase 1: Ẩn
  /*
  const canReportNoShow = (): boolean => {
    if (!lesson) return false;
    if (lesson.status !== 'scheduled') return false;
    const now = new Date();
    const start = new Date(lesson.scheduledStart);
    const diffMinutes = (now.getTime() - start.getTime()) / (1000 * 60);
    return diffMinutes >= 15;
  };
  */

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div style={{ textAlign: 'center', padding: '80px', color: '#999' }}>
        Không tìm thấy buổi học
      </div>
    );
  }

  const status = STATUS_CONFIG[lesson.status || ''] || { label: lesson.status || 'N/A', color: '#999' };
  const startTime = new Date(lesson.scheduledStart);
  const endTime = new Date(lesson.scheduledEnd);

  return (
    <div style={{ padding: inMiniApp ? '12px' : '24px', maxWidth: inMiniApp ? 'none' : '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/parent-portal/lessons')}
          style={{
            width: '36px', height: '36px', borderRadius: '8px',
            border: '1px solid #e8e8e8', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1a2238', margin: 0 }}>
            Chi tiết buổi học
          </h1>
          <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>
            #{lesson.lessonId}
          </p>
        </div>
        <Tag color={status.color} style={{ fontSize: '14px', padding: '4px 12px', borderRadius: '6px' }}>
          {status.label}
        </Tag>
      </div>

      {/* Countdown Timer */}
      {lesson.confirmDeadline && lesson.status === 'pending_confirmation' && (
        <div style={{
          background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '12px',
          padding: '12px 16px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '13px', color: '#d48806' }}>
            Hạn xác nhận buổi học:
          </span>
          <CountdownTimer deadline={lesson.confirmDeadline} />
        </div>
      )}

      {/* Join Banner — chỉ hiện khi tutor đã check-in & có link */}
      {lesson.status === 'in_progress' && lesson.meetingLink && (
        <div style={{
          background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
          color: '#fff',
          borderRadius: 12,
          padding: '20px 24px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          boxShadow: '0 6px 20px rgba(22,163,74,0.25)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Video size={22} color="#fff" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>
                Buổi học đã bắt đầu
              </div>
              <div style={{ fontSize: 13, opacity: 0.9, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span>Gia sư đang chờ trong lớp</span>
                {isJitsiFallbackLink(lesson.meetingLink) && (
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    background: 'rgba(255,255,255,0.25)',
                    padding: '1px 8px', borderRadius: 4, letterSpacing: 0.3,
                  }}>
                    Jitsi (dự phòng)
                  </span>
                )}
              </div>
            </div>
          </div>
          <a
            href={lesson.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#fff',
              color: '#15803d',
              padding: '10px 22px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ▶ Tham gia ngay
          </a>
        </div>
      )}

      {/* Lesson Info Card */}
      <div style={{
        background: '#fff', borderRadius: '12px', padding: '24px',
        border: '1px solid rgba(26,34,56,0.06)', marginBottom: '20px',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1a2238', marginBottom: '16px' }}>
          Thông tin buổi học
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: inMiniApp ? '1fr' : '1fr 1fr', gap: '16px' }}>
          <InfoRow label="Môn học" value={lesson.subjectName || lesson.subject?.subjectName || 'N/A'} />
          <InfoRow label="Gia sư" value={lesson.tutorName || lesson.tutor?.fullName || 'N/A'} />
          <InfoRow

            label="Thời gian"
            value={`${startTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
          />
          <InfoRow
            label="Ngày"
            value={startTime.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
          />
          {lesson.lessonPrice != null && (
            <InfoRow
              label="Giá buổi học"
              value={`${lesson.lessonPrice.toLocaleString('vi-VN')}đ`}
              highlight
            />
          )}
          {lesson.meetingLink && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Link học online</span>
                {isJitsiFallbackLink(lesson.meetingLink) && (
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    color: '#92400e', background: '#fef3c7',
                    padding: '1px 6px', borderRadius: 4, letterSpacing: 0.3,
                  }}>
                    Jitsi (dự phòng)
                  </span>
                )}
              </div>
              <a href={lesson.meetingLink} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '14px', color: '#1890ff', wordBreak: 'break-all' }}>
                {lesson.meetingLink}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Tutor Report (if available) */}
      {(lesson.lessonContent || lesson.homework || lesson.tutorNotes) && (
        <div style={{
          background: '#fff', borderRadius: '12px', padding: '24px',
          border: '1px solid rgba(26,34,56,0.06)', marginBottom: '20px',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1a2238', marginBottom: '16px' }}>
            Báo cáo gia sư
          </h3>
          {lesson.lessonContent && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Nội dung đã dạy</div>
              <div style={{ fontSize: '14px', color: '#1a2238', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {lesson.lessonContent}
              </div>
            </div>
          )}
          {lesson.homework && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Bài tập về nhà</div>
              <div style={{ fontSize: '14px', color: '#1a2238', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {lesson.homework}
              </div>
            </div>
          )}
          {lesson.tutorNotes && (
            <div>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Ghi chú gia sư</div>
              <div style={{ fontSize: '14px', color: '#1a2238', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {lesson.tutorNotes}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{
        background: '#fff', borderRadius: '12px', padding: '20px',
        border: '1px solid rgba(26,34,56,0.06)',
        display: 'flex', gap: '12px', flexWrap: 'wrap',
      }}>
        {lesson.status === 'pending_confirmation' && (
          <>
            <Button
              type="primary"
              size="large"
              onClick={() => setShowConfirmModal(true)}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              Xác nhận buổi học
            </Button>
            {/* MVP Phase 1: Ẩn nút khiếu nại */}
            {/* <Button
              size="large"
              danger
              onClick={() => setShowDisputeForm(true)}
            >
              Khiếu nại
            </Button> */}
          </>
        )}

        {/* MVP Phase 1: Ẩn tính năng báo vắng mặt */}
        {/* {lesson.status === 'scheduled' && canReportNoShow() && (
          <Button
            size="large"
            danger
            onClick={() => setShowNoShowModal(true)}
          >
            Báo gia sư vắng mặt
          </Button>
        )} */}

        {/* {lesson.status === 'no_show' && (
          <Button
            type="primary"
            size="large"
            onClick={() => setShowNoShowActionModal(true)}
            style={{ background: '#3e2f28', borderColor: '#3e2f28' }}
          >
            Chọn hành động xử lý
          </Button>
        )} */}

        {lesson.status === 'completed' && (
          <Button
            type="primary"
            size="large"
            onClick={() => setShowFeedbackModal(true)}
            style={{ background: '#3e2f28', borderColor: '#3e2f28' }}
          >
            Đánh giá buổi học
          </Button>
        )}

        <Button size="large" onClick={() => navigate('/parent-portal/lessons')}>
          Quay lại
        </Button>
      </div>

      {/* Modals */}
      <CreateFeedbackModal
        open={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSuccess={handleActionSuccess}
        lessonId={id}
        bookingId={lesson.bookingId || 0}
        tutorId={(lesson.tutorId || lesson.tutor?.tutorId) || ''}
        tutorName={lesson.tutorName || lesson.tutor?.fullName}
        subjectName={lesson.subjectName || lesson.subject?.subjectName}
      />

      <ConfirmLessonModal
        open={showConfirmModal}
        lessonId={id}
        subjectName={lesson.subjectName}
        tutorName={lesson.tutorName}
        lessonPrice={lesson.lessonPrice}
        onSuccess={handleActionSuccess}
        onCancel={() => setShowConfirmModal(false)}
      />

      <CreateDisputeForm
        open={showDisputeForm}
        lessonId={id}
        onSuccess={handleActionSuccess}
        onCancel={() => setShowDisputeForm(false)}
      />

      <ReportNoShowModal
        open={showNoShowModal}
        lessonId={id}
        scheduledStart={lesson.scheduledStart}
        onSuccess={handleActionSuccess}
        onCancel={() => setShowNoShowModal(false)}
      />

      <NoShowActionModal
        open={showNoShowActionModal}
        lessonId={id}
        onSuccess={handleActionSuccess}
        onCancel={() => setShowNoShowActionModal(false)}
      />
    </div>
  );
};

// Helper component
const InfoRow: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div>
    <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>{label}</div>
    <div style={{
      fontSize: '14px', color: highlight ? '#52c41a' : '#1a2238',
      fontWeight: highlight ? 600 : 400,
    }}>
      {value}
    </div>
  </div>
);

export default ParentLessonDetail;
