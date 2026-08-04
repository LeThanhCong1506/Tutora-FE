/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft, BookOpen, AlertCircle, Video,
    Calendar as CalendarIcon, FileText, ClipboardCheck, Star,
    User, PlayCircle, StopCircle, Paperclip, Download, CalendarClock,
    CheckCircle2, Clock3, XCircle,
} from 'lucide-react';
import dayjs from 'dayjs';
import { getStudentLessonDetail, confirmStudentLesson, type StudentLessonDetailDto } from '../../services/student-lesson.service';
import { getMaterials, type LearningMaterialResponse } from '../../services/materials.service';
import {
    getClassSessionDispute,
    getClassSessionDisputeThread,
    sendClassSessionDisputeThreadMessage,
    getStudentScheduleChange,
    respondStudentScheduleChange,
    type DisputeDetailResponse,
    type DisputeMessage,
    type SessionScheduleChangeResponse,
} from '../../services/classSession.service';
import { signalRService } from '../../services/signalr.service';
import { useLessonStartedListener } from '../../hooks/useLessonStartedListener';
import { message as antMessage, Spin, Modal } from 'antd';
import CreateFeedbackModal from '../ParentLessons/components/CreateFeedbackModal';
import { ClassSessionRecording } from '../../components/shared';
import CreateDisputeForm from '../ParentLessons/components/CreateDisputeForm';
import ReportNoShowModal from '../ParentLessons/components/ReportNoShowModal';
import NoShowActionModal from '../ParentLessons/components/NoShowActionModal';
import { useStudentProfile } from '../../contexts/StudentProfileContext';
import s from '../StudentPages.module.css';
import { getClassSessionStatusMeta } from '../../utils/classSessionStatus';
import { canJoinLiveSession } from '../../utils/liveSession';

// ── Status definitions — nguồn duy nhất là classSessionStatus.ts (khớp BE ClassSessionStatus) ──
type StatusInfo = { label: string; color: string; bg: string; icon: string };

const STATUS_ICON: Record<string, string> = {
    scheduled: '📅',
    reserved: '📅',
    in_progress: '🟢',
    pending_confirmation: '⏳',
    completed: '✅',
    cancelled: '❌',
    cancelled_noshow: '❌',
    no_show: '⚠️',
    disputed: '🚨',
};

const getStatus = (status: string | null | undefined): StatusInfo => {
    const meta = getClassSessionStatusMeta(status);
    return { label: meta.label, color: meta.color, bg: meta.bg, icon: STATUS_ICON[(status ?? '').toLowerCase()] ?? '❔' };
};

const VN_WEEKDAYS_FULL = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

const formatLongDate = (iso: string | null | undefined): string => {
    if (!iso) return 'N/A';
    const d = dayjs(iso);
    return `${VN_WEEKDAYS_FULL[d.day()]}, ${d.format('DD/MM/YYYY')}`;
};

const formatTime = (iso: string | null | undefined): string => {
    if (!iso) return '--:--';
    return dayjs(iso).format('HH:mm');
};

const getFileNameFromUrl = (url: string): string => {
    try {
        const path = new URL(url).pathname;
        return decodeURIComponent(path.substring(path.lastIndexOf('/') + 1)) || 'Tệp đính kèm';
    } catch {
        return 'Tệp đính kèm';
    }
};

const TERMINAL_BOOKING_STATUSES = ['completed', 'cancelled', 'cancelled_noshow'];

