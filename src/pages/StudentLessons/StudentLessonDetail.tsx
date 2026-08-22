/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft, BookOpen, AlertCircle, Video,
    FileText, ClipboardCheck, Star,
    User, PlayCircle, StopCircle, Paperclip, Download, CalendarClock,
    CheckCircle2, Clock3, XCircle, Sparkles, ChevronDown, Plus, ArrowUp, Link2,
} from 'lucide-react';
import dayjs from 'dayjs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getStudentLessonDetail, confirmStudentLesson, type StudentLessonDetailDto } from '../../services/student-lesson.service';
import { getMaterials, type LearningMaterialResponse } from '../../services/materials.service';
import {
    getClassSessionDispute,
    getClassSessionDisputeThread,
    sendClassSessionDisputeThreadMessage,
    getStudentScheduleChange,
    respondStudentScheduleChange,
    proposeStudentReschedule,
    respondStudentReschedule,
    getClassSessionRecordingChain,
    type DisputeDetailResponse,
    type DisputeMessage,
    type SessionScheduleChangeResponse,
} from '../../services/classSession.service';
import {
    triggerVideoSummary,
    getVideoSummaryStatus,
    sendVideoSummaryFollowUp,
    getVideoSummaryMessages,
    type ClassSessionAiJobResponse,
    type VideoSummaryChatMessage,
} from '../../services/videoSummary.service';
import { signalRService } from '../../services/signalr.service';
import { useLessonStartedListener } from '../../hooks/useLessonStartedListener';
import { message as antMessage, Spin, Modal } from 'antd';
import { ClassSessionRecording, RescheduleProposalModal, SkipContinuationCard } from '../../components/shared';
import CreateDisputeForm from '../ParentLessons/components/CreateDisputeForm';
import ReportNoShowModal from '../ParentLessons/components/ReportNoShowModal';
import NoShowActionModal from '../ParentLessons/components/NoShowActionModal';
import { useStudentProfile } from '../../contexts/StudentProfileContext';
import { getUserInfoFromToken } from '../../services/auth.service';
import s from '../StudentPages.module.css';
import { getClassSessionStatusMeta } from '../../utils/classSessionStatus';
import { canJoinLiveSession, isWithinJoinWindow } from '../../utils/liveSession';
import { isAwaitingReport } from './lesson-components';

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
    interrupted: '🔌',
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

/** Gợi ý hỏi AI — trước khi có tóm tắt thì bấm nút nào cũng chỉ kích hoạt tóm tắt (điều kiện bắt
 *  buộc để có transcript), sau khi có tóm tắt thì gửi thẳng câu hỏi tương ứng vào khung chat. */
const AI_SUGGESTIONS: { key: string; label: string; prompt: string }[] = [
    { key: 'summary', label: 'Tóm tắt buổi học', prompt: 'Tóm tắt lại nội dung buổi học này.' },
    { key: 'simple', label: 'Giải thích dễ hiểu hơn', prompt: 'Giải thích nội dung buổi học này bằng ngôn ngữ đơn giản, dễ hiểu hơn.' },
    { key: 'practice', label: 'Cho câu hỏi ôn tập', prompt: 'Cho tôi vài câu hỏi ôn tập dựa trên nội dung buổi học này.' },
    { key: 'examples', label: 'Cho ví dụ thực tế', prompt: 'Cho tôi vài ví dụ thực tế liên quan đến nội dung buổi học này.' },
];

