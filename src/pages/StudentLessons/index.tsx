/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ChevronLeft, ChevronRight, Video, BookOpen } from 'lucide-react';
import dayjs from 'dayjs';
import { Spin } from 'antd';
import { getStudentLessons } from '../../services/student-lesson.service';
import { isJitsiFallbackLink } from '../../services/googleAuth.service';
import s from '../StudentPages.module.css';

// ── Tabs ─────────────────────────────────────────────────────────────────
const TABS = [
    { key: '', label: 'Tất cả' },
    { key: 'scheduled', label: 'Lên lịch' },
    { key: 'in_progress', label: 'Đang diễn ra' },
    { key: 'pending_confirmation', label: 'Chờ xác nhận' },
    { key: 'completed', label: 'Hoàn thành' },
];

// ── Status definitions — khớp với LessonStatus.cs ở BE ─────────────────
type StatusInfo = { label: string; color: string; bg: string };

const STATUS_INFO: Record<string, StatusInfo> = {
    scheduled:            { label: 'Đã lên lịch',     color: '#6366F1', bg: 'rgba(99,102,241,0.10)' },
    in_progress:          { label: 'Đang diễn ra',    color: '#0d9488', bg: 'rgba(13,148,136,0.12)' },
    pending_confirmation: { label: 'Chờ xác nhận',    color: '#d97706', bg: 'rgba(217,119,6,0.10)' },
    completed:            { label: 'Hoàn thành',      color: '#059669', bg: 'rgba(5,150,105,0.10)' },
    cancelled:            { label: 'Đã hủy',          color: '#737373', bg: '#f5f5f5' },
    cancelled_noshow:     { label: 'Hủy (vắng mặt)',  color: '#737373', bg: '#f5f5f5' },
    no_show:              { label: 'Vắng mặt',        color: '#DC2626', bg: '#FEF2F2' },
    disputed:             { label: 'Khiếu nại',       color: '#DC2626', bg: '#FEF2F2' },
};

const getStatus = (status: string | null | undefined): StatusInfo => {
    if (!status) return STATUS_INFO.cancelled;
    return STATUS_INFO[status.toLowerCase()] ?? STATUS_INFO.cancelled;
};

// ── Date helpers ─────────────────────────────────────────────────────────
const VN_WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const formatDayHeader = (dateKey: string): string => {
    const d = dayjs(dateKey);
    const today = dayjs().startOf('day');
    const diff = d.startOf('day').diff(today, 'day');
    if (diff === 0) return `Hôm nay · ${VN_WEEKDAYS[d.day()]} ${d.format('DD/MM')}`;
    if (diff === 1) return `Ngày mai · ${VN_WEEKDAYS[d.day()]} ${d.format('DD/MM')}`;
    if (diff === -1) return `Hôm qua · ${VN_WEEKDAYS[d.day()]} ${d.format('DD/MM')}`;
    if (d.year() === dayjs().year()) return `${VN_WEEKDAYS[d.day()]} · ${d.format('DD/MM')}`;
    return `${VN_WEEKDAYS[d.day()]} · ${d.format('DD/MM/YYYY')}`;
};

const getInitial = (name: string | null | undefined): string => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return (parts[parts.length - 1]?.[0] ?? parts[0]?.[0] ?? '?').toUpperCase();
};