// ─────────────────────────────────────────────────────────────────────────
const StudentLessonDetail = () => {
    const { lessonId } = useParams<{ lessonId: string }>();
    const navigate = useNavigate();
    const { isParentManaged } = useStudentProfile();
    const [lesson, setLesson] = useState<StudentLessonDetailDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [confirming, setConfirming] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [showDisputeForm, setShowDisputeForm] = useState(false);
    const [showNoShowModal, setShowNoShowModal] = useState(false);
    const [showNoShowActionModal, setShowNoShowActionModal] = useState(false);
    const [dispute, setDispute] = useState<DisputeDetailResponse | null>(null);
    const [thread, setThread] = useState<DisputeMessage[]>([]);
    const [threadInput, setThreadInput] = useState('');
    const [sendingThreadMessage, setSendingThreadMessage] = useState(false);
    const [scheduleChange, setScheduleChange] = useState<SessionScheduleChangeResponse | null>(null);
    const [submittingScheduleDecision, setSubmittingScheduleDecision] = useState(false);
    const [materials, setMaterials] = useState<LearningMaterialResponse[]>([]);

    const fetchDetail = useCallback(async () => {
        if (!lessonId) return;
        try {
            setLoading(true);
            const response = await getStudentLessonDetail(parseInt(lessonId));
            setLesson(response.content);
        } catch {
            antMessage.error('Không thể tải chi tiết buổi học');
        } finally {
            setLoading(false);
        }
    }, [lessonId]);

    const fetchDispute = useCallback(async () => {
        if (!lessonId) return;
        try {
            const response = await getClassSessionDispute(parseInt(lessonId));
            setDispute(response.content);
        } catch {
            setDispute(null);
        }
    }, [lessonId]);

    const fetchMaterials = useCallback(async (bookingId: number) => {
        try {
            const response = await getMaterials(bookingId);
            setMaterials(Array.isArray(response.content) ? response.content : []);
        } catch {
            setMaterials([]);
        }
    }, []);

    const fetchScheduleChange = useCallback(async () => {
        if (!lessonId) return;
        try {
            const response = await getStudentScheduleChange(parseInt(lessonId));
            setScheduleChange(response.content);
        } catch (requestError: unknown) {
            console.error('Failed to load schedule-change state', requestError);
            setScheduleChange(null);
        }
    }, [lessonId]);

    const fetchThread = useCallback(async () => {
        if (!lessonId) return;
        try {
            const response = await getClassSessionDisputeThread(parseInt(lessonId));
            setThread(response.content);
        } catch (requestError: unknown) {
            console.error('Failed to load dispute thread', requestError);
        }
    }, [lessonId]);

    const handleSendThreadMessage = async () => {
        if (!lessonId || threadInput.trim().length === 0) return;
        setSendingThreadMessage(true);
        try {
            await sendClassSessionDisputeThreadMessage(parseInt(lessonId), threadInput.trim());
            setThreadInput('');
            await fetchThread();
        } catch (error: any) {
            antMessage.error(error.response?.data?.message || 'Không thể gửi tin nhắn');
        } finally {
            setSendingThreadMessage(false);
        }
    };

    useEffect(() => {
        fetchDetail();
        fetchDispute();
    }, [fetchDetail, fetchDispute]);

    useEffect(() => {
        if (lesson?.bookingId) void fetchMaterials(lesson.bookingId);
    }, [lesson?.bookingId, fetchMaterials]);

    useEffect(() => {
        if (!lessonId) return;
        void fetchScheduleChange();
        const timer = window.setInterval(() => void fetchScheduleChange(), 8000);
        return () => window.clearInterval(timer);
    }, [lessonId, fetchScheduleChange]);

    useEffect(() => {
        if (dispute) void fetchThread();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispute?.disputeId]);

    // Real-time: chèn tin nhắn mới trực tiếp thay vì phải F5/refetch.
    useEffect(() => {
        if (!dispute) return;
        const unsubscribe = signalRService.subscribeToDisputeMessages((message: DisputeMessage) => {
            if (message.disputeId !== dispute.disputeId) return;
            setThread((prev) => (prev.some((m) => m.disputeMessageId === message.disputeMessageId) ? prev : [...prev, message]));
            antMessage.info(`Admin: ${message.message}`);
        });
        return unsubscribe;
    }, [dispute]);

    useLessonStartedListener(fetchDetail);

    const handleConfirm = async () => {
        if (!lessonId) return;
        try {
            setConfirming(true);
            await confirmStudentLesson(parseInt(lessonId));
            antMessage.success('Xác nhận buổi học thành công!');
            setShowConfirmModal(false);
            fetchDetail();
        } catch (error: any) {
            antMessage.error(error.response?.data?.message || 'Không thể xác nhận buổi học');
        } finally {
            setConfirming(false);
        }
    };

    const handleActionSuccess = () => {
        setShowConfirmModal(false);
        setShowFeedbackModal(false);
        setShowDisputeForm(false);
        setShowNoShowModal(false);
        setShowNoShowActionModal(false);
        fetchDetail();
        fetchDispute();
    };

    const handleScheduleChangeDecision = async (confirmed: boolean) => {
        if (!lessonId) return;
        setSubmittingScheduleDecision(true);
        try {
            const response = await respondStudentScheduleChange(parseInt(lessonId), confirmed);
            setScheduleChange(response.content);
            if (confirmed && response.content.scheduleConflict) {
                antMessage.warning(`Đã lưu xác nhận. ${response.content.scheduleConflict.message}`);
            } else {
                antMessage.success(confirmed ? 'Đã xác nhận đổi lịch học.' : 'Đã từ chối đổi lịch học.');
            }
        } catch (error: any) {
            antMessage.error(error.response?.data?.message || 'Không thể xử lý yêu cầu đổi lịch.');
            await fetchScheduleChange();
        } finally {
            setSubmittingScheduleDecision(false);
        }
    };

    // ── Loading ──
    if (loading) {
        return (
            <div className={s.page}>
                <div className={s.loadingCenter}>
                    <Spin size="large" />
                </div>
            </div>
        );
    }

    // ── Not found ──
    if (!lesson) {
        return (
            <div className={s.page}>
                <div className={s.topBar}>
                    <div className={s.topBarLeft}>
                        <h1 className={s.pageTitle}>Chi tiết buổi học</h1>
                    </div>
                </div>
                <div className={s.mainContent}>
                    <div style={notFoundBox}>
                        <div style={notFoundIcon}>
                            <FileText size={32} strokeWidth={1.5} />
                        </div>
                        <div style={notFoundTitle}>Không tìm thấy buổi học</div>
                        <div style={notFoundSub}>Buổi học này có thể đã bị xóa hoặc bạn không có quyền truy cập.</div>
                        <button style={notFoundBackBtn} onClick={() => navigate('/student-portal/calendar')}>
                            <ArrowLeft size={14} /> Quay lại thời khóa biểu
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const status = getStatus(lesson.status);
    const isInProgress = lesson.status === 'in_progress';
    // Phòng Agora mở từ 30ph trước giờ học — không cần đợi gia sư vào trước (khớp BE AgoraController)
    const canJoin = canJoinLiveSession(lesson);
    const tutorName = (lesson as any).tutorName ?? (lesson as any).tutor?.fullName ?? 'Gia sư';
    const subjectName = (lesson as any).subjectName ?? (lesson as any).subject?.subjectName ?? 'Buổi học';
    const report = (lesson as any).report;
    const canCreateDispute = !isParentManaged
        && !TERMINAL_BOOKING_STATUSES.includes(String(lesson.bookingStatus || '').toLowerCase());

    return (
        <div className={s.page}>
            {/* Top Bar */}
            <div className={s.topBar}>
                <div className={s.topBarLeft}>
                    <h1 className={s.pageTitle}>Chi tiết buổi học</h1>
                </div>
            </div>

            {/* Main Content */}
            <div className={s.mainContent} style={{ maxWidth: 860, margin: '0 auto', width: '100%' }}>
                {/* Breadcrumb-style back nav */}
                <div style={breadcrumbRow}>
                    <button style={backBtnStyle} onClick={() => navigate('/student-portal/calendar')}>
                        <ArrowLeft size={15} />
                        <span>Thời khóa biểu</span>
                    </button>
                </div>

                {/* Hero Join Banner — hiện khi phòng Agora đã mở (in_progress hoặc sắp tới giờ học) */}
                {canJoin && (
                    <div style={heroCard}>
                        {/* Animated background circles */}
                        <div style={heroBgCircle1} />
                        <div style={heroBgCircle2} />
                        <div style={heroInner}>
                            <div style={heroLeft}>
                                <div style={heroLiveDot}>
                                    <span style={heroPulseRing} />
                                    <span style={heroSolidDot} />
                                </div>
                                <div>
                                    <div style={heroBadgeText}>
                                        {isInProgress ? 'BUỔI HỌC ĐÃ BẮT ĐẦU' : 'PHÒNG HỌC ĐÃ MỞ'}
                                    </div>
                                    <div style={heroSubtext}>
                                        {isInProgress
                                            ? 'Gia sư đang chờ bạn trong lớp'
                                            : 'Phòng học đã sẵn sàng — bạn có thể vào lớp bất cứ lúc nào'}
                                    </div>
                                </div>
                            </div>
                            <Link to={`/session-lobby/${lesson.lessonId}`} style={heroJoinBtn}>
                                <Video size={16} /> Tham gia ngay
                            </Link>
                        </div>
                    </div>
                )}

                {/* Học sinh tự quản lý xác nhận yêu cầu đổi lịch tại đây — không cần đang ở trong
                    phòng chờ. requiredLearnerRole chỉ là 'Student' khi buổi không có phụ huynh quản lý. */}
                {scheduleChange?.requiresConfirmation && scheduleChange.requiredLearnerRole === 'Student' && (
                    <div style={sectionCard}>
                        <div style={sectionHeaderRow}>
                            <div style={{ ...sectionIconWrap, background: 'rgba(217,119,6,0.10)' }}>
                                <CalendarClock size={16} style={{ color: '#d97706' }} />
                            </div>
                            <div style={sectionTitleText}>Xác nhận thay đổi giờ học</div>
                        </div>
                        <div style={{ fontSize: 13, color: '#667085', marginBottom: 16, lineHeight: 1.55 }}>
                            Gia sư muốn học ngoài thời gian mặc định. Vui lòng xác nhận để buổi học được bắt đầu.
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                            <div style={reportRowBlock}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {scheduleChange.tutorConfirmedAt
                                        ? <CheckCircle2 size={18} color="#16a34a" />
                                        : <Clock3 size={18} color="#d97706" />}
                                    <div>
                                        <div style={reportLabelStyle}>Gia sư</div>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a2238' }}>
                                            {scheduleChange.tutorConfirmedAt ? 'Đã xác nhận' : 'Đang chờ xác nhận'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div style={reportRowBlock}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {scheduleChange.learnerConfirmedAt
                                        ? <CheckCircle2 size={18} color="#16a34a" />
                                        : <Clock3 size={18} color="#d97706" />}
                                    <div>
                                        <div style={reportLabelStyle}>Bạn</div>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a2238' }}>
                                            {scheduleChange.learnerConfirmedAt ? 'Đã xác nhận' : 'Đang chờ xác nhận'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style={reportValueStyle}>
                            Lịch ban đầu: {formatLongDate(scheduleChange.originalScheduledStart)}, {formatTime(scheduleChange.originalScheduledStart)}–{formatTime(scheduleChange.originalScheduledEnd)}
                        </div>

                        {scheduleChange.status === 'rejected' ? (
                            <div style={{ marginTop: 14, color: '#cf1322', background: '#fff2f0', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
                                Yêu cầu đổi lịch đã bị từ chối. Bạn và gia sư chưa thể vào buổi học ngoài lịch này.
                            </div>
                        ) : scheduleChange.status === 'approved' && scheduleChange.scheduleConflict ? (
                            <div style={{ marginTop: 14, color: '#b45309', background: '#fffbeb', borderRadius: 8, padding: '10px 12px', fontSize: 13, lineHeight: 1.55 }}>
                                <strong>Đã đủ xác nhận nhưng chưa thể bắt đầu:</strong> {scheduleChange.scheduleConflict.message}{' '}
                                Hệ thống sẽ tự kiểm tra lại, bạn không cần xác nhận lần nữa.
                            </div>
                        ) : scheduleChange.status === 'approved' ? (
                            <div style={{ marginTop: 14, color: '#15803d', background: '#f0fdf4', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
                                Đã đủ xác nhận. Bạn và gia sư có thể vào học; thời gian buổi học sẽ được cập nhật khi bắt đầu.
                            </div>
                        ) : scheduleChange.currentUserConfirmed ? (
                            <div style={{ marginTop: 14, color: '#0958d9', background: '#e6f4ff', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
                                Bạn đã xác nhận. Đang chờ gia sư xác nhận.
                            </div>
                        ) : scheduleChange.canCurrentUserConfirm ? (
                            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
                                <button
                                    style={{ ...actionBtnBase, background: '#fff', color: '#cf1322', border: '1px solid #ffccc7', boxShadow: 'none' }}
                                    disabled={submittingScheduleDecision}
                                    onClick={() => void handleScheduleChangeDecision(false)}
                                >
                                    <XCircle size={16} /> Từ chối
                                </button>
                                <button
                                    style={{ ...actionBtnBase, background: '#3e2f28' }}
                                    disabled={submittingScheduleDecision}
                                    onClick={() => void handleScheduleChangeDecision(true)}
                                >
                                    <CheckCircle2 size={16} /> Xác nhận đổi lịch
                                </button>
                            </div>
                        ) : null}
                    </div>
                )}

                {/* ─── Subject Header Card ─── */}
                <div style={subjectCard}>
                    <div style={subjectCardInner}>
                        <div style={subjectTopRow}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={subjectTitle}>{subjectName}</div>
                                <div style={subjectDateRow}>
                                    <CalendarIcon size={14} style={{ color: '#9ca3af' }} />
                                    <span>{formatLongDate(lesson.scheduledStart)}</span>
                                </div>
                            </div>
                            <div style={{ ...statusChip, color: status.color, background: status.bg }}>
                                <span style={{ fontSize: 12 }}>{status.icon}</span>
                                {status.label}
                            </div>
                        </div>

                        {/* Time blocks — horizontal timeline style */}
                        <div style={timelineRow}>
                            <div style={timeBlock}>
                                <div style={{ ...timeBlockIconWrap, background: 'rgba(16,185,129,0.10)' }}>
                                    <PlayCircle size={16} style={{ color: '#10b981' }} />
                                </div>
                                <div>
                                    <div style={timeBlockLabel}>BẮT ĐẦU</div>
                                    <div style={timeBlockValue}>{formatTime(lesson.scheduledStart)}</div>
                                </div>
                            </div>
                            <div style={timeConnector}>
                                <div style={timeConnectorLine} />
                                <div style={timeConnectorDot} />
                                <div style={timeConnectorLine} />
                            </div>
                            <div style={timeBlock}>
                                <div style={{ ...timeBlockIconWrap, background: 'rgba(244,63,94,0.10)' }}>
                                    <StopCircle size={16} style={{ color: '#f43f5e' }} />
                                </div>
                                <div>
                                    <div style={timeBlockLabel}>KẾT THÚC</div>
                                    <div style={timeBlockValue}>{formatTime(lesson.scheduledEnd)}</div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* ─── Tutor Card ─── */}
                <div style={tutorCard}>
                    <div style={tutorCardInner}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={tutorLabelRow}>
                                <User size={12} style={{ color: '#9ca3af' }} />
                                <span style={tutorLabel}>GIA SƯ</span>
                            </div>
                            <div style={tutorNameStyle}>{tutorName}</div>
                        </div>
                        <div style={tutorBadge}>
                            Người dạy của bạn
                        </div>
                    </div>
                </div>

                {/* ─── Action card — Confirm / Feedback ─── */}
                {lesson.status === 'pending_confirmation' && (
                    <div style={actionCardConfirm}>
                        <div style={actionCardIconWrap}>
                            <ClipboardCheck size={20} style={{ color: '#d97706' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={actionCardTitle}>Xác nhận buổi học</div>
                            <div style={actionCardDesc}>
                                Gia sư đã gửi báo cáo. Hãy xác nhận để hoàn tất thanh toán.
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <button
                                style={actionBtnConfirm}
                                onClick={() => setShowConfirmModal(true)}
                            >
                                <ClipboardCheck size={15} /> Xác nhận
                            </button>
                            {canCreateDispute && (
                                <button
                                    style={actionBtnDispute}
                                    onClick={() => setShowDisputeForm(true)}
                                >
                                    Khiếu nại
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {dispute && (
                    <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid rgba(26,34,56,0.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ fontSize: '15px', fontWeight: 700, color: '#1a2238' }}>Khiếu nại của bạn</span>
                            <span style={{
                                fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: 999,
                                color: dispute.status === 'resolved' || dispute.status === 'confirmed_no_show' ? '#166534' : dispute.status === 'investigating' ? '#1e40af' : '#92400e',
                                background: dispute.status === 'resolved' || dispute.status === 'confirmed_no_show' ? '#dcfce7' : dispute.status === 'investigating' ? '#dbeafe' : '#fef3c7',
                            }}>
                                {dispute.status === 'resolved'
                                    ? 'Đã giải quyết'
                                    : dispute.status === 'confirmed_no_show'
                                        ? 'Đã xác nhận vắng mặt'
                                        : dispute.status === 'investigating'
                                            ? 'Đang xem xét'
                                            : 'Chờ xử lý'}
                            </span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#666', marginBottom: dispute.evidence?.length ? '12px' : 0 }}>
                            {dispute.reason || 'Không có mô tả.'}
                        </div>
                        {Array.isArray(dispute.evidence) && dispute.evidence.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {dispute.evidence.map((url: string, index: number) => (
                                    <a
                                        key={`${url}-${index}`}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            padding: '10px 14px', background: '#fafaf8', borderRadius: 10,
                                            border: '1px solid rgba(26,34,56,0.06)', textDecoration: 'none',
                                        }}
                                    >
                                        <Paperclip size={14} style={{ flexShrink: 0, color: '#6366F1' }} />
                                        <span style={{ flex: 1, minWidth: 0, fontSize: '13px', color: '#1a2238', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {getFileNameFromUrl(url)}
                                        </span>
                                        <Download size={14} style={{ flexShrink: 0, color: '#9ca3af' }} />
                                    </a>
                                ))}
                            </div>
                        )}
                        {Array.isArray(dispute.additionalEvidence) && dispute.additionalEvidence.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: dispute.evidence?.length ? 8 : 0 }}>
                                {dispute.additionalEvidence.map((item) => (
                                    <a
                                        key={item.disputeEvidenceId}
                                        href={item.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            padding: '10px 14px', background: '#fafaf8', borderRadius: 10,
                                            border: '1px solid rgba(26,34,56,0.06)', textDecoration: 'none',
                                        }}
                                    >
                                        <Paperclip size={14} style={{ flexShrink: 0, color: '#6366F1' }} />
                                        <span style={{ flex: 1, minWidth: 0, fontSize: '13px', color: '#1a2238', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {item.fileUrl ? getFileNameFromUrl(item.fileUrl) : 'Bằng chứng'}
                                        </span>
                                        <Download size={14} style={{ flexShrink: 0, color: '#9ca3af' }} />
                                    </a>
                                ))}
                            </div>
                        )}
                        {dispute.status === 'resolved' && (
                            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(26,34,56,0.06)' }}>
                                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Kết quả xử lý</div>
                                <div style={{ fontSize: '14px', color: '#1a2238' }}>{dispute.resolutionNote || 'Không có ghi chú.'}</div>
                            </div>
                        )}
                        {dispute.status !== 'resolved' && (
                            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(26,34,56,0.06)' }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a2238', marginBottom: 8 }}>Chat riêng với admin</div>
                                {thread.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10, maxHeight: 220, overflowY: 'auto' }}>
                                        {thread.map((msg) => (
                                            <div
                                                key={msg.disputeMessageId}
                                                style={{
                                                    alignSelf: msg.senderRole === 'admin' ? 'flex-start' : 'flex-end',
                                                    maxWidth: '80%',
                                                    padding: '8px 12px',
                                                    borderRadius: 8,
                                                    background: msg.senderRole === 'admin' ? '#eef2ff' : '#f1f5f9',
                                                }}
                                            >
                                                <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 600, color: '#64748b' }}>
                                                    {msg.senderRole === 'admin' ? 'Admin' : 'Bạn'}
                                                </p>
                                                <p style={{ margin: 0, fontSize: 13, whiteSpace: 'pre-wrap' }}>{msg.message}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                        type="text"
                                        value={threadInput}
                                        onChange={(event) => setThreadInput(event.target.value)}
                                        placeholder="Nhắn cho admin..."
                                        style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #d9dde3', fontSize: 13 }}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') void handleSendThreadMessage();
                                        }}
                                    />
                                    <button
                                        type="button"
                                        style={actionBtnConfirm}
                                        disabled={sendingThreadMessage || threadInput.trim().length === 0}
                                        onClick={() => void handleSendThreadMessage()}
                                    >
                                        Gửi
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {lesson.status === 'scheduled' && !isParentManaged && (
                    <div style={actionCardConfirm}>
                        <div style={actionCardIconWrap}>
                            <AlertCircle size={20} style={{ color: '#d97706' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={actionCardTitle}>Gia sư chưa vào lớp</div>
                            <div style={actionCardDesc}>
                                Nếu gia sư không có mặt, bạn có thể báo cáo vắng mặt ngay.
                            </div>
                        </div>
                        <button style={actionBtnDispute} onClick={() => setShowNoShowModal(true)}>
                            Báo gia sư vắng mặt
                        </button>
                    </div>
                )}

                {lesson.status === 'no_show' && !isParentManaged && (
                    <div style={actionCardConfirm}>
                        <div style={actionCardIconWrap}>
                            <AlertCircle size={20} style={{ color: '#d97706' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={actionCardTitle}>
                                {dispute?.status === 'confirmed_no_show' ? 'Admin đã xác nhận gia sư vắng mặt' : 'Báo cáo đang chờ xác nhận'}
                            </div>
                            <div style={actionCardDesc}>
                                {dispute?.status === 'confirmed_no_show'
                                    ? 'Bạn có thể chọn hướng xử lý cho buổi học này.'
                                    : 'Chưa có hoàn tiền hoặc cảnh báo nào được áp dụng.'}
                            </div>
                        </div>
                        {dispute?.status === 'confirmed_no_show' && (
                            <button style={actionBtnDispute} onClick={() => setShowNoShowActionModal(true)}>
                                Chọn hành động xử lý
                            </button>
                        )}
                    </div>
                )}

                {lesson.status === 'completed' && (
                    <div style={actionCardFeedback}>
                        <div style={{ ...actionCardIconWrap, background: 'rgba(26,34,56,0.08)' }}>
                            <Star size={20} style={{ color: '#1a2238' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={actionCardTitle}>Đánh giá buổi học</div>
                            <div style={actionCardDesc}>
                                Chia sẻ trải nghiệm giúp gia sư cải thiện chất lượng dạy.
                            </div>
                        </div>
                        <button
                            style={actionBtnFeedback}
                            onClick={() => setShowFeedbackModal(true)}
                        >
                            <Star size={15} /> Đánh giá
                        </button>
                        {!dispute && canCreateDispute && (
                            <button
                                style={actionBtnDispute}
                                onClick={() => setShowDisputeForm(true)}
                            >
                                Báo cáo gia sư
                            </button>
                        )}
                    </div>
                )}

                {/* ─── Lịch sử dời lịch (nếu có) ─── */}
                {Array.isArray(lesson.scheduleChanges) && lesson.scheduleChanges.length > 0 && (
                    <div style={sectionCard}>
                        <div style={sectionHeaderRow}>
                            <div style={{ ...sectionIconWrap, background: 'rgba(217,119,6,0.10)' }}>
                                <CalendarClock size={16} style={{ color: '#d97706' }} />
                            </div>
                            <div style={sectionTitleText}>Lịch sử dời lịch</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {lesson.scheduleChanges.map((sc: any) => {
                                const statusLabel: Record<string, string> = {
                                    applied: 'Đã áp dụng',
                                    approved: 'Hai bên đã đồng ý',
                                    rejected: 'Đã từ chối',
                                    expired: 'Đã hết hạn',
                                    pending: 'Đang chờ xác nhận',
                                };
                                return (
                                    <div key={sc.scheduleChangeId} style={reportRowBlock}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                                            <span style={reportLabelStyle}>{statusLabel[sc.status] || sc.status}</span>
                                            {sc.appliedAt && (
                                                <span style={{ fontSize: 12, color: '#9ca3af' }}>
                                                    Áp dụng lúc {formatLongDate(sc.appliedAt)} {formatTime(sc.appliedAt)}
                                                </span>
                                            )}
                                        </div>
                                        <div style={reportValueStyle}>
                                            {formatLongDate(sc.originalScheduledStart)}, {formatTime(sc.originalScheduledStart)}–{formatTime(sc.originalScheduledEnd)}
                                            {sc.adjustedScheduledStart && (
                                                <> {'→'} {formatLongDate(sc.adjustedScheduledStart)}, {formatTime(sc.adjustedScheduledStart)}–{formatTime(sc.adjustedScheduledEnd)}</>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: 20, marginTop: 8, fontSize: 12, color: '#666', flexWrap: 'wrap' }}>
                                            <span>Gia sư: {sc.tutorConfirmedByName ? `${sc.tutorConfirmedByName} đã xác nhận` : 'Chưa xác nhận'}</span>
                                            <span>
                                                {sc.learnerApproverRole === 'Student' ? 'Học sinh' : 'Phụ huynh'}: {sc.learnerConfirmedByName ? `${sc.learnerConfirmedByName} đã xác nhận` : 'Chưa xác nhận'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ─── Content + Homework — cũng gồm tệp đính kèm của báo cáo (thường là bài tập) ─── */}
                {(lesson.lessonContent || lesson.homework || (report && Array.isArray(report.attachments) && report.attachments.length > 0)) && (
                    <div style={sectionCard}>
                        <div style={sectionHeaderRow}>
                            <div style={sectionIconWrap}>
                                <BookOpen size={16} style={{ color: '#6366F1' }} />
                            </div>
                            <div style={sectionTitleText}>Nội dung & bài tập</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {lesson.lessonContent && (
                                <ContentBlock
                                    icon={<BookOpen size={15} />}
                                    accent="#6366F1"
                                    label="Nội dung buổi học"
                                    value={lesson.lessonContent}
                                />
                            )}
                            {lesson.homework && (
                                <ContentBlock
                                    icon={<AlertCircle size={15} />}
                                    accent="#d97706"
                                    label="Bài tập về nhà"
                                    value={lesson.homework}
                                />
                            )}
                            {report && Array.isArray(report.attachments) && report.attachments.length > 0 && (
                                <div>
                                    <span style={reportLabelStyle}>Bài tập được giao</span>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                                        {report.attachments.map((url: string, index: number) => (
                                            <a
                                                key={`${url}-${index}`}
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={attachmentLinkStyle}
                                            >
                                                <Paperclip size={14} style={{ flexShrink: 0, color: '#6366F1' }} />
                                                <span style={attachmentNameStyle}>{getFileNameFromUrl(url)}</span>
                                                <Download size={14} style={{ flexShrink: 0, color: '#9ca3af' }} />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ─── Tutor Report — cũng gồm tài liệu lớp học (cùng chỗ gia sư chia sẻ cho học sinh) ─── */}
                {(report || materials.length > 0) && (
                    <div style={sectionCard}>
                        <div style={sectionHeaderRow}>
                            <div style={{ ...sectionIconWrap, background: 'rgba(5,150,105,0.10)' }}>
                                <ClipboardCheck size={16} style={{ color: '#059669' }} />
                            </div>
                            <div style={sectionTitleText}>Báo cáo gia sư</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {report?.contentCovered && (
                                <ReportRow label="Nội dung đã dạy" value={report.contentCovered} />
                            )}
                            {report?.homeworkAssigned && (
                                <ReportRow label="Bài tập giao" value={report.homeworkAssigned} />
                            )}
                            {report && (
                                <div style={ratingRow}>
                                    <span style={reportLabelStyle}>Đánh giá học sinh</span>
                                    {report.studentPerformanceRating > 0 ? (
                                        <div style={ratingStars}>
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <Star
                                                    key={i}
                                                    size={16}
                                                    fill={i <= report.studentPerformanceRating ? '#fbbf24' : '#e5e7eb'}
                                                    color={i <= report.studentPerformanceRating ? '#f59e0b' : '#d1d5db'}
                                                    strokeWidth={1.5}
                                                />
                                            ))}
                                            <span style={ratingNumber}>
                                                {report.studentPerformanceRating}/5
                                            </span>
                                        </div>
                                    ) : (
                                        <span style={{ fontSize: 13, color: '#999' }}>Chưa đánh giá</span>
                                    )}
                                </div>
                            )}
                            {materials.length > 0 && (
                                <div>
                                    <span style={reportLabelStyle}>Tài liệu lớp học</span>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                                        {materials.map((m) => (
                                            <a
                                                key={m.materialId}
                                                href={m.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={attachmentLinkStyle}
                                            >
                                                <Paperclip size={14} style={{ flexShrink: 0, color: '#6366F1' }} />
                                                <span style={attachmentNameStyle}>
                                                    {m.title}
                                                    {m.description ? ` · ${m.description}` : ''}
                                                </span>
                                                <Download size={14} style={{ flexShrink: 0, color: '#9ca3af' }} />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ─── Video buổi học ─── */}
                <div style={sectionCard}>
                    <div style={sectionHeaderRow}>
                        <div style={{ ...sectionIconWrap, background: 'rgba(26,34,56,0.08)' }}>
                            <Video size={16} style={{ color: '#1a2238' }} />
                        </div>
                        <div style={sectionTitleText}>Video buổi học</div>
                    </div>
                    <ClassSessionRecording classSessionId={lesson.lessonId} />
                </div>

                {/* Modals */}
                <Modal
                    title="Xác nhận buổi học"
                    open={showConfirmModal}
                    onOk={handleConfirm}
                    onCancel={() => setShowConfirmModal(false)}
                    okText="Xác nhận"
                    cancelText="Hủy"
                    confirmLoading={confirming}
                >
                    <p>Bạn có chắc chắn muốn xác nhận buổi học #{lesson.lessonId}?</p>
                    <p>Tiền sẽ được chuyển cho gia sư sau khi xác nhận.</p>
                </Modal>

                <CreateFeedbackModal
                    open={showFeedbackModal}
                    onClose={() => setShowFeedbackModal(false)}
                    onSuccess={handleActionSuccess}
                    lessonId={lesson.lessonId}
                    bookingId={lesson.bookingId || 0}
                    tutorId={(lesson as any).tutorId || (lesson as any).tutor?.tutorId}
                    tutorName={tutorName}
                    subjectName={subjectName}
                />

                <CreateDisputeForm
                    open={showDisputeForm}
                    lessonId={lesson.lessonId}
                    onSuccess={handleActionSuccess}
                    onCancel={() => setShowDisputeForm(false)}
                />

                <ReportNoShowModal
                    open={showNoShowModal}
                    lessonId={lesson.lessonId}
                    onSuccess={handleActionSuccess}
                    onCancel={() => setShowNoShowModal(false)}
                />

                <NoShowActionModal
                    open={showNoShowActionModal}
                    lessonId={lesson.lessonId}
                    onSuccess={handleActionSuccess}
                    onCancel={() => setShowNoShowActionModal(false)}
                />
            </div>
        </div>
    );
};

export default StudentLessonDetail;

// ─────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────

const ContentBlock = ({
    icon,
    accent,
    label,
    value,
}: {
    icon: React.ReactNode;
    accent: string;
    label: string;
    value: string;
}) => (
    <div style={contentBlock}>
        <div style={{ ...contentBlockIcon, background: `${accent}1A`, color: accent }}>{icon}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
            <div style={contentBlockLabel}>{label}</div>
            <div style={contentBlockValue}>{value}</div>
        </div>
    </div>
);

const ReportRow = ({ label, value }: { label: string; value: string }) => (
    <div style={reportRowBlock}>
        <div style={reportLabelStyle}>{label}</div>
        <div style={reportValueStyle}>{value}</div>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────
// Keyframes — injected via a tiny <style> tag
// ─────────────────────────────────────────────────────────────────────────
const styleTag = document.createElement('style');
styleTag.textContent = `
@keyframes sld-pulse {
    0% { transform: scale(1); opacity: 1; }
    100% { transform: scale(2.2); opacity: 0; }
}
@keyframes sld-float1 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(10px, -8px) scale(1.1); }
}
@keyframes sld-float2 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(-8px, 6px) scale(1.15); }
}
`;
if (!document.getElementById('sld-keyframes')) {
    styleTag.id = 'sld-keyframes';
    document.head.appendChild(styleTag);
}

// ─────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────

const FONT_DISPLAY = "'Bricolage Grotesque', 'IBM Plex Sans', sans-serif";
const FONT_BODY = "'IBM Plex Sans', sans-serif";

// ── Breadcrumb ──
const breadcrumbRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
};

const backBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#737373',
    fontFamily: FONT_BODY,
    fontSize: 13,
    fontWeight: 500,
    padding: 0,
    transition: 'color 0.2s',
};

// ── Hero ──
const heroCard: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #15803d 0%, #059669 50%, #0d9488 100%)',
    color: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    boxShadow: '0 8px 24px rgba(5,150,105,0.25), 0 2px 8px rgba(0,0,0,0.08)',
};

const heroBgCircle1: React.CSSProperties = {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.08)',
    animation: 'sld-float1 6s ease-in-out infinite',
};

const heroBgCircle2: React.CSSProperties = {
    position: 'absolute',
    bottom: -15,
    left: '30%',
    width: 70,
    height: 70,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)',
    animation: 'sld-float2 8s ease-in-out infinite',
};

const heroInner: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '18px 24px',
};

const heroLeft: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    minWidth: 0,
};

const heroLiveDot: React.CSSProperties = {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.18)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
};

const heroPulseRing: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.5)',
    animation: 'sld-pulse 2s ease-out infinite',
};

const heroSolidDot: React.CSSProperties = {
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: '#fff',
    boxShadow: '0 0 0 3px rgba(255,255,255,0.35)',
};

const heroBadgeText: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1.2,
    opacity: 0.95,
    fontFamily: FONT_BODY,
    marginBottom: 4,
    textTransform: 'uppercase',
};

const heroSubtext: React.CSSProperties = {
    fontSize: 14,
    opacity: 0.92,
    fontFamily: FONT_BODY,
    fontWeight: 500,
};

const heroJoinBtn: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 24px',
    background: '#fff',
    color: '#15803d',
    fontSize: 14,
    fontWeight: 700,
    borderRadius: 10,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    fontFamily: FONT_BODY,
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transition: 'transform 0.15s, box-shadow 0.15s',
};

// ── Subject card ──
const subjectCard: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #f0f0f0',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const subjectCardInner: React.CSSProperties = {
    padding: '24px 26px 22px',
};

const subjectTopRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 22,
};

const subjectTitle: React.CSSProperties = {
    fontSize: 24,
    fontWeight: 700,
    color: '#1a2238',
    fontFamily: FONT_DISPLAY,
    lineHeight: 1.2,
    marginBottom: 8,
    wordBreak: 'break-word',
};

const subjectDateRow: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: '#737373',
    fontFamily: FONT_BODY,
    fontWeight: 500,
};

const statusChip: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: FONT_BODY,
    whiteSpace: 'nowrap',
    flexShrink: 0,
};

// ── Timeline ──
const timelineRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    padding: '16px 0 4px',
};

const timeBlock: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 18px',
    background: '#fafaf8',
    borderRadius: 12,
    border: '1px solid #f5f5f5',
    flex: 1,
};

const timeBlockIconWrap: React.CSSProperties = {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: 'rgba(99,102,241,0.10)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
};

const timeBlockLabel: React.CSSProperties = {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
    fontFamily: FONT_BODY,
};

const timeBlockValue: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 700,
    color: '#1a2238',
    fontFamily: FONT_DISPLAY,
};

const timeConnector: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    width: 60,
    flexShrink: 0,
};

const timeConnectorLine: React.CSSProperties = {
    flex: 1,
    height: 2,
    background: '#e5e7eb',
};

const timeConnectorDot: React.CSSProperties = {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#d1d5db',
    flexShrink: 0,
};

// ── Tutor card ──
const tutorCard: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #f0f0f0',
    borderRadius: 14,
    padding: '18px 22px',
    marginBottom: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const tutorCardInner: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
};

const tutorLabelRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
};

const tutorLabel: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: FONT_BODY,
};

const tutorNameStyle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 700,
    color: '#1a2238',
    fontFamily: FONT_DISPLAY,
    lineHeight: 1.3,
};

const tutorBadge: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: '#6366F1',
    background: 'rgba(99,102,241,0.08)',
    padding: '5px 12px',
    borderRadius: 8,
    fontFamily: FONT_BODY,
    whiteSpace: 'nowrap',
    flexShrink: 0,
};

// ── Action cards ──
const actionCardBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '16px 22px',
    borderRadius: 14,
    marginBottom: 12,
};

const actionCardConfirm: React.CSSProperties = {
    ...actionCardBase,
    background: 'linear-gradient(135deg, rgba(217,119,6,0.06), rgba(245,158,11,0.04))',
    border: '1px solid rgba(217,119,6,0.15)',
};

const actionCardFeedback: React.CSSProperties = {
    ...actionCardBase,
    background: 'rgba(26,34,56,0.03)',
    border: '1px solid rgba(26,34,56,0.08)',
};

const actionCardIconWrap: React.CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: 'rgba(217,119,6,0.10)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
};

const actionCardTitle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 700,
    color: '#1a2238',
    fontFamily: FONT_DISPLAY,
    marginBottom: 2,
};

const actionCardDesc: React.CSSProperties = {
    fontSize: 12,
    color: '#737373',
    fontFamily: FONT_BODY,
    lineHeight: 1.5,
};

const actionBtnBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 20px',
    fontSize: 13,
    fontWeight: 700,
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    fontFamily: FONT_BODY,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    color: '#fff',
    transition: 'transform 0.15s, box-shadow 0.15s',
};

const actionBtnConfirm: React.CSSProperties = {
    ...actionBtnBase,
    background: 'linear-gradient(135deg, #d97706, #f59e0b)',
    boxShadow: '0 2px 8px rgba(217,119,6,0.25)',
};

const actionBtnDispute: React.CSSProperties = {
    ...actionBtnBase,
    background: 'linear-gradient(135deg, #dc2626, #ef4444)',
    boxShadow: '0 2px 8px rgba(220,38,38,0.25)',
};

const actionBtnFeedback: React.CSSProperties = {
    ...actionBtnBase,
    background: 'linear-gradient(135deg, #1a2238, #374151)',
    boxShadow: '0 2px 8px rgba(26,34,56,0.2)',
};

// ── Section card ──
const sectionCard: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #f0f0f0',
    borderRadius: 14,
    padding: '22px 24px',
    marginBottom: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const sectionHeaderRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
    paddingBottom: 14,
    borderBottom: '1px solid #f5f5f5',
};

const sectionIconWrap: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'rgba(99,102,241,0.10)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
};

const sectionTitleText: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 700,
    color: '#1a2238',
    fontFamily: FONT_DISPLAY,
};

// ── Content block ──
const contentBlock: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '14px 16px',
    background: '#fafaf8',
    borderRadius: 10,
    border: '1px solid #f5f5f5',
};

const contentBlockIcon: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
};