/** Render markdown Gemini trả về (in đậm, gạch đầu dòng, tiêu đề phụ...) thay vì hiện nguyên ký tự ** / -. */
const AiMarkdown = ({ content }: { content: string }) => (
    <div className="sld-markdown">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────
const StudentLessonDetail = () => {
    const { lessonId } = useParams<{ lessonId: string }>();
    const navigate = useNavigate();
    const { isParentManaged } = useStudentProfile();
    const [lesson, setLesson] = useState<StudentLessonDetailDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [confirming, setConfirming] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
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
    const [showMaterialsModal, setShowMaterialsModal] = useState(false);
    const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
    const [respondingReschedule, setRespondingReschedule] = useState(false);
    const [recordingAvailable, setRecordingAvailable] = useState(false);
    const [summaryJob, setSummaryJob] = useState<ClassSessionAiJobResponse | null>(null);
    const [summaryStatusLoaded, setSummaryStatusLoaded] = useState(false);
    const [summaryViewTab, setSummaryViewTab] = useState<'summary' | 'transcript'>('summary');
    const [triggeringSummary, setTriggeringSummary] = useState(false);
    const [chatTurns, setChatTurns] = useState<VideoSummaryChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatSending, setChatSending] = useState(false);
    const [diveDeeperOpen, setDiveDeeperOpen] = useState(false);
    const [scheduleHistoryOpen, setScheduleHistoryOpen] = useState(true);
    const [rescheduleHistoryOpen, setRescheduleHistoryOpen] = useState(true);

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

    const fetchRecordingStatus = useCallback(async () => {
        if (!lessonId) return;
        try {
            // Tóm tắt AI hoạt động theo CẢ CHUỖI (backend chỉ cần 1 buổi trong chuỗi có video —
            // xem TriggerStudentSummaryAsync/chain.Any(leg => leg.Available)), không phải riêng
            // buổi đang xem. Buổi phụ/học lại còn chưa học thì tất nhiên chưa có video RIÊNG nó,
            // nhưng vẫn tóm tắt được dựa trên video buổi gốc đã có — nên phải check theo chuỗi,
            // không phải theo /recording của 1 buổi.
            const response = await getClassSessionRecordingChain(parseInt(lessonId));
            setRecordingAvailable(Boolean(response.content?.some((leg) => leg.available)));
        } catch {
            setRecordingAvailable(false);
        }
    }, [lessonId]);

    const fetchSummaryStatus = useCallback(async () => {
        if (!lessonId) return;
        try {
            const response = await getVideoSummaryStatus(parseInt(lessonId));
            setSummaryJob(response.content);
        } catch (requestError: unknown) {
            console.error('Failed to load video summary status', requestError);
        } finally {
            setSummaryStatusLoaded(true);
        }
    }, [lessonId]);

    const fetchChatMessages = useCallback(async () => {
        if (!lessonId) return;
        try {
            const response = await getVideoSummaryMessages(parseInt(lessonId));
            setChatTurns(response.content ?? []);
        } catch (requestError: unknown) {
            console.error('Failed to load video summary chat', requestError);
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
        if (!lessonId || threadInput.trim().length === 0 || sendingThreadMessage) return;
        setSendingThreadMessage(true);
        try {
            await sendClassSessionDisputeThreadMessage(parseInt(lessonId), threadInput.trim());
            setThreadInput('');
            await fetchThread();
        } catch (error: any) {
            antMessage.error({
                content: error.response?.data?.message || 'Không thể gửi tin nhắn',
                key: 'dispute-thread-send-error',
            });
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
        void fetchRecordingStatus();
        void fetchSummaryStatus();
    }, [fetchRecordingStatus, fetchSummaryStatus]);

    // Tóm tắt đã trả về rồi nhưng BE còn đang chép lời chạy nền (xem ClassSessionAiJobStage.Transcribing).
    const transcribing = summaryJob?.status === 'completed' && summaryJob?.stage === 'transcribing';

    // Poll trong lúc Gemini đang xử lý (video có thể vài tiếng, mất vài phút). Chép lời chạy nền sau khi
    // tóm tắt đã xong nên phải poll tiếp qua cả giai đoạn đó, nếu không tab "Hội thoại" sẽ kẹt ở trạng
    // thái đang tạo tới khi người dùng F5.
    useEffect(() => {
        const waiting = summaryJob?.status === 'pending' || summaryJob?.status === 'processing' || transcribing;
        if (!waiting) return;
        const timer = window.setInterval(() => void fetchSummaryStatus(), 8000);
        return () => window.clearInterval(timer);
    }, [summaryJob?.status, transcribing, fetchSummaryStatus]);

    useEffect(() => {
        if (summaryJob?.status === 'completed') void fetchChatMessages();
    }, [summaryJob?.status, fetchChatMessages]);

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
            // Khi cả hai bên đã chốt, BE dời luôn giờ của buổi học — phải nạp lại, không thì
            // trang vẫn hiển thị giờ cũ cho tới khi người dùng tự F5.
            if (response.content.status === 'approved') {
                await fetchDetail();
            }
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

    const handleProposeReschedule = async (proposedScheduledStart: string, reason?: string) => {
        if (!lessonId) return;
        await proposeStudentReschedule(parseInt(lessonId), proposedScheduledStart, reason);
        setRescheduleModalOpen(false);
        await fetchDetail();
    };

    const handleRespondReschedule = async (accepted: boolean) => {
        if (!lessonId) return;
        setRespondingReschedule(true);
        try {
            await respondStudentReschedule(parseInt(lessonId), accepted);
            await fetchDetail();
            antMessage.success(accepted ? 'Đã đồng ý đổi lịch học.' : 'Đã từ chối đề xuất đổi lịch.');
        } catch (error: any) {
            antMessage.error(error.response?.data?.message || 'Không thể xử lý yêu cầu đổi lịch.');
        } finally {
            setRespondingReschedule(false);
        }
    };

    const handleTriggerSummary = async () => {
        if (!lessonId || triggeringSummary) return;
        setTriggeringSummary(true);
        try {
            const response = await triggerVideoSummary(parseInt(lessonId));
            setSummaryJob(response.content);
        } catch (error: any) {
            antMessage.error(error.response?.data?.message || 'Không thể tóm tắt video lúc này.');
        } finally {
            setTriggeringSummary(false);
        }
    };

    const handleSendChatMessage = async (overrideText?: string) => {
        const question = (overrideText ?? chatInput).trim();
        if (!lessonId || chatSending || question.length === 0) return;
        setChatInput('');
        setChatTurns((prev) => [...prev, { role: 'user', content: question, createdAt: new Date().toISOString() }]);
        setChatSending(true);
        try {
            const response = await sendVideoSummaryFollowUp(parseInt(lessonId), question);
            setChatTurns((prev) => [...prev, { role: 'assistant', content: response.content, createdAt: new Date().toISOString() }]);
        } catch (error: any) {
            antMessage.error(error.response?.data?.message || 'Không thể gửi câu hỏi lúc này.');
        } finally {
            setChatSending(false);
        }
    };

    /** 4 gợi ý kiểu Coursera dùng ở cả thanh "Đào sâu nội dung này" (cột giữa) và khung chat AI
     *  (cột phải) — trước khi có tóm tắt thì AI chưa có transcript để trả lời, nên bấm nút nào
     *  cũng kích hoạt tóm tắt trước; sau khi có tóm tắt thì gửi thẳng câu hỏi tương ứng. */
    const handleAiSuggestionClick = (item: { key: string; prompt: string }) => {
        if (!recordingAvailable || triggeringSummary) return;
        if (!summaryJob || summaryJob.status === 'none' || summaryJob.status === 'failed') {
            void handleTriggerSummary();
            return;
        }
        if (summaryJob.status !== 'completed' || chatSending) return;
        if (item.key === 'summary') {
            setSummaryViewTab('summary');
            return;
        }
        void handleSendChatMessage(item.prompt);
    };

    /** Xoá hội thoại hỏi thêm đang hiển thị (tóm tắt vẫn giữ nguyên) để bắt đầu hỏi lại từ đầu. */
    const handleClearChatTurns = () => {
        setChatTurns([]);
        setChatInput('');
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

    const baseStatus = getStatus(lesson.status);
    const status = isAwaitingReport(lesson)
        ? { ...baseStatus, label: 'Chờ gửi báo cáo', color: '#A16207', bg: '#FFF6E5', icon: '⏳' }
        : baseStatus;
    const isInProgress = lesson.status === 'in_progress';
    // Phòng Agora mở từ 30ph trước giờ học — không cần đợi gia sư vào trước (khớp BE AgoraController)
    const canJoin = canJoinLiveSession(lesson);
    const nearJoinWindow = isWithinJoinWindow(lesson.scheduledStart);
    const tutorName = (lesson as any).tutorName ?? (lesson as any).tutor?.fullName ?? 'Gia sư';
    const subjectName = (lesson as any).subjectName ?? (lesson as any).subject?.subjectName ?? 'Buổi học';
    const report = (lesson as any).report;
    const canCreateDispute = !isParentManaged
        && !TERMINAL_BOOKING_STATUSES.includes(String(lesson.bookingStatus || '').toLowerCase());
    const pendingReschedule = lesson.pendingRescheduleProposal;
    const canProposeReschedule =
        lesson.status === 'scheduled' && !isParentManaged && !pendingReschedule && !lesson.skipConfirmedByBothSides;
    const isRescheduleCounterpart = pendingReschedule?.counterpartRole === 'Student';
    const isRescheduleProposer = pendingReschedule?.proposedByRole === 'Student';
    const currentUserInfo = getUserInfoFromToken();
    const greetingName = currentUserInfo?.firstName
        || currentUserInfo?.fullname?.trim().split(/\s+/).pop()
        || null;
    const renderLegacyTopSections = false;
    const renderLegacyTopActions = false;

    return (
        <div className={s.page}>
            {/* Top Bar */}
            <div className={s.topBar} style={{ display: 'none' }}>
                <div className={s.topBarLeft}>
                    <h1 className={s.pageTitle}>Chi tiết buổi học</h1>
                </div>
            </div>

            {/* Main Content — padding hẹp lại so với mặc định 40px của các trang khác trong app,
                giống Coursera. Tắt cuộn ở cấp trang: khối 3 cột co giãn lấp đúng phần còn lại
                sau breadcrumb/banner (flex:1), mỗi cột tự cuộn nội dung riêng bên trong. */}
            <div className={s.mainContent} style={{ padding: '0 20px 14px', overflow: 'hidden' }}>
                <div style={{ maxWidth: 860, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 24, flexShrink: 0 }}>
                {/* Breadcrumb-style back nav */}
                <div style={{ ...breadcrumbRow, display: 'none' }}>
                    <button style={backBtnStyle} onClick={() => navigate('/student-portal/calendar')}>
                        <ArrowLeft size={15} />
                        <span>Thời khóa biểu</span>
                    </button>
                </div>

                {/* Hero Join Banner — nút luôn hiện khi canJoin, badge "đã bắt đầu/đã mở" chỉ hiện
                    trong khung ±15 phút quanh giờ học (isWithinJoinWindow, khớp BE EarlyJoinToleranceMinutes).
                    Còn xa giờ học, nút vẫn bấm được — dẫn vào cổng xác nhận vào học ngoài giờ như cũ. */}
                {renderLegacyTopSections && canJoin && (
                    <div style={heroCard}>
                        {/* Animated background circles */}
                        <div style={heroBgCircle1} />
                        <div style={heroBgCircle2} />
                        <div style={heroInner}>
                            <div style={heroLeft}>
                                {nearJoinWindow ? (
                                    <>
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
                                    </>
                                ) : (
                                    <div style={heroSubtext}>
                                        Bạn có thể vào lớp sớm để kiểm tra thiết bị trước giờ học.
                                    </div>
                                )}
                            </div>
                            <Link to={`/session-lobby/${lesson.lessonId}`} style={heroJoinBtn}>
                                <Video size={16} /> {nearJoinWindow ? 'Vào học' : 'Vào học nhanh'}
                            </Link>
                        </div>
                    </div>
                )}

                {/* Học sinh tự quản lý xác nhận yêu cầu đổi lịch tại đây — không cần đang ở trong
                    phòng chờ. requiredLearnerRole chỉ là 'Student' khi buổi không có phụ huynh quản lý. */}
                {renderLegacyTopActions && scheduleChange?.requiresConfirmation && scheduleChange.requiredLearnerRole === 'Student' && (
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
                                        ? <CheckCircle2 size={18} color={TUTORA_MOSS} />
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
                                        ? <CheckCircle2 size={18} color={TUTORA_MOSS} />
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
                            <div style={{ marginTop: 14, color: TUTORA_BURGUNDY, background: '#f7e8e6', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
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
                                    style={{ ...actionBtnBase, background: '#fff', color: TUTORA_BURGUNDY, border: '1px solid #d9b9b4', boxShadow: 'none' }}
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

                {/* ─── Đề xuất đổi lịch học (khác với cổng xác nhận vào học ngoài giờ ở trên) ─── */}
                {renderLegacyTopActions && canProposeReschedule && (
                    <div style={sectionCard}>
                        <div style={sectionHeaderRow}>
                            <div style={{ ...sectionIconWrap, background: 'rgba(99,102,241,0.10)' }}>
                                <CalendarClock size={16} style={{ color: TUTORA_MIDNIGHT }} />
                            </div>
                            <div style={sectionTitleText}>Đổi lịch học</div>
                        </div>
                        <div style={{ fontSize: 13, color: '#667085', marginBottom: 16, lineHeight: 1.55 }}>
                            Muốn dời buổi học này sang giờ khác? Gửi đề xuất cho gia sư, buổi học chỉ đổi giờ khi gia sư đồng ý.
                        </div>
                        <button
                            style={{ ...actionBtnBase, background: TUTORA_MIDNIGHT, boxShadow: '0 2px 8px rgba(39,42,49,0.22)' }}
                            onClick={() => setRescheduleModalOpen(true)}
                        >
                            <CalendarClock size={16} /> Đề xuất đổi lịch
                        </button>
                    </div>
                )}

                {renderLegacyTopActions && pendingReschedule && (
                    <div style={sectionCard}>
                        <div style={sectionHeaderRow}>
                            <div style={{ ...sectionIconWrap, background: 'rgba(99,102,241,0.10)' }}>
                                <CalendarClock size={16} style={{ color: TUTORA_MIDNIGHT }} />
                            </div>
                            <div style={sectionTitleText}>Đề xuất đổi lịch học</div>
                        </div>
                        <div style={reportValueStyle}>
                            {pendingReschedule.proposedByName ?? 'Người đề xuất'} muốn dời sang{' '}
                            {formatLongDate(pendingReschedule.proposedScheduledStart)}, {formatTime(pendingReschedule.proposedScheduledStart)}
                            {pendingReschedule.reason ? ` — Lý do: ${pendingReschedule.reason}` : ''}
                        </div>
                        {isRescheduleCounterpart ? (
                            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
                                <button
                                    style={{ ...actionBtnBase, background: '#fff', color: TUTORA_BURGUNDY, border: '1px solid #d9b9b4', boxShadow: 'none' }}
                                    disabled={respondingReschedule}
                                    onClick={() => void handleRespondReschedule(false)}
                                >
                                    <XCircle size={16} /> Từ chối
                                </button>
                                <button
                                    style={{ ...actionBtnBase, background: '#3e2f28' }}
                                    disabled={respondingReschedule}
                                    onClick={() => void handleRespondReschedule(true)}
                                >
                                    <CheckCircle2 size={16} /> Đồng ý đổi lịch
                                </button>
                            </div>
                        ) : isRescheduleProposer ? (
                            <div style={{ marginTop: 14, color: '#0958d9', background: '#e6f4ff', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
                                Đang chờ {pendingReschedule.counterpartName ?? 'phía còn lại'} phản hồi (hạn {formatLongDate(pendingReschedule.expiresAt)} {formatTime(pendingReschedule.expiresAt)}).
                            </div>
                        ) : null}
                    </div>
                )}

                <RescheduleProposalModal
                    open={rescheduleModalOpen}
                    currentScheduledStart={lesson.scheduledStart}
                    onSubmit={handleProposeReschedule}
                    onCancel={() => setRescheduleModalOpen(false)}
                    accentColor={TUTORA_MIDNIGHT}
                />

                {/* ─── Action card — Confirm / Feedback ─── */}
                {renderLegacyTopActions && lesson.status === 'pending_confirmation' && (
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

                {renderLegacyTopActions && lesson.status === 'scheduled' && !isParentManaged && (
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

                {renderLegacyTopActions && lesson.status === 'no_show' && !isParentManaged && (
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

                {renderLegacyTopActions && lesson.status === 'completed' && !dispute && canCreateDispute && (
                    <div style={actionCardFeedback}>
                        <div style={{ ...actionCardIconWrap, background: 'rgba(26,34,56,0.08)' }}>
                            <Star size={20} style={{ color: '#1a2238' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={actionCardTitle}>Buổi học đã hoàn thành</div>
                            <div style={actionCardDesc}>
                                Nếu có vấn đề với buổi học này, bạn có thể báo cáo gia sư.
                            </div>
                        </div>
                        <button
                            style={actionBtnDispute}
                            onClick={() => setShowDisputeForm(true)}
                        >
                            Báo cáo gia sư
                        </button>
                    </div>
                )}

                {/* ─── Content + Homework — cũng gồm tệp đính kèm của báo cáo (thường là bài tập) ─── */}
                {renderLegacyTopSections && (lesson.lessonContent || lesson.homework || (report && Array.isArray(report.attachments) && report.attachments.length > 0)) && (
                    <div style={sectionCard}>
                        <div style={sectionHeaderRow}>
                            <div style={sectionIconWrap}>
                                <BookOpen size={16} style={{ color: LESSON_RAIL_ACCENT }} />
                            </div>
                            <div style={sectionTitleText}>Nội dung & bài tập</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {lesson.lessonContent && (
                                <ContentBlock
                                    icon={<BookOpen size={15} />}
                                    accent={LESSON_RAIL_ACCENT}
                                    label="Nội dung buổi học"
                                    value={lesson.lessonContent}
                                />
                            )}
                            {lesson.homework && (
                                <ContentBlock
                                    icon={<AlertCircle size={15} />}
                                    accent={LESSON_RAIL_ACCENT}
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
                                                <Paperclip size={14} style={{ flexShrink: 0, color: TUTORA_MIDNIGHT }} />
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
                {renderLegacyTopSections && (report || materials.length > 0) && (
                    <div style={sectionCard}>
                        <div style={sectionHeaderRow}>
                            <div style={sectionIconWrap}>
                                <ClipboardCheck size={16} style={{ color: LESSON_RAIL_ACCENT }} />
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
                                                <Paperclip size={14} style={{ flexShrink: 0, color: TUTORA_MIDNIGHT }} />
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
                </div>

                {/* ─── Bố cục 3 cột: gia sư & lịch sử · video · AI tóm tắt ─── */}
                <div className="sld-3col-grid" style={threeColGrid}>
                    {/* Cột trái — kiểu sidebar khoá học Coursera: một khối bo viền duy nhất,
                        chia mục bằng đường kẻ mảnh + accordion, thay vì nhiều thẻ nổi rời rạc */}
                    <div style={threeColLeft}>
                        <div style={sidebarCard}>
                            <div style={sidebarHeaderRow}>
                                <div style={sidebarHeaderActions}>
                                    <div style={sidebarHeaderTitle}>{subjectName}</div>
                                    <div style={sidebarHeaderButtons}>
                                        <button
                                            type="button"
                                            className="sld-next-btn"
                                            style={{ ...nextBtn, padding: '8px 12px', fontSize: 12, boxShadow: 'none' }}
                                            title="Về thời khóa biểu"
                                            onClick={() => navigate('/student-portal/calendar')}
                                        >
                                            <ArrowLeft size={14} />
                                            <span>Về thời khóa biểu</span>
                                        </button>
                                        {materials.length > 0 && (
                                            <button
                                                type="button"
                                                className="sld-next-btn"
                                                style={{ ...nextBtn, padding: '8px 12px', fontSize: 12, boxShadow: 'none' }}
                                                title="Xem tài liệu lớp học"
                                                onClick={() => setShowMaterialsModal(true)}
                                            >
                                                <BookOpen size={14} />
                                                <span>Xem tài liệu</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div style={sidebarScrollBody}>
                            {(canProposeReschedule || pendingReschedule || (scheduleChange?.requiresConfirmation && scheduleChange.requiredLearnerRole === 'Student')) && (
                                <SidebarSection label="Đổi lịch học">
                                    {canProposeReschedule && (
                                        <div style={sidebarActionBlock}>
                                            <div style={sidebarActionText}>Gửi đề xuất giờ học mới cho gia sư.</div>
                                            <button style={sidebarPrimaryAction} onClick={() => setRescheduleModalOpen(true)}>
                                                <CalendarClock size={15} /> Đề xuất đổi lịch
                                            </button>
                                        </div>
                                    )}
                                    {pendingReschedule && (
                                        <div style={sidebarActionBlock}>
                                            <div style={sidebarActionText}>
                                                {pendingReschedule.proposedByName ?? 'Người đề xuất'} muốn dời sang {formatLongDate(pendingReschedule.proposedScheduledStart)}, {formatTime(pendingReschedule.proposedScheduledStart)}.
                                            </div>
                                            {isRescheduleCounterpart ? (
                                                <div style={sidebarActionButtons}>
                                                    <button style={sidebarSecondaryAction} disabled={respondingReschedule} onClick={() => void handleRespondReschedule(false)}><XCircle size={14} /> Từ chối</button>
                                                    <button style={sidebarPrimaryAction} disabled={respondingReschedule} onClick={() => void handleRespondReschedule(true)}><CheckCircle2 size={14} /> Đồng ý</button>
                                                </div>
                                            ) : isRescheduleProposer ? <div style={sidebarActionNote}>Đang chờ phản hồi từ {pendingReschedule.counterpartName ?? 'phía còn lại'}.</div> : null}
                                        </div>
                                    )}
                                    {scheduleChange?.requiresConfirmation && scheduleChange.requiredLearnerRole === 'Student' && (
                                        <div style={sidebarActionBlock}>
                                            <div style={sidebarActionText}>Gia sư đề nghị học ngoài khung giờ mặc định.</div>
                                            {scheduleChange.canCurrentUserConfirm && !scheduleChange.currentUserConfirmed ? (
                                                <div style={sidebarActionButtons}>
                                                    <button style={sidebarSecondaryAction} disabled={submittingScheduleDecision} onClick={() => void handleScheduleChangeDecision(false)}><XCircle size={14} /> Từ chối</button>
                                                    <button style={sidebarPrimaryAction} disabled={submittingScheduleDecision} onClick={() => void handleScheduleChangeDecision(true)}><CheckCircle2 size={14} /> Xác nhận</button>
                                                </div>
                                            ) : <div style={sidebarActionNote}>{scheduleChange.currentUserConfirmed ? 'Bạn đã xác nhận, đang chờ gia sư.' : 'Yêu cầu đang được xử lý.'}</div>}
                                        </div>
                                    )}
                                </SidebarSection>
                            )}

                            {lesson.status === 'scheduled' && !isParentManaged && (
                                <SidebarSection label="Gia sư chưa vào lớp">
                                    <div style={sidebarActionBlock}>
                                        <div style={sidebarActionText}>Nếu gia sư vắng mặt, bạn có thể báo cáo ngay.</div>
                                        <button style={sidebarDangerAction} onClick={() => setShowNoShowModal(true)}><AlertCircle size={15} /> Báo gia sư vắng mặt</button>
                                    </div>
                                </SidebarSection>
                            )}

                            {lesson.status === 'pending_confirmation' && (
                                <SidebarSection label="Xác nhận buổi học">
                                    <div style={sidebarActionBlock}>
                                        <div style={sidebarActionText}>Gia sư đã gửi báo cáo. Xác nhận để hoàn tất thanh toán.</div>
                                        <div style={sidebarActionButtons}>
                                            <button style={sidebarPrimaryAction} onClick={() => setShowConfirmModal(true)}><ClipboardCheck size={15} /> Xác nhận</button>
                                            {canCreateDispute && <button style={sidebarSecondaryAction} onClick={() => setShowDisputeForm(true)}>Khiếu nại</button>}
                                        </div>
                                    </div>
                                </SidebarSection>
                            )}

                            {lesson.status === 'completed' && !dispute && canCreateDispute && (
                                <SidebarSection label="Hỗ trợ buổi học">
                                    <div style={sidebarActionBlock}>
                                        <div style={sidebarActionText}>Báo cáo nếu có vấn đề với buổi học đã hoàn thành.</div>
                                        <button style={sidebarSecondaryAction} onClick={() => setShowDisputeForm(true)}>Báo cáo gia sư</button>
                                    </div>
                                </SidebarSection>
                            )}

                            {dispute && (
                                <SidebarSection label="Khiếu nại của bạn">
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                            <span style={{ fontSize: 12, color: '#667085' }}>Trạng thái xử lý</span>
                                            <span style={{
                                                flexShrink: 0,
                                                fontSize: 11,
                                                fontWeight: 700,
                                                padding: '4px 8px',
                                                borderRadius: 999,
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

                                        <div style={{ ...sidebarActionText, color: '#475467' }}>
                                            {dispute.reason || 'Không có mô tả.'}
                                        </div>

                                        {Array.isArray(dispute.evidence) && dispute.evidence.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                <span style={reportLabelStyle}>Bằng chứng đã gửi</span>
                                                {dispute.evidence.map((url: string, index: number) => (
                                                    <a key={`${url}-${index}`} href={url} target="_blank" rel="noopener noreferrer" style={attachmentLinkStyle}>
                                                        <Paperclip size={14} style={{ flexShrink: 0, color: TUTORA_MIDNIGHT }} />
                                                        <span style={attachmentNameStyle}>{getFileNameFromUrl(url)}</span>
                                                        <Download size={14} style={{ flexShrink: 0, color: '#9ca3af' }} />
                                                    </a>
                                                ))}
                                            </div>
                                        )}

                                        {Array.isArray(dispute.additionalEvidence) && dispute.additionalEvidence.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                <span style={reportLabelStyle}>Bằng chứng bổ sung</span>
                                                {dispute.additionalEvidence.map((item) => (
                                                    <a key={item.disputeEvidenceId} href={item.fileUrl} target="_blank" rel="noopener noreferrer" style={attachmentLinkStyle}>
                                                        <Paperclip size={14} style={{ flexShrink: 0, color: TUTORA_MIDNIGHT }} />
                                                        <span style={attachmentNameStyle}>{item.fileUrl ? getFileNameFromUrl(item.fileUrl) : 'Bằng chứng'}</span>
                                                        <Download size={14} style={{ flexShrink: 0, color: '#9ca3af' }} />
                                                    </a>
                                                ))}
                                            </div>
                                        )}

                                        {dispute.status === 'resolved' && (
                                            <div style={{ padding: '10px 12px', background: '#f7f4ed', borderRadius: 10 }}>
                                                <div style={reportLabelStyle}>Kết quả xử lý</div>
                                                <div style={{ marginTop: 4, fontSize: 13, color: TUTORA_MIDNIGHT }}>{dispute.resolutionNote || 'Không có ghi chú.'}</div>
                                                {typeof dispute.refundPercentage === 'number' && (
                                                    <div style={{ marginTop: 4, fontSize: 13, color: TUTORA_MIDNIGHT }}>Tỷ lệ hoàn tiền: {dispute.refundPercentage}%</div>
                                                )}
                                            </div>
                                        )}

                                        {dispute.status !== 'resolved' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                <span style={reportLabelStyle}>Trao đổi với admin</span>
                                                {thread.length > 0 && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto', paddingRight: 2 }}>
                                                        {thread.map((msg) => (
                                                            <div key={msg.disputeMessageId} style={{
                                                                alignSelf: msg.senderRole === 'admin' ? 'flex-start' : 'flex-end',
                                                                maxWidth: '92%',
                                                                padding: '7px 9px',
                                                                borderRadius: 8,
                                                                background: msg.senderRole === 'admin' ? '#eef2ff' : '#f7f4ed',
                                                            }}>
                                                                <div style={{ marginBottom: 2, fontSize: 10, fontWeight: 700, color: '#667085' }}>{msg.senderRole === 'admin' ? 'Admin' : 'Bạn'}</div>
                                                                <div style={{ fontSize: 12, lineHeight: 1.45, whiteSpace: 'pre-wrap', color: TUTORA_MIDNIGHT }}>{msg.message}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <input
                                                        type="text"
                                                        value={threadInput}
                                                        onChange={(event) => setThreadInput(event.target.value)}
                                                        placeholder="Nhắn cho admin..."
                                                        style={{ flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 8, border: '1px solid #d9dde3', fontSize: 12 }}
                                                        onKeyDown={(event) => {
                                                            if (event.key === 'Enter') void handleSendThreadMessage();
                                                        }}
                                                    />
                                                    <button type="button" style={{ ...sidebarPrimaryAction, padding: '8px 10px' }} disabled={sendingThreadMessage || threadInput.trim().length === 0} onClick={() => void handleSendThreadMessage()}>
                                                        Gửi
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </SidebarSection>
                            )}

                            {/* Tương đương "Today's goals" của Coursera — nhưng gắn dữ liệu buổi học thật */}
                            <div className="sld-hover-card" style={sidebarGoalCard}>
                                <div style={sidebarGoalHeader}>
                                    <span style={sidebarGoalTitle}>Trạng thái buổi học</span>
                                    <span style={{ ...statusChip, color: status.color, background: status.bg }}>
                                        <span style={{ ...statusDot, background: status.color }} />
                                        {status.label}
                                    </span>
                                    {(lesson.isContinuation || lesson.isDisputeRelearn) && (
                                        <span
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                padding: '3px 10px',
                                                borderRadius: 8,
                                                border: '1px dashed #b9d6ea',
                                                background: '#EAF3FA',
                                                color: '#2F6F9F',
                                                fontSize: 11,
                                                fontWeight: 600,
                                            }}
                                        >
                                            <Link2 size={12} />
                                            {lesson.isContinuation ? 'Buổi phụ' : 'Buổi học lại'}
                                            {lesson.originalClassSessionId ? ` của buổi #${lesson.originalClassSessionId}` : ''}
                                        </span>
                                    )}
                                </div>
                                <div style={sidebarGoalTimeline}>
                                    <div style={sidebarGoalRow}>
                                        <span style={{ ...sidebarGoalIcon, color: TUTORA_MOSS }}><PlayCircle size={14} /></span>
                                        <div style={sidebarGoalTimeContent}>
                                            <span style={sidebarGoalTimeLabel}>Bắt đầu</span>
                                            <span style={sidebarGoalTimeValue}>{formatLongDate(lesson.scheduledStart)}, {formatTime(lesson.scheduledStart)}</span>
                                        </div>
                                    </div>
                                    <div style={sidebarGoalRow}>
                                        <span style={{ ...sidebarGoalIcon, color: TUTORA_BURGUNDY }}><StopCircle size={14} /></span>
                                        <div style={sidebarGoalTimeContent}>
                                            <span style={sidebarGoalTimeLabel}>Kết thúc</span>
                                            <span style={sidebarGoalTimeValue}>{formatTime(lesson.scheduledEnd)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {lesson.isContinuation && (lesson.status ?? '').toLowerCase() === 'scheduled' && (
                                <SkipContinuationCard
                                    continuationSessionId={lesson.lessonId}
                                    isTutor={false}
                                    accentColor="#6366F1"
                                    onBothConfirmed={() => void fetchDetail()}
                                />
                            )}

                            <SidebarSection label="Gia sư">
                                <SidebarItemRow
                                    active
                                    icon={<User size={14} />}
                                    title={tutorName}
                                    meta="Người dạy của bạn"
                                />
                            </SidebarSection>

                            {Array.isArray(lesson.scheduleChanges) && lesson.scheduleChanges.length > 0 && (
                                <SidebarSection
                                    label="Lịch sử vào học ngoài giờ"
                                    collapsible
                                    open={scheduleHistoryOpen}
                                    onToggle={() => setScheduleHistoryOpen((open) => !open)}
                                >
                                    {lesson.scheduleChanges.map((sc: any) => {
                                        const statusLabel: Record<string, string> = {
                                            applied: 'Đã áp dụng',
                                            approved: 'Hai bên đã đồng ý',
                                            rejected: 'Đã từ chối',
                                            expired: 'Đã hết hạn',
                                            pending: 'Đang chờ xác nhận',
                                        };
                                        const isPositive = sc.status === 'applied' || sc.status === 'approved';
                                        const isNegative = sc.status === 'rejected';
                                        const icon = isPositive
                                            ? <CheckCircle2 size={14} style={{ color: TUTORA_MOSS }} />
                                            : isNegative
                                                ? <XCircle size={14} style={{ color: TUTORA_BURGUNDY }} />
                                                : <Clock3 size={14} style={{ color: TUTORA_UMBER }} />;
                                        return (
                                            <SidebarItemRow
                                                key={sc.scheduleChangeId}
                                                icon={icon}
                                                title={statusLabel[sc.status] || sc.status}
                                                meta={
                                                    <>
                                                        <div>
                                                            {formatLongDate(sc.originalScheduledStart)}, {formatTime(sc.originalScheduledStart)}–{formatTime(sc.originalScheduledEnd)}
                                                            {sc.adjustedScheduledStart && (
                                                                <> {'→'} {formatLongDate(sc.adjustedScheduledStart)}, {formatTime(sc.adjustedScheduledStart)}–{formatTime(sc.adjustedScheduledEnd)}</>
                                                            )}
                                                        </div>
                                                        <div style={{ marginTop: 2 }}>
                                                            Gia sư: {sc.tutorConfirmedByName ? 'đã xác nhận' : 'chưa xác nhận'} ·{' '}
                                                            {sc.learnerApproverRole === 'Student' ? 'Học sinh' : 'Phụ huynh'}: {sc.learnerConfirmedByName ? 'đã xác nhận' : 'chưa xác nhận'}
                                                        </div>
                                                    </>
                                                }
                                            />
                                        );
                                    })}
                                </SidebarSection>
                            )}

                            {Array.isArray(lesson.rescheduleProposals) && lesson.rescheduleProposals.length > 0 && (
                                <SidebarSection
                                    label="Lịch sử đổi lịch học"
                                    collapsible
                                    open={rescheduleHistoryOpen}
                                    onToggle={() => setRescheduleHistoryOpen((open) => !open)}
                                >
                                    {lesson.rescheduleProposals.map((proposal) => {
                                        const statusLabel: Record<string, string> = {
                                            pending: 'Đang chờ phản hồi',
                                            accepted: 'Đã đồng ý',
                                            rejected: 'Đã từ chối',
                                            expired: 'Đã hết hạn',
                                        };
                                        const icon = proposal.status === 'accepted'
                                            ? <CheckCircle2 size={14} style={{ color: TUTORA_MOSS }} />
                                            : proposal.status === 'rejected'
                                                ? <XCircle size={14} style={{ color: TUTORA_BURGUNDY }} />
                                                : <Clock3 size={14} style={{ color: TUTORA_UMBER }} />;
                                        return (
                                            <SidebarItemRow
                                                key={proposal.rescheduleProposalId}
                                                icon={icon}
                                                title={statusLabel[proposal.status] || proposal.status}
                                                meta={
                                                    <>
                                                        {proposal.proposedByName ?? 'Người đề xuất'} đề xuất dời sang{' '}
                                                        {formatLongDate(proposal.proposedScheduledStart)}, {formatTime(proposal.proposedScheduledStart)}
                                                        {proposal.reason ? ` — Lý do: ${proposal.reason}` : ''}
                                                    </>
                                                }
                                            />
                                        );
                                    })}
                                </SidebarSection>
                            )}
                            </div>
                        </div>
                    </div>

                    {/* Cột giữa — thẻ trắng bo góc chứa video + thanh "đào sâu" gợi ý AI + footer điều hướng */}
                    <div style={threeColMiddle}>
                    <div style={middleCard}>
                    <div style={middleScrollBody}>
                    <div style={middleVideoSection}>
                        {canJoin && <JoinSessionBanner lessonId={lesson.lessonId} nearJoinWindow={nearJoinWindow} isInProgress={isInProgress} />}
                        <div style={videoCard}>
                            <ClassSessionRecording classSessionId={lesson.lessonId} />
                        </div>
                        <div style={videoInfoRow}>
                            <Video size={16} style={{ color: TUTORA_BURGUNDY }} />
                            <span style={videoInfoTitle}>Video buổi học</span>
                        </div>

                        {recordingAvailable && (
                            <div style={diveDeeperCard}>
                                <button
                                    type="button"
                                    className="sld-dive-btn"
                                    style={diveDeeperHeaderBtn}
                                    onClick={() => setDiveDeeperOpen((open) => !open)}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Sparkles size={15} style={{ color: TUTORA_BURGUNDY }} />
                                        Đào sâu nội dung này
                                    </span>
                                    <ChevronDown
                                        size={16}
                                        style={{ color: '#667085', transform: diveDeeperOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
                                    />
                                </button>
                                {diveDeeperOpen && (
                                    <div style={pillsGrid}>
                                        {AI_SUGGESTIONS.map((item) => (
                                            <button
                                                key={item.key}
                                                type="button"
                                                className="sld-pill"
                                                style={pillBtn}
                                                disabled={triggeringSummary || summaryJob?.status === 'pending' || summaryJob?.status === 'processing'}
                                                onClick={() => handleAiSuggestionClick(item)}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <LessonContentCard lessonContent={lesson.lessonContent} homework={lesson.homework} attachments={report?.attachments} />
                    <TutorReportCard report={report} materials={materials} />
                    </div>
                    </div>
                    </div>

                    {/* Cột phải — trợ lý AI kiểu chat: tóm tắt hiện như tin nhắn đầu tiên, hỏi thêm nối tiếp bên dưới */}
                    <div style={threeColRight}>
                        <div style={aiPanelCard}>
                            <div style={aiPanelHeader}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Sparkles size={18} style={{ color: TUTORA_BURGUNDY }} />
                                    {summaryJob && summaryJob.status !== 'none' && (
                                        <div style={aiCompactTitle}>Tóm tắt buổi học bằng AI</div>
                                    )}
                                </div>
                                {chatTurns.length > 0 && (
                                    <div style={aiPanelHeaderIcons}>
                                        <button
                                            type="button"
                                            className="sld-ai-header-icon"
                                            style={aiHeaderIconBtn}
                                            title="Xoá hội thoại hỏi thêm, giữ nguyên tóm tắt"
                                            onClick={handleClearChatTurns}
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div style={aiPanelBody}>
                                {!summaryStatusLoaded && (
                                    <div style={{ ...aiBubbleAssistant, flexDirection: 'row', alignItems: 'center' }}>
                                        <Spin size="small" />
                                        <span>Đang tải…</span>
                                    </div>
                                )}

                                {summaryStatusLoaded && (!summaryJob || summaryJob.status === 'none') && (
                                    <>
                                        <div style={aiHeroGreeting}>
                                            {greetingName && <div style={aiGreetingHi}>Xin chào, {greetingName}.</div>}
                                            <div style={aiGreetingTitle}>Trợ lý AI có thể giúp gì?</div>
                                        </div>
                                        <div style={aiEmptyDesc}>
                                            Dùng AI đọc video buổi học và tóm tắt lại nội dung đã học — có thể mất vài phút.
                                        </div>
                                        <div style={pillsGridVertical}>
                                            {AI_SUGGESTIONS.map((item) => (
                                                <button
                                                    key={item.key}
                                                    type="button"
                                                    className="sld-pill-ghost"
                                                    style={pillBtnGhost}
                                                    disabled={!recordingAvailable || triggeringSummary}
                                                    onClick={() => handleAiSuggestionClick(item)}
                                                >
                                                    <Sparkles size={15} style={{ color: TUTORA_BURGUNDY, flexShrink: 0 }} />
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                        {!recordingAvailable && (
                                            <div style={{ fontSize: 12, color: '#9ca3af' }}>
                                                Chỉ tóm tắt được khi video buổi học đã sẵn sàng.
                                            </div>
                                        )}
                                        {triggeringSummary && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: TUTORA_BURGUNDY }}>
                                                <Spin size="small" /> Đang gửi yêu cầu…
                                            </div>
                                        )}
                                    </>
                                )}

                                {(summaryJob?.status === 'pending' || summaryJob?.status === 'processing') && (
                                    <div style={{ ...aiBubbleAssistant, flexDirection: 'row', alignItems: 'center' }}>
                                        <Spin size="small" />
                                        <span>AI đang xem và tóm tắt video…</span>
                                    </div>
                                )}

                                {summaryJob?.status === 'failed' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <div style={{ color: TUTORA_BURGUNDY, background: '#f7e8e6', borderRadius: 10, padding: '10px 12px', fontSize: 13 }}>
                                            {summaryJob.errorMessage || 'Không thể tóm tắt video. Vui lòng thử lại.'}
                                        </div>
                                        <button
                                            type="button"
                                            style={{ ...actionBtnBase, background: TUTORA_MIDNIGHT, alignSelf: 'flex-start' }}
                                            disabled={!recordingAvailable || triggeringSummary}
                                            onClick={() => void handleTriggerSummary()}
                                        >
                                            <Sparkles size={16} /> Thử lại
                                        </button>
                                    </div>
                                )}

                                {summaryJob?.status === 'completed' && (
                                    <>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button
                                                type="button"
                                                onClick={() => setSummaryViewTab('summary')}
                                                style={{
                                                    ...summaryTabBtnBase,
                                                    ...(summaryViewTab === 'summary' ? summaryTabBtnActive : {}),
                                                }}
                                            >
                                                Tóm tắt
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSummaryViewTab('transcript')}
                                                disabled={!summaryJob.transcriptText}
                                                title={
                                                    summaryJob.transcriptText
                                                        ? undefined
                                                        : transcribing
                                                            ? 'AI đang chép lời buổi học, sẽ hiện ngay khi xong'
                                                            : 'Buổi học này chưa có hội thoại (tóm tắt trước khi có tính năng này)'
                                                }
                                                style={{
                                                    ...summaryTabBtnBase,
                                                    ...(summaryViewTab === 'transcript' ? summaryTabBtnActive : {}),
                                                    ...(!summaryJob.transcriptText ? { opacity: 0.45, cursor: 'not-allowed' } : {}),
                                                }}
                                            >
                                                {transcribing && !summaryJob.transcriptText
                                                    ? <><Spin size="small" /> Hội thoại</>
                                                    : 'Hội thoại'}
                                            </button>
                                        </div>

                                        {/* Tóm tắt hiện như tin nhắn đầu tiên của AI trong khung chat */}
                                        <div style={aiBubbleAssistant}>
                                            <AiMarkdown
                                                content={
                                                    summaryViewTab === 'summary'
                                                        ? (summaryJob.resultText || '')
                                                        : (summaryJob.transcriptText || 'Buổi học này chưa có hội thoại.')
                                                }
                                            />
                                        </div>

                                        {chatTurns.map((msg, idx) => (
                                            <div key={idx} style={msg.role === 'assistant' ? aiBubbleAssistant : aiBubbleUser}>
                                                {msg.role === 'assistant' ? <AiMarkdown content={msg.content} /> : msg.content}
                                            </div>
                                        ))}
                                        {chatSending && (
                                            <div style={{ ...aiBubbleAssistant, flexDirection: 'row', alignItems: 'center', color: '#667085' }}>
                                                <Spin size="small" /> AI đang suy nghĩ…
                                            </div>
                                        )}

                                        {chatTurns.length === 0 && !chatSending && (
                                            <div style={pillsGridVertical}>
                                                {AI_SUGGESTIONS.filter((item) => item.key !== 'summary').map((item) => (
                                                    <button
                                                        key={item.key}
                                                        type="button"
                                                        className="sld-pill-ghost"
                                                        style={pillBtnGhost}
                                                        onClick={() => handleAiSuggestionClick(item)}
                                                    >
                                                        <Sparkles size={15} style={{ color: TUTORA_BURGUNDY, flexShrink: 0 }} />
                                                        {item.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {(() => {
                                const chatReady = summaryJob?.status === 'completed';
                                const inputPlaceholder = !recordingAvailable
                                    ? 'Chưa có video buổi học để hỏi...'
                                    : chatReady
                                        ? 'Hỏi AI về buổi học...'
                                        : summaryJob?.status === 'pending' || summaryJob?.status === 'processing'
                                            ? 'AI đang xử lý video...'
                                            : 'Bấm tóm tắt video ở trên để bắt đầu hỏi AI...';
                                return (
                                    <div style={aiPanelInputRow}>
                                        <div className="sld-ai-input-pill" style={aiInputPill}>
                                            <input
                                                type="text"
                                                value={chatInput}
                                                onChange={(event) => setChatInput(event.target.value)}
                                                placeholder={inputPlaceholder}
                                                disabled={!chatReady}
                                                style={{ ...aiInputField, ...(!chatReady ? { cursor: 'not-allowed' } : {}) }}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter') void handleSendChatMessage();
                                                }}
                                            />
                                            <button
                                                type="button"
                                                className="sld-ai-send-btn"
                                                style={{ ...aiSendBtn, opacity: (!chatReady || chatSending || chatInput.trim().length === 0) ? 0.5 : 1 }}
                                                disabled={!chatReady || chatSending || chatInput.trim().length === 0}
                                                onClick={() => void handleSendChatMessage()}
                                            >
                                                <ArrowUp size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div style={aiDisclaimer}>
                                Công cụ này dùng AI nên có thể mắc lỗi — hãy kiểm tra lại thông tin quan trọng và không chia sẻ dữ liệu nhạy cảm.
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modals */}
                <Modal
                    title="Tài liệu lớp học"
                    open={showMaterialsModal}
                    onCancel={() => setShowMaterialsModal(false)}
                    footer={null}
                    width={680}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0 8px' }}>
                        <div style={{ color: '#667085', fontSize: 13, lineHeight: 1.5 }}>
                            Tài liệu do gia sư chia sẻ cho lớp học này.
                        </div>
                        {materials.map((material) => (
                            <a
                                key={material.materialId}
                                href={material.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '13px 14px',
                                    border: '1px solid #e7e1d8',
                                    borderRadius: 12,
                                    background: '#faf9f6',
                                    color: TUTORA_MIDNIGHT,
                                    textDecoration: 'none',
                                }}
                            >
                                <span style={{ ...sectionIconWrap, width: 34, height: 34, flexShrink: 0 }}><BookOpen size={16} style={{ color: TUTORA_BURGUNDY }} /></span>
                                <span style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, fontWeight: 700 }}>{material.title}</span>
                                    {material.description && <span style={{ display: 'block', marginTop: 3, color: '#667085', fontSize: 12, lineHeight: 1.4 }}>{material.description}</span>}
                                </span>
                                <Download size={17} style={{ flexShrink: 0, color: '#667085' }} />
                            </a>
                        ))}
                    </div>
                </Modal>

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

const embeddedSectionCard: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #d9e1eb',
    borderRadius: 14,
    padding: 16,
    margin: 0,
    minWidth: 0,
    boxShadow: '0 2px 8px rgba(16,24,40,0.06)',
};

const LessonContentCard = ({
    lessonContent,
    homework,
    attachments,
}: {
    lessonContent?: string | null;
    homework?: string | null;
    attachments?: string[];
}) => {
    if (!lessonContent && !homework && !attachments?.length) return null;
    return (
        <div className="sld-hover-card" style={embeddedSectionCard}>
            <div style={sectionHeaderRow}>
                <div style={sectionIconWrap}><BookOpen size={16} style={{ color: LESSON_RAIL_ACCENT }} /></div>
                <div style={sectionTitleText}>Nội dung & bài tập</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {lessonContent && <ContentBlock icon={<BookOpen size={15} />} accent={LESSON_RAIL_ACCENT} label="Nội dung buổi học" value={lessonContent} />}
                {homework && <ContentBlock icon={<AlertCircle size={15} />} accent={LESSON_RAIL_ACCENT} label="Bài tập về nhà" value={homework} />}
                {!!attachments?.length && (
                    <div>
                        <span style={reportLabelStyle}>Bài tập được giao</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                            {attachments.map((url, index) => (
                                <a key={`${url}-${index}`} href={url} target="_blank" rel="noopener noreferrer" style={attachmentLinkStyle}>
                                    <Paperclip size={14} style={{ flexShrink: 0, color: LESSON_RAIL_ACCENT }} />
                                    <span style={attachmentNameStyle}>{getFileNameFromUrl(url)}</span>
                                    <Download size={14} style={{ flexShrink: 0, color: '#9ca3af' }} />
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const TutorReportCard = ({ report, materials }: { report?: any; materials: LearningMaterialResponse[] }) => {
    if (!report && materials.length === 0) return null;
    return (
        <div className="sld-hover-card" style={embeddedSectionCard}>
                <div style={sectionHeaderRow}>
                    <div style={sectionIconWrap}><ClipboardCheck size={16} style={{ color: LESSON_RAIL_ACCENT }} /></div>
                <div style={sectionTitleText}>Ghi chú buổi học từ gia sư</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {report?.contentCovered && <ReportRow label="Nội dung đã dạy" value={report.contentCovered} />}
                {report?.homeworkAssigned && <ReportRow label="Bài tập giao" value={report.homeworkAssigned} />}
                {report && (
                    <div style={ratingRow}>
                        <span style={reportLabelStyle}>Đánh giá học sinh</span>
                        {report.studentPerformanceRating > 0 ? (
                            <div style={ratingStars}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={16} fill={i <= report.studentPerformanceRating ? '#fbbf24' : '#e5e7eb'} color={i <= report.studentPerformanceRating ? '#f59e0b' : '#d1d5db'} strokeWidth={1.5} />)}<span style={ratingNumber}>{report.studentPerformanceRating}/5</span></div>
                        ) : <span style={{ fontSize: 13, color: '#999' }}>Chưa đánh giá</span>}
                    </div>
                )}
            </div>
        </div>
    );
};

const JoinSessionBanner = ({ lessonId, nearJoinWindow, isInProgress }: { lessonId: number; nearJoinWindow: boolean; isInProgress: boolean }) => (
    <div style={heroCard}>
        <div style={heroBgCircle1} /><div style={heroBgCircle2} />
        <div style={heroInner}>
            <div style={heroLeft}><div style={heroLiveDot}><span style={heroPulseRing} /><span style={heroSolidDot} /></div><div><div style={heroBadgeText}>{isInProgress ? 'BUỔI HỌC ĐÃ BẮT ĐẦU' : 'PHÒNG HỌC ĐÃ MỞ'}</div><div style={heroSubtext}>{isInProgress ? 'Gia sư đang chờ bạn trong lớp' : 'Phòng học đã sẵn sàng — bạn có thể vào lớp bất cứ lúc nào'}</div></div></div>
            <Link to={`/session-lobby/${lessonId}`} style={heroJoinBtn}><Video size={16} /> {nearJoinWindow ? 'Vào học' : 'Vào học nhanh'}</Link>
        </div>
    </div>
);

// ── Sidebar cột trái kiểu Coursera: khối bo viền duy nhất, chia mục bằng
// đường kẻ mảnh thay vì nhiều thẻ nổi rời rạc ──
const SidebarSection = ({
    label,
    collapsible,
    open,
    onToggle,
    children,
}: {
    label: string;
    collapsible?: boolean;
    open?: boolean;
    onToggle?: () => void;
    children: React.ReactNode;
}) => (
    <div className="sld-hover-card" style={sidebarSection}>
        {collapsible ? (
            <button type="button" className="sld-side-section-btn" style={sidebarSectionHeaderBtn} onClick={onToggle}>
                <span style={sidebarSectionLabel}>{label}</span>
                <ChevronDown
                    size={14}
                    style={{ color: '#9ca3af', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
                />
            </button>
        ) : (
            <div style={sidebarSectionLabel}>{label}</div>
        )}
        {(!collapsible || open) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
                {children}
            </div>
        )}
    </div>
);

const SidebarItemRow = ({
    icon,
    title,
    meta,
    active,
}: {
    icon: React.ReactNode;
    title: React.ReactNode;
    meta?: React.ReactNode;
    active?: boolean;
}) => (
    <div className="sld-side-item" style={active ? sidebarItemRowActive : sidebarItemRow}>
        <span style={{ ...sidebarItemIconWrap, ...(active ? sidebarItemIconWrapActive : {}) }}>{icon}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
            <div style={sidebarItemTitle}>{title}</div>
            {meta && <div style={sidebarItemMeta}>{meta}</div>}
        </div>
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
.sld-markdown { font-size: 14px; line-height: 1.6; color: #1a2238; font-family: 'IBM Plex Sans', sans-serif; }
.sld-markdown > *:first-child { margin-top: 0; }
.sld-markdown > *:last-child { margin-bottom: 0; }
.sld-markdown p { margin: 0 0 10px; }
.sld-markdown ul, .sld-markdown ol { margin: 0 0 10px; padding-left: 20px; }
.sld-markdown li { margin-bottom: 4px; }
.sld-markdown li > p { margin: 0; }
.sld-markdown h1, .sld-markdown h2, .sld-markdown h3 { font-size: 14px; font-weight: 700; margin: 14px 0 6px; color: #1a2238; }
.sld-markdown strong { font-weight: 700; color: #1a2238; }
.sld-markdown code { background: #f1f5f9; padding: 1px 5px; border-radius: 4px; font-size: 12.5px; }
@media (max-width: 1180px) {
    .sld-3col-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important; }
    .sld-3col-grid > *:first-child { grid-column: 1 / -1; }
}
@media (max-width: 760px) {
    .sld-3col-grid { grid-template-columns: minmax(0, 1fr) !important; }
    .sld-3col-grid > *:first-child { grid-column: auto; }
}
.sld-hover-card {
    transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}
.sld-hover-card:hover {
    transform: translateY(-2px);
    border-color: #cdbeb8 !important;
    box-shadow: 0 10px 24px rgba(39,42,49,.08), 0 0 0 3px rgba(103,35,32,.035) !important;
}
.sld-side-section-btn:hover,
.sld-side-item:hover { background: #f7f4ed; }
.sld-side-section-btn, .sld-side-item { transition: background .14s ease, transform .14s ease; }
.sld-side-item:hover { transform: translateX(2px); }
.sld-pill, .sld-pill-ghost, .sld-dive-btn, .sld-sidebar-close, .sld-next-btn {
    transition: transform .14s ease, box-shadow .14s ease, border-color .14s ease, background .14s ease, color .14s ease;
}
.sld-pill:hover:not(:disabled),
.sld-pill-ghost:hover:not(:disabled),
.sld-dive-btn:hover,
.sld-next-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 5px 12px rgba(39,42,49,.10);
}
.sld-pill:hover:not(:disabled) { background: #f5f2ea; }
.sld-pill-ghost:hover:not(:disabled) {
    border-color: #cdbeb8;
    background: #f7f4ed;
    box-shadow: 0 7px 16px rgba(103,35,32,.10);
}
.sld-dive-btn:hover { background: #f2eee4; }
.sld-sidebar-close:hover { background: #f0f0ee; color: #1a2238; }
.sld-next-btn:hover { background: #272A31; color: #fff; }
.sld-ai-send-btn:hover:not(:disabled) {
    background: #7b2b28 !important;
    transform: translateY(-2px) scale(1.04);
    box-shadow: 0 7px 16px rgba(103,35,32,.30);
}
.sld-ai-send-btn:active:not(:disabled) { transform: translateY(0) scale(.98); }
.sld-ai-input-pill:focus-within { border-color: #272A31; box-shadow: 0 0 0 3px rgba(39,42,49,0.12); }
.sld-ai-header-icon:hover { background: #f5f5f5; color: #1a2238; }
`;
const existingStyleTag = document.getElementById('sld-keyframes') as HTMLStyleElement | null;
if (existingStyleTag) {
    // Vite HMR tái thực thi module nhưng giữ nguyên <style> cũ; thay nội dung để
    // các chỉnh sửa hover/animation có hiệu lực ngay, không cần người dùng hard refresh.
    existingStyleTag.textContent = styleTag.textContent;
} else {
    styleTag.id = 'sld-keyframes';
    document.head.appendChild(styleTag);
}

// ─────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────

const FONT_DISPLAY = "'Bricolage Grotesque', 'IBM Plex Sans', sans-serif";
const FONT_BODY = "'IBM Plex Sans', sans-serif";
// Một palette surface dùng xuyên suốt rail trái, lấy cảm hứng từ Coursera:
// các item chỉ khác nhau bởi nội dung/trạng thái, không đổi sang tím/xanh/vàng.
const LESSON_RAIL_SURFACE = '#faf9f7';
const TUTORA_MIDNIGHT = '#272A31';
const TUTORA_MOSS = '#2D372F';
const TUTORA_IVORY = '#DED8CA';
const TUTORA_UMBER = '#2E2721';
const TUTORA_BURGUNDY = '#672320';
const LESSON_RAIL_ACCENT = TUTORA_BURGUNDY;

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
    background: 'linear-gradient(135deg, #2D372F 0%, #3B4A3D 58%, #4B5B4E 100%)',
    color: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    boxShadow: '0 8px 24px rgba(45,55,47,0.25), 0 2px 8px rgba(0,0,0,0.08)',
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
    color: TUTORA_MOSS,
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

const statusChip: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: '7px 10px',
    borderRadius: 999,
    fontSize: 12.5,
    fontWeight: 700,
    fontFamily: FONT_BODY,
    whiteSpace: 'nowrap',
    flexShrink: 0,
};

const statusDot: React.CSSProperties = {
    width: 8,
    height: 8,
    borderRadius: '50%',
    boxShadow: '0 0 0 3px rgba(255,255,255,.45)',
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

// ── Section card ──
// ── Video card + "Đào sâu nội dung này" (cột giữa, kiểu Coursera) ──
// ── Sidebar cột trái: thẻ trắng bo góc + viền + đổ bóng nhẹ (theo mẫu tham khảo),
// header cố định có đường kẻ dưới, phần danh sách cuộn riêng bên trong.
const sidebarCard: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
    overflow: 'hidden',
    height: '100%',
    minHeight: 0,
};

const sidebarHeaderRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '16px 18px',
    borderBottom: '1px solid #f1f1ef',
    flexShrink: 0,
};

const sidebarHeaderActions: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
};

const sidebarHeaderButtons: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
};

const sidebarScrollBody: React.CSSProperties = {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: '16px 18px',
};

const sidebarHeaderTitle: React.CSSProperties = {
    fontSize: 17,
    fontWeight: 700,
    color: TUTORA_MIDNIGHT,
    lineHeight: 1.3,
};

const sidebarGoalCard: React.CSSProperties = {
    background: LESSON_RAIL_SURFACE,
    border: '1px solid #e8e2d8',
    borderRadius: 14,
    padding: '15px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginTop: 12,
    marginBottom: 16,
};

const sidebarGoalHeader: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
};

const sidebarGoalTitle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 700,
    color: TUTORA_MIDNIGHT,
};

const sidebarGoalRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
};

const sidebarGoalTimeline: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: '11px 12px',
    background: '#fff',
    borderRadius: 10,
    border: '1px solid #eee9e0',
};

const sidebarGoalIcon: React.CSSProperties = {
    width: 22,
    height: 22,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    background: '#f7f4ed',
    flexShrink: 0,
};

const sidebarGoalTimeContent: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
};

const sidebarGoalTimeLabel: React.CSSProperties = {
    color: '#7c746b',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '.02em',
    textTransform: 'uppercase',
};

const sidebarGoalTimeValue: React.CSSProperties = {
    color: TUTORA_MIDNIGHT,
    fontSize: 12.5,
    fontWeight: 500,
    lineHeight: 1.45,
    overflowWrap: 'anywhere',
};

const sidebarSection: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #d9e1eb',
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
    boxShadow: '0 2px 8px rgba(16,24,40,0.06)',
};

const sidebarSectionHeaderBtn: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'none',
    border: 'none',
    padding: '2px 4px',
    margin: '-2px -4px',
    borderRadius: 6,
    cursor: 'pointer',
};

// color rgb(94,111,146) đo được từ nhãn "Module 1" thật trên Coursera.
const sidebarSectionLabel: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    color: LESSON_RAIL_ACCENT,
};

const sidebarItemRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '8px 12px',
    margin: 0,
    borderRadius: 6,
};

const sidebarItemRowActive: React.CSSProperties = {
    ...sidebarItemRow,
    background: LESSON_RAIL_SURFACE,
    paddingLeft: 12,
};

const sidebarItemIconWrap: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: '#fff',
    border: '1.5px solid #d0d5dd',
    color: '#8a8370',
    flexShrink: 0,
    marginTop: 1,
};

const sidebarItemIconWrapActive: React.CSSProperties = {
    background: LESSON_RAIL_SURFACE,
    border: 'none',
    color: LESSON_RAIL_ACCENT,
};

const sidebarItemTitle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: TUTORA_MIDNIGHT,
    lineHeight: 1.4,
};

const sidebarItemMeta: React.CSSProperties = {
    fontSize: 11.5,
    color: '#9ca3af',
    marginTop: 2,
    lineHeight: 1.5,
};

// ── Thẻ bọc cột giữa (video + tiêu đề + đào sâu) + thanh footer chứa nút điều hướng,
// theo mẫu tham khảo: 1 thẻ trắng bo góc/viền/đổ bóng, nội dung cuộn riêng, footer
// ngăn cách bằng đường kẻ trên + nền hơi khác màu.
const middleCard: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
    overflow: 'hidden',
    height: '100%',
    minHeight: 0,
};

const middleScrollBody: React.CSSProperties = {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: 24,
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    alignContent: 'start',
    gap: 14,
};

const sidebarActionBlock: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
};

const sidebarActionText: React.CSSProperties = {
    fontSize: 12.5,
    color: '#667085',
    lineHeight: 1.55,
};

const sidebarActionButtons: React.CSSProperties = {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
};

const sidebarActionNote: React.CSSProperties = {
    fontSize: 12,
    color: '#667085',
    lineHeight: 1.5,
};

const sidebarPrimaryAction: React.CSSProperties = {
    ...actionBtnBase,
    padding: '8px 10px',
    fontSize: 12,
    background: TUTORA_MIDNIGHT,
    boxShadow: 'none',
};

const sidebarSecondaryAction: React.CSSProperties = {
    ...sidebarPrimaryAction,
    color: TUTORA_MIDNIGHT,
    background: '#fff',
    border: '1px solid #d0d5dd',
};

const sidebarDangerAction: React.CSSProperties = {
    ...sidebarPrimaryAction,
    background: TUTORA_BURGUNDY,
};

const middleVideoSection: React.CSSProperties = {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
};

const nextBtn: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 18px',
    borderRadius: 10,
    border: '1px solid #d0d5dd',
    background: '#fff',
    color: '#1a2238',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(16,24,40,0.05)',
};

const videoCard: React.CSSProperties = {
    background: '#fff',
    border: 'none',
    borderRadius: 0,
    overflow: 'hidden',
    boxShadow: 'none',
};

const videoInfoRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    marginBottom: 4,
};

const videoInfoTitle: React.CSSProperties = {
    fontSize: 22,
    fontWeight: 700,
    color: TUTORA_MIDNIGHT,
};

const diveDeeperCard: React.CSSProperties = {
    marginTop: 20,
};

const diveDeeperHeaderBtn: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#f7f4ed',
    border: `1px solid ${TUTORA_IVORY}`,
    borderRadius: 10,
    padding: '14px 16px',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    color: TUTORA_BURGUNDY,
};

const pillsGrid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10,
    marginTop: 14,
};

const pillBtn: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '11px 12px',
    borderRadius: 10,
    border: `1.5px solid ${TUTORA_MIDNIGHT}`,
    background: '#fff',
    color: TUTORA_MIDNIGHT,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    lineHeight: 1.35,
};

const pillsGridVertical: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
};

const pillBtnGhost: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    textAlign: 'left',
    padding: '14px 16px',
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    background: '#fff',
    color: '#1a2238',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
};

// ── Khung chat AI (cột phải): thẻ trắng bo góc + viền + đổ bóng nhẹ, theo mẫu tham khảo.
const aiPanelCard: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
};

const aiPanelHeader: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: '16px 18px',
    borderBottom: '1px solid #f1f1ef',
    flexShrink: 0,
};

const aiPanelHeaderIcons: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
};

const aiHeaderIconBtn: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 26,
    height: 26,
    borderRadius: 6,
    border: 'none',
    background: 'transparent',
    color: '#667085',
    cursor: 'pointer',
};

const aiCompactTitle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 700,
    color: TUTORA_MIDNIGHT,
};

const aiHeroGreeting: React.CSSProperties = {
    marginBottom: 2,
};

const aiGreetingHi: React.CSSProperties = {
    fontSize: 26,
    fontWeight: 800,
    color: TUTORA_BURGUNDY,
    marginBottom: 2,
    lineHeight: 1.2,
};

const aiGreetingTitle: React.CSSProperties = {
    fontSize: 22,
    fontWeight: 700,
    color: TUTORA_MIDNIGHT,
    lineHeight: 1.25,
};

const aiPanelBody: React.CSSProperties = {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: '14px 14px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
};

const aiEmptyDesc: React.CSSProperties = {
    fontSize: 13,
    color: '#667085',
    lineHeight: 1.55,
};

// Tin nhắn AI hiện dạng chữ thường trên nền trắng, không bong bóng — khớp Coursera
const aiBubbleAssistant: React.CSSProperties = {
    fontSize: 13.5,
    color: '#1a2238',
    lineHeight: 1.6,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxWidth: '100%',
};

// Tin nhắn người dùng mới có bong bóng tím nhạt, bo tròn, căn phải
const aiBubbleUser: React.CSSProperties = {
    alignSelf: 'flex-end',
    background: '#f2eee4',
    borderRadius: 16,
    padding: '10px 16px',
    fontSize: 13.5,
    color: '#1a2238',
    maxWidth: '85%',
};

const aiPanelInputRow: React.CSSProperties = {
    padding: '14px 16px 8px',
    borderTop: '1px solid #f1f1ef',
    flexShrink: 0,
};

const aiInputPill: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: 6,
    borderRadius: 14,
    border: '1px solid #e5e7eb',
    background: '#faf9f7',
};

const aiInputField: React.CSSProperties = {
    flex: 1,
    padding: '8px 10px',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontSize: 13,
};

const aiSendBtn: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    borderRadius: 10,
    border: 'none',
    background: TUTORA_BURGUNDY,
    color: '#fff',
    cursor: 'pointer',
    flexShrink: 0,
};

const aiDisclaimer: React.CSSProperties = {
    fontSize: 11,
    color: '#9ca3af',
    lineHeight: 1.5,
    padding: '0 16px 16px',
    textAlign: 'center',
    flexShrink: 0,
};

const sectionCard: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #f0f0f0',
    borderRadius: 14,
    padding: '22px 24px',
    marginBottom: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

// Theo mẫu tham khảo mới (3 thẻ trắng bo góc, viền + đổ bóng nhẹ, cách nhau bằng khoảng
// trắng — không còn dính liền như bản đo từ Coursera trước đó). Nền trang Tutora (kem)
// lộ ra ở khoảng cách giữa 3 thẻ, giống hệt bố cục mẫu (nền xám nhạt lộ ra giữa các card).
const threeColGrid: React.CSSProperties = {
    display: 'grid',
    // Coursera uses a wide course-outline rail, a dominant lesson canvas, and
    // an AI rail. Keep the same visual balance while allowing Tutora content
    // to remain readable at common laptop and desktop widths.
    gridTemplateColumns: 'minmax(280px, 26%) minmax(0, 1fr) minmax(340px, 27%)',
    gridTemplateRows: 'minmax(0, 1fr)',
    alignItems: 'stretch',
    gap: 20,
    width: '100%',
    flex: 1,
    minHeight: 0,
};

const threeColLeft: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 0,
};

const threeColMiddle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 0,
};

const threeColRight: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 0,
};

const sectionHeaderRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    paddingBottom: 0,
    borderBottom: 'none',
};

const sectionIconWrap: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: LESSON_RAIL_SURFACE,
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
};

const sectionTitleText: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 700,
    color: TUTORA_MIDNIGHT,
    fontFamily: FONT_DISPLAY,
};

// ── Content block ──
const contentBlock: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '14px 16px',
    background: LESSON_RAIL_SURFACE,
    borderRadius: 10,
    border: 'none',
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
    background: LESSON_RAIL_SURFACE,
    borderRadius: 10,
    border: 'none',
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

const summaryTabBtnBase: React.CSSProperties = {
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 600,
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    background: '#fff',
    color: '#667085',
    cursor: 'pointer',
    fontFamily: FONT_BODY,
};

const summaryTabBtnActive: React.CSSProperties = {
    background: TUTORA_MIDNIGHT,
    borderColor: TUTORA_MIDNIGHT,
    color: '#fff',
};

const attachmentLinkStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    background: LESSON_RAIL_SURFACE,
    borderRadius: 10,
    border: 'none',
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
    background: LESSON_RAIL_SURFACE,
    border: 'none',
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
    color: TUTORA_MIDNIGHT,
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