const getAvatarBg = (name: string | null | undefined): string => {
    const palette = ['#6366F1', '#0d9488', '#d97706', '#059669', '#7c3aed', '#0891b2', '#db2777'];
    if (!name) return palette[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
    return palette[hash % palette.length];
};

// ── Component ────────────────────────────────────────────────────────────
const StudentLessons = () => {
    const navigate = useNavigate();
    const [lessons, setLessons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 10;

    useEffect(() => {
        fetchLessons(activeTab, page);
    }, [activeTab, page]);

    const fetchLessons = async (tab: string, currentPage: number) => {
        try {
            setLoading(true);
            const res = await getStudentLessons({
                page: currentPage,
                pageSize,
                status: tab || undefined,
            });
            const items = res.content?.items || [];
            // Debug: warn nếu items.length != totalCount mà chưa cần pagination
            if (import.meta.env.DEV && items.length !== res.content?.totalCount && currentPage === 1) {
                console.warn(`⚠️ Student lessons: items=${items.length} but totalCount=${res.content?.totalCount}`);
            }
            setLessons(items);
            setTotalCount(res.content?.totalCount || 0);
        } catch {
            setLessons([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    // ── Active lesson (in_progress + có meetingLink) ──
    const activeLesson = useMemo(
        () => lessons.find((l) => l.status === 'in_progress' && l.meetingLink),
        [lessons]
    );

    // ── Group by date ──
    const grouped = useMemo(() => {
        const map = new Map<string, any[]>();
        const others = activeLesson
            ? lessons.filter((l) => l.lessonId !== activeLesson.lessonId)
            : lessons;
        for (const lesson of others) {
            const iso = lesson.scheduledStartTime || lesson.scheduledStart;
            if (!iso) continue;
            const key = dayjs(iso).format('YYYY-MM-DD');
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(lesson);
        }
        const today = dayjs().startOf('day');
        return Array.from(map.entries())
            .sort(([a], [b]) => {
                const da = dayjs(a).startOf('day');
                const db = dayjs(b).startOf('day');
                const aFut = !da.isBefore(today);
                const bFut = !db.isBefore(today);
                if (aFut && !bFut) return -1;
                if (!aFut && bFut) return 1;
                if (aFut) return da.valueOf() - db.valueOf();
                return db.valueOf() - da.valueOf();
            })
            .map(([dateKey, list]) => ({
                dateKey,
                lessons: list.sort((a, b) => {
                    const ta = dayjs(a.scheduledStartTime || a.scheduledStart).valueOf();
                    const tb = dayjs(b.scheduledStartTime || b.scheduledStart).valueOf();
                    return ta - tb;
                }),
            }));
    }, [lessons, activeLesson]);

    const totalVisible = (activeLesson ? 1 : 0) + grouped.reduce((sum, g) => sum + g.lessons.length, 0);

    return (
        <div className={s.page}>
            {/* Top Bar */}
            <div className={s.topBar}>
                <div className={s.topBarLeft}>
                    <h1 className={s.pageTitle}>Buổi học</h1>
                    <p className={s.pageSubtitle}>Theo dõi và quản lý buổi học của bạn</p>
                </div>
                {totalCount > 0 && (
                    <div style={countPill}>
                        <span style={countNumber}>{totalCount}</span>
                        <span style={countLabel}>buổi học</span>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className={s.mainContent}>
                {/* Hero "Đang diễn ra" — compact version */}
                {activeLesson && <ActiveLessonHero lesson={activeLesson} navigate={navigate} />}

                <div className={s.contentPanel}>
                    {/* Tabs */}
                    <div className={s.tabBar}>
                        <div className={s.tabGroup}>
                            {TABS.map((t) => (
                                <button
                                    key={t.key}
                                    className={`${s.tab} ${activeTab === t.key ? s.active : ''}`}
                                    onClick={() => {
                                        setActiveTab(t.key);
                                        setPage(1);
                                    }}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    {loading ? (
                        <div className={s.loadingCenter}>
                            <Spin size="large" />
                        </div>
                    ) : totalVisible === 0 ? (
                        <div style={emptyStateBox}>
                            <div style={emptyStateIcon}>
                                <BookOpen size={28} strokeWidth={1.5} />
                            </div>
                            <div style={emptyStateTitle}>Chưa có buổi học nào</div>
                            <div style={emptyStateSub}>
                                {activeTab === ''
                                    ? 'Buổi học sẽ xuất hiện sau khi booking được xác nhận.'
                                    : 'Không có buổi học nào trong mục này.'}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div style={{ padding: '4px 0' }}>
                                {grouped.map(({ dateKey, lessons: dayLessons }) => (
                                    <div key={dateKey} style={dateGroup}>
                                        <div style={dateHeader}>
                                            {formatDayHeader(dateKey)}
                                            <span style={dateDivider} />
                                        </div>
                                        {dayLessons.map((lesson) => (
                                            <LessonRow
                                                key={lesson.lessonId}
                                                lesson={lesson}
                                                onClick={() =>
                                                    lesson.lessonId &&
                                                    navigate(`/student-portal/lessons/${lesson.lessonId}`)
                                                }
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>

                            {totalPages > 1 && (
                                <div className={s.pagination}>
                                    <button
                                        className={s.paginationBtn}
                                        disabled={page <= 1}
                                        onClick={() => setPage(page - 1)}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className={s.paginationInfo}>
                                        Trang {page}/{totalPages}
                                    </span>
                                    <button
                                        className={s.paginationBtn}
                                        disabled={page >= totalPages}
                                        onClick={() => setPage(page + 1)}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentLessons;

// ─────────────────────────────────────────────────────────────────────────
// Hero card — compact single-row layout
// ─────────────────────────────────────────────────────────────────────────
const ActiveLessonHero = ({ lesson, navigate }: { lesson: any; navigate: (path: string) => void }) => {
    const startIso = lesson.scheduledStartTime || lesson.scheduledStart;
    const endIso = lesson.scheduledEndTime || lesson.scheduledEnd;
    const startTime = startIso ? dayjs(startIso).format('HH:mm') : '';
    const endTime = endIso ? dayjs(endIso).format('HH:mm') : '';
    const isJitsi = isJitsiFallbackLink(lesson.meetingLink);

    return (
        <div
            style={heroCard}
            onClick={() => navigate(`/student-portal/lessons/${lesson.lessonId}`)}
        >
            <div style={heroLeft}>
                <div style={heroLiveDot}>
                    <span style={heroPulseRing} />
                    <span style={heroSolidDot} />
                </div>
                <div>
                    <div style={heroBadgeText}>ĐANG DIỄN RA</div>
                    <div style={heroTitle}>{lesson.subjectName || `Buổi học #${lesson.lessonId}`}</div>
                    <div style={heroMeta}>
                        <Clock size={11} />
                        <span>{startTime} - {endTime}</span>
                        <span style={{ opacity: 0.5 }}>·</span>
                        <span>{lesson.tutorName || 'Gia sư'}</span>
                    </div>
                </div>
            </div>

            <a
                href={lesson.meetingLink}
                target="_blank"
                rel="noreferrer"
                style={heroJoinBtn}
                onClick={(e) => e.stopPropagation()}
            >
                <Video size={14} />
                Tham gia
                {isJitsi && <span style={heroJitsiTag}>Jitsi</span>}
            </a>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────
// Lesson row — compact, single-line
// ─────────────────────────────────────────────────────────────────────────
const LessonRow = ({ lesson, onClick }: { lesson: any; onClick: () => void }) => {
    const [hover, setHover] = useState(false);
    const status = getStatus(lesson.status);
    const startIso = lesson.scheduledStartTime || lesson.scheduledStart;
    const endIso = lesson.scheduledEndTime || lesson.scheduledEnd;
    const startTime = startIso ? dayjs(startIso).format('HH:mm') : '--:--';
    const endTime = endIso ? dayjs(endIso).format('HH:mm') : '';
    const isInProgress = lesson.status === 'in_progress';
    const canJoin = isInProgress && lesson.meetingLink;

    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                ...lessonRow,
                background: hover ? '#fafaf8' : '#fff',
                borderLeftColor: status.color,
            }}
        >
            {/* Time */}
            <div style={timeBlock}>
                <span style={timeStart}>{startTime}{endTime ? ` - ${endTime}` : ''}</span>
            </div>

            {/* Title + tutor inline */}
            <div style={infoBlock}>
                <span style={titleText}>
                    {lesson.subjectName || `Buổi học #${lesson.lessonId}`}
                </span>
                <span style={dotSep}>·</span>
                <span style={tutorWrap}>
                    <span style={avatarSmall(lesson.tutorName)}>{getInitial(lesson.tutorName)}</span>
                    <span style={tutorName}>{lesson.tutorName || 'Gia sư'}</span>
                </span>
            </div>

            {/* Right: status + join + chevron */}
            <div style={rightBlock}>
                <span style={{ ...statusPill, color: status.color, background: status.bg }}>
                    <span style={{ ...statusDot, background: status.color }} />
                    {status.label}
                </span>
                {canJoin && (
                    <a
                        href={lesson.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={joinPill}
                    >
                        <Video size={11} />
                        Vào lớp
                    </a>
                )}
                <ChevronRight
                    size={14}
                    style={{ color: hover ? status.color : '#cbd5e1', transition: 'color 0.15s' }}
                />
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────

const countPill: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: 6,
    padding: '5px 12px',
    background: '#f2f0e4',
    borderRadius: 999,
    fontFamily: "'IBM Plex Sans', sans-serif",
};

const countNumber: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 700,
    color: '#1a2238',
};

const countLabel: React.CSSProperties = {
    fontSize: 11,
    color: '#737373',
    fontWeight: 500,
};

// ── Hero card compact ──
const heroCard: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '14px 18px',
    background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
    color: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(13,148,136,0.22)',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
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
    width: 36,
    height: 36,
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
    border: '2px solid rgba(255,255,255,0.6)',
    animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite',
};

const heroSolidDot: React.CSSProperties = {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#fff',
    boxShadow: '0 0 0 3px rgba(255,255,255,0.4)',
};

const heroBadgeText: React.CSSProperties = {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1.2,
    opacity: 0.9,
    fontFamily: "'IBM Plex Sans', sans-serif",
    marginBottom: 2,
};

const heroTitle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 700,
    fontFamily: "'Bricolage Grotesque', 'IBM Plex Sans', sans-serif",
    marginBottom: 3,
    lineHeight: 1.2,
};

const heroMeta: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    opacity: 0.92,
    fontFamily: "'IBM Plex Sans', sans-serif",
};

const heroJoinBtn: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 18px',
    background: '#fff',
    color: '#0d9488',
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 8,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    fontFamily: "'IBM Plex Sans', sans-serif",
    flexShrink: 0,
};

const heroJitsiTag: React.CSSProperties = {
    fontSize: 9,
    fontWeight: 700,
    background: 'rgba(13,148,136,0.12)',
    padding: '1px 5px',
    borderRadius: 3,
    color: '#0f766e',
    letterSpacing: 0.3,
};

// ── Date group ──
const dateGroup: React.CSSProperties = {
    marginBottom: 14,
};

const dateHeader: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 4px 8px',
    fontSize: 12,
    fontWeight: 600,
    color: '#737373',
    fontFamily: "'IBM Plex Sans', sans-serif",
    letterSpacing: 0.2,
    textTransform: 'uppercase',
};

const dateDivider: React.CSSProperties = {
    flex: 1,
    height: 1,
    background: 'linear-gradient(90deg, #e5e5e5, transparent)',
};

// ── Lesson row (compact) ──
const lessonRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '12px 14px',
    background: '#fff',
    borderRadius: 10,
    borderLeft: '3px solid',
    cursor: 'pointer',
    marginBottom: 6,
    transition: 'background 0.12s ease',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
};

const timeBlock: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    minWidth: 100,
    flexShrink: 0,
};

const timeStart: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 700,
    color: '#1a2238',
    fontFamily: "'Bricolage Grotesque', 'IBM Plex Sans', sans-serif",
    lineHeight: 1.1,
};

const infoBlock: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
};

const titleText: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    color: '#1a2238',
    fontFamily: "'IBM Plex Sans', sans-serif",
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flexShrink: 0,
    maxWidth: '50%',
};

const dotSep: React.CSSProperties = {
    color: '#cbd5e1',
    fontSize: 12,
    flexShrink: 0,
};

const tutorWrap: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 12,
    color: '#737373',
    minWidth: 0,
    overflow: 'hidden',
};

const tutorName: React.CSSProperties = {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
};

const avatarSmall = (name: string | null | undefined): React.CSSProperties => ({
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: getAvatarBg(name),
    color: '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 9,
    fontWeight: 700,
    flexShrink: 0,
});

const rightBlock: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
};

const statusPill: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '3px 9px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "'IBM Plex Sans', sans-serif",
    whiteSpace: 'nowrap',
};

const statusDot: React.CSSProperties = {
    width: 5,
    height: 5,
    borderRadius: '50%',
};

const joinPill: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 9px',
    background: '#16a34a',
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 999,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    fontFamily: "'IBM Plex Sans', sans-serif",
};

// ── Empty state ──
const emptyStateBox: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    textAlign: 'center',
};

const emptyStateIcon: React.CSSProperties = {
    width: 60,
    height: 60,
    borderRadius: '50%',
    background: 'rgba(99,102,241,0.08)',
    color: '#6366F1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
};

const emptyStateTitle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    color: '#1a2238',
    marginBottom: 4,
    fontFamily: "'Bricolage Grotesque', 'IBM Plex Sans', sans-serif",
};

const emptyStateSub: React.CSSProperties = {
    fontSize: 12,
    color: '#737373',
    maxWidth: 320,
    lineHeight: 1.5,
};