const contentBlockLabel: React.CSSProperties = {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
    fontFamily: FONT_BODY,
};

const contentBlockValue: React.CSSProperties = {
    fontSize: 14,
    color: '#1a2238',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    fontFamily: FONT_BODY,
};

// ── Report ──
const reportRowBlock: React.CSSProperties = {
    padding: '12px 14px',
    background: '#fafaf8',
    borderRadius: 10,
    border: '1px solid #f5f5f5',
};

const reportLabelStyle: React.CSSProperties = {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
    fontFamily: FONT_BODY,
};

const reportValueStyle: React.CSSProperties = {
    fontSize: 14,
    color: '#1a2238',
    lineHeight: 1.6,
    fontFamily: FONT_BODY,
    whiteSpace: 'pre-wrap',
};

const attachmentLinkStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    background: '#fafaf8',
    borderRadius: 10,
    border: '1px solid #f5f5f5',
    textDecoration: 'none',
    transition: 'background 0.15s',
};

const attachmentNameStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    color: '#1a2238',
    fontFamily: FONT_BODY,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
};

const ratingRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    background: 'rgba(251,191,36,0.06)',
    border: '1px solid rgba(251,191,36,0.15)',
    borderRadius: 10,
};

const ratingStars: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
};

const ratingNumber: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 700,
    color: '#92400e',
    fontFamily: FONT_DISPLAY,
    marginLeft: 8,
};

// ── Not found ──
const notFoundBox: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 24px',
    textAlign: 'center',
};

const notFoundIcon: React.CSSProperties = {
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: 'rgba(99,102,241,0.08)',
    color: '#6366F1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
};

const notFoundTitle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 700,
    color: '#1a2238',
    marginBottom: 8,
    fontFamily: FONT_DISPLAY,
};

const notFoundSub: React.CSSProperties = {
    fontSize: 13,
    color: '#737373',
    maxWidth: 360,
    lineHeight: 1.5,
    marginBottom: 24,
};

const notFoundBackBtn: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 20px',
    background: '#1a2238',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: FONT_BODY,
};
